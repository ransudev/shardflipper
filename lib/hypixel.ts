import "server-only";

import { cacheLife } from "next/cache";
import type { BazaarResponse } from "@/types/bazaar";

const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [250, 750] as const;

class BazaarHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Hypixel Bazaar returned HTTP ${status}`);
    this.name = "BazaarHttpError";
    this.status = status;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function errorSummary(error: unknown): string {
  if (!(error instanceof Error)) return "unknown network error";
  if (error.cause instanceof Error) return `${error.message}: ${error.cause.message}`;
  return error.message;
}

async function fetchBazaar(): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(BAZAAR_URL, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) return response;

      const error = new BazaarHttpError(response.status);
      if (!isRetryableStatus(response.status)) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof BazaarHttpError && !isRetryableStatus(error.status)) throw error;
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw new Error(
    `Unable to reach Hypixel Bazaar after ${MAX_ATTEMPTS} attempts: ${errorSummary(lastError)}`,
    { cause: lastError },
  );
}

async function readBazaarData(): Promise<BazaarResponse> {
  const response = await fetchBazaar();

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    data.success !== true ||
    !("products" in data) ||
    typeof data.products !== "object" ||
    data.products === null ||
    !("lastUpdated" in data) ||
    typeof data.lastUpdated !== "number"
  ) {
    throw new Error("Hypixel returned invalid Bazaar data");
  }

  const bazaar = data as BazaarResponse;
  const shardProducts = Object.fromEntries(
    Object.entries(bazaar.products)
      .filter(([id]) => id.startsWith("SHARD_"))
      .map(([id, product]) => [id, {
        ...product,
        buy_summary: product.buy_summary.slice(0, 1),
        sell_summary: product.sell_summary.slice(0, 1),
      }]),
  );

  return { ...bazaar, products: shardProducts };
}

export async function getBazaarData(): Promise<BazaarResponse> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  return readBazaarData();
}

/** Bypasses the page cache for scheduled background scans. */
export async function getFreshBazaarData(): Promise<BazaarResponse> {
  return readBazaarData();
}
