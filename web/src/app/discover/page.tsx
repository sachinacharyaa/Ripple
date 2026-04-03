"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { GlassCard } from "@/components/ui/GlassCard";
import { useRippleData } from "@/hooks/useRippleData";
import { lamportsToSol } from "@/lib/purchase";

export default function DiscoverPage() {
  const { products, chainMode, loading, chainError } = useRippleData();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
    );
  }, [products, q]);

  return (
    <AppChrome>
      <div className="mx-auto max-w-4xl px-4 py-12 fade-in">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-[var(--ink)]">
          Discover
        </h1>
        <p className="mb-8 text-[var(--muted)]">
          {chainMode
            ? "Listings come from your deployed program; titles load from IPFS metadata URIs."
            : "Local demo: listings are stored in this browser until you set NEXT_PUBLIC_RIPPLE_PROGRAM_ID."}
        </p>
        {chainError ? (
          <GlassCard className="mb-6 border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
            {chainError}
          </GlassCard>
        ) : null}
        <div className="search-bar mb-8 max-w-md">
          <input
            type="search"
            placeholder="Search marketplace…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products"
          />
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-28 rounded-2xl sm:col-span-2" />
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.length === 0 ? (
              <GlassCard className="p-8 text-center text-[var(--muted)] sm:col-span-2">
                No products yet.{" "}
                <Link
                  href="/dashboard/new"
                  className="font-semibold text-[var(--ink)] underline"
                >
                  Create one
                </Link>
                .
              </GlassCard>
            ) : (
              filtered.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`}>
                  <GlassCard className="p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {lamportsToSol(p.priceLamports)} SOL
                    </p>
                    <h2 className="text-lg font-bold text-[var(--ink)]">{p.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                      {p.description}
                    </p>
                  </GlassCard>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </AppChrome>
  );
}
