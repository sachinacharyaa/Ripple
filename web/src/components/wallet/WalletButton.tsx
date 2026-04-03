"use client";

import { useWallet } from "@/contexts/WalletContext";

function shortAddr(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function WalletButton() {
  const { publicKey, connecting, connect, disconnect } = useWallet();

  if (publicKey) {
    return (
      <button
        type="button"
        className="btn-wallet-connected"
        onClick={() => void disconnect()}
      >
        {shortAddr(publicKey.toBase58())}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-wallet"
      disabled={connecting}
      onClick={() => void connect().catch(() => {})}
    >
      {connecting ? "Connecting…" : "Connect Phantom"}
    </button>
  );
}
