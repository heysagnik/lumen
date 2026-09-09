"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, TextItem } from "pdfjs-dist/types/src/display/api";
import type { PageViewport } from "pdfjs-dist/types/src/display/page_viewport";

interface HighlightTarget {
  pageNumber: number;
  quote: string;
}

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function findHighlightRects(items: TextItem[], quote: string, viewport: PageViewport): HighlightRect[] {
  const normalizedQuote = normalize(quote);
  if (normalizedQuote.length === 0) return [];

  let concatenated = "";
  const itemRanges = items.map((item) => {
    const separator = item.hasEOL ? "\n" : " ";
    const start = concatenated.length;
    concatenated += normalize(item.str) + separator;
    return { item, start, end: concatenated.length };
  });

  const matchStart = concatenated.indexOf(normalizedQuote);
  if (matchStart === -1) return [];
  const matchEnd = matchStart + normalizedQuote.length;

  return itemRanges
    .filter(({ start, end }) => start < matchEnd && end > matchStart)
    .map(({ item }) => {
      const [x1, y1] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const [x2, y2] = viewport.convertToViewportPoint(item.transform[4] + item.width, item.transform[5] + item.height);
      return {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
    });
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;
const VIEWPORT_MARGIN = 64;

export function PdfViewer({ fileUrl, highlight }: { fileUrl: string; highlight: HighlightTarget | null }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const [seenHighlightKey, setSeenHighlightKey] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);

  const highlightKey = highlight ? `${highlight.pageNumber}:${highlight.quote}` : null;
  if (highlightKey !== seenHighlightKey) {
    setSeenHighlightKey(highlightKey);
    if (highlight) setPageNumber(highlight.pageNumber);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ url: fileUrl }).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setPageCount(pdf.numPages);
    }

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Measure the non-scrolling wrapper, not the overflow-auto container: a vertical
    // scrollbar toggling on the container shrinks its own content-box width, which would
    // otherwise feed back into fitScale and oscillate the canvas size at high zoom levels.
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [fileUrl]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || pageCount === 0 || containerWidth === 0) return;
    let cancelled = false;

    renderTaskRef.current?.cancel();

    async function renderPage() {
      const page = await pdf!.getPage(pageNumber);
      if (cancelled) return;

      const baseWidth = page.getViewport({ scale: 1 }).width;
      const fitScale = (containerWidth - VIEWPORT_MARGIN) / baseWidth;
      const viewport = page.getViewport({ scale: fitScale * zoom });
      const context = canvas!.getContext("2d")!;
      canvas!.width = viewport.width;
      canvas!.height = viewport.height;

      const renderTask = page.render({ canvasContext: context, viewport, canvas: canvas! });
      renderTaskRef.current = renderTask;
      try {
        await renderTask.promise;
      } catch (error) {
        if (error instanceof Error && error.name === "RenderingCancelledException") return;
        throw error;
      }
      if (cancelled) return;

      if (highlight && highlight.pageNumber === pageNumber) {
        const textContent = await page.getTextContent();
        setHighlightRects(findHighlightRects(textContent.items as TextItem[], highlight.quote, viewport));
      } else {
        setHighlightRects([]);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pageNumber, pageCount, highlight, containerWidth, zoom]);

  const zoomPercent = Math.round(zoom * 100);
  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, +(current + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, +(current - ZOOM_STEP).toFixed(2)));

  return (
    <div className="relative flex flex-col h-full">
      <div ref={wrapperRef} className="relative flex-1 min-h-0">
        <div ref={containerRef} className="thin-scrollbar absolute inset-0 overflow-auto bg-background flex justify-center py-6">
          <div className="relative h-fit">
            <canvas ref={canvasRef} className="rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.08)] outline outline-1 outline-black/10" />
            {highlightRects.map((rect, index) => (
              <div
                key={index}
                className="absolute bg-highlight outline outline-1 outline-highlight-border rounded-[2px] transition-opacity duration-200"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border bg-surface/90 backdrop-blur-sm px-1.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
        <button
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-100 hover:bg-foreground/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-muted tabular-nums text-xs px-1.5">
          {pageNumber} / {pageCount || "…"}
        </span>
        <button
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-100 hover:bg-foreground/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
          disabled={pageNumber >= pageCount}
          aria-label="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-100 hover:bg-foreground/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setZoom(1)}
          className="text-muted tabular-nums text-xs px-1.5 w-11 text-center transition-colors duration-100 hover:text-foreground"
          aria-label="Reset zoom to fit"
        >
          {zoomPercent}%
        </button>
        <button
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-100 hover:bg-foreground/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
