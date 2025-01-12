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

export const fetchPriceFromJup = async(mint: string) => {
  // {"data":{"METADDFL6wWMWEoKTFJwcThTbUmtarRJZjRpzUvkxhr":{"id":"METADDFL6wWMWEoKTFJwcThTbUmtarRJZjRpzUvkxhr","type":"derivedPrice","price":"1994.355333534"}},"timeTaken":0.003638043}
  const baseUrl = "https://api.jup.ag/price/v2?ids=";
  const url = `${baseUrl}${mint}`
  const response = await fetch(url)
  const data = await response.json()
  return data.data[mint].price
}