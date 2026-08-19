import { describe, expect, it, vi } from "vitest";
import catalogDataJson from "@/data/fusion-data.json";
import type { BazaarProduct } from "@/types/bazaar";
import type { FusionCatalog } from "@/types/fusionCatalog";

vi.mock("server-only", () => ({}));

const { selectBestMarketRecipes } = await import("@/lib/fusionCatalog");

function product(id: string, inputPrice: number, outputPrice = inputPrice): BazaarProduct {
  return {
    product_id: id,
    buy_summary: [{ amount: 100, pricePerUnit: outputPrice, orders: 1 }],
    sell_summary: [{ amount: 100, pricePerUnit: inputPrice, orders: 1 }],
    quick_status: {
      productId: id,
      buyPrice: outputPrice,
      sellPrice: inputPrice,
      buyVolume: 0,
      sellVolume: 0,
      buyMovingWeek: 0,
      sellMovingWeek: 0,
      buyOrders: 1,
      sellOrders: 1,
    },
  };
}

const shard = (id: string, amount = 1) => ({
  name: id,
  family: "Test",
  type: "Test",
  rarity: "common" as const,
  fuse_amount: amount,
  internal_id: `SHARD_${id}`,
});

describe("fusion catalog selection", () => {
  it("deduplicates mirrors and selects the cheapest market path", () => {
    const source: FusionCatalog = {
      shards: {
        A: shard("A"),
        B: shard("B"),
        C: shard("C", 2),
        D: shard("D", 2),
        O: shard("O"),
      },
      recipes: {
        O: { "1": [["A", "B"], ["B", "A"], ["C", "D"]] },
      },
    };
    const products = {
      SHARD_A: product("SHARD_A", 10),
      SHARD_B: product("SHARD_B", 20),
      SHARD_C: product("SHARD_C", 3),
      SHARD_D: product("SHARD_D", 4),
      SHARD_O: product("SHARD_O", 90, 100),
    };

    const selection = selectBestMarketRecipes(products, source);

    expect(selection.stats).toEqual({
      uniqueCandidates: 2,
      pricedCandidates: 2,
      unavailableCandidates: 0,
      selectedPaths: 1,
    });
    expect(selection.recipes[0].inputs).toEqual([
      { id: "SHARD_C", amount: 2 },
      { id: "SHARD_D", amount: 2 },
    ]);
  });

  it("uses a cheaper intermediate fusion in the selected path", () => {
    const source: FusionCatalog = {
      shards: {
        A: shard("A"),
        B: shard("B"),
        C: shard("C"),
        D: shard("D"),
        O: shard("O"),
      },
      recipes: {
        C: { "1": [["A", "B"]] },
        O: { "1": [["C", "D"]] },
      },
    };
    const products = {
      SHARD_A: product("SHARD_A", 10),
      SHARD_B: product("SHARD_B", 10),
      SHARD_C: product("SHARD_C", 100),
      SHARD_D: product("SHARD_D", 10),
      SHARD_O: product("SHARD_O", 200),
    };

    const selection = selectBestMarketRecipes(products, source);
    const outputPath = selection.recipes.find((recipe) => recipe.output.id === "SHARD_O");

    expect(outputPath?.inputPlans?.[0]).toMatchObject({
      id: "SHARD_C",
      method: "fuse",
      totalCost: 20,
      producedAmount: 1,
    });
    expect(outputPath?.inputPlans?.[0].inputs).toEqual([
      { id: "SHARD_A", amount: 1, method: "buy", totalCost: 10 },
      { id: "SHARD_B", amount: 1, method: "buy", totalCost: 10 },
    ]);
    expect(outputPath?.inputPlans?.[1]).toMatchObject({
      id: "SHARD_D",
      method: "buy",
      totalCost: 10,
    });
  });

  it("covers the complete catalog without materializing client rows", () => {
    const realCatalogProducts: Record<string, BazaarProduct> = {};
    const catalogData = catalogDataJson as unknown as FusionCatalog;
    for (const catalogShard of Object.values(catalogData.shards)) {
      realCatalogProducts[catalogShard.internal_id] = product(catalogShard.internal_id, 1);
    }

    const selection = selectBestMarketRecipes(realCatalogProducts, catalogData);

    expect(selection.stats.uniqueCandidates).toBe(134_971);
    expect(selection.stats.pricedCandidates).toBe(134_971);
    expect(selection.stats.selectedPaths).toBe(408);
  });
});
