"use client";

import { BN } from "@coral-xyz/anchor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppChrome } from "@/components/layout/AppChrome";
import { GlassCard } from "@/components/ui/GlassCard";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import {
  createProductOnChain,
  phantomToWallet,
  productPda,
} from "@/lib/chain";
import { getProgramId, isChainMode } from "@/lib/env";
import { buildMetadataJson, sha256Utf8 } from "@/lib/metadata";
import { solToLamports } from "@/lib/purchase";
import { saveProduct } from "@/lib/store";
import type { Product } from "@/types/product";

export default function NewProductPage() {
  const router = useRouter();
  const { publicKey, provider } = useWallet();
  const chain = isChainMode();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceSol, setPriceSol] = useState("0.01");
  const [contentUrl, setContentUrl] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!publicKey || !provider) {
      setErr("Connect your wallet first.");
      return;
    }
    setBusy(true);
    try {
      const priceLamports = solToLamports(Number(priceSol));
      const titleT = title.trim();
      const descT = description.trim();
      const urlT = contentUrl.trim();
      if (!titleT) throw new Error("Title is required.");
      if (!urlT) throw new Error("Content link is required.");

      if (chain) {
        const programId = getProgramId();
        if (!programId) throw new Error("Program id not configured.");
        const uri = metadataUri.trim();
        if (!uri) {
          throw new Error(
            "Upload metadata JSON to IPFS (same shape as title/description/contentUrl) and paste the URI."
          );
        }
        const metaJson = buildMetadataJson({
          title: titleT,
          description: descT,
          contentUrl: urlT,
        });
        const hashBytes = await sha256Utf8(metaJson);
        const productIdBn = new BN(Date.now());
        const wallet = phantomToWallet(provider);
        await createProductOnChain(wallet, {
          productId: productIdBn,
          priceLamports: new BN(priceLamports),
          contentHash: hashBytes,
          metadataUri: uri,
        });
        const pda = productPda(programId, publicKey, productIdBn);
        window.dispatchEvent(new CustomEvent("ripple-chain"));
        router.push(`/p/${pda.toBase58()}`);
      } else {
        const product: Product = {
          id: crypto.randomUUID(),
          source: "local",
          creatorWallet: publicKey.toBase58(),
          title: titleT,
          description: descT,
          priceLamports,
          contentUrl: urlT,
          contentHash: contentHash.trim() || undefined,
          createdAt: Date.now(),
        };
        saveProduct(product);
        router.push(`/p/${product.id}`);
      }
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-xl px-4 py-12 fade-in">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight">Create product</h1>
          <WalletButton />
        </div>

        {!publicKey ? (
          <GlassCard className="p-8 text-center text-[var(--muted)]">
            Connect Phantom to publish a product.
            {chain
              ? " On-chain mode: metadata JSON is loaded from IPFS; payment is validated by the program."
              : " Local mode stores listings in this browser."}
          </GlassCard>
        ) : (
          <GlassCard className="p-6 sm:p-8">
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              {chain ? (
                <p className="rounded-lg border border-[rgba(153,69,255,0.35)] bg-[rgba(153,69,255,0.08)] px-3 py-2 text-sm text-[var(--ink)]">
                  On-chain: create{" "}
                  <code className="rounded bg-white/60 px-1">metadata.json</code> with{" "}
                  <code className="rounded bg-white/60 px-1">title</code>,{" "}
                  <code className="rounded bg-white/60 px-1">description</code>,{" "}
                  <code className="rounded bg-white/60 px-1">contentUrl</code>, upload to IPFS,
                  then paste the URI below. The hash of that JSON is stored on-chain.
                </p>
              ) : null}
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className="w-full rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Solana 101 course"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="desc">
                  Description
                </label>
                <textarea
                  id="desc"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What buyers get…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="price">
                  Price (SOL)
                </label>
                <input
                  id="price"
                  type="number"
                  step="any"
                  min="0"
                  className="w-full rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                  value={priceSol}
                  onChange={(e) => setPriceSol(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="url">
                  Content link
                </label>
                <input
                  id="url"
                  type="url"
                  className="w-full rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="https://… (IPFS, Drive, etc.)"
                  required
                />
              </div>
              {chain ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold" htmlFor="muri">
                    Metadata IPFS / HTTPS URI
                  </label>
                  <input
                    id="muri"
                    type="url"
                    className="w-full rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                    value={metadataUri}
                    onChange={(e) => setMetadataUri(e.target.value)}
                    placeholder="ipfs://… or https://…"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-semibold" htmlFor="hash">
                    Content hash (optional)
                  </label>
                  <input
                    id="hash"
                    className="w-full rounded-lg border border-[rgba(17,17,17,0.15)] bg-white/80 px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none ring-[var(--purple)] focus:ring-2"
                    value={contentHash}
                    onChange={(e) => setContentHash(e.target.value)}
                    placeholder="sha256 / CID commitment"
                  />
                </div>
              )}
              {err ? (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className="btn-dark" disabled={busy}>
                  {busy ? "Publishing…" : "Publish"}
                </button>
                <Link href="/dashboard" className="btn-wallet">
                  Cancel
                </Link>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </AppChrome>
  );
}
