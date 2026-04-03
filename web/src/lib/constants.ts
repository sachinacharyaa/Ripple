import { clusterApiUrl, type Cluster } from "@solana/web3.js";

const RAW = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;

/** Devnet by default — set `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` for production. */
export const SOLANA_CLUSTER: Cluster =
  RAW === "mainnet-beta" || RAW === "testnet" || RAW === "devnet" ? RAW : "devnet";

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl(SOLANA_CLUSTER);

/** For `ipfs://…` metadata URIs in on-chain products. */
export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/$/, "") ??
  "https://ipfs.io/ipfs";

export const STORAGE_PRODUCTS = "ripple_v1_products";
export const STORAGE_PURCHASES = "ripple_v1_purchases";

export function explorerClusterParam(): string {
  if (SOLANA_CLUSTER === "mainnet-beta") return "";
  return `?cluster=${SOLANA_CLUSTER}`;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${explorerClusterParam()}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}${explorerClusterParam()}`;
}
