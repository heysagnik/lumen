import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db/client.js";
import { facts, factRelationships, chunks } from "../lib/db/schema.js";
import { asyncHandler } from "../asyncHandler.js";

export const factsRouter = Router();

factsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [fact] = await db.select().from(facts).where(eq(facts.id, id)).limit(1);
    if (!fact) {
      res.status(404).json({ error: "Fact not found" });
      return;
    }

    const [chunk] = await db.select().from(chunks).where(eq(chunks.id, fact.chunkId)).limit(1);

    const relationships = await db
      .select()
      .from(factRelationships)
      .where(or(eq(factRelationships.factAId, id), eq(factRelationships.factBId, id)));

    const relatedFactIds = relationships.map((r) => (r.factAId === id ? r.factBId : r.factAId));
    const relatedFacts = relatedFactIds.length
      ? await db.select().from(facts).where(or(...relatedFactIds.map((rid) => eq(facts.id, rid))))
      : [];

    res.json({
      fact,
      source: chunk ? { pageNumber: chunk.pageNumber, chunkText: chunk.text } : null,
      relationships: relationships.map((r) => ({
        ...r,
        relatedFact: relatedFacts.find((f) => f.id === (r.factAId === id ? r.factBId : r.factAId)) ?? null,
      })),
    });
  }),
);
