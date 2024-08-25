import * as anchor from "@coral-xyz/anchor";
import { createClient, getPendingProposals } from "./utils";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const main = async() => {
  const _client = createClient()

  const proposals = await getPendingProposals(_client)
  // Crank TWAP
  try {
    console.log('cranking')
    // This cranks constantly, may want to adjust if you want to only run once.
    const crankTxn = await _client.crankProposalMarkets(proposals, 1)
    console.log(crankTxn);
    console.log('cranking done');
  } catch(e) {
    console.error(e)
    main()
  }
}

main()