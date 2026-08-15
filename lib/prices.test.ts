import { describe, expect, it } from "vitest";
import { getAverageBuyOrderPrice, getInstantBuyPrice, getInstantSellPrice, getSellOfferPrice } from "@/lib/prices";
import type { BazaarProduct } from "@/types/bazaar";

function product(buyOrderPrice: number): BazaarProduct {
  return {
    product_id: "SHARD_TEST",
    buy_summary: [
      { amount: 100, pricePerUnit: buyOrderPrice + 15, orders: 1 },
      { amount: 100, pricePerUnit: buyOrderPrice + 30, orders: 1 },
    ],
    sell_summary: [
      { amount: 100, pricePerUnit: buyOrderPrice + 20, orders: 1 },
      { amount: 100, pricePerUnit: buyOrderPrice + 30, orders: 1 },
    ],
    quick_status: {
      productId: "SHARD_TEST",
      buyPrice: buyOrderPrice + 15,
      sellPrice: buyOrderPrice + 30,
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
    expect(getAverageBuyOrderPrice(product(12_000))).toBe(12_030);
  });

  it("ignores missing or non-positive averages", () => {
    const bazaarProduct = product(0);
    bazaarProduct.quick_status.sellPrice = 0;
    expect(getAverageBuyOrderPrice(bazaarProduct)).toBeNull();
  });
});

describe("Bazaar execution prices", () => {
  it("maps API summaries to their actual Bazaar execution sides", () => {
    const bazaarProduct = product(12_000);

    expect(getInstantSellPrice(bazaarProduct)).toBe(12_030);
    expect(getSellOfferPrice(bazaarProduct)).toBe(12_015);
    expect(getInstantBuyPrice(bazaarProduct)).toBe(12_015);
  });
});
