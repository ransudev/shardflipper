import "server-only";

import catalogJson from "@/data/fusion-data.json";
import { getInstantBuyPrice, getSellOfferPrice } from "@/lib/prices";
import type { BazaarProduct } from "@/types/bazaar";
import type { FusionRecipe, FusionScanStats } from "@/types/fusion";
import type { FusionCatalog } from "@/types/fusionCatalog";

const catalog = catalogJson as unknown as FusionCatalog;

const internalToShortId = new Map(
  Object.entries(catalog.shards).map(([shortId, shard]) => [shard.internal_id, shortId]),
);

export function getCatalogShardIds(): string[] {
  return Object.values(catalog.shards).map((shard) => shard.internal_id);
}

export function getCatalogNames(): Map<string, string> {
  return new Map(
    Object.values(catalog.shards).map((shard) => [shard.internal_id, shard.name]),
  );
}

export function getCatalogShortId(internalId: string): string | undefined {
  return internalToShortId.get(internalId);
}

type SelectedRecipe = {
  cost: number;
  recipe: FusionRecipe;
};

type CatalogRecipes = {
  recipes: FusionRecipe[];
  uniqueCandidates: number;
};

function collectCatalogRecipes(source: FusionCatalog): CatalogRecipes {
  const seen = new Set<string>();
  const recipes: FusionRecipe[] = [];

  for (const [outputShortId, quantityGroups] of Object.entries(source.recipes)) {
    const outputShard = source.shards[outputShortId];
    if (!outputShard) continue;

    for (const [quantityText, inputPairs] of Object.entries(quantityGroups)) {
      const outputAmount = Number.parseInt(quantityText, 10);
      if (!Number.isFinite(outputAmount) || outputAmount <= 0) continue;

      for (const [leftShortId, rightShortId] of inputPairs) {
        const leftShard = source.shards[leftShortId];
        const rightShard = source.shards[rightShortId];
        if (!leftShard || !rightShard) continue;

        const orderedInputs = [leftShortId, rightShortId].sort();
        const candidateKey = `${outputShortId}:${outputAmount}:${orderedInputs.join("+")}`;
        if (seen.has(candidateKey)) continue;
        seen.add(candidateKey);

        recipes.push({
          id: `${outputShortId.toLowerCase()}-${outputAmount}-${orderedInputs.join("-").toLowerCase()}`,
          inputs: [
            { id: leftShard.internal_id, amount: leftShard.fuse_amount },
            { id: rightShard.internal_id, amount: rightShard.fuse_amount },
          ],
          output: { id: outputShard.internal_id, amount: outputAmount },
        });
      }
    }
  }

  return { recipes, uniqueCandidates: seen.size };
}

const defaultCatalogRecipes = collectCatalogRecipes(catalog);

export function selectBestMarketRecipes(
  products: Record<string, BazaarProduct>,
  source: FusionCatalog = catalog,
): { recipes: FusionRecipe[]; stats: FusionScanStats } {
  const catalogRecipes = source === catalog
    ? defaultCatalogRecipes
    : collectCatalogRecipes(source);
  const bestByOutput = new Map<string, SelectedRecipe>();
  const inputPrices = new Map<string, number | null>();
  const outputPrices = new Map<string, number | null>();
  let pricedCandidates = 0;

  const inputPrice = (id: string): number | null => {
    if (!inputPrices.has(id)) {
      inputPrices.set(id, products[id] ? getInstantBuyPrice(products[id]) : null);
    }
    return inputPrices.get(id) ?? null;
  };

  const outputPrice = (id: string): number | null => {
    if (!outputPrices.has(id)) {
      outputPrices.set(id, products[id] ? getSellOfferPrice(products[id]) : null);
    }
    return outputPrices.get(id) ?? null;
  };

  for (const recipe of catalogRecipes.recipes) {
    if (outputPrice(recipe.output.id) === null) continue;

    const inputPricesForRecipe = recipe.inputs.map((input) => inputPrice(input.id));
    if (inputPricesForRecipe.some((price) => price === null)) continue;
    pricedCandidates += 1;

    const cost = recipe.inputs.reduce(
      (total, input, index) => total + inputPricesForRecipe[index]! * input.amount,
      0,
    );
    const outputKey = `${recipe.output.id}:${recipe.output.amount}`;
    const current = bestByOutput.get(outputKey);
    if (current && current.cost <= cost) continue;

    bestByOutput.set(outputKey, {
      cost,
      recipe,
    });
  }

  const recipes = Array.from(bestByOutput.values(), ({ recipe }) => recipe);
  return {
    recipes,
    stats: {
      uniqueCandidates: catalogRecipes.uniqueCandidates,
      pricedCandidates,
      unavailableCandidates: catalogRecipes.uniqueCandidates - pricedCandidates,
      selectedPaths: recipes.length,
    },
  };
}
