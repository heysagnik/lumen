import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { attributeRegistry } from "../db/schema.js";
import { embedTexts } from "../embeddings/embed.js";

const AUTO_ACCEPT_SIMILARITY_THRESHOLD = 0.82;

interface RegistryMatch {
  id: string;
  canonicalName: string;
  similarity: number;
}

async function findNearestAttribute(embedding: number[]): Promise<RegistryMatch | null> {
  const rows = await db.execute(sql`
    select id, canonical_name, 1 - (embedding <=> ${sql.raw(`'[${embedding.join(",")}]'`)}::vector) as similarity
    from ${attributeRegistry}
    order by embedding <=> ${sql.raw(`'[${embedding.join(",")}]'`)}::vector
    limit 1
  `);
  const row = rows.rows[0] as { id: string; canonical_name: string; similarity: number } | undefined;
  return row ? { id: row.id, canonicalName: row.canonical_name, similarity: row.similarity } : null;
}

async function resolveOne(attributeText: string, embedding: number[]): Promise<string> {
  const match = await findNearestAttribute(embedding);

  if (match && match.similarity >= AUTO_ACCEPT_SIMILARITY_THRESHOLD) {
    await db
      .update(attributeRegistry)
      .set({ aliases: sql`array_append(${attributeRegistry.aliases}, ${attributeText})` })
      .where(sql`${attributeRegistry.id} = ${match.id}`);
    return match.id;
  }

  const [created] = await db
    .insert(attributeRegistry)
    .values({ canonicalName: attributeText, aliases: [attributeText], embedding })
    .returning({ id: attributeRegistry.id });
  return created.id;
}

export interface AttributeResolver {
  resolveAll(attributeTexts: string[]): Promise<Map<string, string>>;
}

export function createAttributeResolver(): AttributeResolver {
  const cache = new Map<string, string>();

  async function resolveAll(attributeTexts: string[]): Promise<Map<string, string>> {
    const unresolved = [...new Set(attributeTexts.filter((text) => !cache.has(text)))];
    if (unresolved.length > 0) {
      const embeddings = await embedTexts(unresolved);
      const resolvedIds = await Promise.all(
        unresolved.map((text, index) => resolveOne(text, embeddings[index])),
      );
      unresolved.forEach((text, index) => cache.set(text, resolvedIds[index]));
    }

    const result = new Map<string, string>();
    for (const text of attributeTexts) result.set(text, cache.get(text)!);
    return result;
  }

  return { resolveAll };
}
