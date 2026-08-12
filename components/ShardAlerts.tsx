"use client";

import { useEffect, useMemo, useState } from "react";
import { ShardIcon } from "@/components/ShardIcon";
import { formatCoins } from "@/lib/formatCoins";
import { SHARD_SPIKE_THRESHOLD_PERCENT, type ShardAlert, type ShardAlertSnapshot } from "@/types/shardAlerts";

type SortKey = "spike" | "current" | "average";

type AlertRow = ShardAlert & {
  spike: number | null;
  spikePercent: number | null;
};

const PAGE_SIZE = 12;
const EMPTY_ALERTS: ShardAlert[] = [];

function freshness(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatExactCoins(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function sortValue(row: AlertRow, sort: SortKey): number {
  if (sort === "spike") return row.spikePercent ?? Number.NEGATIVE_INFINITY;
  if (sort === "current") return row.currentPrice ?? Number.NEGATIVE_INFINITY;
  return row.averagePrice ?? Number.NEGATIVE_INFINITY;
}

export function ShardAlerts({
  snapshot,
}: {
  snapshot: ShardAlertSnapshot | null;
}) {
  const alerts = snapshot?.alerts ?? EMPTY_ALERTS;
  const directCount = snapshot?.directCount ?? 0;
  const capturedAt = snapshot?.capturedAt ?? 0;
  const [sort, setSort] = useState<SortKey>("spike");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const freshnessLabel = snapshot ? freshness(capturedAt, now) : "waiting for first scan";

  const rows = useMemo<AlertRow[]>(() => alerts.map((alert) => {
    const spike = alert.currentPrice !== null && alert.averagePrice !== null
      ? alert.currentPrice - alert.averagePrice
      : null;
    return {
      ...alert,
      spike,
      spikePercent: spike !== null && alert.averagePrice !== null && alert.averagePrice > 0
        ? (spike / alert.averagePrice) * 100
        : null,
    };
  }), [alerts]);

  const risingRows = useMemo(
    () => rows
      .filter((row) => row.spikePercent !== null && row.spikePercent >= SHARD_SPIKE_THRESHOLD_PERCENT)
      .sort((a, b) => sortValue(b, sort) - sortValue(a, sort)),
    [rows, sort],
  );
  const pageCount = Math.max(1, Math.ceil(risingRows.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const pageStart = (activePage - 1) * PAGE_SIZE;
  const visibleRows = risingRows.slice(pageStart, pageStart + PAGE_SIZE);
  const largestSpike = risingRows[0];
  const pricedCount = alerts.filter((alert) => alert.currentPrice !== null && alert.averagePrice !== null).length;

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
          <span className={`live-dot ${snapshot ? "" : "status-dot-muted"}`} aria-hidden="true" />
          <span>{snapshot ? "Background scan" : "Scan not configured"}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {freshnessLabel}</span>
          <span className="alerts-status-separator" aria-hidden="true">·</span>
          <span>{directCount} direct shards monitored</span>
        </div>

        {snapshot && <div className="alerts-summary" aria-label="Shard alert summary">
          <div><span>Price spikes</span><strong>{risingRows.length}</strong></div>
          <div><span>Market coverage</span><strong>{pricedCount}/{directCount}</strong></div>
          <div><span>Largest spike</span><strong>{largestSpike?.spikePercent !== null && largestSpike?.spikePercent !== undefined ? formatPercent(largestSpike.spikePercent) : "—"}</strong></div>
        </div>}

        <div className="alerts-heading">
          <div>
            <h2 id="alerts-list-title">Direct shards above average</h2>
            <p>{snapshot ? `Compared with Hypixel’s average buy-order price in the current Bazaar snapshot. Spikes are ${SHARD_SPIKE_THRESHOLD_PERCENT}% or more above average.` : "A background scan has not saved a Bazaar snapshot yet."}</p>
          </div>
          <label className="alerts-sort" htmlFor="alerts-sort">
            <span>Sort by</span>
            <select id="alerts-sort" value={sort} onChange={(event) => updateSort(event.target.value as SortKey)}>
              <option value="spike">Biggest spike</option>
              <option value="current">Current price</option>
              <option value="average">Bazaar average</option>
            </select>
          </label>
        </div>

        {!snapshot ? (
          <div className="alerts-empty">
            <span className="alerts-empty-mark" aria-hidden="true">…</span>
            <h3>Waiting for the first background scan.</h3>
            <p>Configure the server secrets and scheduled job, then this page will show the latest saved alert snapshot.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="alerts-empty">
            <span className="alerts-empty-mark" aria-hidden="true">✓</span>
            <h3>No price spikes right now.</h3>
            <p>Current instant-sell prices are within {SHARD_SPIKE_THRESHOLD_PERCENT}% of, or below, the Bazaar average.</p>
          </div>
        ) : (
          <>
            <div className="alerts-table" role="table" aria-label="Direct shard price spikes">
              <div className="alerts-table-header" role="row">
                <span role="columnheader">Shard</span>
                <span role="columnheader">Spike</span>
                <span role="columnheader">Current price</span>
                <span role="columnheader">Bazaar average</span>
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
                      <strong>{formatCoins(row.averagePrice ?? 0)} <span aria-hidden="true">→</span> {formatCoins(row.currentPrice ?? 0)}</strong>
                      <span>{formatCoins(row.spike ?? 0)} · {row.spikePercent !== null ? formatPercent(row.spikePercent) : "—"}</span>
                    </div>
                    <div className="alerts-price" role="cell">
                      <span className="mobile-label">Current price</span>
                      <strong>{row.currentPrice !== null ? formatExactCoins(row.currentPrice) : "—"}</strong>
                    </div>
                    <div className="alerts-price" role="cell">
                      <span className="mobile-label">Bazaar average</span>
                      <strong>{row.averagePrice !== null ? formatExactCoins(row.averagePrice) : "—"}</strong>
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
