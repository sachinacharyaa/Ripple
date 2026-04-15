import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export const RIPPLE_FEE_WALLET =
  "G6DKYcQnySUk1ZYYuR1HMovVscWjAtyDQb6GhqrvJYnw";

type PaymentParams = {
  connection: Connection;
  wallet: Pick<WalletContextState, "publicKey" | "sendTransaction">;
  productPriceSol: number;
  creatorAddress: string;
  platformAddress?: string;
};

export async function handlePayment({
  connection,
  wallet,
  productPriceSol,
  creatorAddress,
  platformAddress = RIPPLE_FEE_WALLET,
}: PaymentParams): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Connect wallet first");
  }

  const creatorPubKey = new PublicKey(creatorAddress);
  const platformPubKey = new PublicKey(platformAddress);

  const totalLamports = Math.round(productPriceSol * LAMPORTS_PER_SOL);
  const feeLamports = Math.floor(totalLamports * 0.01);
  const creatorLamports = totalLamports - feeLamports;

  // Build a single transaction with split payment transfers.
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: creatorPubKey,
      lamports: creatorLamports,
    }),
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: platformPubKey,
      lamports: feeLamports,
    }),
  );

  const latest = await connection.getLatestBlockhash();
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = wallet.publicKey;

  const signature = await wallet.sendTransaction(tx, connection, {
    skipPreflight: false,
  });
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");

  return signature;
}
