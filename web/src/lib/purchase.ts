import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { PhantomProvider } from "@/types/phantom";
import { getConnection } from "./connection";

export function solToLamports(sol: number): number {
  if (!Number.isFinite(sol) || sol < 0) throw new Error("Invalid SOL amount");
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

/**
 * Sends SOL from the connected Phantom wallet to the creator.
 * On success, returns the transaction signature (explorer-verifiable on devnet).
 */
export async function payCreator(
  provider: PhantomProvider,
  creatorWallet: string,
  lamports: number
): Promise<string> {
  const connection = getConnection();
  const from = provider.publicKey;
  if (!from) throw new Error("Wallet not connected");

  const to = new PublicKey(creatorWallet);
  const fromPk = new PublicKey(from.toString());
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey: to,
      lamports,
    })
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPk;

  const signedUnknown = await provider.signTransaction(tx);
  const signed = signedUnknown as Transaction;
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return sig;
}
