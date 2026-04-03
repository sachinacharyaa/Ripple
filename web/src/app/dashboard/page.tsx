"use client";

import Link from "next/link";
import { AppChrome } from "@/components/layout/AppChrome";
import { GlassCard } from "@/components/ui/GlassCard";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { useRippleData } from "@/hooks/useRippleData";
import { lamportsToSol } from "@/lib/purchase";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { products, purchases, chainError, loading } = useRippleData();

  const mine = publicKey
    ? products.filter((p) => p.creatorWallet === publicKey.toBase58())
    : [];

  const myIds = new Set(mine.map((m) => m.id));

  const earned = publicKey
    ? purchases
        .filter((p) => p.creatorWallet === publicKey.toBase58())
        .reduce((s, p) => s + p.amountLamports, 0)
    : 0;

  const totalSales = purchases.filter((p) => myIds.has(p.productId)).length;

  return (
    <AppChrome>
      <div className="mx-auto max-w-4xl px-4 py-12 fade-in">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Creator dashboard</h1>
            <p className="text-[var(--muted)]">
              Manage products and track earnings (local storage or on-chain purchases).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <WalletButton />
            <Link href="/dashboard/new" className="btn-dark">
              Create product
            </Link>
          </div>
        </div>

        {chainError ? (
          <GlassCard className="mb-6 border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
            {chainError}
          </GlassCard>
        ) : null}

        {!publicKey ? (
          <GlassCard className="p-8 text-center">
            <p className="text-[var(--muted)]">
              Connect Phantom to see your products and earnings.
            </p>
          </GlassCard>
        ) : loading ? (
          <div className="space-y-3">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <GlassCard className="p-6">
                <p className="text-sm font-medium text-[var(--muted)]">Earnings</p>
                <p className="mt-1 text-3xl font-black text-[var(--ink)]">
                  {lamportsToSol(earned)} SOL
                </p>
              </GlassCard>
              <GlassCard className="p-6">
                <p className="text-sm font-medium text-[var(--muted)]">Sales</p>
                <p className="mt-1 text-3xl font-black text-[var(--ink)]">{totalSales}</p>
              </GlassCard>
            </div>

            <h2 className="mb-4 text-lg font-bold">Your products</h2>
            <div className="space-y-3">
              {mine.length === 0 ? (
                <GlassCard className="p-8 text-center text-[var(--muted)]">
                  No products yet.{" "}
                  <Link
                    href="/dashboard/new"
                    className="font-semibold text-[var(--ink)] underline"
                  >
                    Create your first
                  </Link>
                  .
                </GlassCard>
              ) : (
                mine.map((p) => (
                  <GlassCard
                    key={p.id}
                    className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/p/${p.id}`}
                        className="text-lg font-bold text-[var(--ink)] hover:underline"
                      >
                        {p.title}
                      </Link>
                      <p className="text-sm text-[var(--muted)]">
                        {lamportsToSol(p.priceLamports)} SOL ·{" "}
                        {purchases.filter((x) => x.productId === p.id).length} sales
                      </p>
                    </div>
                    <Link href={`/p/${p.id}`} className="btn-dark shrink-0 py-2 text-sm">
                      View
                    </Link>
                  </GlassCard>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppChrome>
  );
}
