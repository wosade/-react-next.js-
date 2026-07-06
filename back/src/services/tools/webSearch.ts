import { z } from 'zod';

/** web_search 工具参数 Schema */
export const webSearchSchema = z.object({
  query: z.string().describe('搜索关键词，支持中英文'),
  count: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(5)
    .describe('返回结果数量，默认 5，最大 8'),
});

/** OpenAI function definition */
export const webSearchDefinition = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description:
      '搜索互联网获取最新信息。当需要查询实时资讯、百科知识、行业动态等外部信息时使用。搜索结果包含标题、摘要和链接。',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: '搜索关键词，支持中英文',
        },
        count: {
          type: 'integer' as const,
          description: '返回结果数量，默认 5，最大 8',
        },
      },
      required: ['query'],
    },
  },
};

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

/**
 * 策略 1: 用 DuckDuckGo 的 HTML 版搜索（免费、无需 API Key）
 * 解析返回的 HTML 提取标题/摘要/链接
 */
async function searchDuckDuckGo(query: string, max: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`DuckDuckGo returned ${resp.status}`);

  const html = await resp.text();

  // 解析搜索结果 — 每条结果格式:
  // <a class="result__a" href="...">title</a>
  // <a class="result__snippet">snippet</a>
  const results: SearchResult[] = [];
  const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null && links.length < max) {
    const rawUrl = m[1].replace(/&amp;/g, '&');
    // 跳过广告链接
    if (rawUrl.includes('duckduckgo.com/y.js')) continue;
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
    if (title) links.push({ url: rawUrl, title });
  }

  const snippets: string[] = [];
  while ((m = snippetRe.exec(html)) !== null) {
    const s = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
    snippets.push(s);
  }

  for (let i = 0; i < Math.min(links.length, snippets.length, max); i++) {
    results.push({ title: links[i].title, snippet: snippets[i], url: links[i].url });
  }

  return results;
}

/**
 * 策略 2（备用）: SearXNG 公开实例
 */
async function searchSearXNG(query: string, max: number): Promise<SearchResult[]> {
  const instance = process.env.SEARXNG_URL || 'https://search.sapti.me';
  const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=zh-CN`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(6000),
  });

  if (!resp.ok) throw new Error(`SearXNG returned ${resp.status}`);

  const data = await resp.json() as any;
  const results: SearchResult[] = [];

  for (const r of (data.results || [])) {
    if (results.length >= max) break;
    results.push({
      title: r.title || '',
      snippet: r.content || r.snippet || '',
      url: r.url || '',
    });
  }

  return results;
}

// ---- 主入口：先试 SearXNG（更快更干净），失败则回退 DuckDuckGo ----

export async function webSearch(
  args: z.infer<typeof webSearchSchema>,
): Promise<string> {
  const { query, count } = args;

  // 优先用 SearXNG（如果配置了），否则用 DuckDuckGo
  let results: SearchResult[] = [];

  if (process.env.SEARXNG_URL) {
    try {
      results = await searchSearXNG(query, count);
    } catch {
      // 回退到 DDG
    }
  }

  if (results.length === 0) {
    try {
      results = await searchDuckDuckGo(query, count);
    } catch (err: any) {
      return `网页搜索失败: ${err.message}。请稍后重试或尝试更换搜索词。`;
    }
  }

  if (results.length === 0) {
    return `未找到与「${query}」相关的搜索结果。`;
  }

  // 格式化为 LLM 友好格式
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet}\n    🔗 ${r.url}`)
    .join('\n\n');
}
