export type BazaarOrder = {
  amount: number;
  pricePerUnit: number;
  orders: number;
};

export type BazaarQuickStatus = {
  productId: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
  buyMovingWeek: number;
  sellMovingWeek: number;
  buyOrders: number;
  sellOrders: number;
};

export type BazaarProduct = {
  product_id: string;
  buy_summary: BazaarOrder[];
  sell_summary: BazaarOrder[];
  quick_status: BazaarQuickStatus;
};

export type BazaarResponse = {
  success: boolean;
  lastUpdated: number;
  products: Record<string, BazaarProduct>;
};
