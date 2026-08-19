"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ShardIcon } from "@/components/ShardIcon";
import { WindowsChrome } from "@/components/WindowsChrome";
import { formatCoins, formatSignedCoins } from "@/lib/formatCoins";
import type { FusionAcquisitionPlan, FusionPathStep, FusionResult } from "@/types/fusion";

type CalculatorShard = {
  id: string;
  name: string;
  unitPrice?: number;
};

type InventoryRow = {
  key: string;
  shardId: string;
  shardName: string;
  amount: string;
};

type BuyItem = {
  id: string;
  name: string;
  amount: number;
  totalCost: number;
  unitPrice: number;
};

type UsedItem = {
  id: string;
  name: string;
  amount: number;
  required: number;
};

type ProfitMode = "instantSell" | "sellOffer";

type Recommendation = FusionResult & {
  fusionRuns: number;
  producedAmount: number;
  revenue: number;
  revenueUnitPrice: number;
  cashCost: number;
  ownedValue: number;
  netProfit: number;
  buyItems: BuyItem[];
  usedItems: UsedItem[];
};

type AcquisitionTotals = {
  cashCost: number;
  ownedValue: number;
  purchases: Map<string, { amount: number; totalCost: number }>;
  used: Map<string, number>;
};

function formatQuantity(amount: number): string {
  return amount.toLocaleString("en-US");
}

