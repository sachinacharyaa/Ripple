# Ripple

Decentralized creator monetization on Solana — static landing (`index.html`) and the **Next.js app** in `web/`.

## App (Next.js)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use Phantom on **Solana devnet**; fund the wallet with devnet SOL from a faucet before buying.

- **MVP:** Product metadata and purchase receipts are stored in `localStorage`; payments are real **devnet SOL transfers** to the creator wallet.
- **On-chain:** Anchor program scaffold lives under `programs/ripple` (see `Anchor.toml`). Deploy and replace the client to use program PDAs instead of local storage.

Optional env: copy `web/.env.example` to `web/.env.local`.

- **`NEXT_PUBLIC_RIPPLE_PROGRAM_ID`** — set to your deployed program address to load listings from chain + IPFS metadata; omit to keep the localStorage demo.
- **`NEXT_PUBLIC_SOLANA_CLUSTER`** — `devnet` (default), `testnet`, or `mainnet-beta`.
- **`NEXT_PUBLIC_IPFS_GATEWAY`** — gateway for `ipfs://` metadata (default `https://ipfs.io/ipfs`).

Static landing (`index.html`): set `window.RIPPLE_APP_ORIGIN = 'https://your-app.vercel.app'` before the inline script (or host the landing on the same origin as the Next app and use relative `/dashboard` links).

## Deploy (Anchor)

Deploy the program with Anchor (`anchor build`, `anchor deploy`), update the program id in `Anchor.toml` / `declare_id!`, then set `NEXT_PUBLIC_RIPPLE_PROGRAM_ID` to the deployed address. Rebuild the IDL with `anchor idl build` if you change instructions and replace `web/src/idl/ripple.json` if needed.

Ripple is the Gumroad of Solana.

<img width="1919" height="879" alt="Ripple preview" src="https://github.com/user-attachments/assets/a25ff766-2939-48a6-bf10-ccf8454baae5" />
