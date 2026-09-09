import { Router } from "express";
import multer from "multer";
import { asc, eq, inArray, or } from "drizzle-orm";
import { db } from "../lib/db/client.js";
import { documents, facts, factRelationships } from "../lib/db/schema.js";
import { extractPages } from "../lib/pdf/extract.js";
import { processDocument, SYNC_PAGE_THRESHOLD } from "../lib/pipeline/processDocument.js";
import { asyncHandler } from "../asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage() });

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
        db.select().from(facts).where(eq(facts.documentId, doc.id)),
        db
          .select()
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

documentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
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
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
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

    const rows = await db
      .select()
      .from(facts)
      .where(eq(facts.documentId, documentId))
      .orderBy(asc(facts.pageNumber), asc(facts.createdAt));

    const factIds = rows.map((fact) => fact.id);
    const relationRows = factIds.length
      ? await db
          .select({
            id: factRelationships.id,
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

    res.json({ facts: rows, relationshipCount: relationRows.length, relationSummary });
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
