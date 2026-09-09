"use client";

import { useEffect, useRef, useState } from "react";
import type { Fact, FactRelationSummary } from "@lumen/shared";
import { API_URL } from "../apiUrl";

const POLL_INTERVAL_MS = 2000;
const SEARCH_DEBOUNCE_MS = 300;

export type RelationFilter = "all" | "corroborates" | "contradicts" | "reconciled";

export interface FactsPage {
  facts: Fact[];
  total: number;
  relationshipCount: number;
  relationSummary: Record<string, FactRelationSummary>;
}

const EMPTY_PAGE: FactsPage = { facts: [], total: 0, relationshipCount: 0, relationSummary: {} };

export function useFacts(options: {
  documentId: string;
  pageSize: number;
  page: number;
  query: string;
  filter: RelationFilter;
  isProcessing: boolean;
  initialData?: FactsPage;
}) {
  const { documentId, pageSize, page, query, filter, isProcessing, initialData } = options;
  const [data, setData] = useState<FactsPage>(initialData ?? EMPTY_PAGE);
  const [loading, setLoading] = useState(false);
  const [pollTick, setPollTick] = useState(0);
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => setPollTick((tick) => tick + 1), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    const requestId = ++latestRequestId.current;
    setLoading(true);

    const timeout = setTimeout(
      async () => {
        const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
        if (query) params.set("q", query);
        if (filter !== "all") params.set("filter", filter);

        const response = await fetch(`${API_URL}/v1/documents/${documentId}/facts?${params}`);
        if (latestRequestId.current !== requestId) return;
        if (response.ok) setData(await response.json());
        setLoading(false);
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );

    return () => clearTimeout(timeout);
  }, [documentId, pageSize, page, query, filter, pollTick]);

  return { ...data, loading };
}
