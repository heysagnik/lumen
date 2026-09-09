import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requireEnv("DATABASE_URL"),
  cloudflareAccountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
  cloudflareApiToken: requireEnv("CLOUDFLARE_API_TOKEN"),
  cloudflareGateway: process.env.CLOUDFLARE_AI_GATEWAY ?? "lumen",
  cloudflareModel: process.env.CLOUDFLARE_MODEL ?? "workers-ai/@cf/zai-org/glm-5.3-flash",
};
