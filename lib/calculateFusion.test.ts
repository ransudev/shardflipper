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

    expect(result?.inputCost).toBe(150_000);
    expect(result?.outputValue).toBe(200_000);
    expect(result?.profit).toBe(50_000);
    expect(result?.margin).toBeCloseTo(33.33, 2);
  });

  it("returns unavailable when a required order book is missing", () => {
    const unavailable = product("SHARD_A", 10_000, 9_000);
    unavailable.sell_summary = [];
    unavailable.quick_status.sellPrice = 0;

    expect(calculateFusion(recipe, {
      SHARD_A: unavailable,
      SHARD_B: product("SHARD_B", 20_000, 19_000),
      SHARD_C: product("SHARD_C", 205_000, 200_000),
    }, new Map())).toBeNull();
  });
});
