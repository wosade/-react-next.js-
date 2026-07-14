/**
 * 会话控制器 — 获取会话列表 / 创建 / 查询 / 更新 / 删除
 */
import type { Response, NextFunction } from 'express';
import * as conversationService from '../services/conversationService.js';
import type { AuthRequest } from '../middleware/auth.js';

/** 获取当前用户的会话列表 */
export async function getList(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const list = await conversationService.getConversationList(req.userId!);
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
}

/** 创建新会话 */
export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title } = req.body;
    const conv = await conversationService.createConversation(req.userId!, title);
    res.status(201).json({ data: conv });
  } catch (err) {
    next(err);
  }
}

/** 获取单个会话详情（含消息和步骤） */
export async function getDetail(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conv = await conversationService.getConversation(req.params.id as string);
    conv.messages = await conversationService.getMessagesWithSteps(req.params.id as string);
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
}

/** 更新会话标题 */
export async function update(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title } = req.body;
    const conv = await conversationService.updateConversation(req.params.id as string, { title });
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
}

/** 删除会话 */
export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await conversationService.deleteConversation(req.params.id as string);
    res.json({ data: '删除成功' });
  } catch (err) {
    next(err);
  }
}