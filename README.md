# Shard Fusion Profit Finder

A responsive Next.js application that ranks single- and multi-step Hypixel SkyBlock shard fusion paths using current Bazaar prices. It uses instant-buy prices for starting shards, instant-sell prices for final outputs, and performs search and sorting in the browser after the server prepares the results.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` — start the local application
- `npm test` — run calculation and formatting tests
- `npm run lint` — run ESLint
- `npm run build` — create a production build

## Data model

The complete fusion catalog comes from `data/fusion-data.json`. Direct/Fuse classification comes from the SkyShards acquisition rates in `data/rates.json`; a shard with a non-zero base acquisition rate is Direct. The app converts the catalog into its own normalized model, removes mirrored ingredient pairs, and computes the cheapest acyclic acquisition route for every shard. Each intermediate shard can be bought directly or produced by another fusion, whichever costs less at the current Bazaar snapshot. The planner then keeps the lowest-cost complete chain for each final output and quantity. The current catalog contains 134,971 unique candidates and up to 408 output/quantity paths.

Expanded results show the full execution order: starting Bazaar purchases, each intermediate fusion, the final fusion, and the instant-sale estimate. Paths are ranked by estimated profit by default and can also be sorted by margin, cost, or output value.

Bazaar data is cached for 60 seconds and normalized to the shard products and top-of-book prices the calculator uses. Item metadata is cached for one hour. Missing metadata falls back to the catalog name or a display name derived from the shard ID, while missing market data excludes that candidate from the ranking. Shard icons are served from `public/shardIcons` with a generated fallback for unknown IDs.

Coin estimates exclude Bazaar taxes, fusion bonuses, and slippage beyond the top order-book entry.

The `/shard-alerts` page watches Direct shards for price spikes. A scheduled background scan compares the current top instant-sell order with Hypixel's average buy-order price from the same Bazaar snapshot, stores the latest result in Supabase, and lets the page display that saved result without fetching Hypixel when a visitor opens it. No browser-local history is used.

## Background shard alerts

The scheduled flow uses GitHub Actions, a protected Next.js route, and one server-managed Supabase snapshot:

1. Run the SQL files in `supabase/migrations/` in timestamp order in the Supabase SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` in the production app environment. Keep the service-role key server-only.
3. Add `SHARD_ALERTS_URL` and `CRON_SECRET` as GitHub Actions repository secrets. `SHARD_ALERTS_URL` should be the production origin, such as `https://shardflipper.example.com`.
4. Deploy the app, then use the `Refresh shard alerts` workflow's manual dispatch once to verify the first snapshot. The workflow is scheduled every five minutes afterward.

The website reads the latest saved snapshot from Supabase. GitHub Actions is only the scheduler; it does not store alert history in the browser or in the repository.

The catalog and shard icons are used under their MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution. The catalog adapter, pricing reduction, and application code are independently implemented for this project.
