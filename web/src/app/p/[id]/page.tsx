"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { AppChrome } from "@/components/layout/AppChrome";
import { GlassCard } from "@/components/ui/GlassCard";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { useRippleData } from "@/hooks/useRippleData";
import { phantomToWallet, purchaseOnChain } from "@/lib/chain";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/constants";
import { lamportsToSol, payCreator } from "@/lib/purchase";
import { recordPurchase } from "@/lib/store";
import type { Purchase } from "@/types/product";

export default function ProductPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { publicKey, provider } = useWallet();
  const { products, purchases, chainMode } = useRippleData();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const product = useMemo(
    () => products.find((p) => p.id === id),
    [products, id]
  );

  const purchaseHit = useMemo(() => {
    if (!publicKey || !product) return null;
    return purchases.find(
      (p) =>
        p.productId === product.id && p.buyerWallet === publicKey.toBase58()
    );
  }, [publicKey, product, purchases]);

  const unlocked = useMemo(() => {
    if (!publicKey || !product) return false;
    if (publicKey.toBase58() === product.creatorWallet) return true;
    return purchases.some(
      (p) =>
        p.productId === product.id && p.buyerWallet === publicKey.toBase58()
    );
  }, [publicKey, product, purchases]);

  async function onBuy() {
    setMsg(null);
    if (!product || !provider?.publicKey) {
      setMsg("Connect Phantom to purchase.");
      return;
    }
    if (publicKey?.toBase58() === product.creatorWallet) {
      setMsg("You are the creator — share this link with buyers.");
      return;
    }
    setBusy(true);
    try {
      if (chainMode) {
        const wallet = phantomToWallet(provider);
        const sig = await purchaseOnChain(wallet, new PublicKey(product.id));
        setLastTx(sig);
        window.dispatchEvent(new CustomEvent("ripple-chain"));
        setMsg("Payment confirmed on-chain. Access unlocked below.");
      } else {
        const sig = await payCreator(
          provider,
          product.creatorWallet,
          product.priceLamports
        );
        const purchase: Purchase = {
          id: crypto.randomUUID(),
          productId: product.id,
          buyerWallet: publicKey!.toBase58(),
          creatorWallet: product.creatorWallet,
          txSignature: sig,
          amountLamports: product.priceLamports,
          createdAt: Date.now(),
        };
        recordPurchase(purchase);
        setLastTx(sig);
        setMsg("Payment confirmed. Access unlocked below.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  const proofTx = lastTx || purchaseHit?.txSignature || "";
  const proofRecord = purchaseHit?.recordPda;

  if (!product) {
    return (
      <AppChrome>
        <div className="mx-auto max-w-lg px-4 py-24 text-center fade-in">
          <GlassCard className="p-8">
            <p className="text-[var(--muted)]">Product not found.</p>
            <Link
              href="/discover"
              className="mt-4 inline-block font-semibold text-[var(--ink)] underline"
            >
              Back to Discover
            </Link>
          </GlassCard>
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-xl px-4 py-12 fade-in">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/discover"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            ← Discover
          </Link>
          <WalletButton />
        </div>
        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-[rgba(17,17,17,0.08)] bg-gradient-to-br from-[rgba(153,69,255,0.12)] to-transparent px-6 py-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--purple)]">
              {lamportsToSol(product.priceLamports)} SOL
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">
              {product.title}
            </h1>
            <p className="mt-3 text-[var(--muted)]">{product.description}</p>
          </div>
          <div className="space-y-4 px-6 py-6">
            {unlocked ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
                  Your access
                </p>
                <a
                  href={product.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[var(--purple)] underline underline-offset-2"
                >
                  {product.contentUrl}
                </a>
                {product.contentHash ? (
                  <p className="mt-3 font-mono text-xs text-[var(--muted)]">
                    Hash: {product.contentHash}
                  </p>
                ) : null}
                {proofTx ? (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Payment tx:{" "}
                    <a
                      className="text-[var(--purple)] underline"
                      href={explorerTxUrl(proofTx)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {proofTx.slice(0, 10)}…
                    </a>
                  </p>
                ) : proofRecord ? (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Purchase receipt:{" "}
                    <a
                      className="text-[var(--purple)] underline"
                      href={explorerAddressUrl(proofRecord)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {proofRecord.slice(0, 10)}…
                    </a>
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--muted)]">
                  {chainMode
                    ? "The program transfers exactly the listed price to the creator and records a purchase PDA."
                    : "Pay with SOL on devnet. The creator receives the transfer; this page unlocks after a successful transaction."}
                </p>
                <button
                  type="button"
                  className="btn-buy"
                  onClick={() => void onBuy()}
                  disabled={busy || !provider}
                >
                  {!provider
                    ? "Connect wallet to buy"
                    : busy
                      ? "Confirm in wallet…"
                      : `Buy for ${lamportsToSol(product.priceLamports)} SOL`}
                </button>
              </>
            )}
            {msg ? (
              <p className="text-sm text-[var(--muted)]" role="status">
                {msg}
              </p>
            ) : null}
          </div>
        </GlassCard>
      </div>
    </AppChrome>
  );
}
