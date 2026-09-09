"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DocumentStatus, Fact, FactRelationSummary } from "@lumen/shared";
import { useDocumentLive } from "@/lib/api/useDocumentLive";
import { API_URL } from "@/lib/apiUrl";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { StatusIndicator } from "./StatusIndicator";
import { DocumentProgress } from "./DocumentProgress";
import { FactList } from "./FactList";
import { PdfViewer } from "./PdfViewer";

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 384;
const SIDEBAR_WIDTH_STORAGE_KEY = "lumen-sidebar-width";

function useResizableSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });

  useEffect(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH) setWidth(stored);
  }, []);

  const startDragging = useCallback(
    (event: React.PointerEvent) => {
      dragStartRef.current = { startX: event.clientX, startWidth: width };
      setIsDragging(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isDragging) return;

    function onPointerMove(event: PointerEvent) {
      const delta = event.clientX - dragStartRef.current.startX;
      const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, dragStartRef.current.startWidth + delta));
      setWidth(next);
    }

    function onPointerUp() {
      setIsDragging(false);
      setWidth((current) => {
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(current));
        return current;
      });
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging]);

  return { width, isDragging, startDragging };
}

export function DocumentWorkspace({
  documentId,
  filename,
  initialStatus,
  initialFacts,
  initialRelationshipCount,
  initialRelationSummary,
}: {
  documentId: string;
  filename: string;
  initialStatus: DocumentStatus;
  initialFacts: Fact[];
  initialRelationshipCount: number;
  initialRelationSummary: Record<string, FactRelationSummary>;
}) {
  const { status, facts, relationshipCount, relationSummary } = useDocumentLive(
    documentId,
    initialStatus,
    initialFacts,
    initialRelationshipCount,
    initialRelationSummary,
  );
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const { width: sidebarWidth, isDragging, startDragging } = useResizableSidebarWidth();

  return (
    <div className={`flex flex-1 min-h-0 ${isDragging ? "select-none cursor-col-resize" : ""}`}>
      <aside className="border-r flex flex-col min-h-0 bg-surface shrink-0" style={{ width: sidebarWidth }}>
        <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <Link href="/" className="flex items-center gap-2 transition-transform duration-150 active:scale-95" aria-label="Lumen home">
            <Logo size={20} />
            <span className="text-sm font-semibold tracking-tight">Lumen</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="px-4 py-3.5 border-b flex flex-col gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold truncate">{filename}</h1>
              <StatusIndicator status={status.status} />
            </div>
            {status.error && <p className="text-xs text-danger mt-0.5 truncate">{status.error}</p>}
          </div>
          <p className="text-xs text-subtle">
            <span className="text-foreground font-medium tabular-nums">{facts.length}</span> facts ·{" "}
            <span className="text-foreground font-medium tabular-nums">{relationshipCount}</span> relationships ·{" "}
            <span className="text-foreground font-medium tabular-nums">{status.pages_total}</span> pages
          </p>
          {status.status === "processing" && <DocumentProgress status={status} />}
        </div>
        <div className="flex-1 min-h-0">
          <FactList
            facts={facts}
            selectedFactId={selectedFact?.id ?? null}
            onSelect={setSelectedFact}
            documentStatus={status.status}
            relationSummary={relationSummary}
          />
        </div>
      </aside>
      <div
        onPointerDown={startDragging}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize facts panel"
        className="relative w-px shrink-0 cursor-col-resize group"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        <div className={`absolute inset-y-0 left-0 w-px transition-colors duration-100 ${isDragging ? "bg-accent" : "bg-border group-hover:bg-border-strong"}`} />
      </div>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <PdfViewer
          fileUrl={`${API_URL}/v1/documents/${documentId}/file`}
          highlight={selectedFact ? { pageNumber: selectedFact.pageNumber, quote: selectedFact.quote } : null}
        />
      </div>
    </div>
  );
}
