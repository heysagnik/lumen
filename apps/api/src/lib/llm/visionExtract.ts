import { generateText } from "ai";
import { getVisionModel } from "./models.js";
import { throttle } from "./throttle.js";

const READ_PROMPT = `Transcribe every piece of text, number, and chart value visible in this image — be exhaustive, not selective. If it contains a table, read it row by row and cell by cell; do not summarize rows or omit ones that seem repetitive.
Use the image's own axis labels, legend, and caption to map values to their labels.
Output the content as plain text, preserving any structure (e.g. "Label: Value" per line, or one row per line for tables).
Do not add commentary, interpretation, or values that aren't visibly present. If a value is illegible, omit it rather than guessing.`;

export async function readImageAsText(imageBuffer: Buffer, queueKey?: string): Promise<string> {
  const { text } = await throttle(
    (signal) =>
      generateText({
        model: getVisionModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: READ_PROMPT },
              { type: "file", data: imageBuffer, mediaType: "image/png" },
            ],
          },
        ],
        maxRetries: 0,
        abortSignal: signal,
        providerOptions: { unified: { reasoningEffort: "low" } },
      }),
    queueKey,
  );
  return text.trim();
}
