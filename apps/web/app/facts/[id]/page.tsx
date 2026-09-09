import Link from "next/link";
import type { Fact, FactRelationship } from "@lumen/shared";
import { API_URL } from "@/lib/apiUrl";
import { RelationshipBadge } from "@/components/RelationshipBadge";

interface FactDetail {
  fact: Fact;
  source: { pageNumber: number; chunkText: string } | null;
  relationships: FactRelationship[];
}

export default async function FactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const response = await fetch(`${API_URL}/v1/facts/${id}`, { cache: "no-store" });
  if (!response.ok) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-muted">Fact not found.</p>
      </main>
    );
  }

  const { fact, source, relationships }: FactDetail = await response.json();

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <Link href={`/documents/${fact.documentId}`} className="text-sm text-muted hover:text-foreground transition-colors">
        ← Back to document
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-1">
        {fact.entity} — {fact.attribute}
      </h1>
      <p className="text-lg mb-6">
        {fact.value} {fact.unit ?? ""}
      </p>

      <section className="mb-8">
        <h2 className="text-xs font-medium text-subtle uppercase tracking-wide mb-2">Source</h2>
        <blockquote className="border-l-2 border-border-strong pl-3 text-muted italic">&ldquo;{fact.quote}&rdquo;</blockquote>
        {source && <p className="text-xs text-subtle mt-1.5">page {source.pageNumber}</p>}
      </section>

      <section>
        <h2 className="text-xs font-medium text-subtle uppercase tracking-wide mb-2">Relationships</h2>
        {relationships.length === 0 && <p className="text-muted text-sm">No related facts found.</p>}
        <ul className="flex flex-col gap-2.5">
          {relationships.map((r) => (
            <li key={r.id} className="rounded-xl border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <RelationshipBadge type={r.relationType} />
                {r.relatedFact && (
                  <Link href={`/facts/${r.relatedFact.id}`} className="text-sm font-medium hover:underline">
                    {r.relatedFact.entity} — {r.relatedFact.attribute}: {r.relatedFact.value} {r.relatedFact.unit ?? ""}
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted">{r.explanation}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
