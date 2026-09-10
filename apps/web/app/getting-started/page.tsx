"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

const BASE_URL = "https://lumen-obli.onrender.com";
const DEMO_VIDEO_ID = "2REZxqCMsgM";

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

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function copy(text: string) {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  }

  return [copied, copy];
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, copy] = useCopy();

  return (
    <div className="my-3 w-full rounded-lg border border-border bg-surface/60">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5">
        <span className="font-mono text-[11px] text-subtle">{language}</span>
        <button
          type="button"
          onClick={() => copy(code)}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className="inline-flex cursor-pointer items-center gap-1.5 px-1 py-0.5 text-xs text-subtle transition-colors hover:text-foreground"
        >
          {copied ? <span className="text-success">copied</span> : "copy"}
        </button>
      </div>
      <div className="thin-scrollbar overflow-x-auto p-3">
        <pre className="font-mono text-[12px] leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span
      className={`shrink-0 font-mono text-[12px] font-semibold ${
        method === "POST" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
      }`}
    >
      {method}
    </span>
  );
}

function Endpoint({
  id,
  title,
  method,
  path,
  description,
  children,
}: {
  id: string;
  title: string;
  method: "GET" | "POST";
  path: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-8 first:border-t-0 first:pt-0 sm:py-10">
      <h2 className="mb-1.5 text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
      <div className="mb-3 flex flex-wrap items-baseline gap-2 font-mono text-[12.5px]">
        <MethodBadge method={method} />
        <code className="break-all text-foreground/80">{path}</code>
      </div>
      <div className="space-y-3 text-[13.5px] leading-relaxed text-foreground/80">
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
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
        className="fixed top-0 left-0 right-0 h-[2px] bg-accent z-50 origin-left transition-transform duration-75"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      <div className="fixed top-3.5 right-3.5 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-14 flex-1">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16 items-start">
          <aside className="w-full md:w-48 lg:w-52 shrink-0 md:sticky md:top-12 flex flex-col">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-sm text-subtle transition-colors hover:text-foreground py-1"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
              >
                <path
                  d="M5.5 4L1.5 8M1.5 8L5.5 12M1.5 8H10C11.3807 8 12.5 6.88071 12.5 5.5V5.5C12.5 4.11929 11.3807 3 10 3H8.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
              </svg>
              <span>Index</span>
            </Link>

            <nav
              aria-label="Table of Contents (Mobile)"
              className="flex md:hidden items-center gap-1.5 overflow-x-auto thin-scrollbar pt-3 pb-2 -mx-4 px-4 border-b border-border"
            >
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`text-xs whitespace-nowrap px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                      isActive
                        ? "bg-foreground text-background border-foreground font-medium"
                        : "text-subtle hover:text-foreground border-border bg-surface"
                    }`}
                  >
                    {section.label}
                  </a>
                );
              })}
            </nav>

            <nav aria-label="Table of Contents (Desktop)" className="hidden md:flex flex-col gap-2 mt-10">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`text-sm leading-snug transition-colors ${
                      isActive ? "text-foreground font-medium" : "text-subtle hover:text-muted"
                    }`}
                  >
                    {section.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 w-full max-w-2xl">
            <header className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                Getting started
              </h1>
            </header>

            <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
              <p>
                Lumen extracts checkable facts from PDF documents, grounds every claim to its exact
                source page, and reasons about relationships — detecting which facts corroborate, contradict, or
                reconcile across your uploads.
              </p>
              <p>
                The REST API is completely open at{" "}
                <code className="text-xs font-mono px-1 py-0.5 rounded bg-foreground/5 text-foreground break-all">
                  {BASE_URL}
                </code>
                . No authentication keys or signup are required to upload files or query the reasoning graph.
              </p>
            </div>

            <div className="mt-5 sm:mt-6 rounded-lg border border-border">
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}`}
                  title="Lumen walkthrough"
                  className="h-full w-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            <section id="overview" className="scroll-mt-24 border-t border-border py-8 sm:py-10 mt-4 sm:mt-6">
              <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Protocol &amp; conventions
              </h2>
              <div className="space-y-3 text-[13.5px] leading-relaxed text-foreground/80">
                <p>
                  All upload requests must be sent as <InlineCode>multipart/form-data</InlineCode> with the file
                  included under the <InlineCode>file</InlineCode> parameter. Responses are returned as standard
                  UTF-8 JSON.
                </p>
                <p>
                  Documents with 2 pages or fewer are processed synchronously and return extracted facts
                  immediately. Larger documents return <InlineCode>202 Accepted</InlineCode> and process in the
                  background; you can poll the status endpoint until complete.
                </p>
              </div>
            </section>

            <Endpoint
              id="upload-document"
              title="Upload a document"
              method="POST"
              path="/v1/documents"
              description={
                <>
                  Uploads a PDF for chunking, text &amp; OCR extraction, entity-attribute-value fact extraction, and
                  cross-document relationship reasoning.
                </>
              }
            >
              <CodeBlock language="bash" code={`curl -X POST ${BASE_URL}/v1/documents \\\n  -F "file=@/path/to/document.pdf"`} />

              <div className="pt-1">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadTab("sync")}
                    className={`cursor-pointer py-0.5 transition-colors ${
                      uploadTab === "sync"
                        ? "font-medium text-foreground underline decoration-accent underline-offset-4"
                        : "text-subtle hover:text-muted"
                    }`}
                  >
                    Sync response (≤ 2 pages)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab("async")}
                    className={`cursor-pointer py-0.5 transition-colors ${
                      uploadTab === "async"
                        ? "font-medium text-foreground underline decoration-accent underline-offset-4"
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
            </Endpoint>

            <Endpoint
              id="document-status"
              title="Document status"
              method="GET"
              path="/v1/documents/:id/status"
              description={
                <>
                  Poll this endpoint while a document is processing. Status transitions from{" "}
                  <InlineCode>processing</InlineCode> to <InlineCode>done</InlineCode> or{" "}
                  <InlineCode>error</InlineCode>.
                </>
              }
            >
              <CodeBlock language="bash" code={`curl ${BASE_URL}/v1/documents/a1b2c3d4-.../status`} />
              <CodeBlock language="json" code={STATUS_RESPONSE_CODE} />
            </Endpoint>

            <Endpoint
              id="list-facts"
              title="List facts"
              method="GET"
              path="/v1/documents/:id/facts"
              description="Returns paginated facts extracted from the document along with cross-document relationship counts."
            >
              <div className="overflow-x-auto thin-scrollbar rounded-lg border border-border">
                <table className="w-full min-w-[300px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-foreground/[0.02] font-mono text-subtle">
                      <th scope="col" className="py-2 px-3 font-medium">Param</th>
                      <th scope="col" className="py-2 px-3 font-medium">Default</th>
                      <th scope="col" className="py-2 px-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="py-2 px-3 font-mono text-foreground">limit</td>
                      <td className="py-2 px-3 font-mono text-subtle">100</td>
                      <td className="py-2 px-3 text-muted">Max 500</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono text-foreground">offset</td>
                      <td className="py-2 px-3 font-mono text-subtle">0</td>
                      <td className="py-2 px-3 text-muted">Pagination offset</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono text-foreground">q</td>
                      <td className="py-2 px-3 font-mono text-subtle">—</td>
                      <td className="py-2 px-3 text-muted">Free-text search across entity, attribute, value</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono text-foreground">filter</td>
                      <td className="py-2 px-3 font-mono text-subtle">—</td>
                      <td className="py-2 px-3 text-muted">corroborates, contradicts, or reconciled</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <CodeBlock
                language="bash"
                code={`curl "${BASE_URL}/v1/documents/a1b2c3d4-.../facts?limit=20&filter=contradicts"`}
              />
              <CodeBlock language="json" code={FACTS_RESPONSE_CODE} />
            </Endpoint>

            <Endpoint
              id="single-fact"
              title="Single fact & relationships"
              method="GET"
              path="/v1/facts/:id"
              description="Retrieves an individual fact with its verbatim quote, source chunk text, page number, and any corroborating or contradictory relationships with other facts."
            >
              <CodeBlock language="bash" code={`curl ${BASE_URL}/v1/facts/f1e2d3c4-...`} />
              <CodeBlock language="json" code={SINGLE_FACT_RESPONSE_CODE} />
            </Endpoint>

            <Endpoint
              id="original-pdf"
              title="Original PDF"
              method="GET"
              path="/v1/documents/:id/file"
              description={
                <>
                  Streams the raw uploaded PDF binary with <InlineCode>Content-Type: application/pdf</InlineCode>.
                  Suitable for embedding in an <InlineCode>&lt;iframe&gt;</InlineCode> or passing to PDF.js.
                </>
              }
            >
              <CodeBlock language="bash" code={`curl -O ${BASE_URL}/v1/documents/a1b2c3d4-.../file`} />
            </Endpoint>

            <section id="errors" className="scroll-mt-24 border-t border-border py-8 sm:py-10">
              <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground sm:text-lg">Errors</h2>
              <div className="space-y-3 text-[13.5px] leading-relaxed text-foreground/80">
                <p>
                  All endpoints return an error JSON object with an HTTP 4xx or 5xx status code on failure —{" "}
                  <InlineCode>404</InlineCode> for unknown document or fact IDs, <InlineCode>400</InlineCode> for a
                  missing upload file, and <InlineCode>500</InlineCode> for unexpected server errors.
                </p>
                <CodeBlock language="json" code={ERROR_RESPONSE_CODE} />
              </div>
            </section>

            <div className="mt-8 pt-6 sm:pt-8 border-t border-border">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
