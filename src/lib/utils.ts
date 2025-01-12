import * as anchor from "@coral-xyz/anchor";
import { AutocratClient } from "@metadaoproject/futarchy/v0.3";
import { PublicKey } from '@solana/web3.js';
import { unpackMint } from "@solana/spl-token";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const createClient = () => {
  console.log(`Initalizing client with: ${provider.publicKey.toBase58()}`)
  console.log(`Utilizing RPC url: ${provider.connection.rpcEndpoint}`)
  const AUTOCRAT_PROGRAM_ID = new PublicKey("autoQP9RmUNkzzKRXsMkWicDVZ3h29vvyMDcAYjCxxg")
  const CONDITIONAL_VAULT_PROGRAM_ID = new PublicKey("VAU1T7S5UuEHmMvXtXMVmpEoQtZ2ya7eRb7gcN47wDp")
  const AMM_PROGRAM_ID = new PublicKey("AMM5G2nxuKUwCLRYTW7qqEwuoqCtNSjtbipwEmm2g8bH")

  const newClient = new AutocratClient(provider, AUTOCRAT_PROGRAM_ID, CONDITIONAL_VAULT_PROGRAM_ID, AMM_PROGRAM_ID, []);

  return newClient;
}

export const getPendingProposals = async(client) => {
  const proposals = await client.autocrat.account.proposal.all();

  const pendingProposals = proposals.filter((proposal) => {
    return proposal.account.state.pending
  });

  return pendingProposals;
}

export const getTokenDecimals = async(mint: string) => {
  try{
    const tokenData = await provider.connection.getAccountInfo(new PublicKey(mint))
    const mintData = unpackMint(new PublicKey(mint), tokenData)
    return mintData.decimals
  } catch (err) {
    console.error(err)
  }
}

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

export const ONE_DAY_IN_SLOTS = 216_000
export const TWO_DAYS_IN_SLOTS = 432_000
export const THREE_DAYS_IN_SLOTS = 648_000
export const FIVE_DAYS_IN_SLOTS = 1_080_000