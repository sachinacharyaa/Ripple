# Ripple

 - One-line pitch: Ripple is the Solana-native checkout and access layer for creators to sell digital    products and unlock them instantly with wallet-based proof of payment.                            
  - Target user: Crypto-native creators selling high-value digital goods:                             
      - researchers                                                                                   
      - alpha communities                                                                             
      - designers                                                                                     
      - indie devs                                                                                    
      - educators                                                                                     
      - paid Discord/Telegram/X creators                                                              
  - Killer differentiator: Instant wallet payment + instant wallet-based access unlock in one flow.   
    Most products either handle payments or handle token-gating. Your wedge is doing both cleanly for 
    digital products, with creator-controlled payouts and low fees.                                   
  - MVP scope:                                                                                        
      - Creator connects wallet                                                                       
      - Creates a product with title, description, price, file/link                                   
      - Sets payout wallet                                                                            
      - Buyer connects wallet and pays                                                                
      - On-chain payment is verified                                                                  
      - Product unlocks instantly                                                                     
      - Creator receives payout instantly                                                             
      - Platform takes 1% fee                                                                         
      - Support SOL first; mention USDC next only if not fully working yet                            
  - Demo flow:                                                                                        
      1. Creator opens Ripple and connects Phantom                                                    
      2. Creator creates “Premium Trading Guide” or “Design Asset Pack”                               
      3. Creator sets price and publishes                                                             
      4. Buyer opens public product page                                                              
      5. Buyer pays with wallet                                                                       
      6. Transaction confirms on Solana                                                               
      7. Backend verifies payment                                                                     
      8. File/content unlocks instantly                                                               
      9. Show creator payout and platform fee split                                                   
     10. Show purchase history / proof of access                                                      
  - Why judges would care:                                                                            
      - It has a clear real user and monetization path                                                
      - It uses Solana for something that actually benefits from Solana: fast, cheap, wallet-native   
        settlement                                                                                    
      - The demo is easy to understand in under 2 minutes                                             
      - It is more practical than many “consumer crypto” ideas                                        
      - It can grow beyond a hackathon into a real business                                           
      - It has a strong extension path:                                                               
          - USDC checkout                                                                             
          - subscriptions
          - NFT/token-gated perks                                                                     
          - embedded checkout links                                                                   
          - creator storefronts                                                                       
                                    

the fastest way for a creator to sell a digital product on Solana and unlock access instantly  
after payment

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

## Production on Vercel

This repo is configured for:

- static frontend from `web/dist`
- serverless API from `backend/api/index.js` (Express app)
- SPA fallback for dashboard/product routes

### 1) Create one Vercel project from repo root

Vercel will use `vercel.json` in the root:

- `/api/*` -> backend serverless function
- all other paths -> frontend SPA build output

### 2) Configure environment variables in Vercel

Set these for **Preview** and **Production**:

Backend/runtime:

- `MONGODB_URI` = your MongoDB Atlas connection string
- `SOLANA_RPC` = cluster RPC (example: `https://api.devnet.solana.com`)
- `CORS_ORIGINS` = comma-separated frontend origins (for example: `https://your-app.vercel.app`)

Frontend/build:

- `VITE_API_URL` = `/api` (same-domain API calls)
- `VITE_SOLANA_RPC` = same cluster RPC as backend
- `VITE_SOLANA_NETWORK` = `devnet` (or your cluster)

### 3) Deploy

Push to your connected branch (or run `vercel --prod`).

### 4) Post-deploy verification checklist

1. `GET /api/health` returns `{ "ok": true }`
2. Connect wallet and open `/dashboard/home`
3. Create and publish a product
4. Open public product page and complete buy flow
5. Verify unlock works after purchase
6. Confirm analytics data appears in Vercel Analytics dashboard

### Visitor analytics dashboard

The app now includes:

- Vercel Web Analytics (`@vercel/analytics/react`)
- Vercel Speed Insights (`@vercel/speed-insights/react`)

After deployment and traffic, view metrics in your Vercel project dashboard.

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
