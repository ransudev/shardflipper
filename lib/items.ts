import { cacheLife } from "next/cache";
import type { SkyBlockItem, SkyBlockItemsResponse } from "@/types/item";

const ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";

export async function getSkyBlockItems(): Promise<SkyBlockItem[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86_400 });

  const response = await fetch(ITEMS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Items request failed (${response.status})`);

  const data = (await response.json()) as Partial<SkyBlockItemsResponse>;
  if (!data.success || !Array.isArray(data.items)) {
    throw new Error("Hypixel returned invalid item metadata");
  }
  return data.items.map(({ id, name, material, tier, category }) => ({
    id,
    name,
    material,
    tier,
    category,
  }));
}
