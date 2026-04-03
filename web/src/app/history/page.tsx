"use client";

import Link from "next/link";
import { AppChrome } from "@/components/layout/AppChrome";
import { GlassCard } from "@/components/ui/GlassCard";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { useRippleData } from "@/hooks/useRippleData";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/constants";
import { lamportsToSol } from "@/lib/purchase";

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const { purchases: allPurchases, products } = useRippleData();

  const purchases = publicKey
    ? allPurchases.filter((p) => p.buyerWallet === publicKey.toBase58())
    : [];

  return (
    <AppChrome>
      <div className="mx-auto max-w-3xl px-4 py-12 fade-in">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Transaction history</h1>
            <p className="text-[var(--muted)]">Purchases made with your wallet.</p>
          </div>
          <WalletButton />
        </div>

        {!publicKey ? (
          <GlassCard className="p-8 text-center text-[var(--muted)]">
            Connect Phantom to see your purchase history.
          </GlassCard>
        ) : purchases.length === 0 ? (
          <GlassCard className="p-8 text-center text-[var(--muted)]">
            No purchases yet.{" "}
            <Link href="/discover" className="font-semibold text-[var(--ink)] underline">
              Discover products
            </Link>
            .
          </GlassCard>
        ) : (
          <ul className="space-y-3">
            {purchases.map((p) => {
              const prod = products.find((x) => x.id === p.productId);
              const explorerHref = p.txSignature
                ? explorerTxUrl(p.txSignature)
                : p.recordPda
                  ? explorerAddressUrl(p.recordPda)
                  : null;
              return (
                <li key={p.id}>
                  <GlassCard className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-[var(--ink)]">
                        {prod?.title ?? "Unknown product"}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {lamportsToSol(p.amountLamports)} SOL
                        {p.createdAt ? (
                          <> · {new Date(p.createdAt).toLocaleString()}</>
                        ) : (
                          " · On-chain"
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      {explorerHref ? (
                        <a
                          href={explorerHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--purple)] underline"
                        >
                          View on Explorer
                        </a>
                      ) : null}
                      {prod ? (
                        <Link
                          href={`/p/${prod.id}`}
                          className="text-sm text-[var(--muted)] hover:underline"
                        >
                          Open product →
                        </Link>
                      ) : null}
                    </div>
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppChrome>
  );
}
