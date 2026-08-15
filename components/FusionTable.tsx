"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShardIcon } from "@/components/ShardIcon";
import Scanner from "@/components/Scanner";
import { Topbar } from "@/components/Topbar";
import { formatCoins, formatMargin, formatSignedCoins } from "@/lib/formatCoins";
import type { FusionResult, FusionScanStats } from "@/types/fusion";

type SortKey = "profit" | "margin";

const SORTS: { value: string; label: string }[] = [
  { value: "profit", label: "Sell-offer profit - highest first" },
  { value: "margin", label: "Sell-offer margin - highest first" },
  { value: "insta-buy", label: "Insta-buy · cheapest first" },
  { value: "insta-sell", label: "Insta-sell · highest first" },
].filter(({ value }) => value === "profit" || value === "margin");

const PAGE_SIZE = 10;

function freshness(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function formatQuantity(amount: number): string {
  return amount.toLocaleString("en-US");
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

function DetailPanel({ result }: { result: FusionResult }) {
  return (
    <div className="detail-panel" aria-label={`${result.output.name} fusion details`}>
      <div className="detail-step detail-buy-step">
        <span className="detail-index">1</span>
        <div>
          <span className="detail-kicker">Buy starting shards</span>
          <p className="detail-description">Purchase these directly from the Bazaar.</p>
        </div>
        {result.inputs.map((input, index) => (
          <div className="detail-line" key={`${result.fusionId}-${input.id}-${index}`}>
            <span>{input.amount}× {input.name} <small>@ {formatCoins(input.unitPrice)}</small></span>
            <strong>{formatCoins(input.totalPrice)}</strong>
          </div>
        ))}
      </div>

      <ol className="detail-fusions" aria-label="Fusion sequence">
        {result.steps.map((step) => (
          <li className="detail-step detail-fusion-step" key={`${result.fusionId}-step-${step.stepNumber}`}>
            <span className="detail-index">{step.stepNumber + 1}</span>
            <div className="detail-step-copy">
              <span className="detail-kicker">Fusion {step.stepNumber} of {result.steps.length}</span>
              <div className="detail-recipe">
                <div className="detail-recipe-inputs">
                  {step.inputs.map((input, index) => (
                    <span key={`${result.fusionId}-${step.stepNumber}-${input.id}-${index}`}>
                      {index > 0 && <b aria-hidden="true">+</b>}
                      {input.amount}× {input.name}
                      <small>{input.source === "fuse" ? "from prior fusion" : "from Bazaar"}</small>
                    </span>
                  ))}
                </div>
                <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h12M10 5l5 5-5 5" /></svg>
                <strong>{step.output.amount}× {step.output.name}</strong>
              </div>
              <div className="detail-line detail-cost-line">
                <span>Cumulative material cost</span>
                <strong>{formatCoins(step.materialCost)}</strong>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="detail-step detail-sell-step">
        <span className="detail-index">{result.steps.length + 2}</span>
        <div className="detail-step-copy">
          <span className="detail-kicker">Exit estimates</span>
          <p className="detail-description">Choose a fast sale into current buy orders or wait for a buyer to fill your sell offer.</p>
          <div className="detail-exit-options">
            <div className="detail-exit-option">
              <div className="detail-exit-heading">
                <div>
                  <strong>Instant sale</strong>
                  <span>Fast exit - fills buy orders</span>
                </div>
                <strong className={result.profitValues.instantSell >= 0 ? "positive" : "negative"}>{formatSignedCoins(result.profitValues.instantSell)}</strong>
              </div>
              <div className="detail-line">
                <span>{result.output.amount}× {result.output.name} <small>@ {formatCoins(result.outputValues.instantSell / result.output.amount)}</small></span>
                <strong>{formatCoins(result.outputValues.instantSell)}</strong>
              </div>
              <span className={`detail-exit-margin ${result.marginValues.instantSell >= 0 ? "positive" : "negative"}`}>{formatMargin(result.marginValues.instantSell)} margin</span>
            </div>
            <div className="detail-exit-option">
              <div className="detail-exit-heading">
                <div>
                  <strong>Sell offer</strong>
                  <span>Higher potential - waits for a buyer</span>
                </div>
                <strong className={result.profitValues.sellOffer >= 0 ? "positive" : "negative"}>{formatSignedCoins(result.profitValues.sellOffer)}</strong>
              </div>
              <div className="detail-line">
                <span>{result.output.amount}× {result.output.name} <small>@ {formatCoins(result.outputValues.sellOffer / result.output.amount)}</small></span>
                <strong>{formatCoins(result.outputValues.sellOffer)}</strong>
              </div>
              <span className={`detail-exit-margin ${result.marginValues.sellOffer >= 0 ? "positive" : "negative"}`}>{formatMargin(result.marginValues.sellOffer)} margin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FusionDetailsDialog({ result, id, onClose }: { result: FusionResult; id: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [targetAmount, setTargetAmount] = useState(String(result.output.amount));
  const requestedAmount = Math.max(1, Number.parseInt(targetAmount, 10) || 1);
  const fusionRuns = Math.ceil(requestedAmount / result.output.amount);
  const producedAmount = fusionRuns * result.output.amount;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    if (!dialog.open) dialog.showModal();

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fusion-dialog"
      id={id}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="fusion-dialog-inner">
        <header className="fusion-dialog-header">
          <div className="fusion-dialog-output">
            <ShardIcon shardId={result.output.id} name={result.output.name} size={48} priority />
            <div>
              <span className="fusion-dialog-kicker">Fusion path</span>
              <h2 id={`${id}-title`}>{result.output.name}</h2>
              <p>{result.output.amount} shard{result.output.amount === 1 ? "" : "s"} · {result.steps.length} fusion step{result.steps.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="fusion-dialog-summary">
            <span>Sell-offer profit</span>
            <strong className={result.profitValues.sellOffer >= 0 ? "positive" : "negative"}>{formatSignedCoins(result.profitValues.sellOffer * fusionRuns)}</strong>
            <span className={result.profitValues.instantSell >= 0 ? "positive" : "negative"}>Instant sale {formatSignedCoins(result.profitValues.instantSell * fusionRuns)}</span>
          </div>
          <form method="dialog">
            <button className="fusion-dialog-close" type="submit" aria-label="Close fusion details">
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg>
            </button>
          </form>
        </header>
        <section className="fusion-calculator" aria-labelledby={`${id}-calculator-title`}>
          <div className="fusion-calculator-copy">
            <span className="fusion-calculator-kicker" id={`${id}-calculator-title`}>Batch calculator</span>
            <p>How many {result.output.name} shards do you want to make?</p>
          </div>
          <label className="fusion-calculator-control" htmlFor={`${id}-target`}>
            <span>Target shards</span>
            <span className="fusion-calculator-input">
              <input
                id={`${id}-target`}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value.replace(/\D/g, ""))}
                onBlur={() => setTargetAmount(String(requestedAmount))}
              />
              <span>{result.output.name}</span>
            </span>
          </label>
          <div className="fusion-calculator-result">
            <div><span>Fusion runs</span><strong>{formatQuantity(fusionRuns)}</strong></div>
            <div><span>Produces</span><strong>{formatQuantity(producedAmount)} shards</strong></div>
            <div><span>Starting shards needed</span><strong>{formatCoins(result.inputCost * fusionRuns)}</strong></div>
          </div>
          <div className="fusion-calculator-inputs" aria-label="Starting shard quantities">
            {result.inputs.map((input, index) => (
              <div key={`${result.fusionId}-batch-input-${input.id}-${index}`}>
                <span>{input.name}</span>
                <strong>{formatQuantity(input.amount * fusionRuns)}&times;</strong>
              </div>
            ))}
          </div>
        </section>
        <DetailPanel result={result} />
      </div>
    </dialog>
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
  const closeExpanded = useCallback(() => setExpanded(null), []);

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
        return [
          result.output.name,
          ...result.inputs.map((input) => input.name),
          ...result.steps.flatMap((step) => [
            step.output.name,
            ...step.inputs.map((input) => input.name),
          ]),
        ]
          .some((name) => name.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (sort === "profit") return b.profit - a.profit;
        return b.margin - a.margin;
      });
  }, [query, results, sort]);

  const heroOpportunity = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((best, result) => result.profit > best.profit ? result : best, results[0]);
  }, [results]);

  const pageCount = Math.max(1, Math.ceil(visibleResults.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const pageStart = visibleResults.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE;
  const pagedResults = visibleResults.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = Math.min(pageStart + pagedResults.length, visibleResults.length);
  const expandedResult = expanded ? visibleResults.find((result) => result.fusionId === expanded) ?? null : null;

  const moveToPage = (nextPage: number) => {
    setExpanded(null);
    setPage(Math.min(Math.max(nextPage, 1), pageCount));
  };

  return (
    <div className="app-content" id="page-content">
      <Topbar current="paths" />
      <section className="hero" aria-labelledby="page-title">
        <Scanner
          className="hero-scanner"
          color1="#11111B"
          color2="#89B4FA"
          color3="#B4BEFE"
          speed={0.35}
          sweepSpeed={0.18}
          sweepWidth={1.8}
          sweepFalloff={7}
          scale={1.6}
          frequency={1.7}
          ripple={0.18}
          bandDensity={9}
          lineSharpness={4.8}
          glow={0.16}
          colorSpread={0.32}
          brightness={0.7}
          contrast={1.1}
          softness={1.8}
          vignette={0.7}
          scanline
          grain={false}
          opacity={0.7}
          mouseInteraction={false}
        />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker"><span className="hero-kicker-rule" aria-hidden="true" /><span>Live Bazaar</span><span className="hero-kicker-divider" aria-hidden="true">/</span><span>Hypixel SkyBlock</span></p>
            <h1 id="page-title">Find the shard worth <span>fusing.</span></h1>
            <p className="hero-description">Compare live Bazaar prices, see the cost of every ingredient, and start with the path that leaves the most coins behind.</p>
            <div className="hero-actions">
              <a className="hero-cta" href="#shard-list">
                Browse shard paths
                <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
              </a>
              <a className="hero-text-link" href="#scanner-title">
                See how it works
                <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
              </a>
            </div>
            <p className="hero-note"><span className="live-dot" aria-hidden="true" /><span>Live snapshot</span><span className="hero-note-separator" aria-hidden="true">·</span><span>Updated {freshnessLabel}</span></p>
          </div>

          <aside className="hero-rail" aria-label="Live market snapshot">
            <div className="hero-rail-head">
              <div>
                <span className="hero-rail-eyebrow">Live opportunity</span>
                <strong>Best priced path</strong>
              </div>
              <span className="hero-rail-status"><span className="live-dot" aria-hidden="true" />Synced {freshnessLabel}</span>
            </div>

            {heroOpportunity ? (
              <>
                <div className="hero-route">
                  <div className="hero-route-side">
                    <span className="hero-route-label">Buy ingredients</span>
                    <div className="hero-route-items">
                      {heroOpportunity.inputs.slice(0, 2).map((input, index) => (
                        <div className="hero-route-item" key={`${heroOpportunity.fusionId}-${input.id}-${index}`}>
                          <ShardIcon shardId={input.id} name={input.name} size={28} />
                          <span>{input.amount}× {input.name}</span>
                        </div>
                      ))}
                      {heroOpportunity.inputs.length > 2 && <span className="hero-route-more">+{heroOpportunity.inputs.length - 2} more ingredients</span>}
                    </div>
                    <strong className="hero-route-amount">{formatCoins(heroOpportunity.inputCost)}</strong>
                  </div>

                  <div className="hero-route-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg></div>

                  <div className="hero-route-side hero-route-output">
                    <span className="hero-route-label">Exit estimates</span>
                    <div className="hero-output-item">
                      <ShardIcon shardId={heroOpportunity.output.id} name={heroOpportunity.output.name} size={36} priority />
                      <div>
                        <strong>{heroOpportunity.output.name}</strong>
                        <span>{heroOpportunity.output.amount} shard{heroOpportunity.output.amount === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <div className="hero-output-values">
                      <div><span>Instant sale</span><strong>{formatCoins(heroOpportunity.outputValues.instantSell)}</strong></div>
                      <div><span>Sell offer</span><strong>{formatCoins(heroOpportunity.outputValues.sellOffer)}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="hero-rail-profit">
                  <div className="hero-profit-option">
                    <span>Instant-sale profit</span>
                    <strong className={heroOpportunity.profitValues.instantSell >= 0 ? "positive" : "negative"}>{formatSignedCoins(heroOpportunity.profitValues.instantSell)}</strong>
                    <small>{formatMargin(heroOpportunity.marginValues.instantSell)} margin - fast exit</small>
                  </div>
                  <div className="hero-profit-option">
                    <span>Sell-offer profit</span>
                    <strong className={heroOpportunity.profitValues.sellOffer >= 0 ? "positive" : "negative"}>{formatSignedCoins(heroOpportunity.profitValues.sellOffer)}</strong>
                    <small>{formatMargin(heroOpportunity.marginValues.sellOffer)} margin - waits for a buyer</small>
                  </div>
                </div>
              </>
            ) : (
              <div className="hero-rail-empty">No priced paths are available in this snapshot.</div>
            )}

            <div className="hero-rail-footer">
              <div><span>Catalog checked</span><strong>{scanStats.uniqueCandidates.toLocaleString("en-US")} candidates</strong></div>
              <div><span>Path model</span><strong>Buy <span aria-hidden="true">→</span> fuse ×{heroOpportunity?.steps.length ?? 1} <span aria-hidden="true">→</span> sell</strong></div>
            </div>
          </aside>
        </div>
        <a className="hero-scroll-cue" href="#shard-list"><span>Explore all paths</span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 3v13M5 11l5 5 5-5" /></svg></a>
      </section>

      <section className="shard-lister" id="shard-list" aria-labelledby="scanner-title">
        <div className="lister-heading">
          <div>
            <h2 id="scanner-title">Shard paths</h2>
            <p>Search any shard in the chain. Each path compares direct buys with cheaper intermediate fusions.</p>
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
              <span>Starting buys</span>
              <span>Cost</span>
              <span>Instant sale</span>
              <span>Sell offer</span>
              <span />
            </div>
            <div id="fusion-results" className="fusion-table" role="list" aria-label="Fusion profit opportunities">
              {pagedResults.map((result, index) => {
                const isExpanded = expanded === result.fusionId;
                const detailId = fusionDetailId(result.fusionId);
                return (
                  <div className="table-group" key={result.fusionId} role="listitem">
                    <div className="table-row">
                      <div className="output-cell">
                        <ShardIcon shardId={result.output.id} name={result.output.name} size={40} priority={index < 3} />
                        <div>
                          <strong>{result.output.name}</strong>
                          <span>{result.output.amount} shard{result.output.amount === 1 ? "" : "s"} · {result.steps.length} fusion step{result.steps.length === 1 ? "" : "s"}</span>
                        </div>
                      </div>
                      <div className="ingredients-cell"><IngredientList result={result} /></div>
                      <div className="number-cell cost-cell"><span className="mobile-label">Cost</span><strong>{formatCoins(result.inputCost)}</strong></div>
                      <div className={`number-cell outcome-cell instant-profit-cell ${result.profitValues.instantSell >= 0 ? "positive" : "negative"}`}>
                        <span className="mobile-label">Instant sale</span>
                        <strong>{formatSignedCoins(result.profitValues.instantSell)}</strong>
                        <span className="outcome-margin">{formatMargin(result.marginValues.instantSell)} margin</span>
                      </div>
                      <div className={`number-cell outcome-cell sell-offer-profit-cell ${result.profitValues.sellOffer >= 0 ? "positive" : "negative"}`}>
                        <span className="mobile-label">Sell offer</span>
                        <strong>{formatSignedCoins(result.profitValues.sellOffer)}</strong>
                        <span className="outcome-margin">{formatMargin(result.marginValues.sellOffer)} margin</span>
                      </div>
                      <button className="expand-button" type="button" aria-haspopup="dialog" aria-expanded={isExpanded} aria-controls={isExpanded ? detailId : undefined} aria-label={`${isExpanded ? "Hide" : "View"} ${result.output.name} starting buys and fusion details`} onClick={() => setExpanded(isExpanded ? null : result.fusionId)}>
                        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expandedResult && <FusionDetailsDialog result={expandedResult} id={fusionDetailId(expandedResult.fusionId)} onClose={closeExpanded} />}

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
