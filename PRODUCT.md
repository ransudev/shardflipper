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

Shard Fusion Finder turns the current Bazaar snapshot into a ranked list of profitable shard-fusion paths. Success means a player can find a worthwhile path, understand its ingredient cost and output value, and move on to the next decision without scanning an unstructured catalog.

## Positioning

The product evaluates every known fusion candidate against the live market and selects the cheapest available ingredient path for each output, instead of presenting a static recipe list.

## Operating Context

Players use the scanner during a live market session. They search by shard or output, sort by profit, margin, or cost, open a path for its buy/fuse/sell breakdown, and move through the result set in small pages.

## Capabilities and Constraints

- Fetches live Hypixel Bazaar data and SkyBlock item metadata when available.
- Uses the SkyShards reference dataset as the fusion catalog source and serves shard icons from the reference assets with a fallback.
- Shows market calculations, freshness, scan coverage, unavailable candidates, and ingredient details.
- The main scanner should show 10 paths per page with clear previous/next controls and retain the active search and sort state.
- No authentication, accounts, or persistent user data are required.
- Must remain usable on narrow mobile screens without a wide horizontal result scroll.

## Brand Commitments

The product name is Shard Fusion Finder. Copy should stay direct, technical, and honest about live estimates and market movement.

## Evidence on Hand

- Live Bazaar integration in `lib/hypixel.ts` and `lib/prices.ts`.
- Fusion catalog and selection logic in `lib/fusionCatalog.ts`.
- Reference data and shard icons in `reference/SkyShards-master/public/`.
- Existing scanner behavior in `components/FusionTable.tsx`.

## Product Principles

- Make the next profitable decision obvious.
- Keep every number traceable to a visible buy/fuse/sell path.
- Reduce scan fatigue with bounded, navigable result groups.
- Treat live data as time-sensitive, not guaranteed.

## Accessibility & Inclusion

The scanner should be keyboard-operable, expose labels and status updates to assistive technology, provide visible focus states, preserve readable contrast, and keep pagination controls understandable at every viewport.
