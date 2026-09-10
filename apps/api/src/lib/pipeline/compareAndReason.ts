import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { facts, factRelationships } from "../db/schema.js";
import { classifyRelationshipBatch, type RelationshipVerdict } from "../llm/classifyRelationship.js";
import { compareNumericFacts } from "./numericCompare.js";
import { invalidateFactsCache } from "../cache/factsCache.js";

const NEIGHBOR_LIMIT = Number(process.env.RELATIONSHIP_NEIGHBOR_LIMIT ?? 12);
const MAX_NEIGHBOR_DISTANCE = Number(process.env.RELATIONSHIP_MAX_NEIGHBOR_DISTANCE ?? 0.5);

interface FactRow {
  id: string;
  documentId: string;
  entity: string;
  attribute: string;
  value: string;
  unit: string | null;
  qualifiers: Record<string, unknown>;
  quote: string;
}

async function findNeighborFacts(newFact: FactRow, embedding: number[]): Promise<FactRow[]> {
  const vectorParam = `[${embedding.join(",")}]`;
  const rows = await db.execute(sql`
    with scored as (
      select id, document_id, entity, attribute, value, unit, qualifiers, quote,
             embedding <=> ${vectorParam}::vector as dist
      from ${facts}
      where document_id != ${newFact.documentId}
    )
    select id, document_id, entity, attribute, value, unit, qualifiers, quote
    from scored
    where dist < ${MAX_NEIGHBOR_DISTANCE}
    order by dist
    limit ${NEIGHBOR_LIMIT}
  `);
  return rows.rows as unknown as FactRow[];
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/,/g, "");
}

function sameEntity(a: FactRow, b: FactRow): boolean {
  return normalizeText(a.entity) === normalizeText(b.entity);
}

function sameQualifiers(a: FactRow, b: FactRow): boolean {
  return JSON.stringify(a.qualifiers ?? {}) === JSON.stringify(b.qualifiers ?? {});
}

function deterministicVerdict(a: FactRow, b: FactRow): RelationshipVerdict | null {
  if (!sameEntity(a, b)) return null;

  if (normalizeText(a.value) === normalizeText(b.value) && (a.unit ?? "").trim().toLowerCase() === (b.unit ?? "").trim().toLowerCase() && sameQualifiers(a, b)) {
    return { relationType: "corroborates", explanation: "Identical entity, value, unit, and qualifiers.", confidence: 1 };
  }

  const numericResult = compareNumericFacts(a, b);
  if (numericResult === "not_comparable") return null;

  if (numericResult === "equal") {
    return {
      relationType: "corroborates",
      explanation: `Same underlying value after unit normalization (${a.value}${a.unit ?? ""} vs ${b.value}${b.unit ?? ""}).`,
      confidence: 0.95,
    };
  }

  if (sameQualifiers(a, b)) {
    return {
      relationType: "contradicts",
      explanation: `Same entity, attribute, and qualifiers, but different values (${a.value}${a.unit ?? ""} vs ${b.value}${b.unit ?? ""}) with no explaining qualifier.`,
      confidence: 0.9,
    };
  }

  return null;
}

const newFactColumns = {
  id: facts.id,
  documentId: facts.documentId,
  entity: facts.entity,
  attribute: facts.attribute,
  value: facts.value,
  unit: facts.unit,
  qualifiers: facts.qualifiers,
  quote: facts.quote,
  embedding: facts.embedding,
} as const;

export async function compareAndReasonForFact(newFactId: string): Promise<number> {
  const [newFact] = await db.select(newFactColumns).from(facts).where(sql`${facts.id} = ${newFactId}`).limit(1);
  if (!newFact || !newFact.embedding) return 0;

  const neighbors = await findNeighborFacts(newFact as FactRow, newFact.embedding as number[]);

  const preDecided = neighbors.map((neighbor) => ({ neighbor, verdict: deterministicVerdict(newFact as FactRow, neighbor) }));
  const needsLlm = preDecided.filter((entry): entry is { neighbor: FactRow; verdict: null } => entry.verdict === null);

  const llmVerdicts =
    needsLlm.length > 0
      ? await classifyRelationshipBatch(newFact, needsLlm.map((entry) => entry.neighbor), newFact.documentId)
      : [];

  const verdicts = preDecided.map((entry) => {
    if (entry.verdict) return { neighbor: entry.neighbor, verdict: entry.verdict };
    const llmIndex = needsLlm.findIndex((n) => n.neighbor.id === entry.neighbor.id);
    return { neighbor: entry.neighbor, verdict: llmVerdicts[llmIndex] };
  });

  const related = verdicts.filter(({ verdict }) => verdict.relationType !== "unrelated");
  if (related.length === 0) return 0;

  const inserted = await db
    .insert(factRelationships)
    .values(
      related.map(({ neighbor, verdict }) => {
        const [factAId, factBId] = canonicalPair(newFact.id, neighbor.id);
        return {
          factAId,
          factBId,
          relationType: verdict.relationType,
          explanation: verdict.explanation,
          confidence: verdict.confidence,
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: factRelationships.id });

  if (inserted.length > 0) {
    invalidateFactsCache(newFact.documentId);
    for (const { neighbor } of related) invalidateFactsCache(neighbor.documentId);
  }

  return inserted.length;
}
