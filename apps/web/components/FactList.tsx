"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentStatus, Fact, FactRelationSummary } from "@lumen/shared";
import { useFacts, type FactsPage, type RelationFilter } from "@/lib/api/useFacts";

const FALLBACK_PAGE_SIZE = 8;

const RELATION_PRIORITY: Array<keyof FactRelationSummary> = ["contradicts", "reconciled", "corroborates"];

const RELATION_DOT: Record<string, string> = {
  contradicts: "bg-danger",
  reconciled: "bg-warning",
  corroborates: "bg-success",
};

const FILTERS: { id: RelationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "corroborates", label: "Corroborated" },
  { id: "contradicts", label: "Contradicted" },
  { id: "reconciled", label: "Reconciled" },
];

function relationSignal(summary: FactRelationSummary | undefined) {
  if (!summary) return null;
  const dominant = RELATION_PRIORITY.find((type) => (summary[type] ?? 0) > 0);
  if (!dominant) return null;
  return { dominant };
}

function FactSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="h-3.5 w-28 rounded bg-foreground/8 animate-pulse" />
        <div className="h-4 w-8 rounded bg-foreground/8 animate-pulse" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-16 rounded bg-foreground/8 animate-pulse" />
        <div className="h-3.5 w-14 rounded bg-foreground/8 animate-pulse" />
      </div>
    </div>
  );
}

export function FactList({
  documentId,
  selectedFactId,
  onSelect,
  documentStatus,
  initialFactsPage,
}: {
  documentId: string;
  selectedFactId: string | null;
  onSelect: (fact: Fact) => void;
  documentStatus: DocumentStatus["status"];
  initialFactsPage: FactsPage;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const firstItemRef = useRef<HTMLLIElement>(null);
  const [listHeight, setListHeight] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RelationFilter>("all");

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new ResizeObserver(([entry]) => setListHeight(entry.contentRect.height));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (firstItemRef.current) setItemHeight(firstItemRef.current.offsetHeight);
  });

  const pageSize = itemHeight > 0 && listHeight > 0 ? Math.max(1, Math.floor(listHeight / itemHeight)) : FALLBACK_PAGE_SIZE;

  useEffect(() => {
    setPage(0);
  }, [query, filter]);

  const { facts, total, relationSummary, loading } = useFacts({
    documentId,
    pageSize,
    page,
    query: query.trim(),
    filter,
    isProcessing: documentStatus === "processing",
    initialData: page === 0 && !query && filter === "all" ? initialFactsPage : undefined,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const toolbar = (
    <div className="border-b shrink-0 flex flex-col gap-2 px-3 pt-3 pb-2.5">
      <div className="relative">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search facts"
          className="w-full h-7 pl-7 pr-2.5 text-sm bg-transparent border rounded-md placeholder:text-subtle focus:outline-none focus:border-accent transition-colors duration-100"
        />
      </div>
      <div className="flex items-center gap-0.5 bg-foreground/5 rounded-md p-0.5">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`flex-1 min-w-0 truncate px-1 h-6 rounded text-xs font-medium transition-colors duration-100 ${
              filter === option.id ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (total === 0 && !loading) {
    if (documentStatus === "processing") {
      return (
        <div className="p-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <FactSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (documentStatus === "error") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2">
          <p className="text-sm font-medium text-danger">Processing failed</p>
          <p className="text-xs text-subtle">This document couldn&apos;t be fully processed. See the error above.</p>
        </div>
      );
    }

    if (query || filter !== "all") {
      return (
        <div className="flex flex-col h-full min-h-0">
          {toolbar}
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6 gap-1">
            <p className="text-sm font-medium text-muted">No matching facts</p>
            <p className="text-xs text-subtle">Try a different search or filter.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2">
        <p className="text-sm font-medium text-muted">No facts found</p>
        <p className="text-xs text-subtle">Lumen couldn&apos;t extract any checkable facts from this document.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {toolbar}
      <ul ref={listRef} className="overflow-hidden flex-1 min-h-0 p-1.5">
        {facts.map((fact, index) => {
          const isSelected = selectedFactId === fact.id;
          const signal = relationSignal(relationSummary[fact.id]);
          return (
            <li key={fact.id} ref={index === 0 ? firstItemRef : undefined} className="animate-[fact-enter_200ms_ease-out]">
              <button
                onClick={() => onSelect(fact)}
                className={`flex items-start gap-2 w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-100 active:scale-[0.99] ${
                  isSelected ? "bg-accent/10" : "hover:bg-foreground/5"
                }`}
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${signal ? RELATION_DOT[signal.dominant] : "bg-transparent"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm truncate">{fact.entity}</span>
                    <span className="text-xs text-subtle shrink-0 tabular-nums">p.{fact.pageNumber}</span>
                  </div>
                  <div className="text-sm text-muted truncate">
                    {fact.attribute}: <span className="text-foreground">{fact.value} {fact.unit ?? ""}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-3 h-11 border-t shrink-0">
          <span className="text-xs text-subtle tabular-nums">
            {page * pageSize + 1}–{Math.min(page * pageSize + pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-0.5 bg-foreground/5 rounded-md p-0.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors duration-100 hover:bg-surface hover:shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-xs text-foreground font-medium tabular-nums px-1.5 min-w-[3.5rem] text-center">
              {page + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors duration-100 hover:bg-surface hover:shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
