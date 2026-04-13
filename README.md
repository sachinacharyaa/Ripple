# Ripple

Decentralized creator monetization on **Solana**: list digital products (metadata + gated link in MongoDB), buyers pay in **SOL** with a wallet, and the **API verifies the on-chain transfer** before unlocking the content URL.

## Repo layout

| Path | Role |
|------|------|
| `web/` | React + Vite + Tailwind + Solana Wallet Adapter (Phantom) |
| `web/src/layouts/DashboardShell.tsx` | Wallet-gated creator shell (top bar + sidebar + `Outlet`) |
| `web/src/pages/dashboard/` | **Home** (getting started + activity), **Products** (table), **New product** (3-step flow), connect screen |
| `web/src/lib/` | Shared `api` client + product helpers |
| `web/src/types/product.ts` | `ProductShape` type |
| `backend/` | Express + Mongoose (product metadata, purchases, access) |
| `programs/ripple/` | **Anchor** program with a minimal `purchase` instruction (deploy when you want payments routed through the program) |

## Prerequisites

- Node.js 20+
- MongoDB Atlas URI (or local Mongo)
- Phantom (or compatible wallet) on **Devnet** for testing
- Optional: [Anchor](https://www.anchor-lang.com/docs/installation) + Rust for on-chain builds

## Backend

1. Copy env:

   `cp backend/.env.example backend/.env`

2. Set `MONGODB_URI` and `SOLANA_RPC` (must match the cluster your wallet uses, e.g. devnet).

3. Run:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

API base: `http://localhost:4000/api` — try `GET /api/health`.

**Security:** never commit real database passwords. Rotate any credentials that were shared in plain text.

## Frontend

1. Copy env:

   `cp web/.env.example web/.env`

2. Point `VITE_API_URL` at your API (default `http://localhost:4000/api`).

3. Match Solana cluster: `VITE_SOLANA_RPC` + `VITE_SOLANA_NETWORK` should align with backend `SOLANA_RPC` (e.g. devnet).

4. Run:

   ```bash
   cd web
   rm -rf node_modules package-lock.json   # if Windows/npm left a broken tree
   npm install
   npm run dev
   ```

Open the URL Vite prints (usually `http://localhost:5173`). The **landing page is this app’s `/` route** — not a separate static `index.html` at the repo root.

## MVP flow

1. **Creator:** connect wallet → Dashboard → create product (title, description, SOL price, content URL).
2. **Buyer:** open product page → connect wallet → **Buy now** → approve SOL transfer → API verifies **buyer → creator** for the **exact lamports** → MongoDB stores purchase → **unlock link**.

## On-chain program (Anchor)

From repo root (with Anchor installed):

```bash
anchor build
anchor keys list          # optional: sync program id
anchor deploy
```

The deployed program exposes `purchase(amount)` transferring lamports from buyer to creator. The current web app uses **native `SystemProgram.transfer`**; the backend verifies that transfer. You can later switch the client to invoke this program and tighten verification to the program ID.

## API routes (summary)

- `GET /api/products` — marketplace list  
- `GET /api/products/creator/:wallet` — creator’s products  
- `GET /api/products/:id` — one product  
- `POST /api/products` — create product  
- `POST /api/purchases/verify` — verify tx + record sale  
- `POST /api/access/unlock` — return content URL if purchased  
- `GET /api/purchases/wallet/:wallet` — buyer history  
- `GET /api/purchases/creator/:wallet` — sales to this creator  

## License

ISC (backend default). Adjust as needed.
