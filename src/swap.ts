import { SwapType, getVaultRevertMintAddr, getVaultFinalizeMintAddr, CONDITIONAL_VAULT_PROGRAM_ID, PriceMath, AmmMath, FutarchyClient } from "@metadaoproject/futarchy/v0.3";
import { BN } from "bn.js";
import { createClient, getPendingProposals, getTokenDecimals, provider, USDC_MINT } from "./lib/utils";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, RpcResponseAndContext, TokenAmount } from "@solana/web3.js";
import { fetchAllAmmsFromProposals } from "./lib/trading";

const SLIPPAGE_BPS = 100;

// Initialize client
const client = createClient();

const getTradeSize = async(baseDecimals: number, price: number, dao: any, amount?: number) => {
  if(!amount){
    // TODO: Take in price and adjust...
    // TODO: This is just a dummy wrapper for determining size...
    // NOTE: This should be your size logic for the trading strategy
    const minBaseFutarchicLiquidity = dao.minBaseFutarchicLiquidity.div(new BN(10).pow(new BN(baseDecimals ?? 6))) // TODO: Note this is bad
    const minQuoteFutarchicLiquidity = dao.minQuoteFutarchicLiquidity.div(new BN(10).pow(new BN(6))) // flagged for now given we know it's USDC
    // Random amount because nothing is set...
    const tradeAmountBase = minBaseFutarchicLiquidity.toNumber() / (Math.random() * (8 - 6) + 6)
    const tradeAmountQuote = minQuoteFutarchicLiquidity.toNumber() / Math.floor(Math.random() * (8 - 6) + 6)
    return { tradeAmountBase, tradeAmountQuote}
  }
  // TODO: Get external pricing for swap
  return { tradeAmountBase: amount, tradeAmountQuote: amount }
}

const getAmmPrice = (amm: any) => {
  const price = PriceMath.getAmmPriceFromReserves(amm.baseAmount, amm.quoteAmount)
  return price
}

const swap = async(direction: string, ammAddress: PublicKey, dao: any) => {
  // NOTE: Core swap logic
  // Fetch amm and get price
  const amm = await client.ammClient.getAmm(ammAddress)
  const price = getAmmPrice(amm).toNumber()

  // First step is assuming USDC -> Asset
  const quoteDecimals = await getTokenDecimals(USDC_MINT)
  const baseDecimals = await getTokenDecimals(dao.tokenMint)

  const { tradeAmountBase, tradeAmountQuote} = await getTradeSize(baseDecimals, price, dao)
  
  let swapType = {buy: {}} as SwapType
  let swapAmount = AmmMath.getChainAmount(tradeAmountQuote, quoteDecimals)
  let swapAmountHuman = tradeAmountQuote
  if (direction == 'sell') {
    // From Base to Quote (eg. SOL -> USDC)
    swapType = {sell: {}} as SwapType
    swapAmount = AmmMath.getChainAmount(tradeAmountBase, baseDecimals)
    swapAmountHuman = tradeAmountBase
  }
  
  const { expectedOut } = AmmMath.simulateSwap(
    swapAmount,
    swapType,
    amm.baseAmount,
    amm.quoteAmount,
    new BN(SLIPPAGE_BPS)
  )

  let outputAmount = 0;
  
  if (direction === 'buy') {
    try {
      outputAmount = AmmMath.getHumanAmount(expectedOut, baseDecimals);
    } catch (err){
      console.error(err)
      outputAmount = expectedOut.div(new BN(10).pow(new BN(baseDecimals))).toNumber();
    }
    console.log(`Expected price: ${tradeAmountQuote / outputAmount}`)
  } else {
    try {
      outputAmount = AmmMath.getHumanAmount(expectedOut, quoteDecimals);
    } catch (err){
      console.error(err)
      outputAmount = expectedOut.div(new BN(10).pow(new BN(quoteDecimals))).toNumber();
    }
    console.log(`Expected price: ${outputAmount / tradeAmountBase}`)
  }
  try {
    console.log(`${direction}ing ${swapAmount.toString()} for ${expectedOut.toString()}`)
    const swapTxn = client.ammClient.swap(
      ammAddress,
      swapType,
      swapAmountHuman,
      outputAmount
    )
    console.log(swapTxn)
    return swapTxn
  } catch (err) {
    console.error(err)
  }
}

