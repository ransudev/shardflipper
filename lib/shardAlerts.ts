import "server-only";

import catalogJson from "@/data/fusion-data.json";
import ratesJson from "@/data/rates.json";
import { getFreshBazaarData } from "@/lib/hypixel";
import { getAverageBuyOrderPrice, getBuyOrderPrice } from "@/lib/prices";
import { cacheLife } from "next/cache";
import type { BazaarResponse } from "@/types/bazaar";
import type { ShardAlert, ShardAlertSnapshot } from "@/types/shardAlerts";
import type { FusionCatalog } from "@/types/fusionCatalog";

const catalog = catalogJson as unknown as FusionCatalog;
const directRates = ratesJson as Record<string, number>;
const SNAPSHOT_ID = "current";
const SNAPSHOT_TABLE = "shard_alert_snapshots";

const directShardDefinitions = Object.entries(catalog.shards)
  .filter(([shortId]) => (directRates[shortId] ?? 0) > 0)
  .map(([, shard]) => ({
    id: shard.internal_id,
    name: shard.name,
    family: shard.family,
    type: shard.type,
    rarity: shard.rarity,
  }));

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type StoredSnapshotRow = {
  id: string;
  last_updated: number;
  captured_at: string;
  direct_count: number;
  alerts: unknown;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function supabaseHeaders(config: SupabaseConfig, extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra,
  };
}

async function supabaseRequest<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${SNAPSHOT_TABLE}${path}`, {
    ...init,
    cache: "no-store",
    headers: supabaseHeaders(config, {
      "Content-Type": "application/json",
      ...init.headers,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Supabase alert storage failed (${response.status}): ${detail}`);
  }

  const body = await response.text();
  if (!body.trim()) return undefined as T;
  return JSON.parse(body) as T;
}

function isRarity(value: unknown): value is ShardAlert["rarity"] {
  return value === "common" || value === "uncommon" || value === "rare" || value === "epic" || value === "legendary";
}

function parseShardAlert(value: unknown): ShardAlert | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("id" in value) || typeof value.id !== "string") return null;
  if (!("name" in value) || typeof value.name !== "string") return null;
  if (!("family" in value) || typeof value.family !== "string") return null;
  if (!("type" in value) || typeof value.type !== "string") return null;
  if (!("rarity" in value) || !isRarity(value.rarity)) return null;
  if (!("currentPrice" in value) || (value.currentPrice !== null && typeof value.currentPrice !== "number")) return null;
  if (!("averagePrice" in value) || (value.averagePrice !== null && typeof value.averagePrice !== "number")) return null;

  return value as ShardAlert;
}

function parseStoredSnapshot(value: unknown): ShardAlertSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("id" in value) || value.id !== SNAPSHOT_ID) return null;
  if (!("last_updated" in value) || typeof value.last_updated !== "number") return null;
  if (!("captured_at" in value) || typeof value.captured_at !== "string") return null;
  if (!("direct_count" in value) || typeof value.direct_count !== "number") return null;
  if (!("alerts" in value) || !Array.isArray(value.alerts)) return null;

  const capturedAt = Date.parse(value.captured_at);
  const alerts = value.alerts.map(parseShardAlert);
  if (!Number.isFinite(capturedAt) || alerts.some((alert) => alert === null)) return null;

  return {
    alerts: alerts as ShardAlert[],
    directCount: value.direct_count,
    lastUpdated: value.last_updated,
    capturedAt,
  };
}

export function buildShardAlertsSnapshot(bazaar: BazaarResponse): ShardAlertSnapshot {
  return {
    directCount: directShardDefinitions.length,
    lastUpdated: bazaar.lastUpdated,
    capturedAt: Date.now(),
    alerts: directShardDefinitions.map((shard) => {
      const product = bazaar.products[shard.id];
      return {
        ...shard,
        currentPrice: product ? getBuyOrderPrice(product) : null,
        averagePrice: product ? getAverageBuyOrderPrice(product) : null,
      };
    }),
  };
}

export async function getFreshShardAlertsData(): Promise<ShardAlertSnapshot> {
  return buildShardAlertsSnapshot(await getFreshBazaarData());
}

export async function saveShardAlertsSnapshot(snapshot: ShardAlertSnapshot): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for shard alert storage");
  }

  await supabaseRequest(config, `?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: SNAPSHOT_ID,
      last_updated: snapshot.lastUpdated,
      captured_at: new Date(snapshot.capturedAt).toISOString(),
      direct_count: snapshot.directCount,
      alerts: snapshot.alerts,
    }),
  });
}

export async function getStoredShardAlertsData(): Promise<ShardAlertSnapshot | null> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });

  const config = getSupabaseConfig();
  if (!config) return null;

  const rows = await supabaseRequest<StoredSnapshotRow[]>(
    config,
    `?id=eq.${SNAPSHOT_ID}&select=id,last_updated,captured_at,direct_count,alerts&limit=1`,
  );
  return parseStoredSnapshot(rows?.[0]);
}
