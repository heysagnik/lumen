import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import type { LanguageModel } from "ai";
import { config } from "../../config.js";

function buildModel(modelId: string): LanguageModel {
  const aigateway = createAiGateway({
    accountId: config.cloudflareAccountId,
    gateway: config.cloudflareGateway,
    apiKey: config.cloudflareApiToken,
  });
  const unified = createUnified();
  return aigateway(unified(modelId));
}

export function getModel(): LanguageModel {
  return buildModel(config.cloudflareModel);
}

export function getVisionModel(): LanguageModel {
  return buildModel(config.cloudflareVisionModel);
}
