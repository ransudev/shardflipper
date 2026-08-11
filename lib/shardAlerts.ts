import "server-only";

import catalogJson from "@/data/fusion-data.json";
import ratesJson from "@/data/rates.json";
import { getBazaarData } from "@/lib/hypixel";
import { getAverageBuyOrderPrice, getBuyOrderPrice } from "@/lib/prices";
import type { ShardAlert } from "@/types/shardAlerts";
import type { FusionCatalog } from "@/types/fusionCatalog";

const catalog = catalogJson as unknown as FusionCatalog;
const directRates = ratesJson as Record<string, number>;

const directShardDefinitions = Object.entries(catalog.shards)
  .filter(([shortId]) => (directRates[shortId] ?? 0) > 0)
  .map(([, shard]) => ({
    id: shard.internal_id,
    name: shard.name,
    family: shard.family,
    type: shard.type,
    rarity: shard.rarity,
  }));

export async function getShardAlertsData(): Promise<{
  alerts: ShardAlert[];
  directCount: number;
  lastUpdated: number;
}> {
  const bazaar = await getBazaarData();

  return {
    directCount: directShardDefinitions.length,
    lastUpdated: bazaar.lastUpdated,
    alerts: directShardDefinitions.map((shard) => {
      const product = bazaar.products[shard.id];
      return {
        ...shard,
        currentPrice: product ? getBuyOrderPrice(product) : null,
        averagePrice: product ? getAverageBuyOrderPrice(product) : null,
      };
    }),
  };
}
