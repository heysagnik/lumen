import { standardFontDataUrl, cMapUrl } from "./pdfjsAssets.js";

const RENDER_SCALE = 2;

async function getPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

type PdfjsDoc = Awaited<ReturnType<Awaited<ReturnType<typeof getPdfjs>>["getDocument"]>["promise"]>;

const docCache = new WeakMap<Buffer, Promise<PdfjsDoc>>();

async function getCachedDoc(buffer: Buffer): Promise<PdfjsDoc> {
  const cached = docCache.get(buffer);
  if (cached) return cached;

  const docPromise = getPdfjs().then(
    (pdfjs) =>
      pdfjs.getDocument({
        data: new Uint8Array(buffer),
        standardFontDataUrl,
        cMapUrl,
        cMapPacked: true,
      }).promise,
  );
  docCache.set(buffer, docPromise);
  return docPromise;
}

export async function renderPageToPng(buffer: Buffer, pageNumber: number): Promise<Buffer> {
  const [doc, { createCanvas }] = await Promise.all([getCachedDoc(buffer), import("@napi-rs/canvas")]);

  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return canvas.toBuffer("image/png");
}
