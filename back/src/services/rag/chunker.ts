/**
 * 文本分块器 — 递归字符分割
 *
 * 策略：段落(\\n\\n) → 句子(。！？.!?\\n) → 字符
 * 优先在语义边界切分，保证每块尽量完整
 */

export interface ChunkConfig {
  /** 每块最大字符数 */
  chunkSize: number;
  /** 相邻块重叠字符数（防止关键信息正好被切断） */
  chunkOverlap: number;
}

const DEFAULT_CONFIG: ChunkConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
};

/**
 * 将长文本切成适合 LLM 上下文窗口的小块
 */
export function chunkText(
  text: string,
  config: Partial<ChunkConfig> = {},
): string[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_CONFIG, ...config };

  // ── 第 1 层：按段落切 ──
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  // ── 第 2 层：超长段落按句子再切 ──
  const splits: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length <= chunkSize) {
      splits.push(trimmed);
    } else {
      // 中英文句号、换行 作为句子边界
      const sentences = trimmed.split(/(?<=[。！？.!?\n])/);
      for (const sent of sentences) {
        const s = sent.trim();
        if (!s) continue;

        if (s.length > chunkSize) {
          // ── 第 3 层：仍超长，强制按字符切（带 overlap）──
          for (let i = 0; i < s.length; i += chunkSize - chunkOverlap) {
            splits.push(s.slice(i, i + chunkSize).trim());
          }
        } else {
          splits.push(s);
        }
      }
    }
  }

  // ── 合并短块，让每块尽量接近 chunkSize ──
  const chunks: string[] = [];
  let current = '';
  for (const split of splits) {
    if (!split) continue;
    if (current && (current + split).length > chunkSize) {
      chunks.push(current.trim());
      // 带上 overlap 防止上下文断裂
      current = current.slice(-chunkOverlap) + split;
    } else {
      current += (current ? ' ' : '') + split;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
