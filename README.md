# RAGEQUIT your DAO

## Strategy Overview

The most effective way to ensure a proposal fails is to keep the fail market price within a certain threshold of the spot price, usually 3%. This bot sells DAO tokens on the spot market and uses the cash to purchase those tokens back at a discount on the fail market. The user can specify what percentage of their tokens they want to sell and the minimum price difference they require to execute trades.

## Project Overview

This project provides a template for a Ragequit Bot that interacts with MetaDAO proposals on Solana. The project consists of two main scripts:

1. **Print Active Proposals** – Lists all live (active) proposals along with your wallet's spot balances and the current Jupiter-quoted price for your base token.
2. **Run Ragequit Bot** – Reads a configuration file with your selected proposal, desired sell percentage, and price deviation threshold, then monitors market conditions and (in a real bot) would execute trades when conditions are met.

Follow the steps below to set up and run the bot.

## 1. Install Dependencies

Run the following command in your project directory:

```bash
bun install
```

## 2. Create Environment File

Create a file named **.env** in the project root with the following content:

```env
ANCHOR_PROVIDER_URL="https://api.mainnet-beta.solana.com"
ANCHOR_WALLET="/path/to/your/wallet/keyfile.json"
```

After creating the file, load the environment variables by running:

```bash
source .env
```

## 3. Print Active Proposals

This script will list all live proposals along with details such as:

- Proposal ID
- DAO address and base token mint
- Your wallet’s spot balances for the base token and USDC
- The current Jupiter-quoted price for the base token

Run the script using:

```bash
bun run print-proposals
```

Review the output and note the Proposal IDs that you may want to target for your ragequit.

## 4. Configure Your Ragequit Bot

A template configuration file is provided. Copy the template file to create your own configuration file:

```bash
cp ragequit.config.template.json ragequit.config.json
```

Open **ragequit.config.json** and fill in the following fields:

- **proposal**: The Proposal ID you want to target (as shown by the first script).
- **sellPercentage**: The percentage of your base token balance you wish to sell (e.g., 10 for 10%).
- **priceDeviation**: The minimum percentage price deviation between Jupiter’s spot price and the fail market price that will trigger a trade (e.g., 3).

Your configuration file should look similar to this:

```json
{
  "proposal": "Enter the Proposal ID here",
  "sellPercentage": 10,
  "priceDeviation": 3
}
```

## 5. Run the Ragequit Bot

After setting up your configuration, start the bot with:

```bash
bun run src/runRagequit.ts
```

The bot will monitor market conditions every 30 seconds. When the fail market price is sufficiently below the spot price (based on your configured deviation), it will log that trade conditions are met.

## Notes

- **Wallet & RPC**: Ensure that your **.env** file is correctly configured with your mainnet RPC URL and wallet file path.
