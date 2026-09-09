import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import type { LanguageModel } from "ai";
import { config } from "../../config.js";

export function getModel(): LanguageModel {
  const aigateway = createAiGateway({
    accountId: config.cloudflareAccountId,
    gateway: config.cloudflareGateway,
    apiKey: config.cloudflareApiToken,
  });
  const unified = createUnified();
  return aigateway(unified(config.cloudflareModel));
}
