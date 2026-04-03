"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { isChainMode } from "@/lib/env";
import { fetchChainCatalog } from "@/lib/chain";
import { getProducts, getPurchases } from "@/lib/store";
import type { Product, Purchase } from "@/types/product";

/**
 * Product list + purchases: on-chain + IPFS when `NEXT_PUBLIC_RIPPLE_PROGRAM_ID` is set,
 * otherwise localStorage-backed MVP data.
 */
export function useRippleData() {
  const chain = isChainMode();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [chainProducts, setChainProducts] = useState<Product[]>([]);
  const [chainPurchases, setChainPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setRefreshCounter((c) => c + 1);
    window.addEventListener("storage", bump);
    window.addEventListener("ripple-storage", bump as EventListener);
    window.addEventListener("ripple-chain", bump as EventListener);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("ripple-storage", bump as EventListener);
      window.removeEventListener("ripple-chain", bump as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!chain) return;
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setChainError(null);
    });
    fetchChainCatalog()
      .then(({ products, purchases }) => {
        if (!cancelled) {
          setChainProducts(products);
          setChainPurchases(purchases);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setChainError(e instanceof Error ? e.message : "Failed to load on-chain data");
          setChainProducts([]);
          setChainPurchases([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chain, refreshCounter]);

  return useMemo(
    () => ({
      products: chain ? chainProducts : getProducts(),
      purchases: chain ? chainPurchases : getPurchases(),
      tick: refreshCounter,
      loading: chain && loading,
      chainError,
      chainMode: chain,
    }),
    [chain, chainProducts, chainPurchases, refreshCounter, loading, chainError]
  );
}
