import { z } from "zod";
import { generateJson } from "./generateJson.js";

const qualifierEntrySchema = z.object({ key: z.string(), value: z.string() });

const wireFactSchema = z.object({
  entity: z.string(),
  attribute: z.string(),
  value: z.string(),
  unit: z.string().nullable(),
  qualifiers: z.array(qualifierEntrySchema),
  quote: z.string(),
  confidence: z.number().min(0).max(1),
});

export interface ExtractedFact {
  entity: string;
  attribute: string;
  value: string;
  unit: string | null;
  qualifiers: Record<string, string>;
  quote: string;
  confidence: number;
}

const extractionSchema = z.object({ facts: z.array(wireFactSchema) });

const SYSTEM_PROMPT = `You extract discrete, checkable facts from a document excerpt.
A fact has: entity, attribute, value, unit, qualifiers (key/value pairs such as time_period, scope, condition), and a verbatim quote copied exactly from the source text that supports the fact.
Only extract facts that are explicitly stated. Do not infer or calculate. Skip narrative or opinion text.
Return an empty facts array if the excerpt has no checkable facts.
The quote must be an exact substring of the provided text.
Required JSON shape: {"facts": [{"entity": string, "attribute": string, "value": string, "unit": string | null, "qualifiers": [{"key": string, "value": string}], "quote": string, "confidence": number}]}`;

function toQualifierRecord(entries: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

export async function extractFacts(chunkText: string, queueKey?: string): Promise<ExtractedFact[]> {
  const result = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: chunkText,
    schema: extractionSchema,
    queueKey,
  });
  return result.facts.map((fact) => ({ ...fact, qualifiers: toQualifierRecord(fact.qualifiers) }));
}

const batchExtractionSchema = z.object({
  chunks: z.array(z.object({ index: z.number().int(), facts: z.array(wireFactSchema) })),
});

const BATCH_SYSTEM_PROMPT = `You extract discrete, checkable facts from several document excerpts.
A fact has: entity, attribute, value, unit, qualifiers (key/value pairs such as time_period, scope, condition), and a verbatim quote copied exactly from the source text that supports the fact.
Only extract facts that are explicitly stated. Do not infer or calculate. Skip narrative or opinion text.
Each excerpt is independent — do not let facts from one excerpt leak into another's list. Return an empty facts array for an excerpt with no checkable facts.
The quote for a fact must be an exact substring of its own excerpt's text.
Return one entry per excerpt, in the same order, each tagged with its index.
Required JSON shape: {"chunks": [{"index": number, "facts": [{"entity": string, "attribute": string, "value": string, "unit": string | null, "qualifiers": [{"key": string, "value": string}], "quote": string, "confidence": number}]}]}`;

function renderChunk(index: number, text: string): string {
  return `Excerpt ${index}:\n${text}`;
}

export interface IndexedChunkText {
  index: number;
  text: string;
}

export async function extractFactsBatch(
  chunks: IndexedChunkText[],
  queueKey?: string,
): Promise<Map<number, ExtractedFact[]>> {
  if (chunks.length === 0) return new Map();

  const prompt = chunks.map((chunk) => renderChunk(chunk.index, chunk.text)).join("\n\n");

  const result = await generateJson({
    system: BATCH_SYSTEM_PROMPT,
    prompt,
    schema: batchExtractionSchema,
    queueKey,
  });

  const byIndex = new Map(result.chunks.map((entry) => [entry.index, entry.facts]));
  return new Map(
    chunks.map((chunk) => [
      chunk.index,
      (byIndex.get(chunk.index) ?? []).map((fact) => ({ ...fact, qualifiers: toQualifierRecord(fact.qualifiers) })),
    ]),
  );
}
