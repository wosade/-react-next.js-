/**
 * ═══════════════════════════════════════════════════════════
 *  AI 工具调用 — 完整演示（从输入到输出，一个文件搞定）
 * ═══════════════════════════════════════════════════════════
 *
 *  运行方式：npx tsx src/services/tools/demo-all-in-one.ts
 *
 *  流程：
 *    用户输入 → LLM 判断要不要调工具 → 调工具 → 结果喂回 LLM → 最终回答
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════
//  0. 配置 LLM 客户端
// ══════════════════════════════════════════════════════════════

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua',
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
});

const MODEL = process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';

// ══════════════════════════════════════════════════════════════
//  1. 工具定义（每个工具 = Schema + Definition + Handler）
// ══════════════════════════════════════════════════════════════

// ──────────── 类型定义 ────────────

type ToolHandler = (args: any) => Promise<string>;

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

interface ToolEntry {
  schema: z.ZodTypeAny;
  definition: ToolDefinition;
  handler: ToolHandler;
}

// ──────────── 工具 1：查天气 ────────────

const weatherSchema = z.object({
  city: z.string().describe('城市名称，如 北京、上海、深圳'),
});

const weatherDefinition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: '查询指定城市的实时天气信息',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称，如 北京、上海、深圳' },
      },
      required: ['city'],
    },
  },
};

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  '北京': { lat: 39.9042, lon: 116.4074 },
  '上海': { lat: 31.2304, lon: 121.4737 },
  '深圳': { lat: 22.5431, lon: 114.0579 },
  '杭州': { lat: 30.2741, lon: 120.1551 },
  '广州': { lat: 23.1291, lon: 113.2644 },
  '成都': { lat: 30.5728, lon: 104.0668 },
  '武汉': { lat: 30.5928, lon: 114.3055 },
};

async function getWeather(args: z.infer<typeof weatherSchema>): Promise<string> {
  const { city } = args;
  const coords = CITY_COORDS[city];
  if (!coords) {
    return `未找到城市"${city}"，支持的城市：${Object.keys(CITY_COORDS).join('、')}`;
  }
  // 调 Open-Meteo 免费天气 API
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
  const res = await fetch(url);
  const data = (await res.json()) as any;
  const cw = data.current_weather;
  if (!cw) return `${city}天气数据暂不可用`;
  return `${city}天气：温度 ${cw.temperature}°C，风速 ${cw.windspeed}km/h`;
}

// ──────────── 工具 2：计算器 ────────────

const calculatorSchema = z.object({
  expression: z.string().describe('数学表达式，如 "2 + 3 * 4"、"sqrt(16)"、"100 / 3"'),
});

const calculatorDefinition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculator',
    description: '执行数学计算。支持加减乘除、括号、sqrt、pow、sin、cos 等。',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: '数学表达式，如 "2 + 3 * 4"、"sqrt(16)"' },
      },
      required: ['expression'],
    },
  },
};

async function calculator(args: z.infer<typeof calculatorSchema>): Promise<string> {
  const { expression } = args;
  try {
    // 安全求值：只允许数学函数和数字
    const safe = expression.replace(/[^0-9+\-*/().%\s]|Math\./g, '');
    const result = Function(`"use strict"; return (${safe})`)();
    return `${expression} = ${result}`;
  } catch {
    return `表达式 "${expression}" 计算失败，请检查格式`;
  }
}

// ──────────── 工具 3：查 IP 信息 ────────────

const ipLookupSchema = z.object({
  ip: z.string().describe('IP 地址，如 "8.8.8.8" 或 "114.114.114.114"'),
});

const ipLookupDefinition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ip_lookup',
    description: '查询 IP 地址的归属地信息（国家、城市、ISP 等）',
    parameters: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'IP 地址，如 "8.8.8.8"' },
      },
      required: ['ip'],
    },
  },
};

async function ipLookup(args: z.infer<typeof ipLookupSchema>): Promise<string> {
  const { ip } = args;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
    const data = (await res.json()) as any;
    if (data.status === 'fail') return `查询失败: ${data.message}`;
    return `IP ${ip} → ${data.country} ${data.regionName} ${data.city}，ISP: ${data.isp}`;
  } catch (err: any) {
    return `IP 查询失败: ${err.message}`;
  }
}

// ══════════════════════════════════════════════════════════════
//  2. 工具注册表
// ══════════════════════════════════════════════════════════════

const toolRegistry = new Map<string, ToolEntry>([
  ['get_weather', { schema: weatherSchema, definition: weatherDefinition, handler: getWeather }],
  ['calculator', { schema: calculatorSchema, definition: calculatorDefinition, handler: calculator }],
  ['ip_lookup', { schema: ipLookupSchema, definition: ipLookupDefinition, handler: ipLookup }],
]);

// 自动生成 OpenAI 格式的工具列表
const TOOL_DEFINITIONS = Array.from(toolRegistry.values()).map((e) => e.definition);

// ══════════════════════════════════════════════════════════════
//  3. 工具执行入口（Zod 校验 + 调用 handler）
// ══════════════════════════════════════════════════════════════

async function executeTool(name: string, rawArgs: Record<string, any>): Promise<string> {
  const entry = toolRegistry.get(name);
  if (!entry) {
    return `❌ 未知工具: "${name}"。可用: ${[...toolRegistry.keys()].join(', ')}`;
  }

  // Zod 校验参数
  const result = entry.schema.safeParse(rawArgs);
  if (!result.success) {
    const issues = (result.error.issues as any[])
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    return `❌ 调用 "${name}" 参数错误:\n${issues}`;
  }

  // 执行 handler
  return entry.handler(result.data);
}

