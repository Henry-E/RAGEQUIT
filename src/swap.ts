import * as anchor from "@coral-xyz/anchor";
import { SwapType, getVaultRevertMintAddr, getVaultFinalizeMintAddr, CONDITIONAL_VAULT_PROGRAM_ID } from "@metadaoproject/futarchy";
import { BN } from "bn.js";
import { createClient, getPendingProposals } from "./utils";
import { getAssociatedTokenAddressSync, getTokenMetadata } from "@solana/spl-token";
import { PublicKey, RpcResponseAndContext, TokenAmount } from "@solana/web3.js";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

type ProposalAmmsDao = {
  daoKey: PublicKey;
  pubKey: PublicKey;
  failAmm: PublicKey;
  passAmm: PublicKey;
}

const fetchAmmsFromProposals = (pendingProposals): ProposalAmmsDao[] => {
  return pendingProposals.map((proposal) => {
    return {
      daoKey: proposal.account.dao,
      pubKey: proposal.publicKey,
      failAmm: proposal.account.failAmm,
      passAmm: proposal.account.passAmm,
    }
  })
}


const getTokenDecimals = async(_client, dao) => {
  const tokenData = await provider.connection.getParsedAccountInfo(dao.tokenMint)
  // TODO: What if parsed doesn't exist?
  // @ts-ignore
  const baseTokenDecimals = tokenData.value.data.parsed.info.decimals
  return baseTokenDecimals
}

const getInAmount = async(amount: number | undefined = undefined, dao, decimals: number, _client) => {
  if(!amount){
    const minBaseFutarchicLiquidity = dao.minBaseFutarchicLiquidity.div(new BN(10).pow(new BN(decimals ?? 6))) // TODO: Note this is bad
    const minQuoteFutarchicLiquidity = dao.minQuoteFutarchicLiquidity.div(new BN(10).pow(new BN(6))) // flagged for now given we know it's USDC
    // Random amount because nothing is set...
    const tradeAmountBase = minBaseFutarchicLiquidity.toNumber() / (Math.random() * (8 - 6) + 6)
    const tradeAmountQuote = minQuoteFutarchicLiquidity.toNumber() / Math.floor(Math.random() * (8 - 6) + 6)
    return { tradeAmountBase, tradeAmountQuote}
  }
  // TODO: Get external pricing for swap
  return { tradeAmountBase: amount, tradeAmountQuote: amount }
}

const swap = async(_client, direction: string, amm: PublicKey, dao) => {
  const slippage = 10000
  // TODO: Want to fetch the min liquidity and then do something which allows us to calculate amount
  let swapType = {buy: {}} as SwapType
  const decimals = await getTokenDecimals(_client, dao)
  const { tradeAmountBase, tradeAmountQuote} = await getInAmount(undefined, dao, decimals, _client)
  let swapAmount = new BN(tradeAmountQuote).mul(new BN(10).pow(new BN(6)))
  let _swapAmount = tradeAmountQuote
  if (direction == 'sell') {
    swapType = {sell: {}} as SwapType
    swapAmount = new BN(tradeAmountBase).mul(new BN(10).pow(new BN(decimals))) // The amount to trade
    _swapAmount = tradeAmountBase; // Amount we're trading
  }
  
  console.log(swapType)
  const ammReserves = await _client.ammClient.getAmm(amm)
  const swapSim = _client.ammClient.simulateSwap(
    swapAmount,
    swapType,
    ammReserves.baseAmount,
    ammReserves.quoteAmount,
    new BN(slippage)
  )
  
  
  try {
    if(!swapSim.minExpectedOut) {
      console.log('simulation failed')
      return
    }
    let _outputAmount = swapSim.minExpectedOut.div(new BN(10).pow(new BN(6)))
    if (direction === 'buy') {
      _outputAmount = swapSim.minExpectedOut.div(new BN(10).pow(new BN(decimals)))
    }
    // console.log(swapSim.expectedOut.toNumber())
    console.log(`Swapping via ${direction} ${_swapAmount} for ${_outputAmount.toString()}`)
    const swapTxn = await _client.ammClient.swap(amm, swapType, _swapAmount, _outputAmount)
    console.log(swapTxn)
    return swapTxn
  } catch (err){
    console.error(err)
    return err;
  }
}

