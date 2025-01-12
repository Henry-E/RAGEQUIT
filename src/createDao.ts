import { createClient, provider } from './lib/utils'
import { ComputeBudgetProgram, Keypair, PublicKey } from '@solana/web3.js';
import { USDC_MINT, THREE_DAYS_IN_SLOTS } from './lib/utils'
import { unpackMint } from '@solana/spl-token';
import { MaxCUs, PriceMath, USDC_DECIMALS } from '@metadaoproject/futarchy/v0.3';
import { BN } from 'bn.js';

const DAO_TOKEN_MINT = new PublicKey("9HRMrk8GLytqWvSbXs8FpJpsKgpf3mtX7Pqw4FtSxcuf")

const main = async() => {
  const client = createClient();

  // NOTE: These values are in USD or normal human units...
  const currentBaseTokenPrice = 0.001
  const quoteLiquidity = 25_000 // NOTE: USDC
  const baseLiquidity = 13_850 / currentBaseTokenPrice // NOTE: This value should be somewhat elastic to price changes..

  let baseDecimals = unpackMint(
    DAO_TOKEN_MINT,
    await provider.connection.getAccountInfo(DAO_TOKEN_MINT)
  ).decimals;

  const SELECTED_PROPOSAL_DURATION = THREE_DAYS_IN_SLOTS

  const scaledPrice = PriceMath.getAmmPrice(
    currentBaseTokenPrice,
    baseDecimals,
    USDC_DECIMALS
  );

  const twapInitialObservation = scaledPrice

  const twapMaxObservationDeltaPerUpdate = scaledPrice.divn(50)

  const AMM_DECIMALS = 12 - Math.abs(USDC_DECIMALS - baseDecimals)

  const minQuoteFutarchicLiquidity = new BN(quoteLiquidity).mul(
    new BN(10).pow(new BN(USDC_DECIMALS))
  );
  const minBaseFutarchicLiquidity = new BN(baseLiquidity).mul(
    new BN(10).pow(new BN(baseLiquidity))
  );

  const daoKeypair = Keypair.generate();

  const passThresholdBps = 100

  const params = {
    twapInitialObservation: twapInitialObservation.toString(),
    twapMaxObservationChangePerUpdate: twapMaxObservationDeltaPerUpdate.toString(),
    minQuoteFutarchicLiquidity: minQuoteFutarchicLiquidity.toString(),
    minBaseFutarchicLiquidity: minBaseFutarchicLiquidity.toString(),
    passThresholdBps: passThresholdBps,
    slotsPerProposal: SELECTED_PROPOSAL_DURATION
  }
  const humanizedParams = {
    twapInitialObservation: `$${twapInitialObservation.toNumber() / 10 ** USDC_DECIMALS} USDC`,
    twapMaxObservationChangePerUpdate: `$${twapMaxObservationDeltaPerUpdate.toNumber() / 10 ** AMM_DECIMALS} USDC`,
    minQuoteFutarchicLiquidity: `$${minQuoteFutarchicLiquidity.toNumber() / 10 ** USDC_DECIMALS} USDC`,
    minBaseFutarchicLiquidity: `${minBaseFutarchicLiquidity.toNumber() / 10 ** baseDecimals} ${DAO_TOKEN_MINT.toBase58().slice(0, 3)}`,
    passThresholdPct: `${passThresholdBps / 100}%`,
    slotsInDays: `${SELECTED_PROPOSAL_DURATION / 216_000} days`
  }
  console.log(params);
  console.log(humanizedParams);

  // Sleep for review
  console.log("Sleeping for 60s, press ctrl + c to cancel");
  await new Promise((f) => setTimeout(f, 60000));
  
  // Initialize DAO
  try {
    const createDaoIx = client.initializeDaoIx(
      daoKeypair,
      DAO_TOKEN_MINT,
      {
      twapInitialObservation,
      twapMaxObservationChangePerUpdate: twapMaxObservationDeltaPerUpdate,
      minQuoteFutarchicLiquidity,
      minBaseFutarchicLiquidity,
      passThresholdBps: passThresholdBps,
      slotsPerProposal: new BN(SELECTED_PROPOSAL_DURATION)
    }
    )

    const tx = await createDaoIx.postInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({
          units: MaxCUs.initializeDao,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 10_000,
      }),
    ]).rpc()
  
    console.log(tx)
    console.log(daoKeypair.publicKey.toBase58())
  } catch(err) {
    console.error(err)
  }
  return;
}

main()