function formatShardQuantity(amount: number): string {
  return `${formatQuantity(amount)}×`;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function parseAmount(value: string): number {
  const amount = Number.parseInt(value, 10);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function profitModeLabel(mode: ProfitMode): string {
  return mode === "instantSell" ? "instant sell" : "sell offer";
}

function formatStepInput(step: FusionPathStep, fusionRuns: number): string {
  return step.inputs
    .map((input) => `${formatShardQuantity(input.amount * fusionRuns)} ${input.name}`)
    .join(" + ");
}

function formatInventorySummary(entries: Array<{ amount: number; name: string }>): string {
  const visible = entries.slice(0, 2).map(({ amount, name }) => `${formatShardQuantity(amount)} ${name}`);
  if (entries.length > 2) return `${visible.join(" + ")} + ${entries.length - 2} more`;
  return visible.join(" + ");
}

function collectPlanRequirements(
  plans: FusionAcquisitionPlan[],
  multiplier: number,
  requirements: Map<string, number>,
): void {
  for (const plan of plans) {
    const amount = Math.max(0, Math.round(plan.amount * multiplier));
    requirements.set(plan.id, (requirements.get(plan.id) ?? 0) + amount);
    if (plan.inputs) collectPlanRequirements(plan.inputs, multiplier, requirements);
  }
}

function acquirePlan(
  plan: FusionAcquisitionPlan,
  requestedAmount: number,
  available: Map<string, number>,
  priceById: Map<string, number>,
  totals: AcquisitionTotals,
): void {
  if (requestedAmount <= 0) return;

  const owned = Math.min(available.get(plan.id) ?? 0, requestedAmount);
  if (owned > 0) {
    available.set(plan.id, (available.get(plan.id) ?? 0) - owned);
    totals.ownedValue += owned * (priceById.get(plan.id) ?? plan.totalCost / Math.max(plan.amount, 1));
    totals.used.set(plan.id, (totals.used.get(plan.id) ?? 0) + owned);
  }

  const missing = requestedAmount - owned;
  if (missing <= 0) return;

  if (plan.method === "buy" || !plan.inputs || !plan.crafts) {
    const unitPrice = plan.totalCost / Math.max(plan.amount, 1);
    const purchase = totals.purchases.get(plan.id) ?? { amount: 0, totalCost: 0 };
    purchase.amount += missing;
    purchase.totalCost += missing * unitPrice;
    totals.purchases.set(plan.id, purchase);
    totals.cashCost += missing * unitPrice;
    return;
  }

  const originalCrafts = plan.crafts;
  const outputPerCraft = (plan.producedAmount ?? plan.amount) / originalCrafts;
  const crafts = Math.ceil(missing / outputPerCraft);
  const scale = crafts / originalCrafts;

  for (const input of plan.inputs) {
    acquirePlan(input, Math.round(input.amount * scale), available, priceById, totals);
  }

  const extraOutput = crafts * outputPerCraft - missing;
  if (extraOutput > 0) available.set(plan.id, (available.get(plan.id) ?? 0) + extraOutput);
}

export function InventoryCalculator({
  results,
  shards,
}: {
  results: FusionResult[];
  shards: CalculatorShard[];
}) {
  const listId = useId();
  const [rowNumber, setRowNumber] = useState(1);
  const [inventory, setInventory] = useState<InventoryRow[]>([
    { key: "inventory-0", shardId: "", shardName: "", amount: "" },
  ]);
  const [profitMode, setProfitMode] = useState<ProfitMode>("instantSell");

  const shardsByName = useMemo(
    () => new Map(shards.map((shard) => [normalizeName(shard.name), shard])),
    [shards],
  );
  const shardsById = useMemo(
    () => new Map(shards.map((shard) => [shard.id, shard])),
    [shards],
  );
  const priceById = useMemo(
    () => new Map(shards.flatMap((shard) => shard.unitPrice ? [[shard.id, shard.unitPrice] as const] : [])),
    [shards],
  );

  const inventoryMap = useMemo(() => {
    const owned = new Map<string, number>();
    for (const row of inventory) {
      if (!row.shardId) continue;
      const amount = parseAmount(row.amount);
      if (amount > 0) owned.set(row.shardId, (owned.get(row.shardId) ?? 0) + amount);
    }
    return owned;
  }, [inventory]);

  const inventoryEntries = useMemo(
    () => Array.from(inventoryMap, ([id, amount]) => ({
      id,
      amount,
      name: shardsById.get(id)?.name ?? id,
    })),
    [inventoryMap, shardsById],
  );

  const enteredShardCount = useMemo(
    () => inventoryEntries.reduce((total, entry) => total + entry.amount, 0),
    [inventoryEntries],
  );

  const inventoryValue = useMemo(
    () => inventoryEntries.reduce((total, entry) => total + entry.amount * (shardsById.get(entry.id)?.unitPrice ?? 0), 0),
    [inventoryEntries, shardsById],
  );

  const recommendations = useMemo<Recommendation[]>(() => {
    return results
      .map((result) => {
        const plans = result.acquisitionPlan;
        const requirementsPerRun = new Map<string, number>();
        collectPlanRequirements(plans, 1, requirementsPerRun);
        const ownedRuns = Array.from(requirementsPerRun)
          .map(([id, amount]) => Math.floor((inventoryMap.get(id) ?? 0) / amount))
          .filter((runs) => runs > 0);
        const fusionRuns = Math.max(1, ...ownedRuns);
        const totals: AcquisitionTotals = {
          cashCost: 0,
          ownedValue: 0,
          purchases: new Map(),
          used: new Map(),
        };
        const available = new Map(inventoryMap);
        for (const plan of plans) {
          acquirePlan(plan, Math.round(plan.amount * fusionRuns), available, priceById, totals);
        }
        const buyItems = Array.from(totals.purchases, ([id, purchase]) => ({
          id,
          name: shardsById.get(id)?.name ?? id,
          amount: purchase.amount,
          totalCost: purchase.totalCost,
          unitPrice: purchase.totalCost / purchase.amount,
        }));
        const usedItems = Array.from(totals.used, ([id, amount]) => ({
          id,
          name: shardsById.get(id)?.name ?? id,
          amount,
          required: Math.round((requirementsPerRun.get(id) ?? amount) * fusionRuns),
        }));
        const outputValue = result.outputValues[profitMode];
        const revenue = outputValue * fusionRuns;

        return {
          ...result,
          fusionRuns,
          producedAmount: result.output.amount * fusionRuns,
          revenue,
          revenueUnitPrice: outputValue / result.output.amount,
          cashCost: totals.cashCost,
          ownedValue: totals.ownedValue,
          netProfit: revenue - totals.cashCost - totals.ownedValue,
          buyItems,
          usedItems,
        };
      })
      .filter((result) => result.netProfit > 0 && result.usedItems.length > 0)
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 12);
  }, [inventoryMap, priceById, profitMode, results, shardsById]);

  const updateRow = (key: string, update: Partial<InventoryRow>) => {
    setInventory((current) => current.map((row) => row.key === key ? { ...row, ...update } : row));
  };

  const updateShardName = (row: InventoryRow, value: string) => {
    const match = shardsByName.get(normalizeName(value));
    updateRow(row.key, { shardName: value, shardId: match?.id ?? "" });
  };

  const addRow = () => {
    setInventory((current) => [
      ...current,
      { key: `inventory-${rowNumber}`, shardId: "", shardName: "", amount: "" },
    ]);
    setRowNumber((current) => current + 1);
  };

  const removeRow = (key: string) => {
    setInventory((current) => {
      const next = current.filter((row) => row.key !== key);
      return next.length > 0 ? next : [{ key: `inventory-${rowNumber}`, shardId: "", shardName: "", amount: "" }];
    });
    if (inventory.length === 1) setRowNumber((current) => current + 1);
  };

  const hasInventory = inventoryMap.size > 0;
  const inventorySummary = formatInventorySummary(inventoryEntries);

  return (
    <WindowsChrome
      className="calculator-window"
      title="Fusion Calculator — Control Panel"
      kind="calculator"
      status={<><span>{hasInventory ? `${enteredShardCount.toLocaleString("en-US")} shards entered` : "Enter your inventory to begin"}</span><span>{hasInventory ? `${recommendations.length} recommendations` : "Live Bazaar prices loaded"}</span></>}
    >
      <div className="windows-toolbar calculator-toolbar" aria-label="Calculator location">
        <span className="windows-address-label">Control Panel</span>
        <div className="windows-address"><span className="window-glyph window-glyph-calculator" aria-hidden="true">123</span><span>Market Tools\Fusion Calculator</span></div>
        <Link className="windows-go-button" href="/">Paths</Link>
      </div>
      <section className="inventory-calculator" aria-labelledby="inventory-form-title">
      <div className="inventory-calculator-grid">
        <form className="inventory-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="inventory-panel-heading">
            <div>
              <span className="panel-kicker">Your inventory</span>
              <h2 id="inventory-form-title">What shards do you already have?</h2>
            </div>
            <span className="inventory-count">{formatQuantity(enteredShardCount)} entered</span>
          </div>
          <div className="inventory-rows">
            {inventory.map((row, index) => (
              <div className="inventory-row" key={row.key}>
                <label className="sr-only" htmlFor={`${listId}-name-${row.key}`}>Shard {index + 1} name</label>
                <input
                  id={`${listId}-name-${row.key}`}
                  list={`${listId}-shards`}
                  value={row.shardName}
                  onChange={(event) => updateShardName(row, event.target.value)}
                  onBlur={() => {
                    const match = shardsByName.get(normalizeName(row.shardName));
                    if (match) updateRow(row.key, { shardName: match.name, shardId: match.id });
                  }}
                  placeholder="Search a shard"
                  autoComplete="off"
                />
                <label className="sr-only" htmlFor={`${listId}-amount-${row.key}`}>Shard {index + 1} quantity</label>
                <input
                  id={`${listId}-amount-${row.key}`}
                  className="inventory-amount"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={row.amount}
                  onChange={(event) => updateRow(row.key, { amount: event.target.value.replace(/\D/g, "") })}
                  placeholder="Qty"
                />
                <button className="inventory-remove" type="button" onClick={() => removeRow(row.key)} aria-label={`Remove shard row ${index + 1}`}>
                  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg>
                </button>
              </div>
            ))}
          </div>

          <datalist id={`${listId}-shards`}>
            {shards.map((shard) => <option key={shard.id} value={shard.name} />)}
          </datalist>

          <button className="inventory-add" type="button" onClick={addRow}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg>
            Add another shard
          </button>
        </form>

        <div className="calculator-results-panel" aria-live="polite">
          <div className="calculator-results-heading">
            <div>
              <span className="panel-kicker">Best next moves</span>
              <h2>{hasInventory ? `What to do with your ${inventorySummary}` : "What to do with the shards you own"}</h2>
              {hasInventory && <p className="calculator-inventory-value">Worth {inventoryValue > 0 ? formatCoins(inventoryValue) : "an unknown amount"} as-is</p>}
            </div>
            <div className="calculator-results-tools">
              <fieldset className="profit-mode-control">
                <legend>Show profit using</legend>
                <div className="profit-mode-options">
                  <label className={`profit-mode-option${profitMode === "instantSell" ? " active" : ""}`}>
                    <input
                      className="sr-only"
                      type="radio"
                      name={`${listId}-profit-mode`}
                      value="instantSell"
                      checked={profitMode === "instantSell"}
                      onChange={() => setProfitMode("instantSell")}
                    />
                    <span>Instant sell</span>
                  </label>
                  <label className={`profit-mode-option${profitMode === "sellOffer" ? " active" : ""}`}>
                    <input
                      className="sr-only"
                      type="radio"
                      name={`${listId}-profit-mode`}
                      value="sellOffer"
                      checked={profitMode === "sellOffer"}
                      onChange={() => setProfitMode("sellOffer")}
                    />
                    <span>Sell offer</span>
                  </label>
                </div>
              </fieldset>
              <span className="calculator-results-count">{hasInventory ? `${recommendations.length} found` : "Waiting for inventory"}</span>
            </div>
          </div>

          {!hasInventory ? (
            <div className="calculator-empty">
              <span className="calculator-empty-mark" aria-hidden="true">+</span>
              <h3>Start with the shards you own.</h3>
              <p>Enter a shard and quantity to see the best ways to use it instead of selling it as-is.</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="calculator-empty">
              <span className="calculator-empty-mark" aria-hidden="true">—</span>
              <h3>No profitable path uses these shards right now.</h3>
              <p>These recommendations use the current live Bazaar snapshot. Try another owned shard or check again after prices move.</p>
            </div>
          ) : (
            <div className="calculator-recommendations">
              {recommendations.map((recommendation, index) => {
                const finalStep = recommendation.steps[recommendation.steps.length - 1];
                const missing = recommendation.buyItems.filter((requirement) => requirement.amount > 0);
                const used = recommendation.usedItems.filter((requirement) => requirement.amount > 0);
                const executionVolume = profitMode === "instantSell" ? recommendation.output.buyVolume : recommendation.output.sellVolume;
                const lowExecutionVolume = executionVolume !== undefined && executionVolume < Math.max(1000, recommendation.producedAmount * 2);

                return (
                  <article className="calculator-result-card" key={recommendation.fusionId}>
                    <div className="calculator-result-card-head">
                      <div className="calculator-result-output">
                        <span className="calculator-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                        <ShardIcon shardId={recommendation.output.id} name={recommendation.output.name} size={42} priority={index === 0} />
                        <div>
                          <h3>{recommendation.output.name}</h3>
                          <p>{formatShardQuantity(recommendation.producedAmount)} produced · {recommendation.fusionRuns} fusion run{recommendation.fusionRuns === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <div className="calculator-result-profit positive">
                        <span>Profit via {profitModeLabel(profitMode)}</span>
                        <strong>{formatSignedCoins(recommendation.netProfit)}</strong>
                      </div>
                    </div>

                    <div className="calculator-result-line calculator-buy-line">
                      <span className="calculator-line-label">Buy</span>
                      <div>
                        {missing.length > 0 ? missing.map((requirement) => (
                          <span key={`${recommendation.fusionId}-buy-${requirement.id}`}>
                            {formatShardQuantity(requirement.amount)} {requirement.name} <small>({formatCoins(requirement.amount * requirement.unitPrice)})</small>
                          </span>
                        )) : <span>Nothing — your inventory covers the inputs</span>}
                      </div>
                      {missing.length > 0 && <strong>{formatCoins(recommendation.cashCost)}</strong>}
                    </div>

                    <div className="calculator-result-line calculator-fusion-line">
                      <span className="calculator-line-label">Fuse</span>
                      <div>
                        <span>{recommendation.fusionRuns}× → {formatStepInput(finalStep, recommendation.fusionRuns)} → {formatShardQuantity(recommendation.producedAmount)} {recommendation.output.name}</span>
                      </div>
                    </div>

                    <div className="calculator-result-line calculator-sell-line">
                      <span className="calculator-line-label">Sell</span>
                      <div>
                        <span>{formatShardQuantity(recommendation.producedAmount)} @ {formatCoins(recommendation.revenueUnitPrice)} → {formatCoins(recommendation.revenue)} revenue</span>
                        <small>Using {profitModeLabel(profitMode)} price</small>
                        {lowExecutionVolume && <small className="calculator-volume-warning">Low {profitMode === "instantSell" ? "buy" : "sell"} volume ({formatQuantity(executionVolume ?? 0)})</small>}
                      </div>
                    </div>

                    <div className="calculator-result-breakdown" aria-label={`Profit breakdown for ${recommendation.output.name} using ${profitModeLabel(profitMode)}`}>
                      <span>{formatCoins(recommendation.revenue)} revenue</span>
                      <b aria-hidden="true">−</b>
                      <span>buy {formatCoins(recommendation.cashCost)}</span>
                      <b aria-hidden="true">−</b>
                      <span>your shards {formatCoins(recommendation.ownedValue)}</span>
                      <b aria-hidden="true">=</b>
                      <strong>{formatSignedCoins(recommendation.netProfit)}</strong>
                    </div>

                    {used.length > 0 && (
                      <p className="calculator-used-line">
                         Uses {used.map((requirement) => `${formatQuantity(requirement.amount)}/${formatQuantity(requirement.required)} ${requirement.name}`).join(" + ")}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <Link className="calculator-browse-link" href="/">
            Browse every shard path
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
          </Link>
        </div>
      </div>
      </section>
    </WindowsChrome>
  );
}
