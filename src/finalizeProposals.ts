import * as anchor from "@coral-xyz/anchor";
import { AutocratClient } from "@metadaoproject/futarchy";
import { PublicKey } from '@solana/web3.js';

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const main = async() => {
  const AUTOCRAT_PROGRAM_ID = new PublicKey("autoQP9RmUNkzzKRXsMkWicDVZ3h29vvyMDcAYjCxxg")
  const CONDITIONAL_VAULT_PROGRAM_ID = new PublicKey("VAU1T7S5UuEHmMvXtXMVmpEoQtZ2ya7eRb7gcN47wDp")
  const AMM_PROGRAM_ID = new PublicKey("AMM5G2nxuKUwCLRYTW7qqEwuoqCtNSjtbipwEmm2g8bH")

  const newClient = new AutocratClient(provider, AUTOCRAT_PROGRAM_ID, CONDITIONAL_VAULT_PROGRAM_ID, AMM_PROGRAM_ID, []);

  const proposals = [
    new PublicKey('GXxqbxYYb5kdbQgcicViXyfYHvhPqErYWLLbguqDv4LJ'),
    new PublicKey('6Ag5B9LQfdrd2b94uwRQ1YUU6L7sLUdZNp7pKczZ2xsY'),
    new PublicKey('hEoj5ca54sU14MD3QqmKp734h7EgiuoPqyeWkBTUDr1'),
    new PublicKey('2PdCKJJFaFddxhZ7RoKR1QPFPebWW2qRh45oipYekgBM'),
    new PublicKey('AczntXRrBFn3epMVAnGTwb4fYrzcCPETd7JU8jnGpFJo'),
    new PublicKey('4eBBafsLqt952WCwJgTDo9k3XJrLQSfaAepjYL8ZNNTh'),
    new PublicKey('FDkBMuhWoMwEm1SfXvuDhcmdtE2w6yuUtAF6bDhZRYzi'),
    new PublicKey('38HWQNi7GtnaqLZ2G2Jt1XvArNLPQatJqtsEHUokLizc'),
    new PublicKey('Hy8qo5qg5ThAnJoiVAV2nD2aMaarDpJukMckhCabTr3n'),
    new PublicKey('6iQV5rGwazbC1HwpBWHy8wFsysAGwdtFExqQxtKuf5cP'),
    new PublicKey('8rWCzya6irW5oEpjLeEwYhb44v9YgiTUA1uagJAtQmAS'),
    new PublicKey('BUUwLxVFhBZUkQWPm1d91GCfH1pbjX2dT5B5jujoPaFB'),
    new PublicKey('J8yuXR3n6DmURya1oUqoP4hHPFPHDbkAo1cPnU5nZny9'),
    new PublicKey('51sCz3pEXCSePBiHpqJFennMa1QJShY4ykie41UnnZFi'),
    new PublicKey('9d4ZdtfeK3UWoRnwgE9teBeSgTAngrGsEwS4WnMSo2aY'),
  ]

  //Finalize Proposal
  proposals.map(async (proposal) => {
    try {
      const proposalAccount = await newClient.getProposal(proposal)
      const passMarket = proposalAccount.passAmm
      const failMarket = proposalAccount.failAmm
      await newClient.ammClient.crankThatTwap(passMarket)
      await newClient.ammClient.crankThatTwap(failMarket)
      console.log(`Finalizing Proposal ${proposal.toBase58()}`)
      const finalizeTxn = await newClient.finalizeProposal(proposal)
      console.log(`txn: ${finalizeTxn}`)
    } catch (err) {
      console.error(err)
    }
  })
}

main()