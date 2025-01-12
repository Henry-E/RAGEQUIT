import { MEMO_PROGRAM_ID } from "@solana/spl-memo";
import { PublicKey } from '@solana/web3.js';
import { createClient } from './lib/utils'


const main = async() => {

  const _client = createClient()
  // NOTE: You can see how this is done in https://github.com/metaDAOproject/futarchy/blob/develop/scripts/initializeProposal.ts
  
  // Create Proposal
  const daoKey = new PublicKey('33Pi6Dxur8Q87K7DmG8JAdZoiTwSRi2HCP6ZjLAPn2sE')
  const dao = await _client.getDao(daoKey);
  const base = dao.minBaseFutarchicLiquidity
  const quote = dao.minQuoteFutarchicLiquidity
  
  console.log(dao)
  console.log(base.toNumber() / Math.pow(10, 9))
  console.log(quote.toNumber() / Math.pow(10, 6))
  const createMemoIx = {
    programId: new PublicKey(MEMO_PROGRAM_ID),
    accounts: [],
    data: Buffer.from('Try It Again'),
  };
  
  let i = 'testing-testing';
  try{
    const prop = await _client.initializeProposal(
      daoKey,
      `https://metadao.fi/${i}`,
      createMemoIx,
      base,
      quote
    );
    console.log(prop);
  } catch (err) {
    console.error(err);
  }
}

main()