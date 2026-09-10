import { generateText } from "ai";
import type { z } from "zod";
import { getModel } from "./models.js";
import { throttle } from "./throttle.js";

const JSON_ONLY_INSTRUCTION =
  "Output ONLY valid JSON matching the required shape. No prose, no markdown code fences, no explanation before or after.";

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

export async function generateJson<T>(options: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  queueKey?: string;
}): Promise<T> {
  const { text } = await throttle(
    (signal) =>
      generateText({
        model: getModel(),
        system: `${options.system}\n\n${JSON_ONLY_INSTRUCTION}`,
        prompt: options.prompt,
        maxOutputTokens: 4096,
        abortSignal: signal,
        providerOptions: { unified: { reasoningEffort: "low" } },
      }),
    options.queueKey,
  );

  const parsed = JSON.parse(stripCodeFence(text));
  return options.schema.parse(parsed);
}
