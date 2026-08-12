import { describe, expect, it } from "vitest";
import { calculateFusion } from "@/lib/calculateFusion";
import type { BazaarProduct } from "@/types/bazaar";
import type { FusionRecipe } from "@/types/fusion";

function product(id: string, sellOffer: number, buyOrder: number): BazaarProduct {
  return {
    product_id: id,
    sell_summary: [{ amount: 100, pricePerUnit: sellOffer, orders: 1 }],
    buy_summary: [{ amount: 100, pricePerUnit: buyOrder, orders: 1 }],
    quick_status: {
      productId: id,
      buyPrice: buyOrder,
      sellPrice: sellOffer,
      buyVolume: 0,
      sellVolume: 0,
      buyMovingWeek: 0,
      sellMovingWeek: 0,
      buyOrders: 1,
      sellOrders: 1,
    },
  };
}

const recipe: FusionRecipe = {
  id: "acceptance-test",
  inputs: [{ id: "SHARD_A", amount: 5 }, { id: "SHARD_B", amount: 5 }],
  output: { id: "SHARD_C", amount: 1 },
};

describe("calculateFusion", () => {
  it("matches the specification acceptance example", () => {
    const result = calculateFusion(recipe, {
      SHARD_A: product("SHARD_A", 10_000, 9_000),
      SHARD_B: product("SHARD_B", 20_000, 19_000),
      SHARD_C: product("SHARD_C", 205_000, 200_000),
    }, new Map());

    expect(result?.inputCost).toBe(140_000);
    expect(result?.outputValue).toBe(205_000);
    expect(result?.outputValues).toEqual({ instantSell: 200_000, sellOffer: 205_000 });
    expect(result?.profit).toBe(65_000);
    expect(result?.margin).toBeCloseTo(46.43, 2);
    expect(result?.steps).toHaveLength(1);
  });

  it("calculates and exposes a multi-step fusion chain", () => {
    const chainedRecipe: FusionRecipe = {
      id: "chained-path",
      inputs: [{ id: "SHARD_C", amount: 1 }, { id: "SHARD_D", amount: 1 }],
      output: { id: "SHARD_O", amount: 1 },
      inputPlans: [
        {
          id: "SHARD_C",
          amount: 1,
          method: "fuse",
          totalCost: 20,
          crafts: 1,
          producedAmount: 1,
          recipe: {
            id: "make-c",
            inputs: [{ id: "SHARD_A", amount: 1 }, { id: "SHARD_B", amount: 1 }],
            output: { id: "SHARD_C", amount: 1 },
          },
          inputs: [
            { id: "SHARD_A", amount: 1, method: "buy", totalCost: 10 },
            { id: "SHARD_B", amount: 1, method: "buy", totalCost: 10 },
          ],
        },
        { id: "SHARD_D", amount: 1, method: "buy", totalCost: 10 },
      ],
    };

    const result = calculateFusion(chainedRecipe, {
      SHARD_O: product("SHARD_O", 200, 190),
    }, new Map());

    expect(result?.inputCost).toBe(30);
    expect(result?.profit).toBe(170);
    expect(result?.steps.map((step) => step.output.id)).toEqual(["SHARD_C", "SHARD_O"]);
    expect(result?.inputs.map((input) => input.id).sort()).toEqual([
      "SHARD_A",
      "SHARD_B",
      "SHARD_D",
    ]);
  });

  it("returns unavailable when a required order book is missing", () => {
    const unavailable = product("SHARD_A", 10_000, 9_000);
    unavailable.buy_summary = [];
    unavailable.quick_status.buyPrice = 0;

    expect(calculateFusion(recipe, {
      SHARD_A: unavailable,
      SHARD_B: product("SHARD_B", 20_000, 19_000),
      SHARD_C: product("SHARD_C", 205_000, 200_000),
    }, new Map())).toBeNull();
  });
});
