import type { ExtractedPage } from "../pdf/extract.js";
import { renderPageToPng } from "../pdf/render.js";
import { runOcr } from "../ocr/runOcr.js";
import { readImageAsText } from "../llm/visionExtract.js";

const OCR_LOW_CONFIDENCE_THRESHOLD = 0.6;
const SPARSE_TEXT_THRESHOLD = 400;

function needsVisionForImages(page: ExtractedPage): boolean {
  if (page.imageRefs.length === 0) return false;
  return page.text.length < SPARSE_TEXT_THRESHOLD;
}

async function tryReadImageAsText(pageImage: Buffer, pageNumber: number, queueKey: string): Promise<string> {
  try {
    return await readImageAsText(pageImage, queueKey);
  } catch (error) {
    console.warn(`vision read failed for page ${pageNumber}, degrading to available text:`, error);
    return "";
  }
}

export async function resolvePageText(page: ExtractedPage, pdfBuffer: Buffer, queueKey: string): Promise<string> {
  if (!page.isScanned && !needsVisionForImages(page)) {
    return page.text;
  }

  const pageImage = await renderPageToPng(pdfBuffer, page.pageNumber);

  if (page.isScanned) {
    const ocr = await runOcr(pageImage);
    if (ocr.confidence >= OCR_LOW_CONFIDENCE_THRESHOLD && ocr.text.length > 0) {
      return ocr.text;
    }
    const visionFallback = await tryReadImageAsText(pageImage, page.pageNumber, queueKey);
    return visionFallback || ocr.text;
  }

  const visionText = await tryReadImageAsText(pageImage, page.pageNumber, queueKey);
  return [page.text, visionText].filter(Boolean).join("\n\n");
}
