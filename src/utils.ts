import * as anchor from "@coral-xyz/anchor";
import { AutocratClient } from "@metadaoproject/futarchy";
import { PublicKey } from '@solana/web3.js';

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

export const getPendingProposals = async(_client) => {
  const proposals = await _client.autocrat.account.proposal.all();

  const pendingProposals = proposals.filter((proposal) => {
    return proposal.account.state.pending
  });

  return pendingProposals;
}