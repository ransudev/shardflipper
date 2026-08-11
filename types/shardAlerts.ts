export type ShardAlert = {
  id: string;
  name: string;
  family: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  buyOrderPrice: number | null;
  instaSellPrice: number | null;
};
