import type { DocumentStatus, Fact, FactRelationSummary } from "@lumen/shared";
import { API_URL } from "@/lib/apiUrl";
import { DocumentWorkspace } from "@/components/DocumentWorkspace";

interface DocumentDetail extends DocumentStatus {
  id: string;
  filename: string;
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [docResponse, factsResponse] = await Promise.all([
    fetch(`${API_URL}/v1/documents/${id}`, { cache: "no-store" }),
    fetch(`${API_URL}/v1/documents/${id}/facts`, { cache: "no-store" }),
  ]);

  if (!docResponse.ok) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-muted">Document not found.</p>
      </main>
    );
  }

  const doc: DocumentDetail = await docResponse.json();
  const {
    facts,
    relationshipCount,
    relationSummary,
  }: { facts: Fact[]; relationshipCount: number; relationSummary: Record<string, FactRelationSummary> } = factsResponse.ok
    ? await factsResponse.json()
    : { facts: [], relationshipCount: 0, relationSummary: {} };

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <DocumentWorkspace
        documentId={id}
        filename={doc.filename}
        initialStatus={{
          status: doc.status,
          pages_processed: doc.pages_processed,
          pages_total: doc.pages_total,
          error: doc.error,
        }}
        initialFacts={facts}
        initialRelationshipCount={relationshipCount}
        initialRelationSummary={relationSummary}
      />
    </main>
  );
}
