# Solana Foundation India Grants Application Draft

Submission link: https://superteam.fun/earn/grants/solana-foundation-india-grants/

Program notes checked on May 28, 2026: this is an India-only regional grant by Superteam India for Solana builders, with grants up to 10k USDG, expected response time around 30 days, mandatory Earn KYC for payout, weekly community progress updates after approval, and a strong preference for working products, active links, user/product feedback, and visible proof of work.

## Applicant Details

**Applicant name**
> Sachin Acharya

**Location in India**
> TODO: Add city/state in India.

**Telegram**
> TODO: t.me/your_username

**X profile**
> TODO: https://x.com/your_handle

**GitHub profile**
> https://github.com/sachinacharyaa

**Solana wallet address**
> TODO: Add the wallet address you want to use for grant/KYC payout.

**Superteam Earn profile**
> TODO: Add your Superteam Earn profile URL, if available.

## Project Basics

**Project title**
> Rivo

**One-line description**
> Stablecoin-native creator monetization on Solana: creators sell digital products, buyers pay with PUSD/SOL, and Rivo verifies payment on-chain before unlocking content.

**Live product**
> https://rivolabs.app

**Repository**
> https://github.com/sachinacharyaa/Ripple

**Devnet program ID**
> EaEq7oukxo1VA75P5zr8jCVZjNesF7ZavWy2A9QKAqTp

**Requested grant amount**
> 8,000 USDG

## Project Details

**Problem**
> Indian and global digital creators can sell courses, templates, files, reports, and gated assets through traditional platforms, but they usually face high platform fees, delayed payouts, cross-border payment friction, and weak ownership over their customer/payment flow. Crypto can solve the settlement problem, but most crypto commerce UX is still too raw: creators need wallets, product pages, checkout, delivery, buyer access control, analytics, and fraud-resistant payment verification in one place.

**Solution**
> Rivo is a Solana-powered creator monetization platform for selling real digital products. A creator connects a wallet, publishes a product, uploads delivery files to IPFS/Pinata, sets a price in PUSD or SOL, and shares a public product link. Buyers connect Phantom, pay from their wallet, and unlock the content only after the backend verifies the transaction on Solana.

> The current product includes a React/Vite marketplace and creator dashboard, Express/MongoDB backend, Phantom wallet checkout, SPL token transfer support, SOL transfer support, platform-fee split transactions, purchase history, creator revenue/admin analytics, IPFS delivery, and a minimal Anchor `purchase` program on devnet. The checkout is non-custodial: payment moves from buyer to creator, with the platform fee routed in the same transaction, and backend verification checks mint, amount, creator destination, and fee destination before recording the purchase.

> Rivo fits the grant focus areas around payments/stablecoins, consumer apps, developer/tooling quality, and practical Solana adoption from India. The near-term goal is to move from a working devnet/product prototype into a mainnet-ready commerce rail for creators, with strong reliability, better buyer UX, and enough early creator onboarding to validate repeat usage.

## Why Solana

> Rivo depends on low-cost, fast finality payments and simple wallet-based checkout. Solana is a natural fit because digital products often have low to mid-ticket prices, so checkout fees and confirmation latency directly affect conversion. Stablecoin payments on Solana also make the product useful for creators who want predictable pricing while still receiving direct on-chain settlement.

## Proof Of Work

> Rivo is already live at https://rivolabs.app and has an active public GitHub repository at https://github.com/sachinacharyaa/Ripple. The repo includes a production web app, backend API, Vercel deployment configuration, an Anchor workspace, and a devnet program.

> Current shipped functionality includes wallet connection, product creation, public product pages, marketplace/discover routes, PUSD/SOL checkout, legacy USDC support, split creator/platform payments, backend on-chain verification, purchase records, gated content unlock, IPFS/Pinata delivery, creator purchase history, admin revenue analytics, waitlist/newsletter collection, and Vercel production deployment.

> Recent git history shows active product work, including admin revenue aggregation fixes on May 27, 2026; on-chain settlement and platform-fee work on May 23, 2026; PUSD/USDC/SOL price formatting and backend token verification work on May 22, 2026; Vercel production build fixes; and MongoDB-backed subscriber wiring.

> Devnet Anchor program: `EaEq7oukxo1VA75P5zr8jCVZjNesF7ZavWy2A9QKAqTp`. The program currently provides a minimal buyer-to-creator SOL purchase instruction, while the MVP checkout uses native transfers and SPL-token transfers with backend verification.

## Milestones

**Milestone 1: Mainnet-ready checkout hardening**
> Target date: June 21, 2026
>
> Finalize stablecoin/SOL checkout reliability, complete mainnet token configuration, harden backend transaction verification, add clearer buyer error states, and produce a public demo checkout flow.

**Milestone 2: Creator onboarding and storefront quality**
> Target date: July 7, 2026
>
> Improve creator product publishing, payout wallet setup, public storefront/product-page polish, upload reliability, and dashboard states so a non-technical creator can publish and test a paid product without support.

**Milestone 3: Anchor payment route and audit pass**
> Target date: July 24, 2026
>
> Route at least one checkout path through the Anchor `purchase` program or document the production migration path, review payment and access-control edge cases, add focused tests/checklists, and remove any unsafe assumptions around unlock access.

**Milestone 4: Early creator pilot**
> Target date: August 15, 2026
>
> Onboard 10-20 early creators, collect product feedback, run live purchase tests, measure checkout completion, and publish progress updates to the Superteam India community.

**Milestone 5: Public launch report**
> Target date: August 31, 2026
>
> Ship the mainnet-ready version, publish a short launch/postmortem report, open-source the relevant Solana/payment components, and share metrics, learnings, and next roadmap.

## Primary KPI

> 20 creators onboarded and 100 verified on-chain purchases completed through Rivo by August 31, 2026.

## Budget Use

> 8,000 USDG will be used for engineering time, mainnet/payment testing, RPC/hosting/storage costs, product QA, early creator onboarding, content/demo production, and a small pilot budget for recruiting initial creators and running real checkout tests.

## Open Source Plan

> Rivo will keep the core repository public and open-source the Solana payment/verification components that are useful to other builders after the mainnet payment path is finalized.

## Weekly Updates Commitment

> If approved, I will post a weekly progress update covering shipped work, current blockers, milestone progress, and demo links/metrics.

## Missing Items Before Submission

- Confirm you are eligible as an India-based applicant.
- Add Telegram, X profile, Solana wallet, India city/state, and Superteam Earn profile.
- Confirm whether the requested grant amount should stay at 8,000 USDG or be changed.
- Add any live traction numbers: creator signups, waitlist count, purchases, demo users, revenue, or pilot partners.
- Add screenshots or short demo video links for the live product, checkout, creator dashboard, and admin analytics.
- Complete Superteam Earn KYC when prompted after approval.
