const UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
] as const;

export function formatCoins(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const unit = UNITS.find((candidate) => absolute >= candidate.value);

  if (!unit) return `${sign}${Math.round(absolute).toLocaleString("en-US")}`;

  const scaled = absolute / unit.value;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${sign}${Number(scaled.toFixed(digits))}${unit.suffix}`;
}

export function formatSignedCoins(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatCoins(value)}`;
}

export function formatMargin(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
