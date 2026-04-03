"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PublicKey } from "@solana/web3.js";
import type { PhantomProvider } from "@/types/phantom";

type WalletContextValue = {
  publicKey: PublicKey | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  provider: PhantomProvider | null;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const p = window.solana;
  if (p?.isPhantom) return p;
  return p ?? null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);

  const provider = useMemo(() => getPhantom(), []);

  useEffect(() => {
    if (!provider) return;
    const sync = () => {
      const pk = provider.publicKey;
      setPublicKey(pk ? new PublicKey(pk.toString()) : null);
    };
    sync();
    provider.on("accountChanged", (pk) => {
      setPublicKey(pk ? new PublicKey(pk.toString()) : null);
    });
  }, [provider]);

  const connect = useCallback(async () => {
    const p = getPhantom();
    if (!p) {
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      throw new Error("Install Phantom to connect.");
    }
    setConnecting(true);
    try {
      const { publicKey: pk } = await p.connect();
      setPublicKey(new PublicKey(pk.toString()));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const p = getPhantom();
    if (p) await p.disconnect();
    setPublicKey(null);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      publicKey,
      connecting,
      connect,
      disconnect,
      provider: getPhantom(),
    }),
    [publicKey, connecting, connect, disconnect]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
