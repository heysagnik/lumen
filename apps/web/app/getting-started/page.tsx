"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

const BASE_URL = "https://lumen-obli.onrender.com";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "upload-document", label: "Upload a document" },
  { id: "document-status", label: "Document status" },
  { id: "list-facts", label: "List facts" },
  { id: "single-fact", label: "Single fact" },
  { id: "original-pdf", label: "Original PDF" },
  { id: "errors", label: "Errors" },
];

const SYNC_RESPONSE_CODE = JSON.stringify(
  {
    document_id: "a1b2c3d4-...",
    facts: [
      {
        id: "f8a9b0c1-...",
        entity: "Delhivery Limited",
        attribute: "Total Revenue FY24",
        value: "8,142",
        unit: "INR Crore",
        quote: "Revenue from operations reached ₹8,142 Cr for the fiscal year ended March 31, 2024.",
        confidence: 0.96,
      },
    ],
    relationships: [
      {
        id: "r1a2b3c4-...",
        factAId: "f8a9b0c1-...",
        factBId: "f2b3c4d5-...",
        relationType: "corroborates",
        explanation: "Consistent with earnings report filed in Q4 investor deck.",
        confidence: 0.95,
      },
    ],
  },
  null,
  2
);

const ASYNC_RESPONSE_CODE = JSON.stringify(
  {
    document_id: "a1b2c3d4-...",
    status: "processing",
  },
  null,
  2
);

const STATUS_RESPONSE_CODE = JSON.stringify(
  {
    status: "processing",
    pages_processed: 3,
    pages_total: 10,
    error: null,
  },
  null,
  2
);

const FACTS_RESPONSE_CODE = JSON.stringify(
  {
    facts: [
      {
        id: "f8a9b0c1-...",
        entity: "Delhivery",
        attribute: "Adjusted EBITDA",
        value: "127",
        unit: "INR Crore",
        quote: "Adjusted EBITDA turned positive to ₹127 Cr compared to a loss in previous period.",
        confidence: 0.92,
      },
    ],
    total: 143,
    limit: 20,
    offset: 0,
    relationshipCount: 12,
    relationSummary: {
      "f8a9b0c1-...": {
        contradicts: 1,
      },
    },
  },
  null,
  2
);

const SINGLE_FACT_RESPONSE_CODE = JSON.stringify(
  {
    fact: {
      id: "f1e2d3c4-...",
      entity: "Delhivery",
      attribute: "Express Parcel Volume",
      value: "740",
      unit: "Million orders",
      quote: "Handled over 740 million express parcel shipments across India.",
    },
    source: {
      pageNumber: 4,
      chunkText: "During the year under review, express parcel shipment volumes crossed 740 million orders.",
    },
    relationships: [
      {
        id: "rel-9921",
        relationType: "contradicts",
        explanation: "Earlier prospectus cited 705 million shipments for the overlapping period.",
        relatedFact: {
          id: "fact-prev",
          entity: "Delhivery",
          attribute: "Express Parcel Volume",
          value: "705",
          unit: "Million orders",
        },
      },
    ],
  },
  null,
  2
);

const ERROR_RESPONSE_CODE = JSON.stringify(
  {
    error: "Document not found",
  },
  null,
  2
);

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono text-subtle hover:text-foreground transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-success text-[11px]">copied</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span className="text-[11px]">copy</span>
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/80 bg-foreground/[0.02]">
        <span className="text-[11px] font-mono text-subtle uppercase tracking-wider">{language}</span>
        <CopyButton text={code} />
      </div>
      <div className="p-3.5 overflow-x-auto thin-scrollbar">
        <pre className="font-mono text-xs leading-relaxed text-foreground">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="flex items-center gap-3 pt-10 pb-3 scroll-mt-16">
      <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight shrink-0">
        {title}
      </h2>
      <div className="h-px bg-border flex-1" />
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  if (method === "POST") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
        POST
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
      GET
    </span>
  );
}

