import { PublicKey } from "@solana/web3.js";

const PLACEHOLDER = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

/** When set to your deployed program id, the app uses on-chain data + IPFS metadata. */
export function getProgramId(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_RIPPLE_PROGRAM_ID?.trim();
  if (!raw || raw === PLACEHOLDER) return null;
  try {
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

export function isChainMode(): boolean {
  return getProgramId() !== null;
}
