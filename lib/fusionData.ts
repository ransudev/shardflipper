import "server-only";

import { calculateAllFusions } from "@/lib/calculateFusion";
import {
  getCatalogNames,
  getCatalogShardIds,
  selectBestMarketRecipes,
} from "@/lib/fusionCatalog";
import { getBazaarData } from "@/lib/hypixel";
import { getSkyBlockItems } from "@/lib/items";
import { getInstantSellPrice } from "@/lib/prices";
import { buildShardMetadata } from "@/lib/shardMetadata";
import { cacheLife } from "next/cache";

export async function getFusionData() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const bazaar = await getBazaarData();
  const itemsResult = await Promise.allSettled([getSkyBlockItems()]);
  const items = itemsResult[0].status === "fulfilled" ? itemsResult[0].value : [];
  const selection = selectBestMarketRecipes(bazaar.products);
  const metadata = buildShardMetadata(
    getCatalogShardIds(),
    items,
    getCatalogNames(),
  );

  return {
    results: calculateAllFusions(selection.recipes, bazaar.products, metadata),
    lastUpdated: bazaar.lastUpdated,
    scanStats: selection.stats,
    shards: Array.from(metadata.values(), ({ id, name }) => ({
      id,
      name,
      unitPrice: bazaar.products[id] ? getInstantSellPrice(bazaar.products[id]) ?? undefined : undefined,
    })),
  };
}
