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
