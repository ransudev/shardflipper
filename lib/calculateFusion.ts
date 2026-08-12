import { getInputPrice, getInstantSellPrice, getSellOfferPrice } from "@/lib/prices";
import { nameFromShardId } from "@/lib/shardMetadata";
import type { BazaarProduct } from "@/types/bazaar";
import type {
  CalculatedIngredient,
  CalculatedPathIngredient,
  FusionAcquisitionPlan,
  FusionPathStep,
  FusionRecipe,
  FusionResult,
} from "@/types/fusion";
import type { ShardMetadata } from "@/types/item";

function calculatedIngredient(
  id: string,
  amount: number,
  unitPrice: number,
  totalPrice: number,
  metadata: Map<string, ShardMetadata>,
): CalculatedIngredient {
  const shard = metadata.get(id);
  return {
    id,
    amount,
    name: shard?.name ?? nameFromShardId(id),
    unitPrice,
    totalPrice,
    imageUrl: shard?.imageUrl,
  };
}

function pathIngredient(
  plan: FusionAcquisitionPlan,
  metadata: Map<string, ShardMetadata>,
): CalculatedPathIngredient {
  return {
    ...calculatedIngredient(
      plan.id,
      plan.amount,
      plan.totalCost / plan.amount,
      plan.totalCost,
      metadata,
    ),
    source: plan.method,
  };
}

function appendAcquisitionSteps(
  plan: FusionAcquisitionPlan,
  metadata: Map<string, ShardMetadata>,
  steps: FusionPathStep[],
): void {
  if (plan.method === "buy" || !plan.recipe || !plan.inputs) return;

  for (const input of plan.inputs) {
    appendAcquisitionSteps(input, metadata, steps);
  }

  const producedAmount = plan.producedAmount ?? plan.amount;
  steps.push({
    stepNumber: steps.length + 1,
    inputs: plan.inputs.map((input) => pathIngredient(input, metadata)),
    output: calculatedIngredient(
      plan.id,
      producedAmount,
      plan.totalCost / producedAmount,
      plan.totalCost,
      metadata,
    ),
    materialCost: plan.totalCost,
  });
}

function collectPurchases(
  plan: FusionAcquisitionPlan,
  purchases: Map<string, { amount: number; totalCost: number }>,
): void {
  if (plan.method === "buy") {
    const current = purchases.get(plan.id) ?? { amount: 0, totalCost: 0 };
    current.amount += plan.amount;
    current.totalCost += plan.totalCost;
    purchases.set(plan.id, current);
    return;
  }

  for (const input of plan.inputs ?? []) collectPurchases(input, purchases);
}

export function calculateFusion(
  recipe: FusionRecipe,
  products: Record<string, BazaarProduct>,
  metadata: Map<string, ShardMetadata>,
): FusionResult | null {
  const inputPlans: FusionAcquisitionPlan[] = [];

  for (let index = 0; index < recipe.inputs.length; index += 1) {
    const ingredient = recipe.inputs[index];
    const planned = recipe.inputPlans?.[index];
    if (planned) {
      inputPlans.push(planned);
      continue;
    }

    const product = products[ingredient.id];
    if (!product) return null;
    const unitPrice = getInputPrice(product);
    if (unitPrice === null) return null;
    inputPlans.push({
      ...ingredient,
      method: "buy",
      totalCost: unitPrice * ingredient.amount,
    });
  }

  const outputProduct = products[recipe.output.id];
  if (!outputProduct) return null;
  const instantSellPrice = getInstantSellPrice(outputProduct);
  const sellOfferPrice = getSellOfferPrice(outputProduct);
  if (instantSellPrice === null || sellOfferPrice === null) return null;
  const output = calculatedIngredient(
    recipe.output.id,
    recipe.output.amount,
    sellOfferPrice,
    sellOfferPrice * recipe.output.amount,
    metadata,
  );
  output.buyVolume = outputProduct.quick_status.buyVolume;
  output.sellVolume = outputProduct.quick_status.sellVolume;

  const inputCost = inputPlans.reduce((total, plan) => total + plan.totalCost, 0);
  if (inputCost <= 0) return null;
  const outputValues = {
    instantSell: instantSellPrice * recipe.output.amount,
    sellOffer: sellOfferPrice * recipe.output.amount,
  };
  const outputValue = outputValues.sellOffer;
  const profit = outputValue - inputCost;
  const purchases = new Map<string, { amount: number; totalCost: number }>();
  const steps: FusionPathStep[] = [];

  for (const plan of inputPlans) {
    collectPurchases(plan, purchases);
    appendAcquisitionSteps(plan, metadata, steps);
  }

  const inputs = Array.from(purchases, ([id, purchase]) =>
    calculatedIngredient(
      id,
      purchase.amount,
      purchase.totalCost / purchase.amount,
      purchase.totalCost,
      metadata,
    ),
  ).sort((a, b) => b.totalPrice - a.totalPrice || a.name.localeCompare(b.name));

  steps.push({
    stepNumber: steps.length + 1,
    inputs: inputPlans.map((plan) => pathIngredient(plan, metadata)),
    output,
    materialCost: inputCost,
  });

  return {
    fusionId: recipe.id,
    inputs,
    steps,
    acquisitionPlan: inputPlans,
    output,
    inputCost,
    outputValue,
    outputValues,
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
