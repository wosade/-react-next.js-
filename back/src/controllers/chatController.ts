/**
 * 聊天控制器 — 发送消息并流式响应
 */
import type { Response } from 'express';
import { log } from '../lib/logger.js';
import { runAgent } from '../services/chatService.js';
import * as conversationModel from '../models/conversation.js';
import * as stepModel from '../models/step.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { StepRecord } from '../types/index.js';

// 根据用户消息生成对话标题
function makeTitle(content: string): string {
  return content.slice(0, 20) + (content.length > 20 ? '…' : '');
}

/** 发送消息，运行 Agent，SSE 流式输出 */
export async function sendMessage(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { message, conversationId, skill } = req.body;
  if (!message || typeof message !== 'string') {
    res.write(
      `data:${JSON.stringify({ type: 'error', message: '请输入消息' })}\n\n`,
    );
    res.end();
    return;
  }

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 插入用户消息
  try {
    await conversationModel.addMessage(conversationId, {
      role: 'user',
      content: message,
    });
  } catch (err: any) {
    res.write(
      `data:${JSON.stringify({ type: 'error', message: err.message })}\n\n`,
    );
    res.end();
    return;
  }

  log.info(`CHAT ${message.slice(0, 50)}...`);

  try {
    // 查历史消息，转成 OpenAI 格式传给 Agent
    const historyMessages = await conversationModel.findMessages(conversationId);
    const isFirstMessage = historyMessages.length <= 1; // 只有刚插入的 user 消息
    const history = historyMessages.slice(0, -1).map((m) => ({
      role: m.role === 'agent' ? 'assistant' : (m.role as string),
      content: m.content,
    }));

    // 用一个数组存 agent 的工具调用步骤
    const stepRecodes: StepRecord[] = [];
    let fullContent = '';
    let fullThinking = '';

    for await (let stream of runAgent(message, history, conversationId, skill, req.userId)) {
      res.write(`data:${JSON.stringify(stream)}\n\n`);
      if (stream.type === 'content') {
        fullContent += stream.content;
      }
      if (stream.type === 'thinking') {
        fullThinking += stream.content;
      }
      if (stream.type === 'tool_step') {
        stepRecodes.push(stream.step);
      }
    }

    // 写入 agent 消息
    if (fullContent || fullThinking) {
      const agentmsg = await conversationModel.addMessage(conversationId, {
        role: 'agent',
        content: fullContent || '已处理完成',
        thinking: fullThinking || undefined,
      });
      if (agentmsg) {
        // 写入工具调用步骤
        await stepModel.batchInsertSteps(agentmsg.id, stepRecodes);
      }
      // 首次对话自动生成标题
      if (isFirstMessage) {
        await conversationModel.updateConversation(conversationId, {
          title: makeTitle(message),
        });
      }
    }

    res.end();
  } catch (err: any) {
    // SSE 头已发出，只能用流格式报错
    res.write(
      `data:${JSON.stringify({ type: 'error', message: err.message })}\n\n`,
    );
    res.end();
  }
}