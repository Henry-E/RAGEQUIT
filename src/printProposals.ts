// File: src/printProposals.ts

import { createClient, provider, USDC_MINT } from "./lib/utils";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { fetchPriceFromJup } from "./lib/trading";

// Helper to fetch token balance for a given mint.
const getTokenBalance = async (
  tokenMint: PublicKey
): Promise<number | null> => {
  const tokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    provider.publicKey,
    true
  );
  try {
    const accountInfo = await provider.connection.getAccountInfo(tokenAccount);
    const mintInfo = await provider.connection.getAccountInfo(tokenMint);
    if (!accountInfo || !mintInfo) return null;
    const tokenData = unpackAccount(tokenAccount, accountInfo);
    const decimals = unpackMint(tokenMint, mintInfo).decimals;
    return Number(tokenData.amount) / 10 ** decimals;
  } catch (err) {
    console.error(`Error fetching balance for ${tokenMint.toBase58()}:`, err);
    return null;
  }
};

const main = async () => {
  const client = createClient();
  // Fetch all proposals and filter for active (pending) ones.
  const proposals = await client.autocrat.account.proposal.all();
  const activeProposals = proposals.filter(
    (proposal: any) => proposal.account.state.pending
  );

  if (activeProposals.length === 0) {
    console.log("No active proposals found.");
    return;
  }

  console.log("Active Proposals:\n");
  for (let i = 0; i < activeProposals.length; i++) {
    const proposal = activeProposals[i];
    console.log(`Proposal ${i}:`);
    console.log(`Proposal ID: ${proposal.publicKey.toBase58()}`);
    console.log(`DAO: ${proposal.account.dao.toBase58()}`);
    // Fetch DAO details.
    const dao = await client.getDao(proposal.account.dao);
    console.log(`DAO Details:`);
    console.log(`  DAO Token Mint (Base): ${dao.tokenMint.toBase58()}`);

    // Spot balances for the wallet.
    const baseBalance = await getTokenBalance(dao.tokenMint);
    const quoteBalance = await getTokenBalance(new PublicKey(USDC_MINT));
    console.log(`Spot Balances for wallet ${provider.publicKey.toBase58()}:`);
    console.log(
      `  Base Token Balance: ${baseBalance !== null ? baseBalance : "Not found"}`
    );
    console.log(
      `  Quote Token Balance (USDC): ${quoteBalance !== null ? quoteBalance : "Not found"}`
    );

    // Jupiter-quoted price for the base token.
    const jupiterPrice = await fetchPriceFromJup(dao.tokenMint.toBase58());
    console.log(`Jupiter Price for Base Token: ${jupiterPrice}`);
    console.log("----------------------------------------------------\n");
  }
};

main().catch((err) => {
  console.error(err);
});
