import { getInputPrice, getOutputPrice } from "@/lib/prices";
import { nameFromShardId } from "@/lib/shardMetadata";
import type { BazaarProduct } from "@/types/bazaar";
import type {
  CalculatedIngredient,
  FusionRecipe,
  FusionResult,
} from "@/types/fusion";
import type { ShardMetadata } from "@/types/item";

export function calculateFusion(
  recipe: FusionRecipe,
  products: Record<string, BazaarProduct>,
  metadata: Map<string, ShardMetadata>,
): FusionResult | null {
  const inputs: CalculatedIngredient[] = [];

  for (const ingredient of recipe.inputs) {
    const product = products[ingredient.id];
    if (!product) return null;
    const unitPrice = getInputPrice(product);
    if (unitPrice === null) return null;
    const shard = metadata.get(ingredient.id);
    inputs.push({
      ...ingredient,
      name: shard?.name ?? nameFromShardId(ingredient.id),
      unitPrice,
      totalPrice: unitPrice * ingredient.amount,
      imageUrl: shard?.imageUrl,
    });
  }

  const outputProduct = products[recipe.output.id];
  if (!outputProduct) return null;
  const outputPrice = getOutputPrice(outputProduct);
  if (outputPrice === null) return null;
  const outputMetadata = metadata.get(recipe.output.id);
  const output: CalculatedIngredient = {
    ...recipe.output,
    name: outputMetadata?.name ?? nameFromShardId(recipe.output.id),
    unitPrice: outputPrice,
    totalPrice: outputPrice * recipe.output.amount,
    imageUrl: outputMetadata?.imageUrl,
  };

  const inputCost = inputs.reduce((total, input) => total + input.totalPrice, 0);
  if (inputCost <= 0) return null;
  const outputValue = output.totalPrice;
  const profit = outputValue - inputCost;

  return {
    fusionId: recipe.id,
    inputs,
    output,
    inputCost,
    outputValue,
    profit,
    margin: (profit / inputCost) * 100,
  };
}

export function calculateAllFusions(
  recipes: FusionRecipe[],
  products: Record<string, BazaarProduct>,
  metadata: Map<string, ShardMetadata>,
): FusionResult[] {
  return recipes
    .map((recipe) => calculateFusion(recipe, products, metadata))
    .filter((result): result is FusionResult => result !== null)
    .sort((a, b) => b.profit - a.profit);
}
