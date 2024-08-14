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
  // Initialize DAO
  try {
    const dao = await newClient.initializeDao(
      new PublicKey('9HRMrk8GLytqWvSbXs8FpJpsKgpf3mtX7Pqw4FtSxcuf'),
      0.001,
      1,
      100,
      new PublicKey('ABizbp4pXowKQJ1pWgPeWPYDfSKwg34A7Xy1fxTu7No9')
    )
    console.log(dao)
  } catch(err) {
    console.error(err)
  }
  return;
}

main()