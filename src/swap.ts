import * as anchor from "@coral-xyz/anchor";
import { AutocratClient, SwapType } from "@metadaoproject/futarchy";
import { BN } from "bn.js";
import { PublicKey } from '@solana/web3.js';

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const main = async() => {
  
  const AUTOCRAT_PROGRAM_ID = new PublicKey("autoQP9RmUNkzzKRXsMkWicDVZ3h29vvyMDcAYjCxxg")
  const CONDITIONAL_VAULT_PROGRAM_ID = new PublicKey("VAU1T7S5UuEHmMvXtXMVmpEoQtZ2ya7eRb7gcN47wDp")
  const AMM_PROGRAM_ID = new PublicKey("AMM5G2nxuKUwCLRYTW7qqEwuoqCtNSjtbipwEmm2g8bH")

  const newClient = new AutocratClient(provider, AUTOCRAT_PROGRAM_ID, CONDITIONAL_VAULT_PROGRAM_ID, AMM_PROGRAM_ID, []);
  console.log(provider.publicKey.toBase58())
  // SWAP (Simulate trading environment)
  console.log('Swaping')

  const proposalKey = new PublicKey('7wn2uLx4Rgaz5GDsKVw3fEJxXmbTWGxdpyUHPUXoaWjr')

  const amms = [
    new PublicKey('CwwXQQnC2Y46iUNZgUdxpBhWyekWANAgxZWJKf4tAT5d'),
    new PublicKey('CoZq7BFsXwv5srUYQPFHK3uE3aZrGdZgK5Q1ixcsmoDM')
  ]

  // TODO: Fetch balances of the conditional tokens, if none or not enough exist then call this
  
  // Mint conditional tokens
  if(false){
    const proposal = await newClient.autocrat.account.proposal.fetch(proposalKey)
    const baseCondTokensTx = await newClient.vaultClient.mintConditionalTokens(proposal.baseVault, 3)
    const quoteCondTokensTx = await newClient.vaultClient.mintConditionalTokens(proposal.quoteVault, 3000)
    console.log(baseCondTokensTx)
    console.log(quoteCondTokensTx)
    }
  
  const swap = async(direction, amm) => {
    let swapType = {buy: {}} as SwapType
    let swapAmount = new BN(1).mul(new BN(10).pow(new BN(6)))
    let _swapAmount = Math.floor(Math.random() * (700 - 100) + 100);
    if (direction == 'sell') {
      swapType = {sell: {}} as SwapType
      swapAmount = new BN(1).mul(new BN(10).pow(new BN(9)))
      _swapAmount = Math.random() * (3 - 1) + 1; // Amount we're trading
    }
    
    console.log(swapType)
    const ammReserves = await newClient.ammClient.getAmm(amm)
    const swapSim = newClient.ammClient.simulateSwap(
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
      const swapTxn = await newClient.ammClient.swap(amm, swapType, _swapAmount, _outputAmount)
      console.log(swapTxn)
      return swapTxn
    } catch (err){
      console.error(err)
      return err;
    }
  }
  
  amms.map((amm) => {
    setTimeout(async () => {
      console.log(`Swapping with ${amm.toBase58()}`)
      try {
        // Buy
        await swap('buy', amm)
        // Sell
        await swap('sell', amm)
      } catch (err) {
        console.error(err)
      }
    }, 2000)
  })

  setTimeout(() => {main();}, 30000)
  
}

main()