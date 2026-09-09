const UNIT_TO_BASE_MULTIPLIER: Record<string, number> = {
  "": 1,
  cr: 1e7,
  crore: 1e7,
  crores: 1e7,
  mn: 1e6,
  mln: 1e6,
  million: 1e6,
  lakh: 1e5,
  lac: 1e5,
  lakhs: 1e5,
  thousand: 1e3,
  k: 1e3,
  "%": 1,
  percent: 1,
};

function normalizeUnit(unit: string | null): string {
  return (unit ?? "").trim().toLowerCase().replace(/[₹$.]/g, "").replace(/\s+/g, "");
}

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/[₹$,\s]/g, "").replace(/%$/, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface NumericFact {
  value: string;
  unit: string | null;
}

export type NumericComparisonResult = "equal" | "different" | "not_comparable";

const RELATIVE_TOLERANCE = 0.01;

export function compareNumericFacts(a: NumericFact, b: NumericFact): NumericComparisonResult {
  const numA = parseNumeric(a.value);
  const numB = parseNumeric(b.value);
  if (numA === null || numB === null) return "not_comparable";

  const unitA = normalizeUnit(a.unit);
  const unitB = normalizeUnit(b.unit);
  const multiplierA = UNIT_TO_BASE_MULTIPLIER[unitA];
  const multiplierB = UNIT_TO_BASE_MULTIPLIER[unitB];
  if (multiplierA === undefined || multiplierB === undefined) return "not_comparable";

  const isPercentA = unitA === "%" || unitA === "percent";
  const isPercentB = unitB === "%" || unitB === "percent";
  if (isPercentA !== isPercentB) return "not_comparable";

  const baseA = numA * multiplierA;
  const baseB = numB * multiplierB;
  if (baseA === 0 && baseB === 0) return "equal";

  const relativeDiff = Math.abs(baseA - baseB) / Math.max(Math.abs(baseA), Math.abs(baseB));
  return relativeDiff <= RELATIVE_TOLERANCE ? "equal" : "different";
}
