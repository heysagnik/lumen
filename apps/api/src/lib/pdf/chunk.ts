import type { ExtractedPage } from "./extract.js";

export interface PageChunk {
  pageNumber: number;
  charStart: number;
  charEnd: number;
  text: string;
  hasEmbeddedImage: boolean;
  imageRefs: ExtractedPage["imageRefs"];
}

const MAX_CHUNK_CHARS = 12000;
const CHUNK_OVERLAP_CHARS = 400;

export function chunkPage(page: ExtractedPage): PageChunk[] {
  if (page.text.length <= MAX_CHUNK_CHARS) {
    return [
      {
        pageNumber: page.pageNumber,
        charStart: 0,
        charEnd: page.text.length,
        text: page.text,
        hasEmbeddedImage: page.imageRefs.length > 0,
        imageRefs: page.imageRefs,
      },
    ];
  }

  const chunks: PageChunk[] = [];
  let start = 0;
  while (start < page.text.length) {
    const end = Math.min(start + MAX_CHUNK_CHARS, page.text.length);
    const splitAt = findSentenceBoundary(page.text, start, end);
    chunks.push({
      pageNumber: page.pageNumber,
      charStart: start,
      charEnd: splitAt,
      text: page.text.slice(start, splitAt),
      hasEmbeddedImage: page.imageRefs.length > 0,
      imageRefs: page.imageRefs,
    });
    if (splitAt >= page.text.length) break;
    start = Math.max(splitAt - CHUNK_OVERLAP_CHARS, start + 1);
  }
  return chunks;
}

function findSentenceBoundary(text: string, start: number, end: number): number {
  if (end >= text.length) return text.length;
  const window = text.slice(start, end);
  const lastPeriod = window.lastIndexOf(". ");
  if (lastPeriod > window.length * 0.5) {
    return start + lastPeriod + 1;
  }
  return end;
}

const BOILERPLATE_PATTERNS = [
  /^page \d+( of \d+)?$/i,
  /^confidential$/i,
  /^\s*$/,
];

export function isBoilerplate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
