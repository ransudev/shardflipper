import { cacheLife } from "next/cache";
import type { BazaarResponse } from "@/types/bazaar";

const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";

export async function getBazaarData(): Promise<BazaarResponse> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const response = await fetch(BAZAAR_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Bazaar request failed (${response.status})`);

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
