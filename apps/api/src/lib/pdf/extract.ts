import { standardFontDataUrl, cMapUrl } from "./pdfjsAssets.js";

export interface PageImageRef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  isScanned: boolean;
  imageRefs: PageImageRef[];
}

const MIN_TEXT_LENGTH_FOR_NON_SCANNED = 20;

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

export async function extractPages(buffer: Buffer): Promise<ExtractedPage[]> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    cMapUrl,
    cMapPacked: true,
  }).promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => {
        if (!("str" in item)) return "";
        return item.str + (item.hasEOL ? "\n" : " ");
      })
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const operatorList = await page.getOperatorList();
    const imageRefs = extractImageRefs(operatorList, pdfjs);

    pages.push({
      pageNumber,
      text,
      isScanned: text.length < MIN_TEXT_LENGTH_FOR_NON_SCANNED && imageRefs.length > 0,
      imageRefs,
    });
  }

  return pages;
}

function extractImageRefs(
  operatorList: { fnArray: number[]; argsArray: unknown[][] },
  pdfjs: Awaited<ReturnType<typeof getPdfjs>>,
): PageImageRef[] {
  const refs: PageImageRef[] = [];
  const paintOps = new Set([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
  ]);

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    if (paintOps.has(operatorList.fnArray[i])) {
      refs.push({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
  return refs;
}
