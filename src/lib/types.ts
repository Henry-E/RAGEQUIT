import { PublicKey } from "@solana/web3.js";

export type ProposalAmmsDao = {
  daoKey: PublicKey;
  pubKey: PublicKey;
  failAmm: PublicKey;
  passAmm: PublicKey;
}