import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
}

const OCR_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`OCR timed out after ${ms}ms`)), ms)),
  ]);
}

async function recognize(imageBuffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBuffer);
    return { text: text.trim(), confidence: confidence / 100 };
  } finally {
    await worker.terminate();
  }
}

export async function runOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    return await withTimeout(recognize(imageBuffer), OCR_TIMEOUT_MS);
  } catch (error) {
    console.warn("OCR failed or timed out, degrading to empty result:", error);
    return { text: "", confidence: 0 };
  }
}
