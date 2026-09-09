# Lumen

Lumen ingests PDF documents, extracts structured facts from their text, and cross-references those facts against each other to surface corroborations and contradictions — with every fact traceable back to the exact quote and page it came from.

## Why

Reading a stack of documents (contracts, reports, filings) to find where two sources agree or disagree is slow and error-prone. Lumen automates that: upload PDFs, and it tells you what was said, where, and whether it's consistent across your document set — without asking you to trust an LLM's summary blindly, since every fact carries its source quote.

## How it works

```
PDF upload
   │
   ▼
extract pages (pdfjs-dist, OCR fallback via tesseract.js for scanned pages)
   │
   ▼
chunk each page into text segments, drop boilerplate
   │
   ▼
extract facts per chunk (entity, attribute, value, unit, qualifiers, source quote) via LLM
   │
   ├─▶ attribute registry: new attributes are embedded and matched against
   │   existing canonical attributes (vector similarity) so "revenue" and
   │   "total revenue" resolve to the same concept
   │
   ▼
each new fact is embedded and compared against similar existing facts
   │
   ├─▶ deterministic checks first (exact match, unit-normalized numeric
   │   compare) — cheap and doesn't need an LLM call
   │
   └─▶ ambiguous cases go to an LLM classifier: corroborates / contradicts /
       unrelated
   │
   ▼
facts + relationships stored, queryable per document or per fact
```

**Stack**: Express API (`apps/api`) + Next.js frontend (`apps/web`), Postgres (Neon, with `pgvector` for embeddings) via Drizzle ORM, Cloudflare AI Gateway for LLM calls.

**Key tables**: `documents`, `chunks` (page text segments), `facts` (extracted claims with embeddings), `fact_relationships` (corroborates/contradicts links between facts), `attribute_registry` (canonical attribute names + aliases).

## Running locally

```bash
# apps/api/.env.local and apps/web/.env.local — see .env.example in each
cd apps/api && npm install && npm run db:push && npm run dev
cd apps/web && npm install && npm run dev
```

Requires a Postgres database with the `vector` extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## TODO:

- [ ] **PDF binaries are stored inline in Postgres** (`documents.file_data` as `bytea`) and served directly from the DB on every view (`GET /v1/documents/:id/file`). This is the single biggest driver of database egress/bandwidth — every document view round-trips the full PDF through Postgres. Should move to object storage (R2/S3) with the DB holding only a reference.
- [ ] **No pagination** on list/fact endpoints — large documents return every fact and relationship in one response.
- [ ] **List queries select full rows** (`SELECT *`) instead of the columns actually used, adding unnecessary payload on every request.
- [ ] **No caching layer** — repeated reads of the same document/facts hit Postgres every time.
- [ ] **Attribute registry never merges or prunes** — canonical attributes only grow; near-duplicate attributes from borderline similarity scores accumulate over time.
- [ ] **Relationship checking is per-new-fact, nearest-neighbor only** (top 4 neighbors within a distance threshold) — it won't catch contradictions against facts outside that similarity radius.
- [ ] **No auth** — the API has no access control; anyone with the URL can upload documents or read facts.
- [ ] **Sync vs. async processing is a hardcoded page-count threshold** (`SYNC_PAGE_THRESHOLD`) rather than a job queue, so large documents processed synchronously would time out the request.
- [ ] **No automated tests** currently in the pipeline code.
