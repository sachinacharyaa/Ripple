import { api } from "./api";

/**
 * Live SOL/USD for admin metrics.
 * Prefers the backend proxy (`/api/sol-price`) which is cached and uses multiple
 * sources — this avoids per-browser CoinGecko CORS/rate-limit failures in production.
 * Falls back to a direct CoinGecko call if the backend is unreachable.
 */
export async function fetchSolUsdPrice(): Promise<number | null> {
  try {
    const res = await api.get<{ usd?: number | null }>("/sol-price", { timeout: 8000 });
    const usd = res.data?.usd;
    if (typeof usd === "number" && usd > 0) return usd;
  } catch {
    /* fall back to direct provider below */
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { solana?: { usd?: number } };
    const usd = data?.solana?.usd;
    return typeof usd === "number" && usd > 0 ? usd : null;
  } catch {
    return null;
  }
}

export function solToUsd(sol: number, solUsd: number | null): number | null {
  if (solUsd == null || !Number.isFinite(sol)) return null;
  return sol * solUsd;
}
