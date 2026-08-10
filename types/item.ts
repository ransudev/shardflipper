export type SkyBlockItemSkin = {
  value?: string;
  signature?: string;
};

export type SkyBlockItem = {
  id: string;
  name: string;
  material?: string;
  tier?: string;
  category?: string;
  skin?: SkyBlockItemSkin;
};

export type SkyBlockItemsResponse = {
  success: boolean;
  lastUpdated: number;
  items: SkyBlockItem[];
};

export type ShardMetadata = {
  id: string;
  name: string;
  material?: string;
  tier?: string;
  imageUrl?: string;
};
