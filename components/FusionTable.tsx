"use client";

import { useEffect, useMemo, useState } from "react";
import { ShardIcon } from "@/components/ShardIcon";
import { formatCoins, formatMargin, formatSignedCoins } from "@/lib/formatCoins";
import type { FusionResult, FusionScanStats } from "@/types/fusion";

type SortKey = "profit" | "margin" | "cost-asc" | "cost-desc";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "profit", label: "Highest profit" },
  { value: "margin", label: "Highest margin" },
  { value: "cost-asc", label: "Lowest cost" },
  { value: "cost-desc", label: "Highest cost" },
];

const PAGE_SIZE = 10;

function freshness(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function IngredientList({ result }: { result: FusionResult }) {
  return (
    <div className="ingredient-list">
      {result.inputs.map((input, index) => (
        <div className="ingredient" key={`${result.fusionId}-${input.id}-${index}`}>
          {index > 0 && <span className="plus" aria-hidden="true">+</span>}
          <ShardIcon shardId={input.id} name={input.name} size={32} />
          <span>{input.name}</span>
          <strong>×{input.amount}</strong>
        </div>
      ))}
    </div>
  );
}

function fusionDetailId(fusionId: string): string {
  return `fusion-detail-${fusionId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function DetailPanel({ result, id }: { result: FusionResult; id: string }) {
  return (
    <div className="detail-panel" id={id} role="region" aria-label={`${result.output.name} fusion details`}>
      <div className="detail-step">
        <span className="detail-kicker">Buy ingredients</span>
        {result.inputs.map((input) => (
          <div className="detail-line" key={input.id}>
            <span>{input.amount}× {input.name} <small>@ {formatCoins(input.unitPrice)}</small></span>
            <strong>{formatCoins(input.totalPrice)}</strong>
          </div>
        ))}
      </div>
      <div className="detail-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h12M10 5l5 5-5 5" /></svg></div>
      <div className="detail-step">
        <span className="detail-kicker">Fuse & instant-sell</span>
        <div className="detail-line">
          <span>{result.output.amount}× {result.output.name} <small>@ {formatCoins(result.output.unitPrice)}</small></span>
          <strong>{formatCoins(result.outputValue)}</strong>
        </div>
      </div>
      <div className="detail-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h12M10 5l5 5-5 5" /></svg></div>
      <div className="detail-profit">
        <span>Estimated profit</span>
        <strong>{formatSignedCoins(result.profit)}</strong>
      </div>
    </div>
  );
}

export function FusionTable({
  results,
  lastUpdated,
  scanStats,
}: {
  results: FusionResult[];
  lastUpdated: number;
  scanStats: FusionScanStats;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("profit");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [freshnessLabel, setFreshnessLabel] = useState("live");

  useEffect(() => {
    const update = () => setFreshnessLabel(freshness(lastUpdated));
    update();
    const interval = window.setInterval(update, 15_000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setExpanded(null);
  };

  const updateSort = (value: SortKey) => {
    setSort(value);
    setPage(1);
    setExpanded(null);
  };

  const visibleResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return results
      .filter((result) => {
        if (!needle) return true;
        return [result.output.name, ...result.inputs.map((input) => input.name)]
          .some((name) => name.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (sort === "margin") return b.margin - a.margin;
        if (sort === "cost-asc") return a.inputCost - b.inputCost;
        if (sort === "cost-desc") return b.inputCost - a.inputCost;
        return b.profit - a.profit;
      });
  }, [query, results, sort]);

  const best = results[0];
  const pageCount = Math.max(1, Math.ceil(visibleResults.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const pageStart = visibleResults.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE;
  const pagedResults = visibleResults.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = Math.min(pageStart + pagedResults.length, visibleResults.length);

  const moveToPage = (nextPage: number) => {
    setExpanded(null);
    setPage(Math.min(Math.max(nextPage, 1), pageCount));
  };

  return (
    <div className="app-content">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 id="page-title">Find the shard worth fusing.</h1>
            <p>Compare live Bazaar prices, see the cost of every ingredient, and start with the path that leaves the most coins behind.</p>
            <a className="hero-link" href="#shard-list">
              Browse shard paths
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
            </a>
          </div>

          <dl className="hero-status">
            <div>
              <dt>Market status</dt>
              <dd><span className="live-dot" aria-hidden="true" />Synced {freshnessLabel}</dd>
            </div>
            <div>
              <dt>Catalog checked</dt>
              <dd>{scanStats.uniqueCandidates.toLocaleString("en-US")} candidates</dd>
            </div>
            <div>
              <dt>Price path</dt>
              <dd>Buy · fuse · instant-sell</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="shard-lister" id="shard-list" aria-labelledby="scanner-title">
        <div className="lister-heading">
          <div>
            <h2 id="scanner-title">Shard paths</h2>
            <p>Search by ingredient or output. Each path uses the best priced ingredients available in the current snapshot.</p>
          </div>
          <p className="lister-meta">{scanStats.pricedCandidates.toLocaleString("en-US")} candidates priced · {PAGE_SIZE} per page</p>
        </div>

        <div className="controls">
          <div className="control-field">
            <label htmlFor="shard-search">Search shards</label>
            <div className="search-control">
              <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
              <input id="shard-search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Try an ingredient or output" />
              {query && <button type="button" onClick={() => updateQuery("")} aria-label="Clear search"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg></button>}
            </div>
          </div>
          <div className="control-field sort-field">
            <label htmlFor="sort-paths">Sort by</label>
            <div className="sort-control">
              <select id="sort-paths" value={sort} onChange={(event) => updateSort(event.target.value as SortKey)}>
                {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 12 8"><path d="m1 1 5 5 5-5"/></svg>
            </div>
          </div>
        </div>

        <div className="results-note" role="status" aria-live="polite">
          <span>{visibleResults.length === 0 ? "No paths" : <>Showing <strong>{pageStart + 1}–{pageEnd}</strong> of <strong>{visibleResults.length}</strong> paths</>}</span>
          <span>Updated {freshnessLabel}</span>
        </div>

        {visibleResults.length === 0 ? (
          <div className="empty-state"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 8 10-8 10-8-10 8-10Z" /><path d="m8.5 12 3.5 3.5 3.5-3.5" /></svg><h3>No matching fusions</h3><p>Try a different shard name.</p></div>
        ) : (
          <div className="results-shell">
            <div className="results-header" aria-hidden="true">
              <span>Output</span>
              <span>Ingredients</span>
              <span>Cost</span>
              <span>Value</span>
              <span>Profit</span>
              <span>Margin</span>
              <span />
            </div>
            <div id="fusion-results" className="fusion-table" role="list" aria-label="Fusion profit opportunities">
              {pagedResults.map((result, index) => {
                const isExpanded = expanded === result.fusionId;
                const isBest = result.fusionId === best?.fusionId && sort === "profit" && !query;
                const detailId = fusionDetailId(result.fusionId);
                return (
                  <div className={`table-group ${isBest ? "best-row" : ""}`} key={result.fusionId} role="listitem">
                    <div className="table-row">
                      <div className="output-cell">
                        <ShardIcon shardId={result.output.id} name={result.output.name} size={40} priority={index < 3} />
                        <div>
                          <strong>{result.output.name}</strong>
                          <span>{result.output.amount} shard{result.output.amount === 1 ? "" : "s"} output</span>
                          {isBest && <span className="top-path">Top profit</span>}
                        </div>
                      </div>
                      <div className="ingredients-cell"><IngredientList result={result} /></div>
                      <div className="number-cell cost-cell"><span className="mobile-label">Cost</span><strong>{formatCoins(result.inputCost)}</strong></div>
                      <div className="number-cell value-cell secondary"><span className="mobile-label">Value</span><strong>{formatCoins(result.outputValue)}</strong></div>
                      <div className={`number-cell profit-cell ${result.profit >= 0 ? "positive" : "negative"}`}><span className="mobile-label">Profit</span><strong>{formatSignedCoins(result.profit)}</strong></div>
                      <div className={`number-cell margin-cell ${result.margin >= 0 ? "positive" : "negative"}`}><span className="mobile-label">Margin</span><strong>{formatMargin(result.margin)}</strong></div>
                      <button className="expand-button" type="button" aria-expanded={isExpanded} aria-controls={detailId} aria-label={`${isExpanded ? "Hide" : "View"} ${result.output.name} fusion details`} onClick={() => setExpanded(isExpanded ? null : result.fusionId)}>
                        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6"/></svg>
                      </button>
                    </div>
                    {isExpanded && <DetailPanel result={result} id={detailId} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {visibleResults.length > PAGE_SIZE && (
          <nav className="pagination" aria-label="Fusion path pages">
            <button type="button" aria-controls="fusion-results" onClick={() => moveToPage(activePage - 1)} disabled={activePage === 1}>
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12.5 4-6 6 6 6" /></svg>
              <span>Previous</span>
            </button>
            <p>Page <strong>{activePage}</strong> of <strong>{pageCount}</strong></p>
            <button type="button" aria-controls="fusion-results" onClick={() => moveToPage(activePage + 1)} disabled={activePage === pageCount}>
              <span>Next</span>
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7.5 4 6 6-6 6" /></svg>
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
