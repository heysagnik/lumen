import pLimit from "p-limit";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, chunks } from "../db/schema.js";
import { extractPages } from "../pdf/extract.js";
import { chunkPage, isBoilerplate, type PageChunk } from "../pdf/chunk.js";
import { resolvePageText } from "./resolvePageText.js";
import { createAttributeResolver } from "./attributeRegistry.js";
import { extractFactsFromChunkGroup, type ChunkContext } from "./extractFromChunk.js";
import { compareAndReasonForFact } from "./compareAndReason.js";
import { settleAll } from "./settleAll.js";

const PAGE_CONCURRENCY = 6;
const PIPELINE_ITEM_CEILING_MS = 200000;
const EXTRACTION_GROUP_SIZE = 6;
const EXTRACTION_GROUP_CHAR_BUDGET = 6000;

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

const PROGRESS_UPDATE_INTERVAL_MS = 1500;

async function collectDocumentChunks(documentId: string, buffer: Buffer): Promise<PersistedChunk[]> {
  const pages = await extractPages(buffer);
  await db.update(documents).set({ pageCount: pages.length }).where(eq(documents.id, documentId));

  let pagesProcessed = 0;
  let lastFlushed = 0;
  let lastFlushedAt = 0;
  const flushProgress = async (force: boolean) => {
    if (pagesProcessed === lastFlushed) return;
    const now = Date.now();
    if (!force && now - lastFlushedAt < PROGRESS_UPDATE_INTERVAL_MS) return;
    lastFlushed = pagesProcessed;
    lastFlushedAt = now;
    await db.update(documents).set({ pagesProcessed }).where(eq(documents.id, documentId));
  };

  const limit = pLimit(PAGE_CONCURRENCY);
  const chunksByPage = await Promise.all(
    pages.map((page) =>
      limit(async () => {
        const resolvedText = await resolvePageText(page, buffer, documentId);
        const pageChunks = chunkPage({ ...page, text: resolvedText }).filter((chunk) => !isBoilerplate(chunk.text));
        pagesProcessed += 1;
        await flushProgress(false);
        return pageChunks;
      }),
    ),
  );
  await flushProgress(true);

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

function groupChunks(documentId: string, persistedChunks: PersistedChunk[]): ChunkContext[][] {
  const groups: ChunkContext[][] = [];
  let current: ChunkContext[] = [];
  let currentChars = 0;

  for (const chunk of persistedChunks) {
    const context: ChunkContext = {
      documentId,
      chunkId: chunk.id,
      chunkText: chunk.text,
      pageNumber: chunk.pageNumber,
    };
    if (current.length > 0 && (current.length >= EXTRACTION_GROUP_SIZE || currentChars + chunk.text.length > EXTRACTION_GROUP_CHAR_BUDGET)) {
      groups.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(context);
    currentChars += chunk.text.length;
  }
  if (current.length > 0) groups.push(current);

  return groups;
}

async function extractFactsFromDocument(documentId: string, persistedChunks: PersistedChunk[]): Promise<ExtractionOutcome> {
  const attributeResolver = createAttributeResolver();
  const groups = groupChunks(documentId, persistedChunks);

  const { values, failureCount } = await settleAll(
    groups.map((group) => extractFactsFromChunkGroup(group, attributeResolver)),
    { perItemTimeoutMs: PIPELINE_ITEM_CEILING_MS },
  );

  return { factIds: values.flat(), failedChunkCount: failureCount };
}

interface ComparisonOutcome {
  relationshipCount: number;
  failedComparisonCount: number;
}

async function compareNewFacts(factIds: string[]): Promise<ComparisonOutcome> {
  const { values, failureCount } = await settleAll(
    factIds.map((factId) => compareAndReasonForFact(factId)),
    { perItemTimeoutMs: PIPELINE_ITEM_CEILING_MS },
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
