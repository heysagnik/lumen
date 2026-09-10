import { generateText } from "ai";
import { getVisionModel } from "./models.js";
import { throttle } from "./throttle.js";

const READ_PROMPT = `Read all text, numbers, and chart values visible in this image.
Use the image's own axis labels, legend, and caption to map values to their labels.
Output the content as plain text, preserving any structure (e.g. "Label: Value").
Do not add commentary or values that aren't visibly present.`;

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
              { type: "image", image: imageBuffer },
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
