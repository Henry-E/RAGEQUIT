import { MEMO_PROGRAM_ID } from "@solana/spl-memo";
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
  // Create Proposal
  const daoKey = new PublicKey('33Pi6Dxur8Q87K7DmG8JAdZoiTwSRi2HCP6ZjLAPn2sE')
  const dao = await newClient.getDao(daoKey);
  const base = dao.minBaseFutarchicLiquidity
  const quote = dao.minQuoteFutarchicLiquidity
  console.log(provider.publicKey.toBase58())
  console.log(dao)
  console.log(base.toNumber() / Math.pow(10, 9))
  console.log(quote.toNumber() / Math.pow(10, 6))
  const createMemoIx = {
    programId: new PublicKey(MEMO_PROGRAM_ID),
    accounts: [],
    data: Buffer.from('Another Way To A Biking Day'),
  };
  
  let i = 'mtn-bike-me';
  try{
    const prop = await newClient.initializeProposal(
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