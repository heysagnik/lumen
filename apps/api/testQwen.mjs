import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { z } from "zod";

function loadEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1).trim();
    if (process.env[key] === undefined) process.env[key] = rawVal.replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  gateway: process.env.CLOUDFLARE_AI_GATEWAY ?? "lumen",
  apiKey: process.env.CLOUDFLARE_API_TOKEN,
});
const unified = createUnified();

const qualifierEntrySchema = z.object({ key: z.string(), value: z.string() });
const wireFactSchema = z.object({
  entity: z.string(),
  attribute: z.string(),
  value: z.string(),
  unit: z.string().nullable(),
  qualifiers: z.array(qualifierEntrySchema),
  quote: z.string(),
  confidence: z.number().min(0).max(1),
});
const extractionSchema = z.object({ facts: z.array(wireFactSchema) });

const JSON_ONLY_INSTRUCTION =
  "Output ONLY valid JSON matching the required shape. No prose, no markdown code fences, no explanation before or after.";

const SYSTEM_PROMPT = `You extract discrete, checkable facts from a document excerpt.
A fact has: entity, attribute, value, unit, qualifiers (key/value pairs such as time_period, scope, condition), and a verbatim quote copied exactly from the source text that supports the fact.
Only extract facts that are explicitly stated. Do not infer or calculate. Skip narrative or opinion text.
Return an empty facts array if the excerpt has no checkable facts.
The quote must be an exact substring of the provided text.
Required JSON shape: {"facts": [{"entity": string, "attribute": string, "value": string, "unit": string | null, "qualifiers": [{"key": string, "value": string}], "quote": string, "confidence": number}]}

${JSON_ONLY_INSTRUCTION}`;

const SAMPLE_CHUNK = `Delhivery Limited reported consolidated revenue from operations of Rs. 2,240 Crore for
the quarter ended March 31, 2024 (Q4 FY24), representing a year-on-year growth of 6.4%
compared to Rs. 2,105 Crore in Q4 FY23. Adjusted EBITDA for Q4 FY24 stood at Rs. 127 Crore,
translating to an adjusted EBITDA margin of 5.7%, up from 1.6% in the corresponding quarter
of the previous fiscal year. The Express Parcel segment handled 176 Mn shipments during the
quarter, a year-on-year decline of 2.2% but a quarter-on-quarter increase of 12.8%. The
Company's Part Truckload (PTL) freight segment moved 384K tons during Q4 FY24, up 20.8%
year-on-year and 8.6% quarter-on-quarter. Net working capital days improved to 31 days as of
March 31, 2024, from 38 days as of December 31, 2023. The Board of Directors, at its meeting
held on May 8, 2024, approved the audited financial results for the quarter and year ended
March 31, 2024.`;

const CANDIDATES = [
  "workers-ai/@cf/qwen/qwen3.8-27b",
  "@cf/qwen/qwen3.8-27b",
];

const TIMEOUT_MS = 45000;

function stripCodeFence(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

for (const id of CANDIDATES) {
  const start = Date.now();
  try {
    const model = aigateway(unified(id));
    const { text } = await Promise.race([
      generateText({ model, system: SYSTEM_PROMPT, prompt: SAMPLE_CHUNK, maxOutputTokens: 4096 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${TIMEOUT_MS / 1000}s)`)), TIMEOUT_MS)),
    ]);
    const durationMs = Date.now() - start;
    try {
      const parsed = extractionSchema.parse(JSON.parse(stripCodeFence(text)));
      const groundedCount = parsed.facts.filter((f) => SAMPLE_CHUNK.includes(f.quote)).length;
      console.log(`[PASS] ${id.padEnd(40)} ${durationMs}ms  facts=${parsed.facts.length}  grounded=${groundedCount}/${parsed.facts.length}`);
    } catch (parseError) {
      console.log(`[FAIL] ${id.padEnd(40)} ${durationMs}ms  bad JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.log(`[FAIL] ${id.padEnd(40)} ${Date.now() - start}ms  ${error.message} ${error.responseBody ?? ""}`);
  }
}
