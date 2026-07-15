/**
 * 知识库控制器 — 上传文档 / 列表 / 下载 / 删除
 */
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { requireJwt, type AuthRequest } from '../middleware/auth.js';
import { ingestDocument, removeDocument } from '../services/rag/ragService.js';
import * as documentModel from '../models/document.js';
import { log } from '../lib/logger.js';

// 持久化存储目录
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// multer 底层 busboy 会把 UTF-8 文件名按 Latin-1 解析，这里修复
function fixFilename(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf-8');
}

// 清理文件（同步删除，确保一定执行）
function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log.info(`[storage] 已清理文件: ${filePath}`);
    }
  } catch (err: any) {
    log.warn(`[storage] 清理文件失败: ${filePath}`, err.message);
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

    // 入库 Pipeline（解析 → 分块 → 向量化 → 存 Qdrant）
    const { documentId, chunkCount } = await ingestDocument(
      req.file.path,
      req.file.originalname,
    );

    // 将上传的文件从临时目录移动到持久化存储
    const ext = req.file.originalname.split('.').pop() || 'bin';
    const storedName = `${documentId}.${ext}`;
    const storedPath = path.join(STORAGE_DIR, storedName);
    fs.renameSync(req.file.path, storedPath);
    log.info(`[storage] 文件已持久化: ${storedPath}`);

    // 写 MySQL 记录（含文件路径）
    await documentModel.createDocument({
      id: documentId,
      userId: req.userId!,
      name: req.file.originalname,
      type: ext,
      size: req.file.size,
      chunkCount,
      filePath: storedPath,
    });

    res.json({ data: { documentId, chunkCount } });
  } catch (err) {
    // 出错要清理临时文件
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

/** 下载文档原文件 */
export async function download(
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
      res.status(403).json({ error: '无权下载此文档' });
      return;
    }

    // 检查文件是否存在于磁盘
    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      res.status(404).json({ error: '文件不存在于服务器' });
      return;
    }

    // 用 res.download 发送文件，自动设置 Content-Disposition
    res.download(doc.filePath, doc.name);
  } catch (err) {
    next(err);
  }
}

/** 删除文档（向量 + 记录 + 文件） */
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

    // 删向量 + 删记录 + 删物理文件
    await removeDocument(docId);
    await documentModel.deleteById(docId);
    if (doc.filePath) cleanupFile(doc.filePath);

    res.json({ data: { message: '删除成功' } });
  } catch (err) {
    next(err);
  }
}
