import { z } from "zod";
import { generateJson } from "./generateJson.js";

export const RELATION_TYPES = ["corroborates", "contradicts", "reconciled", "unrelated"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

const verdictSchema = z.object({
  relationType: z.enum(RELATION_TYPES),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
});

export type RelationshipVerdict = z.infer<typeof verdictSchema>;

export interface FactForComparison {
  entity: string;
  attribute: string;
  value: string;
  unit: string | null;
  qualifiers: Record<string, unknown> | null;
  quote: string;
}

const SYSTEM_PROMPT = `You compare two extracted facts and decide their relationship. Base your judgment only on the fields given — do not assume context that isn't stated.
- corroborates: same entity and attribute, and the values state the same underlying claim (allowing for phrasing, unit, or rounding differences).
- contradicts: same entity and attribute (and scope/time, if given), but genuinely different values, with no qualifier that explains the gap.
- reconciled: values look contradictory on the surface, but differing qualifiers (time period, scope, condition) explain the difference — the facts are both correct in their own context.
- unrelated: different entities or attributes, or not enough context to compare — this is the default when in doubt.
Ground your explanation in the specific qualifiers of both facts; do not restate the rule definitions.
Required JSON shape: {"relationType": "corroborates" | "contradicts" | "reconciled" | "unrelated", "explanation": string, "confidence": number}`;

function renderFact(label: string, fact: FactForComparison): string {
  return `${label}: entity=${fact.entity}, attribute=${fact.attribute}, value=${fact.value}, unit=${fact.unit ?? "n/a"}, qualifiers=${JSON.stringify(fact.qualifiers)}, quote="${fact.quote}"`;
}

export async function classifyRelationship(
  factA: FactForComparison,
  factB: FactForComparison,
): Promise<RelationshipVerdict> {
  return generateJson({
    system: SYSTEM_PROMPT,
    prompt: `${renderFact("Fact A", factA)}\n${renderFact("Fact B", factB)}`,
    schema: verdictSchema,
  });
}

const batchVerdictSchema = z.object({
  verdicts: z.array(z.object({ index: z.number().int(), ...verdictSchema.shape })),
});

const BATCH_SYSTEM_PROMPT = `You compare a subject fact against several candidate facts and decide each pair's relationship independently. Base your judgment only on the fields given — do not assume context that isn't stated.
- corroborates: same entity and attribute, and the values state the same underlying claim (allowing for phrasing, unit, or rounding differences).
- contradicts: same entity and attribute (and scope/time, if given), but genuinely different values, with no qualifier that explains the gap.
- reconciled: values look contradictory on the surface, but differing qualifiers (time period, scope, condition) explain the difference — the facts are both correct in their own context.
- unrelated: different entities or attributes, or not enough context to compare — this is the default when in doubt.
Ground each explanation in the specific qualifiers of that pair; do not restate the rule definitions. One candidate's verdict must not influence another's. Return one verdict per candidate, in the same order, each tagged with its index.
Required JSON shape: {"verdicts": [{"index": number, "relationType": "corroborates" | "contradicts" | "reconciled" | "unrelated", "explanation": string, "confidence": number}]}`;

export async function classifyRelationshipBatch(
  subject: FactForComparison,
  candidates: FactForComparison[],
  queueKey?: string,
): Promise<RelationshipVerdict[]> {
  if (candidates.length === 0) return [];

  const prompt = [
    renderFact("Subject", subject),
    ...candidates.map((candidate, i) => renderFact(`Candidate ${i}`, candidate)),
  ].join("\n");

  const { verdicts } = await generateJson({
    system: BATCH_SYSTEM_PROMPT,
    prompt,
    schema: batchVerdictSchema,
    queueKey,
  });

  const byIndex = new Map(verdicts.map((v) => [v.index, v]));
  return candidates.map((_, i) => byIndex.get(i) ?? { relationType: "unrelated", explanation: "", confidence: 0 });
}
