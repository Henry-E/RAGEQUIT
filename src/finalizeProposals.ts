import { createClient, getPendingProposals } from './lib/utils'

const main = async() => {
  
  const _client = createClient();

  const pendingProposals = await getPendingProposals(_client);

  //Finalize Proposal
  pendingProposals.map(async (proposal) => {
    try {
      console.log(`Found Pending Proposal ${proposal.publicKey.toBase58()}`)
      const proposalAccount = await _client.getProposal(proposal.publicKey)
      const passMarket = proposalAccount.passAmm
      const failMarket = proposalAccount.failAmm
      console.log(`Cranking Pass Market`)
      await _client.ammClient.crankThatTwap(passMarket)
      console.log(`Cranking Fail Market`)
      await _client.ammClient.crankThatTwap(failMarket)
      console.log(`Finalizing Proposal ${proposal.publicKey.toBase58()}`)
      const finalizeTxn = await _client.finalizeProposal(proposal.publicKey)
      console.log(`Signature: ${finalizeTxn}`)
    } catch (err) {
      console.error(err)
    }
  })
}

main()