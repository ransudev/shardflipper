# Shard Fusion Profit Finder

A responsive Next.js application that ranks single-step Hypixel SkyBlock shard fusions using current Bazaar prices. It uses instant-buy prices for ingredients, instant-sell prices for outputs, and performs search and sorting in the browser after the server prepares the results.

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

The complete fusion catalog comes from `reference/SkyShards-master/public/fusion-data.json`. The app converts that catalog into its own normalized model, removes mirrored ingredient pairs, prices every available candidate against the current Bazaar snapshot, and keeps the cheapest valid ingredient path for each output and quantity. The current catalog contains 134,971 unique candidates and up to 408 output/quantity paths.

Bazaar data is cached for 60 seconds and normalized to the shard products and top-of-book prices the calculator uses. Item metadata is cached for one hour. Missing metadata falls back to the catalog name or a display name derived from the shard ID, while missing market data excludes that candidate from the ranking. Shard icons are served from the reference dataset with a generated fallback for unknown IDs.

Coin estimates exclude Bazaar taxes, fusion bonuses, and slippage beyond the top order-book entry.

The catalog and shard icons are used under their MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution. The catalog adapter, pricing reduction, and application code are independently implemented for this project.
