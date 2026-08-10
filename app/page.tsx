import { FusionTable } from "@/components/FusionTable";
import { calculateAllFusions } from "@/lib/calculateFusion";
import {
  getCatalogNames,
  getCatalogShardIds,
  selectBestMarketRecipes,
} from "@/lib/fusionCatalog";
import { getBazaarData } from "@/lib/hypixel";
import { getSkyBlockItems } from "@/lib/items";
import { buildShardMetadata } from "@/lib/shardMetadata";

export default async function Home() {
  const bazaar = await getBazaarData();
  const itemsResult = await Promise.allSettled([getSkyBlockItems()]);
  const items = itemsResult[0].status === "fulfilled" ? itemsResult[0].value : [];
  const selection = selectBestMarketRecipes(bazaar.products);
  const metadata = buildShardMetadata(
    getCatalogShardIds(),
    items,
    getCatalogNames(),
  );
  const recipes = selection.recipes;
  const results = calculateAllFusions(recipes, bazaar.products, metadata);

  return (
    <FusionTable
      results={results}
      lastUpdated={bazaar.lastUpdated}
      scanStats={selection.stats}
    />
  );
}
