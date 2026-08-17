import "server-only";

import catalogJson from "@/data/fusion-data.json";
import { getInstantBuyPrice, getSellOfferPrice } from "@/lib/prices";
import type { BazaarProduct } from "@/types/bazaar";
import type {
  FusionAcquisitionPlan,
  FusionRecipe,
  FusionScanStats,
} from "@/types/fusion";
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

function choiceDependsOn(
  shardId: string,
  targetId: string,
  choices: Map<string, FusionRecipe | null>,
  visited = new Set<string>(),
): boolean {
  if (shardId === targetId) return true;
  if (visited.has(shardId)) return false;
  visited.add(shardId);

  const choice = choices.get(shardId);
  return choice?.inputs.some((input) =>
    choiceDependsOn(input.id, targetId, choices, visited),
  ) ?? false;
}

function findBestAcquisitionChoices(
  recipes: FusionRecipe[],
  directCosts: Map<string, number>,
): Map<string, FusionRecipe | null> {
  const recipesByOutput = new Map<string, FusionRecipe[]>();
  const dependents = new Map<string, Set<string>>();
  const costs = new Map(directCosts);
  const choices = new Map<string, FusionRecipe | null>();

  for (const id of directCosts.keys()) choices.set(id, null);
  for (const recipe of recipes) {
    const outputRecipes = recipesByOutput.get(recipe.output.id) ?? [];
    outputRecipes.push(recipe);
    recipesByOutput.set(recipe.output.id, outputRecipes);

    for (const input of recipe.inputs) {
      const inputDependents = dependents.get(input.id) ?? new Set<string>();
      inputDependents.add(recipe.output.id);
      dependents.set(input.id, inputDependents);
    }
  }

  const queue = Array.from(recipesByOutput.keys());
  const queued = new Set(queue);
  const tolerance = 1e-6;

  while (queue.length > 0) {
    const outputId = queue.shift()!;
    queued.delete(outputId);
    let bestCost = costs.get(outputId) ?? Number.POSITIVE_INFINITY;
    let bestChoice = choices.get(outputId) ?? null;

    for (const recipe of recipesByOutput.get(outputId) ?? []) {
      if (recipe.inputs.some((input) =>
        choiceDependsOn(input.id, outputId, choices),
      )) continue;

      let totalCost = 0;
      let available = true;
      for (const input of recipe.inputs) {
        const unitCost = costs.get(input.id) ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(unitCost)) {
          available = false;
          break;
        }
        totalCost += unitCost * input.amount;
      }
      if (!available) continue;

      const costPerUnit = totalCost / recipe.output.amount;
      if (costPerUnit < bestCost - tolerance) {
        bestCost = costPerUnit;
        bestChoice = recipe;
      }
    }

    const previousCost = costs.get(outputId) ?? Number.POSITIVE_INFINITY;
    if (bestCost >= previousCost - tolerance) continue;

    costs.set(outputId, bestCost);
    choices.set(outputId, bestChoice);
    for (const dependent of dependents.get(outputId) ?? []) {
      if (!queued.has(dependent)) {
        queue.push(dependent);
        queued.add(dependent);
      }
    }
  }

  return choices;
}

function buildAcquisitionPlan(
  shardId: string,
  amount: number,
  directCosts: Map<string, number>,
  choices: Map<string, FusionRecipe | null>,
  blocked: Set<string>,
): FusionAcquisitionPlan | null {
  const directUnitCost = directCosts.get(shardId) ?? Number.POSITIVE_INFINITY;
  const directCost = directUnitCost * amount;
  const directPlan = Number.isFinite(directCost)
    ? { id: shardId, amount, totalCost: directCost, method: "buy" as const }
    : null;

  if (blocked.has(shardId)) return directPlan;
  const recipe = choices.get(shardId);
  if (!recipe) return directPlan;

  const crafts = Math.ceil(amount / recipe.output.amount);
  const nextBlocked = new Set(blocked);
  nextBlocked.add(shardId);
  const inputs = recipe.inputs.map((input) =>
    buildAcquisitionPlan(
      input.id,
      input.amount * crafts,
      directCosts,
      choices,
      nextBlocked,
    ),
  );
  if (inputs.some((input) => input === null)) return directPlan;

  const resolvedInputs = inputs as FusionAcquisitionPlan[];
  const fusedCost = resolvedInputs.reduce((total, input) => total + input.totalCost, 0);
  if (directPlan && fusedCost >= directPlan.totalCost - 1e-6) return directPlan;

  return {
    id: shardId,
    amount,
    totalCost: fusedCost,
    method: "fuse",
    crafts,
    producedAmount: crafts * recipe.output.amount,
    recipe,
    inputs: resolvedInputs,
  };
}

export function selectBestMarketRecipes(
  products: Record<string, BazaarProduct>,
  source: FusionCatalog = catalog,
): { recipes: FusionRecipe[]; stats: FusionScanStats } {
  const catalogRecipes = source === catalog
    ? defaultCatalogRecipes
    : collectCatalogRecipes(source);
  const bestByOutput = new Map<string, SelectedRecipe>();
  const directCosts = new Map<string, number>();
  const outputPrices = new Map<string, number | null>();
  let pricedCandidates = 0;

  for (const shard of Object.values(source.shards)) {
    const price = products[shard.internal_id]
      ? getInstantBuyPrice(products[shard.internal_id])
      : null;
    directCosts.set(
      shard.internal_id,
      price ?? Number.POSITIVE_INFINITY,
    );
  }

  const choices = findBestAcquisitionChoices(catalogRecipes.recipes, directCosts);

  const outputPrice = (id: string): number | null => {
    if (!outputPrices.has(id)) {
      outputPrices.set(id, products[id] ? getSellOfferPrice(products[id]) : null);
    }
    return outputPrices.get(id) ?? null;
  };

  for (const recipe of catalogRecipes.recipes) {
    if (outputPrice(recipe.output.id) === null) continue;

    const blocked = new Set([recipe.output.id]);
    const inputPlans = recipe.inputs.map((input) =>
      buildAcquisitionPlan(
        input.id,
        input.amount,
        directCosts,
        choices,
        blocked,
      ),
    );
    if (inputPlans.some((plan) => plan === null)) continue;
    pricedCandidates += 1;

    const resolvedPlans = inputPlans as FusionAcquisitionPlan[];
    const cost = resolvedPlans.reduce((total, plan) => total + plan.totalCost, 0);
    const outputKey = `${recipe.output.id}:${recipe.output.amount}`;
    const current = bestByOutput.get(outputKey);
    if (current && current.cost <= cost) continue;

    bestByOutput.set(outputKey, {
      cost,
      recipe: { ...recipe, inputPlans: resolvedPlans },
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