export default function GettingStartedPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [uploadTab, setUploadTab] = useState<"sync" | "async">("sync");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
          const clientHeight = window.innerHeight || document.documentElement.clientHeight;
          const totalScroll = scrollHeight - clientHeight;
          if (totalScroll > 0) {
            setScrollProgress(Math.min(1, Math.max(0, scrollY / totalScroll)));
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.body.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-full bg-background text-foreground flex flex-col font-sans">
      <div
        className="fixed top-0 left-0 right-0 h-[2px] bg-accent z-50 transition-transform duration-75 origin-left"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-12 sm:py-16 flex-1">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-14 items-start">
          <aside className="w-full md:w-44 lg:w-48 shrink-0 md:sticky md:top-12 flex flex-col">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-subtle hover:text-foreground transition-colors group"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 transition-transform group-hover:-translate-x-0.5"
              >
                <path
                  d="M5.5 4L1.5 8M1.5 8L5.5 12M1.5 8H10C11.3807 8 12.5 6.88071 12.5 5.5V5.5C12.5 4.11929 11.3807 3 10 3H8.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
              </svg>
              <span>Index</span>
            </Link>

            <nav aria-label="Table of Contents" className="hidden md:flex flex-col gap-2 mt-10">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`text-sm leading-snug transition-colors ${
                      isActive
                        ? "text-foreground font-medium"
                        : "text-subtle hover:text-muted"
                    }`}
                  >
                    {section.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 max-w-2xl">
            <header className="mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-1">
                Getting started
              </h1>
              <time className="text-xs text-subtle font-mono">9 September, 2026</time>
            </header>

            <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
              <p>
                Lumen extracts checkable facts from PDF documents, grounds every claim to its exact source
                page, and reasons about relationships — detecting which facts corroborate, contradict, or reconcile
                across your uploads.
              </p>
              <p>
                The REST API is completely open at{" "}
                <code className="text-xs font-mono px-1 py-0.5 rounded bg-foreground/5 text-foreground">
                  {BASE_URL}
                </code>
                . No authentication keys or signup are required to upload files or query the reasoning graph.
              </p>
            </div>

            <section className="mt-6">
              <SectionHeading id="overview" title="Protocol & conventions" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <p>
                  All upload requests must be sent as <code className="text-xs font-mono text-foreground">multipart/form-data</code> with
                  the file included under the <code className="text-xs font-mono text-foreground">file</code> parameter. Responses are
                  returned as standard UTF-8 JSON.
                </p>
                <p>
                  Documents with 2 pages or fewer are processed synchronously and return extracted facts immediately.
                  Larger documents return <code className="text-xs font-mono text-foreground">202 Accepted</code> and process in the
                  background; you can poll the status endpoint until complete.
                </p>
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="upload-document" title="Upload a document" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <MethodBadge method="POST" />
                  <span className="text-foreground font-semibold">/v1/documents</span>
                </div>
                <p>
                  Uploads a PDF for chunking, text &amp; OCR extraction, entity-attribute-value fact extraction,
                  and cross-document relationship reasoning.
                </p>

                <CodeBlock
                  language="bash"
                  code={`curl -X POST ${BASE_URL}/v1/documents \\\n  -F "file=@/path/to/document.pdf"`}
                />

                <div className="pt-2">
                  <div className="flex items-center gap-4 text-xs font-mono mb-2">
                    <button
                      type="button"
                      onClick={() => setUploadTab("sync")}
                      className={`transition-colors cursor-pointer ${
                        uploadTab === "sync"
                          ? "text-foreground font-medium underline underline-offset-4 decoration-accent"
                          : "text-subtle hover:text-muted"
                      }`}
                    >
                      Sync response (≤ 2 pages)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab("async")}
                      className={`transition-colors cursor-pointer ${
                        uploadTab === "async"
                          ? "text-foreground font-medium underline underline-offset-4 decoration-accent"
                          : "text-subtle hover:text-muted"
                      }`}
                    >
                      Async response (&gt; 2 pages)
                    </button>
                  </div>

                  {uploadTab === "sync" ? (
                    <CodeBlock language="json" code={SYNC_RESPONSE_CODE} />
                  ) : (
                    <CodeBlock language="json" code={ASYNC_RESPONSE_CODE} />
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="document-status" title="Document status" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <MethodBadge method="GET" />
                  <span className="text-foreground font-semibold">/v1/documents/:id/status</span>
                </div>
                <p>
                  Poll this endpoint while a document is processing. Status transitions from{" "}
                  <code className="text-xs font-mono text-foreground">processing</code> to{" "}
                  <code className="text-xs font-mono text-foreground">done</code> or{" "}
                  <code className="text-xs font-mono text-foreground">error</code>.
                </p>

                <CodeBlock
                  language="bash"
                  code={`curl ${BASE_URL}/v1/documents/a1b2c3d4-.../status`}
                />

                <CodeBlock language="json" code={STATUS_RESPONSE_CODE} />
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="list-facts" title="List facts" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <MethodBadge method="GET" />
                  <span className="text-foreground font-semibold">/v1/documents/:id/facts</span>
                </div>
                <p>
                  Returns paginated facts extracted from the document along with cross-document relationship counts.
                </p>

                <div className="border-t border-b border-border py-2 my-2 text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-subtle font-mono">
                        <th scope="col" className="py-1 font-medium">Param</th>
                        <th scope="col" className="py-1 font-medium">Default</th>
                        <th scope="col" className="py-1 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="py-1.5 font-mono text-foreground">limit</td>
                        <td className="py-1.5 font-mono text-subtle">100</td>
                        <td className="py-1.5 text-muted">Max 500</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono text-foreground">offset</td>
                        <td className="py-1.5 font-mono text-subtle">0</td>
                        <td className="py-1.5 text-muted">Pagination offset</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono text-foreground">q</td>
                        <td className="py-1.5 font-mono text-subtle">—</td>
                        <td className="py-1.5 text-muted">Free-text search across entity, attribute, value</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono text-foreground">filter</td>
                        <td className="py-1.5 font-mono text-subtle">—</td>
                        <td className="py-1.5 text-muted">corroborates, contradicts, or reconciled</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <CodeBlock
                  language="bash"
                  code={`curl "${BASE_URL}/v1/documents/a1b2c3d4-.../facts?limit=20&filter=contradicts"`}
                />

                <CodeBlock language="json" code={FACTS_RESPONSE_CODE} />
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="single-fact" title="Single fact & relationships" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <MethodBadge method="GET" />
                  <span className="text-foreground font-semibold">/v1/facts/:id</span>
                </div>
                <p>
                  Retrieves an individual fact with its verbatim quote, source chunk text, page number, and any
                  corroborating or contradictory relationships with other facts.
                </p>

                <CodeBlock
                  language="bash"
                  code={`curl ${BASE_URL}/v1/facts/f1e2d3c4-...`}
                />

                <CodeBlock language="json" code={SINGLE_FACT_RESPONSE_CODE} />
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="original-pdf" title="Original PDF" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <MethodBadge method="GET" />
                  <span className="text-foreground font-semibold">/v1/documents/:id/file</span>
                </div>
                <p>
                  Streams the raw uploaded PDF binary with <code className="text-xs font-mono text-foreground">Content-Type: application/pdf</code>.
                  Suitable for embedding in an <code className="text-xs font-mono text-foreground">&lt;iframe&gt;</code> or passing to PDF.js.
                </p>

                <CodeBlock
                  language="bash"
                  code={`curl -O ${BASE_URL}/v1/documents/a1b2c3d4-.../file`}
                />
              </div>
            </section>

            <section className="mt-6">
              <SectionHeading id="errors" title="Errors" />
              <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                <p>
                  All endpoints return an error JSON object with an HTTP 4xx or 5xx status code on failure —{" "}
                  <code className="text-xs font-mono text-foreground">404</code> for unknown document or fact IDs,{" "}
                  <code className="text-xs font-mono text-foreground">400</code> for a missing upload file, and{" "}
                  <code className="text-xs font-mono text-foreground">500</code> for unexpected server errors.
                </p>

                <CodeBlock language="json" code={ERROR_RESPONSE_CODE} />
              </div>
            </section>

            <div className="mt-16 pt-8 border-t border-border">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
