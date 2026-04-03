export type Product = {
  id: string;
  /** `local` = browser storage; `chain` = program account + IPFS metadata */
  source?: "local" | "chain";
  creatorWallet: string;
  title: string;
  description: string;
  /** Price in lamports (1 SOL = 1e9 lamports) */
  priceLamports: number;
  /** IPFS, Arweave, or gated URL — shown only after purchase */
  contentUrl: string;
  /** Optional commitment to content (e.g. hash of file) */
  contentHash?: string;
  createdAt: number;
  /** On-chain metadata JSON URI (IPFS / HTTPS) */
  metadataUri?: string;
  /** On-chain product id (u64) used for PDA seeds */
  productIdU64?: string;
};

export type Purchase = {
  id: string;
  productId: string;
  buyerWallet: string;
  creatorWallet: string;
  txSignature: string;
  amountLamports: number;
  createdAt: number;
  /** On-chain purchase receipt PDA (explorer link when no tx sig) */
  recordPda?: string;
};
