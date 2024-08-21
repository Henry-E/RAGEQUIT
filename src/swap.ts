import * as anchor from "@coral-xyz/anchor";
import { SwapType } from "@metadaoproject/futarchy";
import { BN } from "bn.js";
import { createClient, getPendingProposals } from "./utils";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const fetchAmmsFromProposals = (pendingProposals) => {
  return pendingProposals.map((proposal) => {
    return {
      pubKey: proposal.pubKey,
      failAmm: proposal.failAmm,
      passAmm: proposal.passAmm,
    }
  })
}

const swap = async(_client, direction, amm) => {
  let swapType = {buy: {}} as SwapType
  let swapAmount = new BN(1).mul(new BN(10).pow(new BN(6)))
  let _swapAmount = Math.floor(Math.random() * (700 - 100) + 100);
  if (direction == 'sell') {
    swapType = {sell: {}} as SwapType
    swapAmount = new BN(1).mul(new BN(10).pow(new BN(9))) // The amount to trade
    _swapAmount = Math.random() * (3 - 1) + 1; // Amount we're trading
  }
  
  console.log(swapType)
  const ammReserves = await _client.ammClient.getAmm(amm)
  const swapSim = _client.ammClient.simulateSwap(
    swapAmount,
    swapType,
    ammReserves.baseAmount,
    ammReserves.quoteAmount,
    new BN(5000)
  )
  
  
  try {
    if(!swapSim.minExpectedOut) {
      console.log('simulation failed')
      return
    }
    let _outputAmount = swapSim.minExpectedOut.toNumber() / Math.pow(10, 6)
    if (direction === 'buy') {
      _outputAmount = swapSim.minExpectedOut.toNumber() / Math.pow(10, 9)
    }
    // console.log(swapSim.expectedOut.toNumber())
    console.log(`Swapping via ${direction} ${_swapAmount} for ${_outputAmount}`)
    const swapTxn = await _client.ammClient.swap(amm, swapType, _swapAmount, _outputAmount)
    console.log(swapTxn)
    return swapTxn
  } catch (err){
    console.error(err)
    return err;
  }
}

const main = async() => {
  // SWAP (Simulate trading environment)
  console.log('Swaping')

  const _client = createClient()

  const pendingProposals = await getPendingProposals(_client)

  // Mint conditional tokens
  const tokenAddresses = pendingProposals.map(async(proposal) => {
    const baseAmountToMint = 3; // TODO: Need to mint a reasonable amount
    const quoteAmountToMint = 3000; // TODO: Need to mint a reasonable amount
    const baseTokenAccount = getAssociatedTokenAddressSync(proposal.baseVault ,_client.provider.publicKey)
    const quoteTokenAccount = getAssociatedTokenAddressSync(proposal.quoteVault ,_client.provider.publicKey)

    const baseTokenBalance = await _client.provider.connection.getTokenAccountBalance(baseTokenAccount)

    if(!baseTokenBalance || baseTokenBalance.value.uiAmount === 0){
      console.log(`No balance located for Base Conditional Token`)
      const baseCondTokensTx = await _client.vaultClient.mintConditionalTokens(proposal.baseVault, baseAmountToMint)
      console.log(`Minted ${baseAmountToMint} Base Conditional Tokens ${baseCondTokensTx}`)
    }

    const quoteTokenBalance = await _client.provider.connection.getTokenAccountBalance(quoteTokenAccount)
    if(!quoteTokenBalance || quoteTokenBalance.value.uiAmount === 0){
      console.log(`No balance located for Quote Conditional Token`)
      const quoteCondTokensTx = await _client.vaultClient.mintConditionalTokens(proposal.quoteVault, quoteAmountToMint)
      console.log(`Minted ${quoteAmountToMint} Quote Conditional Tokens ${quoteCondTokensTx}`)
    }
    
  })
  
  // NOTE: This is fetching all active proposals and their AMMs 
  const proposalAmm = fetchAmmsFromProposals(pendingProposals)
  
  proposalAmm.map((proposal) => {
    setTimeout(async () => {
      // TODO: We should refactor this.
      console.log(`Swapping with Fail ${proposal.failAmm.toBase58()}`)
      console.log(`Swapping with Pass ${proposal.passAmm.toBase58()}`)
      try {
        // Buy
        await swap(_client, 'buy fail', proposal.failAmm)
        await swap(_client, 'buy pass', proposal.passAmm)
        // Sell
        await swap(_client, 'sell fail', proposal.failAmm)
        await swap(_client, 'sell pass', proposal.passAmm)
      } catch (err) {
        console.error(err)
      }
    }, 2000)
  })

  setTimeout(() => {main();}, 30000)
  
}

main()