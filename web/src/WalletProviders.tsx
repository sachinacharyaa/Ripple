import { type ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";

function rpcEndpoint() {
  const custom = import.meta.env.VITE_SOLANA_RPC;
  if (custom) return custom;
  const net = import.meta.env.VITE_SOLANA_NETWORK;
  if (net === "mainnet-beta") return clusterApiUrl(WalletAdapterNetwork.Mainnet);
  return clusterApiUrl(WalletAdapterNetwork.Devnet);
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={rpcEndpoint()}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
