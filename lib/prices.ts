import type { BazaarProduct } from "@/types/bazaar";

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Buy-order price: what you receive when selling into the top Bazaar buy order. */
export function getBuyOrderPrice(product: BazaarProduct): number | null {
  const topOrder = product.buy_summary[0]?.pricePerUnit;
  if (validPrice(topOrder)) return topOrder;

  const quickPrice = product.quick_status.buyPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}

/** Insta-sell price: the current top sell offer used for an immediate purchase. */
export function getInstaSellPrice(product: BazaarProduct): number | null {
  const topOffer = product.sell_summary[0]?.pricePerUnit;
  if (validPrice(topOffer)) return topOffer;

  const quickPrice = product.quick_status.sellPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}

/** Existing calculator aliases, kept stable while exposing market-accurate names for alerts. */
export function getInputPrice(product: BazaarProduct): number | null {
  return getBuyOrderPrice(product);
}

export function getOutputPrice(product: BazaarProduct): number | null {
  return getInstaSellPrice(product);
}
