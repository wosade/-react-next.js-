/**
 * 知识库控制器 — 上传文档 / 列表 / 删除
 */
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { requireJwt, type AuthRequest } from '../middleware/auth.js';
import { ingestDocument, removeDocument } from '../services/rag/ragService.js';
import * as documentModel from '../models/document.js';
import { log } from '../lib/logger.js';

// multer 底层 busboy 会把 UTF-8 文件名按 Latin-1 解析，这里修复
function fixFilename(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf-8');
}

// 清理临时文件（同步删除，确保一定执行）
function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log.info(`[upload] 已清理临时文件: ${filePath}`);
    }
  } catch (err: any) {
    log.warn(`[upload] 清理临时文件失败: ${filePath}`, err.message);
  }
}

/** 上传文档并向量化入库 */
export async function upload(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请选择文件' });
      return;
    }

    // 修复文件名编码
    req.file.originalname = fixFilename(req.file.originalname);

    // 入库 Pipeline
    const { documentId, chunkCount } = await ingestDocument(
      req.file.path,
      req.file.originalname,
    );

    // 写 MySQL 记录
    await documentModel.createDocument({
      id: documentId,
      userId: req.userId!,
      name: req.file.originalname,
      type: req.file.originalname.split('.').pop()!,
      size: req.file.size,
      chunkCount,
    });

    // 清理临时文件
    cleanupFile(req.file.path);

    res.json({ data: { documentId, chunkCount } });
  } catch (err) {
    // 出错也要清理
    if (req.file) cleanupFile(req.file.path);
    next(err);
  }
}

/** 获取当前用户的文档列表 */
export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const docs = await documentModel.listByUser(req.userId!);
    res.json({ data: docs });
  } catch (err) {
    next(err);
  }
}

/** 删除文档（向量 + 记录） */
export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const docId = req.params.id as string;
    const doc = await documentModel.findById(docId);
    if (!doc) {
      res.status(404).json({ error: '文档不存在' });
      return;
    }
    if (doc.userId !== req.userId) {
      res.status(403).json({ error: '无权删除此文档' });
      return;
    }

    // 删向量 + 删记录
    await removeDocument(docId);
    await documentModel.deleteById(docId);

    res.json({ data: { message: '删除成功' } });
  } catch (err) {
    next(err);
  }
}