// ══════════════════════════════════════════════════════════════
//  4. Agent 循环（核心！）
// ══════════════════════════════════════════════════════════════

async function runAgent(userMessage: string) {
  const messages: any[] = [
    {
      role: 'system',
      content:
        '你是智能助手。遇到需要计算、查天气、查IP时，请调用对应工具获取数据，然后用你自己的话回答用户。',
    },
    { role: 'user', content: userMessage },
  ];

  const MAX_ROUNDS = 3; // 最多 3 轮（防止死循环）

  for (let round = 0; round < MAX_ROUNDS; round++) {
    console.log(`\n🔄 第 ${round + 1} 轮 LLM 调用...`);

    // 调 LLM（带上工具定义）
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages,
      stream: true,
      tools: TOOL_DEFINITIONS,
    });

    // 流式解析：累积文本 + 工具调用
    const toolCallMap = new Map<number, { id: string; name: string; args: string }>();
    let fullContent = '';
    let hasToolCalls = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullContent += delta.content;
        process.stdout.write(delta.content); // 实时打印
      }

      if (delta?.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallMap.has(idx)) {
            toolCallMap.set(idx, { id: tc.id || '', name: '', args: '' });
          }
          const entry = toolCallMap.get(idx)!;
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name += tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
        }
      }
    }

    // 没有工具调用 → 直接返回文本，结束
    if (!hasToolCalls || toolCallMap.size === 0) {
      console.log('\n✅ 完成');
      return;
    }

    // 有工具调用 → 执行
    const calls = Array.from(toolCallMap.values());
    console.log(`\n🔧 LLM 想调用 ${calls.length} 个工具:`);

    // 把 assistant 的 tool_calls 写入消息历史
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: calls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args },
      })),
    });

    // 逐个执行工具
    for (const tc of calls) {
      console.log(`   🛠️  调用 ${tc.name}，参数: ${tc.args}`);
      let args: Record<string, any> = {};
      try { args = JSON.parse(tc.args); } catch {}

      const toolOutput = await executeTool(tc.name, args);
      console.log(`   📤 结果: ${toolOutput.slice(0, 200)}${toolOutput.length > 200 ? '...' : ''}`);

      // 工具结果写回消息历史
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolOutput,
      });
    }

    // continue → 回到循环头，让 LLM 基于工具结果再回答
    console.log(`\n📨 将工具结果喂回 LLM，进入下一轮...`);
  }

  console.log('\n⚠️ 达到最大轮次，强制结束');
}

// ══════════════════════════════════════════════════════════════
//  5. 运行
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  AI 工具调用 完整演示');
  console.log('═══════════════════════════════════════');

  // ====== 示例 1：查天气（LLM 会调用 get_weather 工具） ======
  console.log('\n\n📝 用户: 北京今天天气怎么样？');
  await runAgent('北京今天天气怎么样？');

  console.log('\n\n' + '─'.repeat(50));

  // ====== 示例 2：计算（LLM 会调用 calculator 工具） ======
  console.log('\n📝 用户: 帮我算一下 (135 + 267) * 3.14 等于多少？');
  await runAgent('帮我算一下 (135 + 267) * 3.14 等于多少？');

  console.log('\n\n' + '─'.repeat(50));

  // ====== 示例 3：查 IP（LLM 会调用 ip_lookup 工具） ======
  console.log('\n📝 用户: 8.8.8.8 这个 IP 是哪里的？');
  await runAgent('8.8.8.8 这个 IP 是哪里的？');

  console.log('\n\n═══════════════════════════════════════');
  console.log('  演示结束');
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);


// ══════════════════════════════════════════════════════════════
//  附：LLM 实际收到的 messages 格式示例
// ══════════════════════════════════════════════════════════════
//
//  第 1 轮 — 发送给 LLM:
//  [
//    { role: 'system', content: '你是智能助手...' },
//    { role: 'user', content: '北京今天天气怎么样？' }
//  ]
//
//  第 1 轮 — LLM 返回:
//  {
//    choices: [{
//      delta: {
//        tool_calls: [{
//          index: 0,
//          id: 'call_abc123',
//          function: { name: 'get_weather', arguments: '{"city":"北京"}' }
//        }]
//      }
//    }]
//  }
//
//  执行工具后，messages 多了 2 条:
//  [
//    ...,
//    { role: 'assistant', content: null, tool_calls: [{ id:'call_abc123', type:'function', function:{ name:'get_weather', arguments:'{"city":"北京"}' } }] },
//    { role: 'tool', tool_call_id: 'call_abc123', content: '北京天气：温度 27°C，风速 12km/h' }
//  ]
//
//  第 2 轮 — 发送给 LLM（包含工具结果）:
//  [
//    { role: 'system', content: '...' },
//    { role: 'user', content: '北京今天天气怎么样？' },
//    { role: 'assistant', content: null, tool_calls: [...] },
//    { role: 'tool', tool_call_id: 'call_abc123', content: '北京天气：温度 27°C，风速 12km/h' }
//  ]
//
//  第 2 轮 — LLM 返回（基于工具结果生成回答）:
//  {
//    choices: [{ delta: { content: '北京今天天气不错，温度 27°C...' } }]
//  }