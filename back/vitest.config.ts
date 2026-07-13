import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // 加载 dotenv（在测试运行前）
    env: {
      LLM_MODEL: "deepseek-ai/DeepSeek-V4-Flash",
      LLM_API_KEY: "test-key",
      LLM_BASE_URL: "https://api.siliconflow.cn/v1",
      JWT_SECRET: "test-jwt-secret",
      EMBEDDING_MODEL: "BAAI/bge-large-zh-v1.5",
    },
    // Agent 测试需要较长的超时
    testTimeout: 15000,
  },
});
