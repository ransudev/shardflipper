import type { BazaarProduct } from "@/types/bazaar";

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Price paid when instantly buying from the lowest sell offer. */
export function getInputPrice(product: BazaarProduct): number | null {
  const topOffer = product.sell_summary[0]?.pricePerUnit;
  if (validPrice(topOffer)) return topOffer;

  const quickPrice = product.quick_status.sellPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}

/** Coins received when instantly selling into the highest buy order. */
export function getOutputPrice(product: BazaarProduct): number | null {
  const topOrder = product.buy_summary[0]?.pricePerUnit;
  if (validPrice(topOrder)) return topOrder;

  const quickPrice = product.quick_status.buyPrice;
  return validPrice(quickPrice) ? quickPrice : null;
}
