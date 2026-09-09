import { db } from "../db/client.js";
import { facts } from "../db/schema.js";
import { extractFacts } from "../llm/extractFacts.js";
import { embedTexts } from "../embeddings/embed.js";
import { isQuoteGrounded } from "./grounding.js";
import type { AttributeResolver } from "./attributeRegistry.js";

interface ExtractContext {
  documentId: string;
  chunkId: string;
  chunkText: string;
  pageNumber: number;
  attributeResolver: AttributeResolver;
}

function factStatement(entity: string, attribute: string, value: string, unit: string | null): string {
  return `${entity} ${attribute} ${value}${unit ? ` ${unit}` : ""}`;
}

export async function extractFactsFromChunk(ctx: ExtractContext): Promise<string[]> {
  const extracted = await extractFacts(ctx.chunkText, ctx.documentId);
  const grounded = extracted.filter((fact) => isQuoteGrounded(fact.quote, ctx.chunkText));
  if (grounded.length === 0) return [];

  const canonicalAttributeIds = await ctx.attributeResolver.resolveAll(grounded.map((fact) => fact.attribute));
  const embeddings = await embedTexts(
    grounded.map((fact) => factStatement(fact.entity, fact.attribute, fact.value, fact.unit)),
  );

  const inserted = await db
    .insert(facts)
    .values(
      grounded.map((fact, index) => ({
        documentId: ctx.documentId,
        chunkId: ctx.chunkId,
        pageNumber: ctx.pageNumber,
        entity: fact.entity,
        attribute: fact.attribute,
        canonicalAttributeId: canonicalAttributeIds.get(fact.attribute)!,
        value: fact.value,
        unit: fact.unit,
        qualifiers: fact.qualifiers,
        quote: fact.quote,
        confidence: fact.confidence,
        embedding: embeddings[index],
      })),
    )
    .returning({ id: facts.id });

  return inserted.map((row) => row.id);
}
