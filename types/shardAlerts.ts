export const SHARD_SPIKE_THRESHOLD_PERCENT = 10;

export type ShardAlert = {
  id: string;
  name: string;
  family: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  currentPrice: number | null;
  averagePrice: number | null;
};
