/**
 * One-time backfill: lock in the historical USD value for purchases recorded BEFORE
 * `usdValueAtPurchase` / `solUsdRateAtPurchase` existed.
 *
 * For each confirmed purchase missing a locked-in value:
 *   - PUSD  -> usdValueAtPurchase = amount / 1e6        (face value, rate N/A)
 *   - USDC  -> usdValueAtPurchase = amount              (face value, rate N/A)
 *   - SOL   -> usdValueAtPurchase = amountSol * (SOL/USD price on the purchase date)
 *             The historical rate comes from CoinGecko's daily snapshot for that date.
 *
 * Idempotent: rows that already have usdValueAtPurchase > 0 are skipped.
 *
 * Usage (run from the `backend/` folder, where .env lives):
 *   node scripts/backfillPurchaseUsd.js                 # DRY RUN — prints what it would do
 *   node scripts/backfillPurchaseUsd.js --apply         # actually writes the changes
 *   node scripts/backfillPurchaseUsd.js --apply --fallback-current   # use current price if a date lookup fails
 *   node scripts/backfillPurchaseUsd.js --apply --rate=152.5         # force this SOL/USD rate for ALL sol rows (offline)
 */
import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const FALLBACK_CURRENT = process.argv.includes("--fallback-current");
const FORCED_RATE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--rate="));
  if (!arg) return null;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

const SOL_MINT = "So11111111111111111111111111111111111111112";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal schema (strict:false keeps every existing field intact on save).
const Purchase = mongoose.model(
  "Purchase",
  new mongoose.Schema({}, { strict: false, timestamps: true, collection: "purchases" }),
);

const priceByDate = new Map(); // "DD-MM-YYYY" -> number | null
let currentRateCache = null;

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function ddmmyyyy(date) {
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Daily SOL/USD for a date, trying several providers so one outage doesn't block the backfill. */
async function getHistoricalSolUsd(date) {
  const key = isoDate(date);
  if (priceByDate.has(key)) return priceByDate.get(key);

  let price = null;

  // 1) Coinpaprika — clean per-day snapshot.
  try {
    const d = await fetchJson(
      `https://api.coinpaprika.com/v1/tickers/sol-solana/historical?start=${key}&interval=1d&limit=1`,
    );
    const usd = Number(d?.[0]?.price);
    if (Number.isFinite(usd) && usd > 0) price = usd;
  } catch {
    /* try next */
  }

  // 2) CryptoCompare daily close.
  if (price == null) {
    try {
      const ts = Math.floor(new Date(`${key}T00:00:00Z`).getTime() / 1000);
      const d = await fetchJson(
        `https://min-api.cryptocompare.com/data/v2/histoday?fsym=SOL&tsym=USD&limit=1&toTs=${ts}`,
      );
      const usd = Number(d?.Data?.Data?.at(-1)?.close);
      if (Number.isFinite(usd) && usd > 0) price = usd;
    } catch {
      /* try next */
    }
  }

  // 3) CoinGecko history.
  if (price == null) {
    try {
      const d = await fetchJson(
        `https://api.coingecko.com/api/v3/coins/solana/history?date=${ddmmyyyy(date)}&localization=false`,
      );
      const usd = Number(d?.market_data?.current_price?.usd);
      if (Number.isFinite(usd) && usd > 0) price = usd;
    } catch {
      /* give up for this date */
    }
  }

  if (price == null) console.warn(`  ! No historical SOL price found for ${key}`);
  priceByDate.set(key, price);
  await sleep(1200); // be gentle with free rate limits
  return price;
}

async function getCurrentSolUsd() {
  if (currentRateCache != null) return currentRateCache;
  const sources = [
    {
      url: "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      pick: (d) => d?.solana?.usd,
    },
    {
      url: "https://api.coinbase.com/v2/prices/SOL-USD/spot",
      pick: (d) => Number(d?.data?.amount),
    },
    {
      url: `https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`,
      pick: (d) => Number(d?.[SOL_MINT]?.usdPrice),
    },
  ];
  for (const s of sources) {
    try {
      const d = await fetchJson(s.url);
      const usd = Number(s.pick(d));
      if (Number.isFinite(usd) && usd > 0) {
        currentRateCache = usd;
        return usd;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Run this from the backend/ folder with a populated .env.");
    process.exit(1);
  }
  if (FORCED_RATE) console.log(`Using forced SOL/USD rate for all SOL rows: $${FORCED_RATE}`);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: DRY RUN (no writes)\n");

  await mongoose.connect(process.env.MONGODB_URI);

  const rows = await Purchase.find({
    status: "confirmed",
    $or: [
      { usdValueAtPurchase: { $exists: false } },
      { usdValueAtPurchase: { $lte: 0 } },
      { usdValueAtPurchase: null },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Found ${rows.length} purchase(s) needing a locked-in USD value.\n`);

  let updated = 0;
  let skipped = 0;
  let totalUsd = 0;

  for (const p of rows) {
    const currency = p.currency || "PUSD";
    const when = p.purchaseTimestamp || p.createdAt || new Date();
    let usd = 0;
    let rate = 0;
    let note = "";

    if (currency === "PUSD") {
      usd = (Number(p.amount) || 0) / 1_000_000;
      note = "PUSD face value";
    } else if (currency === "USDC") {
      usd = Number(p.amount) || 0;
      note = "USDC face value";
    } else if (currency === "SOL") {
      const sol = Number(p.amountSol) || 0;
      if (FORCED_RATE) {
        rate = FORCED_RATE;
        note = "forced rate";
      } else {
        rate = await getHistoricalSolUsd(when);
        if (rate == null && FALLBACK_CURRENT) {
          rate = await getCurrentSolUsd();
          note = "current rate (fallback)";
        } else {
          note = `historical ${ddmmyyyy(when)}`;
        }
      }
      if (rate == null || rate <= 0) {
        console.warn(`  SKIP ${p._id} — no SOL price for ${ddmmyyyy(when)} (use --fallback-current or --rate=)`);
        skipped += 1;
        continue;
      }
      usd = sol * rate;
    } else {
      console.warn(`  SKIP ${p._id} — unknown currency "${currency}"`);
      skipped += 1;
      continue;
    }

    usd = Math.round(usd * 1_000_000) / 1_000_000;
    totalUsd += usd;
    updated += 1;

    const label = `${currency.padEnd(4)}  ${ddmmyyyy(when)}  $${usd.toFixed(2)}  (${note}${rate ? `, rate $${Number(rate).toFixed(2)}` : ""})`;
    console.log(`  ${APPLY ? "SET " : "would set"} ${p._id}: ${label}`);

    if (APPLY) {
      await Purchase.updateOne(
        { _id: p._id },
        {
          $set: {
            usdValueAtPurchase: usd,
            solUsdRateAtPurchase: currency === "SOL" ? Number(rate) || 0 : 0,
            purchaseTimestamp: p.purchaseTimestamp || p.createdAt || new Date(),
          },
        },
      );
    }
  }

  console.log(
    `\nDone. ${APPLY ? "Updated" : "Would update"} ${updated} row(s), skipped ${skipped}. ` +
      `Backfilled USD total: $${totalUsd.toFixed(2)}.`,
  );
  if (!APPLY) console.log("Re-run with --apply to write these changes.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