// TODO: We can use this to mint and swap saving the mint if you want to trade both markets...
// TODO: Need to work on this function not proven working..
const mintAndSwap = async(proposal: PublicKey, inputAmount: number, quoteMint: PublicKey, baseMint: PublicKey, swapType: SwapType, outcome: "pass" | "fail") => {
  const futarchyClient = FutarchyClient.createClient({
    provider,
  });
  const swapTxn = await futarchyClient.createMintAndSwapTx({
    proposal: proposal,
    inputAmount: new BN(inputAmount),
    quoteMint: quoteMint,
    baseMint: baseMint,
    user: client.provider.publicKey,
    payer: client.provider.publicKey,
    swapType: swapType as { buy: {} } | { sell: {} },
    outcome: outcome as "pass" | "fail",
  })
  return swapTxn
}

const mintConditionalTokens = async(baseTokenMint: PublicKey, quoteTokenMint: PublicKey, baseAmountToMint: number, quoteAmountToMint: number, proposal: any) => {
  const baseTokenAccount = getAssociatedTokenAddressSync(baseTokenMint, client.provider.publicKey, true)
  const quoteTokenAccount = getAssociatedTokenAddressSync(quoteTokenMint, client.provider.publicKey, true)
  let baseTokenBalance: RpcResponseAndContext<TokenAmount> | undefined; // TODO: Tisk Tisk
  try {
    // TODO: Return balance here from this function...
    baseTokenBalance = await client.provider.connection.getTokenAccountBalance(baseTokenAccount)
  } catch(err){
    console.error(err)
    console.error('No balance found')
  }
  if(!baseTokenBalance || baseTokenBalance.value.uiAmount === 0){
    console.log(`No balance located for Base Conditional Token`)
    
    const baseCondTokensTx = await client.vaultClient.mintConditionalTokens(proposal.account.baseVault, baseAmountToMint)
    console.log(`Minted ${baseAmountToMint} Base Conditional Tokens ${baseCondTokensTx}`)
  }

  let quoteTokenBalance: RpcResponseAndContext<TokenAmount> | undefined; // TODO: Tisk Tisk

  try {
    // TODO: Return balance here from this function...
    quoteTokenBalance = await client.provider.connection.getTokenAccountBalance(quoteTokenAccount)
  } catch(err){
    console.error('No balance found')
  }

  if(!quoteTokenBalance || quoteTokenBalance.value.uiAmount === 0){
    console.log(`No balance located for Quote Conditional Token`)
    const quoteCondTokensTx = await client.vaultClient.mintConditionalTokens(proposal.account.quoteVault, quoteAmountToMint)
    console.log(`Minted ${quoteAmountToMint} Quote Conditional Tokens ${quoteCondTokensTx}`)
  }
}

const main = async() => {
  // SWAP (Simulate trading environment)
  console.log('Swaping')

  const pendingProposals = await getPendingProposals(client)

  if (pendingProposals.length === 0) {
    console.log('No proposals found')
    return
  }

  console.log('Found ', pendingProposals.length, ' proposals')

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
      await mintConditionalTokens(baseRevert, quoteRevert, baseAmountToMint, quoteAmountToMint, proposal)
      await mintConditionalTokens(baseFinalize, quoteFinalize, baseAmountToMint, quoteAmountToMint, proposal)
    } catch(err) {
      console.error(err)
    }
  })
  
  // NOTE: This is fetching all active proposals and their AMMs 
  const proposalAmm = fetchAllAmmsFromProposals(pendingProposals)
  
  proposalAmm.map((proposal) => {
    setTimeout(async () => {
      // TODO: We should refactor this.
      const dao = await client.getDao(proposal.daoKey)
      console.log(`Swapping with Fail ${proposal.failAmm.toBase58()}`)
      console.log(`Swapping with Pass ${proposal.passAmm.toBase58()}`)
      try {
        // Buy fail amm
        await swap('buy', proposal.failAmm, dao)
        // Buy pass amm
        await swap('buy', proposal.passAmm, dao)
        // Sell fail amm
        await swap('sell', proposal.failAmm, dao)
        // Sell pass amm
        await swap('sell', proposal.passAmm, dao)
      } catch (err) {
        console.error(err)
      }
    }, 2000)
  })

  setTimeout(() => {main();}, 30000)
  
}

main()