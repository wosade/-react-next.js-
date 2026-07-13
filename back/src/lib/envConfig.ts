/**
 * 集中式环境变量配置
 *
 * 所有配置统一从此模块读取。
 * 调用 initConfig() 后才会校验必填项（在 dotenv 加载之后调用）。
 * 禁止在业务代码中写死任何 Secret/API Key 的 fallback 值。
 */

const DEFAULTS: Record<string, string> = {
  EMBEDDING_MODEL: "BAAI/bge-large-zh-v1.5",
  QDRANT_URL: "http://localhost:6333",
  QDRANT_COLLECTION: "agent_knowledge",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
  REDIS_DB: "0",
  DB_HOST: "localhost",
  DB_PORT: "3306",
  DB_USER: "root",
  DB_PASSWORD: "",
  DB_NAME: "agent_chat",
  JWT_EXPIRES_IN: "24h",
  JWT_REFRESH_EXPIRES_IN: "7d",
  PORT: "3001",
};

function env(key: string): string | undefined {
  return process.env[key] || DEFAULTS[key];
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `缺少必填环境变量: ${key}。请检查 .env 文件配置。`,
    );
  }
  return val;
}

// ── 延迟初始化：dotenv 加载后调用 ──

let _initialized = false;

export function initConfig(): void {
  if (_initialized) return;

  const required = ["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL", "JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `缺少必填环境变量:\n${missing
        .map((k) => `  - ${k}`)
        .join("\n")}\n\n请检查 .env 文件配置。`,
    );
  }
  _initialized = true;
}

// ── 导出（getter 模式，延迟取值） ──

export const config = {
  get llmModel() { return requireEnv("LLM_MODEL"); },
  get llmApiKey() { return requireEnv("LLM_API_KEY"); },
  get llmBaseUrl() { return requireEnv("LLM_BASE_URL"); },

  get embeddingModel() { return env("EMBEDDING_MODEL")!; },

  get qdrantUrl() { return env("QDRANT_URL")!; },
  get qdrantCollection() { return env("QDRANT_COLLECTION")!; },

  get redisHost() { return env("REDIS_HOST")!; },
  get redisPort() { return Number(env("REDIS_PORT")); },
  get redisPassword() { return process.env.REDIS_PASSWORD || undefined; },
  get redisDb() { return Number(env("REDIS_DB")); },

  get dbHost() { return env("DB_HOST")!; },
  get dbPort() { return Number(env("DB_PORT")); },
  get dbUser() { return env("DB_USER")!; },
  get dbPassword() { return env("DB_PASSWORD")!; },
  get dbName() { return env("DB_NAME")!; },

  get jwtSecret() { return requireEnv("JWT_SECRET"); },
  get jwtExpiresIn() { return env("JWT_EXPIRES_IN")!; },
  get jwtRefreshExpiresIn() { return env("JWT_REFRESH_EXPIRES_IN")!; },

  get port() { return Number(env("PORT")); },
} as const;
