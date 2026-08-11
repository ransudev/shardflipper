# Product

<!-- impeccable:product-schema 1 -->

<!-- Product truth below is inferred from the repository and the user's redesign brief; confirm any field that does not match the intended product. -->

## Platform

web

## Stack

Next.js App Router with React and TypeScript.

## Users

Hypixel SkyBlock players who are actively comparing Bazaar prices while deciding what shard fusion to make next.

## Product Purpose

Shard Fusion Finder turns the current Bazaar snapshot into a ranked list of profitable single- and multi-step shard-fusion paths. Success means a player can find a worthwhile chain, understand every purchase and fusion in it, and move on to the next decision without scanning an unstructured catalog.

## Positioning

The product evaluates every known fusion candidate against the live market, recursively compares direct purchases with intermediate fusions, and selects the cheapest acyclic chain for each output instead of presenting a static recipe list.

## Operating Context

Players use the scanner during a live market session. They search by shard or output, sort by profit, margin, or cost, open a path for its buy/fuse/sell breakdown, and move through the result set in small pages.

## Capabilities and Constraints

- Fetches live Hypixel Bazaar data and SkyBlock item metadata when available.
- Uses the checked-in SkyShards fusion catalog and serves checked-in shard icons with a generated fallback for unknown IDs.
- Provides a Shard alerts page for Direct shards, comparing the current Insta-sell price with the previous browser-local snapshot and sorting by price change, Insta-sell price, or Buy order price.
- Shows market calculations, freshness, scan coverage, unavailable candidates, and ingredient details.
- The main scanner should show 10 paths per page with clear previous/next controls and retain the active search and sort state.
- No authentication, accounts, or persistent user data are required.
- Must remain usable on narrow mobile screens without a wide horizontal result scroll.

## Brand Commitments

The product name is Shard Fusion Finder. Copy should stay direct, technical, and honest about live estimates and market movement.

## Evidence on Hand

- Live Bazaar integration in `lib/hypixel.ts` and `lib/prices.ts`.
- Fusion catalog and selection logic in `lib/fusionCatalog.ts`.
- Fusion data in `data/fusion-data.json`, Direct/Fuse rates in `data/rates.json`, and shard icons in `public/shardIcons/`.
- Existing scanner behavior in `components/FusionTable.tsx`.

## Product Principles

- Make the next profitable decision obvious.
- Keep every number traceable to a visible buy/fuse/sell path.
- Reduce scan fatigue with bounded, navigable result groups.
- Treat live data as time-sensitive, not guaranteed.

## Accessibility & Inclusion

The scanner should be keyboard-operable, expose labels and status updates to assistive technology, provide visible focus states, preserve readable contrast, and keep pagination controls understandable at every viewport.