const mintConditionalTokens = async(_client, baseTokenMint, quoteTokenMint, baseAmountToMint, quoteAmountToMint, proposal) => {
  const baseTokenAccount = getAssociatedTokenAddressSync(baseTokenMint ,_client.provider.publicKey, true)
  const quoteTokenAccount = getAssociatedTokenAddressSync(quoteTokenMint ,_client.provider.publicKey, true)
  let baseTokenBalance: RpcResponseAndContext<TokenAmount> | undefined; // TODO: Tisk Tisk
  try {
    // TODO: Return balance here from this function...
    baseTokenBalance = await _client.provider.connection.getTokenAccountBalance(baseTokenAccount)
  } catch(err){
    console.error(err)
    console.error('No balance found')
  }
  if(!baseTokenBalance || baseTokenBalance.value.uiAmount === 0){
    console.log(`No balance located for Base Conditional Token`)
    
    const baseCondTokensTx = await _client.vaultClient.mintConditionalTokens(proposal.account.baseVault, baseAmountToMint)
    console.log(`Minted ${baseAmountToMint} Base Conditional Tokens ${baseCondTokensTx}`)
  }

  let quoteTokenBalance: RpcResponseAndContext<TokenAmount> | undefined; // TODO: Tisk Tisk

  try {
    // TODO: Return balance here from this function...
    quoteTokenBalance = await _client.provider.connection.getTokenAccountBalance(quoteTokenAccount)
  } catch(err){
    console.error('No balance found')
  }

  if(!quoteTokenBalance || quoteTokenBalance.value.uiAmount === 0){
    console.log(`No balance located for Quote Conditional Token`)
    const quoteCondTokensTx = await _client.vaultClient.mintConditionalTokens(proposal.account.quoteVault, quoteAmountToMint)
    console.log(`Minted ${quoteAmountToMint} Quote Conditional Tokens ${quoteCondTokensTx}`)
  }
}

const swapLoop = async() => {

}

const main = async() => {
  // SWAP (Simulate trading environment)
  console.log('Swaping')

  const _client = createClient()

  const pendingProposals = await getPendingProposals(_client)

  // Mint conditional tokens
  pendingProposals.map(async(proposal) => {
    const baseAmountToMint = 3; // TODO: Need to mint a reasonable amount
    const quoteAmountToMint = 3000; // TODO: Need to mint a reasonable amount
    try{
      // TODO: We should return balanc so we can size our positions
      const [baseRevert] = getVaultRevertMintAddr(CONDITIONAL_VAULT_PROGRAM_ID, proposal.account.baseVault)
      const [baseFinalize] = getVaultFinalizeMintAddr(CONDITIONAL_VAULT_PROGRAM_ID, proposal.account.baseVault)
      const [quoteRevert] = getVaultRevertMintAddr(CONDITIONAL_VAULT_PROGRAM_ID, proposal.account.quoteVault)
      const [quoteFinalize] = getVaultFinalizeMintAddr(CONDITIONAL_VAULT_PROGRAM_ID, proposal.account.quoteVault)
      await mintConditionalTokens(_client, baseRevert, quoteRevert, baseAmountToMint, quoteAmountToMint, proposal)
      await mintConditionalTokens(_client, baseFinalize, quoteFinalize, baseAmountToMint, quoteAmountToMint, proposal)
    } catch(err) {
      console.error(err)
    }
  })
  
  // NOTE: This is fetching all active proposals and their AMMs 
  const proposalAmm = fetchAmmsFromProposals(pendingProposals)
  
  proposalAmm.map((proposal) => {
    setTimeout(async () => {
      // TODO: We should refactor this.
      const dao = await _client.getDao(proposal.daoKey)
      console.log(`Swapping with Fail ${proposal.failAmm.toBase58()}`)
      console.log(`Swapping with Pass ${proposal.passAmm.toBase58()}`)
      try {
        // Buy
        await swap(_client, 'buy', proposal.failAmm, dao)
        await swap(_client, 'buy', proposal.passAmm, dao)
        // Sell
        await swap(_client, 'sell', proposal.failAmm, dao)
        await swap(_client, 'sell', proposal.passAmm, dao)
      } catch (err) {
        console.error(err)
      }
    }, 2000)
  })

  setTimeout(() => {main();}, 30000)
  
}

main()