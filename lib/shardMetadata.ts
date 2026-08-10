import type { ShardMetadata, SkyBlockItem } from "@/types/item";

export function nameFromShardId(id: string): string {
  return id
    .replace(/^SHARD_/, "")
    .split("_")
    .filter(Boolean)
    .map((word) => `${word[0]}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function buildShardMetadata(
  ids: Iterable<string>,
  items: SkyBlockItem[],
  catalogNames: Map<string, string> = new Map(),
): Map<string, ShardMetadata> {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const metadata = new Map<string, ShardMetadata>();

  for (const id of ids) {
    const item = itemMap.get(id);
    metadata.set(id, {
      id,
      name:
        item?.name?.replace(/ Shard$/i, "") ||
        catalogNames.get(id) ||
        nameFromShardId(id),
      material: item?.material,
      tier: item?.tier,
      imageUrl: `/api/shards/${encodeURIComponent(id)}/icon`,
    });
  }

  return metadata;
}
