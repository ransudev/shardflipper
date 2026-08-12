import type { BazaarOrder, BazaarProduct } from "@/types/bazaar";

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function bestOrderPrice(orders: BazaarOrder[], direction: "highest" | "lowest"): number | null {
  let bestPrice: number | null = null;

  for (const order of orders) {
    if (!validPrice(order.pricePerUnit)) continue;
    if (
      bestPrice === null ||
      (direction === "highest" && order.pricePerUnit > bestPrice) ||
      (direction === "lowest" && order.pricePerUnit < bestPrice)
    ) {
      bestPrice = order.pricePerUnit;
    }
  }

  return bestPrice;
}

/** Instant-sell price: what you receive by filling the top Bazaar buy order. */
export function getInstantSellPrice(product: BazaarProduct): number | null {
  const bestBuyOrder = bestOrderPrice(product.buy_summary, "highest");
  if (bestBuyOrder !== null) return bestBuyOrder;

  const quickPrice = product.quick_status.buyPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}

/** Sell-offer price: the current lowest sell offer on the Bazaar. */
export function getSellOfferPrice(product: BazaarProduct): number | null {
  const bestSellOffer = bestOrderPrice(product.sell_summary, "lowest");
  if (bestSellOffer !== null) return bestSellOffer;

  const quickPrice = product.quick_status.sellPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}

/** Instant-buy price: the price paid when immediately filling a sell offer. */
export function getInstantBuyPrice(product: BazaarProduct): number | null {
  return getSellOfferPrice(product);
}

/** Buy-order price: the price received when immediately selling into a buy order. */
export function getBuyOrderPrice(product: BazaarProduct): number | null {
  return getInstantSellPrice(product);
}

/** Hypixel's average buy-order price for the current Bazaar snapshot. */
export function getAverageBuyOrderPrice(product: BazaarProduct): number | null {
  const averagePrice = product.quick_status.buyPrice;
  return validPrice(averagePrice) ? averagePrice : null;
}

/** Calculator aliases: inputs are bought instantly; outputs are sold instantly. */
export function getInputPrice(product: BazaarProduct): number | null {
  return getInstantBuyPrice(product);
}

export function getOutputPrice(product: BazaarProduct): number | null {
  return getInstantSellPrice(product);
}
