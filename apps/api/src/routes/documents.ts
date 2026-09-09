import { Router } from "express";
import multer from "multer";
import { and, asc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../lib/db/client.js";
import { documents, facts, factRelationships } from "../lib/db/schema.js";
import { extractPages } from "../lib/pdf/extract.js";
import { processDocument, SYNC_PAGE_THRESHOLD } from "../lib/pipeline/processDocument.js";
import { asyncHandler } from "../asyncHandler.js";
import { getCachedFacts, setCachedFacts } from "../lib/cache/factsCache.js";

const upload = multer({ storage: multer.memoryStorage() });

const DEFAULT_FACTS_PAGE_SIZE = 100;
const MAX_FACTS_PAGE_SIZE = 500;

interface FactsResponse {
  facts: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
  relationshipCount: number;
  relationSummary: Record<string, Record<string, number>>;
}

const RELATION_FILTERS = ["corroborates", "contradicts", "reconciled"] as const;
type RelationFilter = (typeof RELATION_FILTERS)[number];

function isRelationFilter(value: unknown): value is RelationFilter {
  return typeof value === "string" && (RELATION_FILTERS as readonly string[]).includes(value);
}

const factListColumns = {
  id: facts.id,
  documentId: facts.documentId,
  chunkId: facts.chunkId,
  pageNumber: facts.pageNumber,
  entity: facts.entity,
  attribute: facts.attribute,
  value: facts.value,
  unit: facts.unit,
  qualifiers: facts.qualifiers,
  quote: facts.quote,
  confidence: facts.confidence,
} as const;

function parseIntParam(raw: unknown, fallback: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export const documentsRouter = Router();

documentsRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Missing 'file' field" });
      return;
    }

    const buffer = file.buffer;
    const pageCount = (await extractPages(buffer)).length;

    const [doc] = await db
      .insert(documents)
      .values({ filename: file.originalname, fileData: buffer, status: "processing", pageCount })
      .returning({ id: documents.id });

    if (pageCount <= SYNC_PAGE_THRESHOLD) {
      try {
        await processDocument(doc.id, buffer);
      } catch (error) {
        res.status(500).json({ document_id: doc.id, error: error instanceof Error ? error.message : String(error) });
        return;
      }
      const [docFacts, docRelationships] = await Promise.all([
        db.select(factListColumns).from(facts).where(eq(facts.documentId, doc.id)),
        db
          .select({
            id: factRelationships.id,
            factAId: factRelationships.factAId,
            factBId: factRelationships.factBId,
            relationType: factRelationships.relationType,
            explanation: factRelationships.explanation,
            confidence: factRelationships.confidence,
          })
          .from(factRelationships)
          .innerJoin(facts, eq(factRelationships.factAId, facts.id))
          .where(eq(facts.documentId, doc.id)),
      ]);
      res.json({ document_id: doc.id, facts: docFacts, relationships: docRelationships });
      return;
    }

    processDocument(doc.id, buffer).catch((error) => console.error(`document ${doc.id} failed:`, error));
    res.status(202).json({ document_id: doc.id, status: "processing" });
  }),
);

const documentStatusColumns = {
  id: documents.id,
  filename: documents.filename,
  status: documents.status,
  pagesProcessed: documents.pagesProcessed,
  pageCount: documents.pageCount,
  error: documents.error,
} as const;

documentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [doc] = await db.select(documentStatusColumns).from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      pages_processed: doc.pagesProcessed,
      pages_total: doc.pageCount,
      error: doc.error,
    });
  }),
);

documentsRouter.get(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const [doc] = await db.select(documentStatusColumns).from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({
      status: doc.status,
      pages_processed: doc.pagesProcessed,
      pages_total: doc.pageCount,
      error: doc.error,
    });
  }),
);

documentsRouter.get(
  "/:id/facts",
  asyncHandler(async (req, res) => {
    const documentId = req.params.id;
    const limit = parseIntParam(req.query.limit, DEFAULT_FACTS_PAGE_SIZE, MAX_FACTS_PAGE_SIZE);
    const offset = parseIntParam(req.query.offset, 0, Number.MAX_SAFE_INTEGER);
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const filter = isRelationFilter(req.query.filter) ? req.query.filter : null;

    const cacheKey = `${documentId}:${limit}:${offset}:${query}:${filter ?? "all"}`;
    const cached = getCachedFacts<FactsResponse>(documentId, cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const searchCondition = query
      ? or(
          ilike(facts.entity, `%${query}%`),
          ilike(facts.attribute, `%${query}%`),
          ilike(facts.value, `%${query}%`),
          ilike(facts.unit, `%${query}%`),
        )
      : undefined;

    const filterCondition = filter
      ? exists(
          db
            .select({ one: sql`1` })
            .from(factRelationships)
            .where(
              and(
                eq(factRelationships.relationType, filter),
                or(eq(factRelationships.factAId, facts.id), eq(factRelationships.factBId, facts.id)),
              ),
            ),
        )
      : undefined;

    const whereClause = and(eq(facts.documentId, documentId), searchCondition, filterCondition);

    const [rows, [{ total }], [{ relationshipCount }]] = await Promise.all([
      db
        .select(factListColumns)
        .from(facts)
        .where(whereClause)
        .orderBy(asc(facts.pageNumber), asc(facts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(facts).where(whereClause),
      db
        .select({ relationshipCount: sql<number>`count(*)::int` })
        .from(factRelationships)
        .innerJoin(facts, eq(factRelationships.factAId, facts.id))
        .where(eq(facts.documentId, documentId)),
    ]);

    const factIds = rows.map((fact) => fact.id);
    const relationRows = factIds.length
      ? await db
          .select({
            factAId: factRelationships.factAId,
            factBId: factRelationships.factBId,
            relationType: factRelationships.relationType,
          })
          .from(factRelationships)
          .where(or(inArray(factRelationships.factAId, factIds), inArray(factRelationships.factBId, factIds)))
      : [];

    const factIdSet = new Set(factIds);
    const relationSummary: Record<string, Record<string, number>> = {};
    for (const row of relationRows) {
      for (const factId of [row.factAId, row.factBId]) {
        if (!factIdSet.has(factId)) continue;
        relationSummary[factId] ??= {};
        relationSummary[factId][row.relationType] = (relationSummary[factId][row.relationType] ?? 0) + 1;
      }
    }

    const response: FactsResponse = { facts: rows, total, limit, offset, relationshipCount, relationSummary };
    setCachedFacts(documentId, cacheKey, response);
    res.json(response);
  }),
);

documentsRouter.get(
  "/:id/file",
  asyncHandler(async (req, res) => {
    const [doc] = await db
      .select({ filename: documents.filename, fileData: documents.fileData })
      .from(documents)
      .where(eq(documents.id, req.params.id))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.filename}"`);
    res.send(doc.fileData);
  }),
);
