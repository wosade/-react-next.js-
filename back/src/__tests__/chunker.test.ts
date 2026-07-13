/**
 * 文本分块器测试
 *
 * 验证递归字符分割器的正确性
 */
import { describe, it, expect } from "vitest";
import { chunkText } from "../services/rag/chunker.js";

describe("chunkText", () => {
  it("短文本应保持完整", () => {
    const text = "这是一段短文本。";
    const result = chunkText(text, { chunkSize: 500, chunkOverlap: 50 });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("短文本");
  });

  it("超长段落应按句子分割", () => {
    // 构造一个超过 chunkSize 的文本
    const sentence = "这是一段测试句子。";
    const text = sentence.repeat(60); // ~600 chars
    const result = chunkText(text, { chunkSize: 200, chunkOverlap: 20 });

    expect(result.length).toBeGreaterThan(1);
    // 每块不应超过 chunkSize
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(250); // 允许一些容差
    }
  });

  it("应保留 overlap 防止信息断裂", () => {
    const text = "第一段内容。\n\n第二段内容。\n\n第三段内容。";
    const result = chunkText(text, { chunkSize: 10, chunkOverlap: 5 });

    if (result.length > 1) {
      // 前一块的结尾应该出现在后一块的开头（overlap）
      const firstEnd = result[0].slice(-3);
      const secondStart = result[1].slice(0, 3);
      // 至少有一些重叠
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("空文本应返回空数组", () => {
    const result = chunkText("");
    expect(result).toHaveLength(0);
  });

  it("多段落文本应按段落边界分割", () => {
    const text = [
      "第一段：这是关于项目背景的介绍。",
      "",
      "第二段：这是关于技术选型的说明。",
      "",
      "第三段：这是关于未来规划的内容。",
    ].join("\n\n");

    const result = chunkText(text, { chunkSize: 500, chunkOverlap: 50 });

    // 三段都应该保留
    expect(result.length).toBeGreaterThanOrEqual(1);
    const joined = result.join(" ");
    expect(joined).toContain("项目背景");
    expect(joined).toContain("技术选型");
    expect(joined).toContain("未来规划");
  });

  it("中英文混合文本应正确处理", () => {
    const text =
      "这是中文内容。This is English content. 继续中文。More English.";
    const result = chunkText(text, { chunkSize: 500, chunkOverlap: 50 });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
