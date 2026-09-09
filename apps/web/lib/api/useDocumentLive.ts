"use client";

import { useEffect, useState } from "react";
import type { DocumentStatus } from "@lumen/shared";
import { API_URL } from "../apiUrl";

const POLL_INTERVAL_MS = 2000;

interface DocumentTotals {
  factCount: number;
  relationshipCount: number;
}

export function useDocumentLive(documentId: string, initialStatus: DocumentStatus, initialTotals: DocumentTotals) {
  const [status, setStatus] = useState(initialStatus);
  const [totals, setTotals] = useState(initialTotals);

  useEffect(() => {
    if (status.status !== "processing") return;

    const interval = setInterval(async () => {
      const [statusResponse, factsResponse] = await Promise.all([
        fetch(`${API_URL}/v1/documents/${documentId}/status`),
        fetch(`${API_URL}/v1/documents/${documentId}/facts?limit=0`),
      ]);

      if (statusResponse.ok) setStatus(await statusResponse.json());
      if (factsResponse.ok) {
        const data = await factsResponse.json();
        setTotals({ factCount: data.total, relationshipCount: data.relationshipCount });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [documentId, status.status]);

  return { status, ...totals };
}
