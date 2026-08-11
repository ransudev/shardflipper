import { describe, expect, it } from "vitest";
import { getAverageBuyOrderPrice } from "@/lib/prices";
import type { BazaarProduct } from "@/types/bazaar";

function product(buyPrice: number): BazaarProduct {
  return {
    product_id: "SHARD_TEST",
    buy_summary: [{ amount: 100, pricePerUnit: buyPrice + 10, orders: 1 }],
    sell_summary: [{ amount: 100, pricePerUnit: buyPrice + 20, orders: 1 }],
    quick_status: {
      productId: "SHARD_TEST",
      buyPrice,
      sellPrice: buyPrice + 20,
      buyVolume: 100,
      sellVolume: 100,
      buyMovingWeek: 0,
      sellMovingWeek: 0,
      buyOrders: 1,
      sellOrders: 1,
    },
  };
}

describe("getAverageBuyOrderPrice", () => {
  it("uses Hypixel's current average buy-order price as the baseline", () => {
    expect(getAverageBuyOrderPrice(product(12_000))).toBe(12_000);
  });

  it("ignores missing or non-positive averages", () => {
    expect(getAverageBuyOrderPrice(product(0))).toBeNull();
  });
});
