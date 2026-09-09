import pLimit from "p-limit";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, chunks } from "../db/schema.js";
import { extractPages } from "../pdf/extract.js";
import { chunkPage, isBoilerplate, type PageChunk } from "../pdf/chunk.js";
import { resolvePageText } from "./resolvePageText.js";
import { createAttributeResolver } from "./attributeRegistry.js";
import { extractFactsFromChunk } from "./extractFromChunk.js";
import { compareAndReasonForFact } from "./compareAndReason.js";
import { retryWithBackoff } from "./retryWithBackoff.js";
import { settleAll } from "./settleAll.js";

const PAGE_CONCURRENCY = 6;
export const SYNC_PAGE_THRESHOLD = 2;

export interface ProcessResult {
  factCount: number;
  relationshipCount: number;
  failedChunkCount: number;
  failedComparisonCount: number;
}

export async function processDocument(documentId: string, buffer: Buffer): Promise<ProcessResult> {
  try {
    return await runPipeline(documentId, buffer);
  } catch (error) {
    await db
      .update(documents)
      .set({ status: "error", error: error instanceof Error ? error.message : String(error) })
      .where(eq(documents.id, documentId));
    throw error;
  }
}

interface PersistedChunk {
  id: string;
  text: string;
  pageNumber: number;
}

async function collectDocumentChunks(documentId: string, buffer: Buffer): Promise<PersistedChunk[]> {
  const pages = await extractPages(buffer);
  await db.update(documents).set({ pageCount: pages.length }).where(eq(documents.id, documentId));

  const limit = pLimit(PAGE_CONCURRENCY);
  const chunksByPage = await Promise.all(
    pages.map((page) =>
      limit(async () => {
        const resolvedText = await resolvePageText(page, buffer, documentId);
        const pageChunks = chunkPage({ ...page, text: resolvedText }).filter((chunk) => !isBoilerplate(chunk.text));
        await db
          .update(documents)
          .set({ pagesProcessed: sql`${documents.pagesProcessed} + 1` })
          .where(eq(documents.id, documentId));
        return pageChunks;
      }),
    ),
  );

  return persistChunks(documentId, chunksByPage.flat());
}

async function persistChunks(documentId: string, pageChunks: PageChunk[]): Promise<PersistedChunk[]> {
  if (pageChunks.length === 0) return [];

  const rows = await db
    .insert(chunks)
    .values(
      pageChunks.map((chunk) => ({
        documentId,
        pageNumber: chunk.pageNumber,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        text: chunk.text,
        hasEmbeddedImage: chunk.hasEmbeddedImage,
        imageRefs: chunk.imageRefs,
      })),
    )
    .returning({ id: chunks.id });

  return rows.map((row, index) => ({ id: row.id, text: pageChunks[index].text, pageNumber: pageChunks[index].pageNumber }));
}

interface ExtractionOutcome {
  factIds: string[];
  failedChunkCount: number;
}

async function extractFactsFromDocument(documentId: string, persistedChunks: PersistedChunk[]): Promise<ExtractionOutcome> {
  const attributeResolver = createAttributeResolver();

  const { values, failureCount } = await settleAll(
    persistedChunks.map((chunk) =>
      retryWithBackoff(() =>
        extractFactsFromChunk({
          documentId,
          chunkId: chunk.id,
          chunkText: chunk.text,
          pageNumber: chunk.pageNumber,
          attributeResolver,
        }),
      ),
    ),
  );

  return { factIds: values.flat(), failedChunkCount: failureCount };
}

interface ComparisonOutcome {
  relationshipCount: number;
  failedComparisonCount: number;
}

async function compareNewFacts(factIds: string[]): Promise<ComparisonOutcome> {
  const { values, failureCount } = await settleAll(
    factIds.map((factId) => retryWithBackoff(() => compareAndReasonForFact(factId))),
  );
  return {
    relationshipCount: values.reduce((total, count) => total + count, 0),
    failedComparisonCount: failureCount,
  };
}

async function runPipeline(documentId: string, buffer: Buffer): Promise<ProcessResult> {
  const persistedChunks = await collectDocumentChunks(documentId, buffer);

  const extraction = await extractFactsFromDocument(documentId, persistedChunks);
  const comparison = await compareNewFacts(extraction.factIds);

  const totalFailures = extraction.failedChunkCount + comparison.failedComparisonCount;
  await db
    .update(documents)
    .set({
      status: "done",
      error: totalFailures > 0 ? `${totalFailures} pipeline step(s) failed and were skipped; see server logs` : null,
    })
    .where(eq(documents.id, documentId));

  return {
    factCount: extraction.factIds.length,
    relationshipCount: comparison.relationshipCount,
    failedChunkCount: extraction.failedChunkCount,
    failedComparisonCount: comparison.failedComparisonCount,
  };
}
