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
}: PaymentParams): Promise<{
  creatorSignature: string;
  feeSignature: string;
}> {
  if (!wallet.publicKey) {
    throw new Error("Connect wallet first");
  }

  const creatorPubKey = new PublicKey(creatorAddress);
  const platformPubKey = new PublicKey(platformAddress);

  const priceLamports = Math.round(productPriceSol * LAMPORTS_PER_SOL);
  const feeLamports = Math.round(priceLamports * 0.01);

  const tx1 = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: creatorPubKey,
      lamports: priceLamports,
    }),
  );

  const tx2 = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: platformPubKey,
      lamports: feeLamports,
    }),
  );

  const signature1 = await wallet.sendTransaction(tx1, connection, {
    skipPreflight: false,
  });
  await connection.confirmTransaction(signature1, "processed");

  const signature2 = await wallet.sendTransaction(tx2, connection, {
    skipPreflight: false,
  });
  await connection.confirmTransaction(signature2, "processed");

  return { creatorSignature: signature1, feeSignature: signature2 };
}
