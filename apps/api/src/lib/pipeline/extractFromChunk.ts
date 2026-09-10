import { db } from "../db/client.js";
import { facts } from "../db/schema.js";
import { extractFactsBatch, type ExtractedFact } from "../llm/extractFacts.js";
import { embedTexts } from "../embeddings/embed.js";
import { isQuoteGrounded } from "./grounding.js";
import type { AttributeResolver } from "./attributeRegistry.js";
import { invalidateFactsCache } from "../cache/factsCache.js";

export interface ChunkContext {
  documentId: string;
  chunkId: string;
  chunkText: string;
  pageNumber: number;
}

interface GroundedFact {
  chunk: ChunkContext;
  fact: ExtractedFact;
}

function factStatement(entity: string, attribute: string, value: string, unit: string | null): string {
  return `${entity} ${attribute} ${value}${unit ? ` ${unit}` : ""}`;
}

export async function extractFactsFromChunkGroup(
  chunks: ChunkContext[],
  attributeResolver: AttributeResolver,
): Promise<string[]> {
  if (chunks.length === 0) return [];

  const documentId = chunks[0].documentId;
  const byIndex = await extractFactsBatch(
    chunks.map((chunk, index) => ({ index, text: chunk.chunkText })),
    documentId,
  );

  const grounded: GroundedFact[] = [];
  chunks.forEach((chunk, index) => {
    const extracted = byIndex.get(index) ?? [];
    for (const fact of extracted) {
      if (isQuoteGrounded(fact.quote, chunk.chunkText)) grounded.push({ chunk, fact });
    }
  });

  if (grounded.length === 0) return [];

  const canonicalAttributeIds = await attributeResolver.resolveAll(grounded.map(({ fact }) => fact.attribute));
  const embeddings = await embedTexts(
    grounded.map(({ fact }) => factStatement(fact.entity, fact.attribute, fact.value, fact.unit)),
  );

  const inserted = await db
    .insert(facts)
    .values(
      grounded.map(({ chunk, fact }, index) => ({
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        pageNumber: chunk.pageNumber,
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

  if (inserted.length > 0) invalidateFactsCache(documentId);
  return inserted.map((row) => row.id);
}
