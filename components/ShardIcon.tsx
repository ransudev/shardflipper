type ShardIconProps = {
  shardId: string;
  name: string;
  size?: number;
  priority?: boolean;
};

export function ShardIcon({ shardId, name, size = 38, priority = false }: ShardIconProps) {
  return (
    <span className="shard-icon" style={{ width: size, height: size }}>
      {/* The local route already returns the final PNG and does not benefit from Next image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/shards/${encodeURIComponent(shardId)}/icon`}
        alt={`${name} shard`}
        width={180}
        height={191}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </span>
  );
}
