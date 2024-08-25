import { createClient } from './utils'
import { PublicKey } from '@solana/web3.js';

const main = async() => {
  const _client = createClient();
  // Initialize DAO
  try {
    const dao = await _client.initializeDao(
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