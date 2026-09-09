export interface Fact {
  id: string;
  documentId: string;
  chunkId: string;
  pageNumber: number;
  entity: string;
  attribute: string;
  value: string;
  unit: string | null;
  qualifiers: Record<string, unknown> | null;
  quote: string;
  confidence: number;
}

export type FactRelationSummary = Partial<Record<FactRelationship["relationType"], number>>;

export interface FactRelationship {
  id: string;
  factAId: string;
  factBId: string;
  relationType: "corroborates" | "contradicts" | "reconciled" | "unrelated";
  explanation: string;
  confidence: number;
  relatedFact: Fact | null;
}

export interface DocumentStatus {
  status: "processing" | "done" | "error";
  pages_processed: number;
  pages_total: number;
  error: string | null;
}
