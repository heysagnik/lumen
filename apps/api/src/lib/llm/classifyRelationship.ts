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

const SYSTEM_PROMPT = `You compare two extracted facts about the same or similar attribute and decide their relationship.
- corroborates: both facts state the same underlying value/claim, possibly with different phrasing or units.
- contradicts: same entity/attribute/scope/time, genuinely different values, with no qualifier explaining the gap.
- reconciled: facts look contradictory on the surface, but differing qualifiers (time period, scope, condition) explain the difference.
- unrelated: facts are not comparable.
Ground your explanation in the qualifiers of both facts.
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

const BATCH_SYSTEM_PROMPT = `You compare a subject fact against several candidate facts and decide each pair's relationship.
- corroborates: both facts state the same underlying value/claim, possibly with different phrasing or units.
- contradicts: same entity/attribute/scope/time, genuinely different values, with no qualifier explaining the gap.
- reconciled: facts look contradictory on the surface, but differing qualifiers (time period, scope, condition) explain the difference.
- unrelated: facts are not comparable.
Ground each explanation in the qualifiers of both facts. Return one verdict per candidate, in the same order, each tagged with its index.
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
