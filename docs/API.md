# Lumen API

Base URL: `https://lumen-obli.onrender.com`

No authentication is currently required — every endpoint below is open to anyone with the URL. There is also no rate limiting or upload size cap yet (see the main [README](../README.md#todo) TODO list).

All responses are JSON unless noted otherwise. All request bodies for uploads are `multipart/form-data`.

---

## Upload a document

```
POST /v1/documents
Content-Type: multipart/form-data

file: <PDF file>
```

```bash
curl -X POST https://lumen-obli.onrender.com/v1/documents \
  -F "file=@/path/to/document.pdf"
```

Small documents (2 pages or fewer) are processed synchronously and return facts immediately:

```json
{
  "document_id": "a1b2c3d4-...",
  "facts": [ { "id": "...", "entity": "...", "attribute": "...", "value": "...", "unit": null, "quote": "...", "confidence": 0.92 } ],
  "relationships": [ { "id": "...", "factAId": "...", "factBId": "...", "relationType": "corroborates", "explanation": "...", "confidence": 0.95 } ]
}
```

Larger documents return `202 Accepted` immediately and process in the background:

```json
{ "document_id": "a1b2c3d4-...", "status": "processing" }
```

Poll `GET /v1/documents/:id/status` until `status` is `"done"` or `"error"`.

---

## Get document status

```
GET /v1/documents/:id
GET /v1/documents/:id/status
```

```bash
curl https://lumen-obli.onrender.com/v1/documents/a1b2c3d4-.../status
```

```json
{ "status": "processing", "pages_processed": 3, "pages_total": 10, "error": null }
```

`status` is one of `"processing"`, `"done"`, `"error"`.

---

## List facts for a document

```
GET /v1/documents/:id/facts?limit=&offset=&q=&filter=
```

| Param    | Default | Notes                                                              |
|----------|---------|---------------------------------------------------------------------|
| `limit`  | 100     | Max 500                                                              |
| `offset` | 0       |                                                                       |
| `q`      | —       | Free-text search across entity/attribute/value/unit                 |
| `filter` | —       | One of `corroborates`, `contradicts`, `reconciled`                   |

```bash
curl "https://lumen-obli.onrender.com/v1/documents/a1b2c3d4-.../facts?limit=20&filter=contradicts"
```

```json
{
  "facts": [ { "id": "...", "entity": "...", "attribute": "...", "value": "...", "unit": null, "quote": "...", "confidence": 0.92 } ],
  "total": 143,
  "limit": 20,
  "offset": 0,
  "relationshipCount": 12,
  "relationSummary": { "<factId>": { "contradicts": 1 } }
}
```

---

## Get a single fact + its relationships

```
GET /v1/facts/:id
```

```bash
curl https://lumen-obli.onrender.com/v1/facts/f1e2d3c4-...
```

```json
{
  "fact": { "id": "...", "entity": "...", "attribute": "...", "value": "...", "quote": "..." },
  "source": { "pageNumber": 4, "chunkText": "..." },
  "relationships": [ { "id": "...", "relationType": "contradicts", "explanation": "...", "relatedFact": { "...": "..." } } ]
}
```

---

## Get the original PDF

```
GET /v1/documents/:id/file
```

Returns the raw PDF (`Content-Type: application/pdf`), suitable for embedding in an `<iframe>` or PDF viewer.

---

## Errors

All endpoints return `{ "error": "message" }` with a 4xx/5xx status on failure — `404` for unknown document/fact IDs, `400` for a missing upload file, `500` for unexpected server errors.
