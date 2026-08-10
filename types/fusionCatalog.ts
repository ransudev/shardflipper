export type CatalogShard = {
  name: string;
  family: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  fuse_amount: number;
  internal_id: string;
};

export type FusionCatalog = {
  shards: Record<string, CatalogShard>;
  recipes: Record<string, Record<string, [string, string][]>>;
};
