// File: src/runRagequit.ts

import fs from "fs";
import { createClient, provider, USDC_MINT } from "./lib/utils";
import { PublicKey } from "@solana/web3.js";
import { fetchPriceFromJup } from "./lib/trading";
import { PriceMath } from "@metadaoproject/futarchy/v0.3";
import {
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RagequitConfig {
  proposal: string; // Proposal ID chosen by the user.
  sellPercentage: number; // Percentage of base token balance to sell.
  priceDeviation: number; // Minimum % price deviation (spot vs. fail market) required.
}

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
  // Read configuration from ragequit.config.json.
  let config: RagequitConfig;
  try {
    const configData = fs.readFileSync("ragequit.config.json", "utf8");
    config = JSON.parse(configData);
  } catch (err) {
    console.error(
      "Error reading config file. Ensure 'ragequit.config.json' exists and contains valid JSON."
    );
    process.exit(1);
  }
  if (!config.proposal || !config.sellPercentage || !config.priceDeviation) {
    console.error(
      "Config file missing required fields: proposal, sellPercentage, or priceDeviation."
    );
    process.exit(1);
  }

  const client = createClient();
  const proposals = await client.autocrat.account.proposal.all();
  const activeProposals = proposals.filter(
    (proposal: any) => proposal.account.state.pending
  );
  const selectedProposal = activeProposals.find(
    (proposal: any) => proposal.publicKey.toBase58() === config.proposal
  );

  if (!selectedProposal) {
    console.error("Selected proposal not found among active proposals.");
    process.exit(1);
  }

  // Retrieve DAO info and wallet's base token balance.
  const dao = await client.getDao(selectedProposal.account.dao);
  const baseTokenMint = dao.tokenMint;
  const baseBalance = await getTokenBalance(baseTokenMint);
  if (baseBalance === null) {
    console.error("Unable to retrieve base token balance.");
    process.exit(1);
  }
  const sellAmount = (config.sellPercentage / 100) * baseBalance;

  console.log("Ragequit Bot Config Summary:");
  console.log(`Selected Proposal: ${selectedProposal.publicKey.toBase58()}`);
  console.log(`DAO: ${selectedProposal.account.dao.toBase58()}`);
  console.log(`Sell Percentage: ${config.sellPercentage}%`);
  console.log(`Calculated Sell Amount (Base Tokens): ${sellAmount}`);
  console.log(`Price Deviation Threshold: ${config.priceDeviation}%`);
  console.log("----------------------------------------------------");
  console.log("Starting market monitoring... (Press Ctrl+C to exit)");

  while (true) {
    // Fetch the current Jupiter spot price for the base token.
    const currentSpotPrice = await fetchPriceFromJup(baseTokenMint.toBase58());

    // Fetch fail market AMM details.
    let failAmm;
    try {
      failAmm = await client.ammClient.getAmm(selectedProposal.account.failAmm);
    } catch (err) {
      console.error("Error fetching fail market AMM:", err);
      await sleep(30000);
      continue;
    }
    const failPriceRaw = PriceMath.getAmmPriceFromReserves(
      failAmm.baseAmount,
      failAmm.quoteAmount
    );
    // Assuming USDC uses 6 decimals.
    const humanFailPrice = failPriceRaw.toNumber() / 10 ** 6;
    // Calculate the percentage difference between spot and fail prices.
    const percDifference =
      ((currentSpotPrice - humanFailPrice) / currentSpotPrice) * 100;

    console.clear();
    console.log("Current Market Data:");
    console.log(`Jupiter Spot Price: ${currentSpotPrice}`);
    console.log(`Fail Market Price: ${humanFailPrice}`);
    console.log(`Price Difference: ${percDifference.toFixed(2)}%`);

    if (percDifference >= config.priceDeviation) {
      console.log("Market condition met: Price deviation threshold reached.");
      console.log(
        `Bot would execute trade: Sell ${sellAmount} base tokens on Jupiter and buy on the fail market.`
      );
      // Place your trade execution logic here.
    } else {
      console.log("Market condition not met. No trade executed.");
    }

    console.log("Next update in 30 seconds...");
    await sleep(30000);
  }
};

main().catch((err) => {
  console.error(err);
});
