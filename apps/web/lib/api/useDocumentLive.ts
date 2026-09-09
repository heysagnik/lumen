"use client";

import { useEffect, useState } from "react";
import type { DocumentStatus, Fact, FactRelationSummary } from "@lumen/shared";
import { API_URL } from "../apiUrl";

const POLL_INTERVAL_MS = 2000;

export function useDocumentLive(
  documentId: string,
  initialStatus: DocumentStatus,
  initialFacts: Fact[],
  initialRelationshipCount: number,
  initialRelationSummary: Record<string, FactRelationSummary>,
) {
  const [status, setStatus] = useState(initialStatus);
  const [facts, setFacts] = useState(initialFacts);
  const [relationshipCount, setRelationshipCount] = useState(initialRelationshipCount);
  const [relationSummary, setRelationSummary] = useState(initialRelationSummary);

  useEffect(() => {
    if (status.status !== "processing") return;

    const interval = setInterval(async () => {
      const [statusResponse, factsResponse] = await Promise.all([
        fetch(`${API_URL}/v1/documents/${documentId}/status`),
        fetch(`${API_URL}/v1/documents/${documentId}/facts`),
      ]);

      if (statusResponse.ok) setStatus(await statusResponse.json());
      if (factsResponse.ok) {
        const data = await factsResponse.json();
        setFacts(data.facts);
        setRelationshipCount(data.relationshipCount);
        setRelationSummary(data.relationSummary ?? {});
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [documentId, status.status]);

  return { status, facts, relationshipCount, relationSummary };
}
