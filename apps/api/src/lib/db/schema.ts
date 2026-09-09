import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  real,
  customType,
  timestamp,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType: () => "bytea",
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  fileData: bytea("file_data").notNull(),
  status: text("status").notNull().default("processing"),
  pageCount: integer("page_count").notNull().default(0),
  pagesProcessed: integer("pages_processed").notNull().default(0),
  error: text("error"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    text: text("text").notNull(),
    hasEmbeddedImage: boolean("has_embedded_image").notNull().default(false),
    imageRefs: jsonb("image_refs").$type<Array<{ x: number; y: number; width: number; height: number }>>().default([]),
  },
  (table) => [index("chunks_document_id_idx").on(table.documentId)],
);

export const attributeRegistry = pgTable("attribute_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalName: text("canonical_name").notNull(),
  aliases: text("aliases").array().notNull().default([]),
  embedding: vector("embedding", { dimensions: 384 }),
});

export const facts = pgTable(
  "facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id").notNull().references(() => chunks.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    entity: text("entity").notNull(),
    attribute: text("attribute").notNull(),
    canonicalAttributeId: uuid("canonical_attribute_id").references(() => attributeRegistry.id),
    value: text("value").notNull(),
    unit: text("unit"),
    qualifiers: jsonb("qualifiers").$type<Record<string, unknown>>().default({}),
    quote: text("quote").notNull(),
    confidence: real("confidence").notNull(),
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("facts_document_id_idx").on(table.documentId),
    index("facts_canonical_attribute_id_idx").on(table.canonicalAttributeId),
    index("facts_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const factRelationships = pgTable(
  "fact_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factAId: uuid("fact_a_id").notNull().references(() => facts.id, { onDelete: "cascade" }),
    factBId: uuid("fact_b_id").notNull().references(() => facts.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    explanation: text("explanation").notNull(),
    confidence: real("confidence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fact_relationships_fact_a_id_idx").on(table.factAId),
    index("fact_relationships_fact_b_id_idx").on(table.factBId),
    uniqueIndex("fact_relationships_pair_unique_idx").on(table.factAId, table.factBId),
  ],
);
