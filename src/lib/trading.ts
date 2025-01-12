import { ProposalAmmsDao } from "./types";

export const fetchAllAmmsFromProposals = (pendingProposals: any): ProposalAmmsDao[] => {
  return pendingProposals.map((proposal) => {
    return {
      daoKey: proposal.account.dao,
      pubKey: proposal.publicKey,
      failAmm: proposal.account.failAmm,
      passAmm: proposal.account.passAmm,
    }
  })
}