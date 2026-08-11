"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ShardIcon } from "@/components/ShardIcon";
import { formatCoins } from "@/lib/formatCoins";
import type { ShardAlert } from "@/types/shardAlerts";

type SortKey = "change" | "instaSell" | "buyOrder";
type StorageStatus = "loading" | "tracking" | "ready";

type PriceSnapshot = {
  capturedAt: number;
  prices: Record<string, {
    buyOrderPrice: number | null;
    instaSellPrice: number | null;
  }>;
};

type AlertRow = ShardAlert & {
  previousPrice: number | null;
  change: number | null;
  changePercent: number | null;
};

const STORAGE_KEY = "shard-fusion-finder:direct-shard-prices:v1";
const PAGE_SIZE = 12;
const SERVER_SNAPSHOT = "__server_snapshot__";

function freshness(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function parseSnapshot(raw: string | null): PriceSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (typeof parsed !== "object" || parsed === null || !("capturedAt" in parsed) || !("prices" in parsed)) return null;
    if (typeof parsed.capturedAt !== "number" || typeof parsed.prices !== "object" || parsed.prices === null) return null;
    return parsed as PriceSnapshot;
  } catch {
    return null;
  }
}

function getStoredSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function writeSnapshot(alerts: ShardAlert[], capturedAt: number): void {
  const prices = Object.fromEntries(alerts.map((alert) => [alert.id, {
    buyOrderPrice: alert.buyOrderPrice,
    instaSellPrice: alert.instaSellPrice,
  }]));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ capturedAt, prices } satisfies PriceSnapshot));
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatExactCoins(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function sortValue(row: AlertRow, sort: SortKey): number {
  if (sort === "change") return row.change ?? Number.NEGATIVE_INFINITY;
  if (sort === "instaSell") return row.instaSellPrice ?? Number.NEGATIVE_INFINITY;
  return row.buyOrderPrice ?? Number.NEGATIVE_INFINITY;
}

export function ShardAlerts({
  alerts,
  directCount,
  lastUpdated,
}: {
  alerts: ShardAlert[];
  directCount: number;
  lastUpdated: number;
}) {
  const [sort, setSort] = useState<SortKey>("change");
  const [page, setPage] = useState(1);
  const [freshnessLabel, setFreshnessLabel] = useState("live");
  const storedSnapshot = useSyncExternalStore(subscribeToStorage, getStoredSnapshot, () => SERVER_SNAPSHOT);
  const snapshot = useMemo(
    () => storedSnapshot === SERVER_SNAPSHOT ? null : parseSnapshot(storedSnapshot),
    [storedSnapshot],
  );
  const storageStatus: StorageStatus = storedSnapshot === SERVER_SNAPSHOT
    ? "loading"
    : snapshot
      ? "ready"
      : "tracking";

  useEffect(() => {
    const previous = parseSnapshot(getStoredSnapshot());
    if (!previous || lastUpdated > previous.capturedAt) {
      try {
        writeSnapshot(alerts, lastUpdated);
      } catch {
        // The alert list still works for this render if browser storage is unavailable.
      }
    }
  }, [alerts, lastUpdated]);

  useEffect(() => {
    const update = () => setFreshnessLabel(freshness(lastUpdated));
    update();
    const interval = window.setInterval(update, 15_000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  const rows = useMemo<AlertRow[]>(() => alerts.map((alert) => {
    const previousPrice = snapshot?.prices[alert.id]?.instaSellPrice ?? null;
    const change = previousPrice !== null && alert.instaSellPrice !== null
      ? alert.instaSellPrice - previousPrice
      : null;
    return {
      ...alert,
      previousPrice,
      change,
      changePercent: change !== null && previousPrice !== null && previousPrice > 0 ? (change / previousPrice) * 100 : null,
    };
  }), [alerts, snapshot]);

  const risingRows = useMemo(
    () => rows
      .filter((row) => row.change !== null && row.change > 0)
      .sort((a, b) => sortValue(b, sort) - sortValue(a, sort)),
    [rows, sort],
  );
  const pageCount = Math.max(1, Math.ceil(risingRows.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const pageStart = (activePage - 1) * PAGE_SIZE;
  const visibleRows = risingRows.slice(pageStart, pageStart + PAGE_SIZE);
  const largestMove = risingRows[0];
  const pricedCount = alerts.filter((alert) => alert.instaSellPrice !== null && alert.buyOrderPrice !== null).length;

  const updateSort = (value: SortKey) => {
    setSort(value);
    setPage(1);
  };

  const moveToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount));
  };

  return (
    <section className="alerts-content" aria-labelledby="alerts-list-title">
      <div className="alerts-content-inner">
        <div className="alerts-status-line">
          <span className="live-dot" aria-hidden="true" />
          <span>Live snapshot</span>
          <span aria-hidden="true">·</span>
          <span>Updated {freshnessLabel}</span>
          <span className="alerts-status-separator" aria-hidden="true">·</span>
          <span>{directCount} direct shards monitored</span>
        </div>

        <div className="alerts-summary" aria-label="Shard alert summary">
          <div><span>Moving up</span><strong>{storageStatus === "ready" ? risingRows.length : "—"}</strong></div>
          <div><span>Market coverage</span><strong>{pricedCount}/{directCount}</strong></div>
          <div><span>Largest move</span><strong>{largestMove?.changePercent !== null && largestMove?.changePercent !== undefined ? formatPercent(largestMove.changePercent) : "—"}</strong></div>
        </div>

        <div className="alerts-heading">
          <div>
            <h2 id="alerts-list-title">Rising direct shards</h2>
            <p>{storageStatus === "tracking" ? "This is your first snapshot. Return after prices move to see the alerts." : "Compared with the previous snapshot saved in this browser."}</p>
          </div>
          <label className="alerts-sort" htmlFor="alerts-sort">
            <span>Sort by</span>
            <select id="alerts-sort" value={sort} onChange={(event) => updateSort(event.target.value as SortKey)}>
              <option value="change">Biggest increase</option>
              <option value="instaSell">Insta-sell price</option>
              <option value="buyOrder">Buy order price</option>
            </select>
          </label>
        </div>

        {storageStatus === "loading" ? (
          <div className="alerts-empty" aria-live="polite">
            <span className="alerts-empty-mark" aria-hidden="true">…</span>
            <h3>Loading your price baseline.</h3>
            <p>Comparing this snapshot with the last one saved here.</p>
          </div>
        ) : storageStatus === "tracking" ? (
          <div className="alerts-empty">
            <span className="alerts-empty-mark" aria-hidden="true">↗</span>
            <h3>Tracking starts with this snapshot.</h3>
            <p>Refresh this page after the Bazaar moves. We’ll show Direct shards whose Insta-sell price has climbed, like Ghost from 12K to 16K.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="alerts-empty">
            <span className="alerts-empty-mark" aria-hidden="true">✓</span>
            <h3>No rising Direct shards right now.</h3>
            <p>Prices are steady or lower than your last snapshot. Check again after the next market move.</p>
          </div>
        ) : (
          <>
            <div className="alerts-table" role="table" aria-label="Rising direct shard prices">
              <div className="alerts-table-header" role="row">
                <span role="columnheader">Shard</span>
                <span role="columnheader">Change</span>
                <span role="columnheader">Insta-sell</span>
                <span role="columnheader">Buy order</span>
              </div>
              <div className="alerts-table-body">
                {visibleRows.map((row) => (
                  <div className="alerts-row" role="row" key={row.id}>
                    <div className="alerts-shard" role="cell">
                      <ShardIcon shardId={row.id} name={row.name} size={42} />
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.type} · {row.rarity}</span>
                      </div>
                    </div>
                    <div className="alerts-change" role="cell">
                      <strong>{formatCoins(row.previousPrice ?? 0)} <span aria-hidden="true">→</span> {formatCoins(row.instaSellPrice ?? 0)}</strong>
                      <span>{formatCoins(row.change ?? 0)} · {row.changePercent !== null ? formatPercent(row.changePercent) : "—"}</span>
                    </div>
                    <div className="alerts-price" role="cell">
                      <span className="mobile-label">Insta-sell</span>
                      <strong>{row.instaSellPrice !== null ? formatExactCoins(row.instaSellPrice) : "—"}</strong>
                    </div>
                    <div className="alerts-price" role="cell">
                      <span className="mobile-label">Buy order</span>
                      <strong>{row.buyOrderPrice !== null ? formatExactCoins(row.buyOrderPrice) : "—"}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {risingRows.length > PAGE_SIZE && (
              <nav className="pagination alerts-pagination" aria-label="Shard alert pages">
                <button type="button" onClick={() => moveToPage(activePage - 1)} disabled={activePage === 1}>
                  <span aria-hidden="true">←</span>
                  <span>Previous</span>
                </button>
                <p>Page <strong>{activePage}</strong> of <strong>{pageCount}</strong></p>
                <button type="button" onClick={() => moveToPage(activePage + 1)} disabled={activePage === pageCount}>
                  <span>Next</span>
                  <span aria-hidden="true">→</span>
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
