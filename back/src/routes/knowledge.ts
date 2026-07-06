/**
 * 知识库管理 API
 *
 * POST   /api/knowledge/upload  — 上传文档并入库
 * GET    /api/knowledge         — 文档列表
 * DELETE /api/knowledge/:id     — 删除文档（向量 + 记录）
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireJwt, type AuthRequest } from '../middleware/auth.js';
import { ingestDocument, removeDocument } from '../services/rag/ragService.js';
import * as documentModel from '../models/document.js';

const router = Router();

// multer 底层 busboy 会把 UTF-8 文件名按 Latin-1 解析，这里修复
function fixFilename(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

// 上传临时目录
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['pdf', 'docx', 'doc', 'txt', 'md'];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: .${ext}`));
    }
  },
});

// POST /api/knowledge/upload
// 存入文件 文件向量化 写入数据库
router.post(
  '/upload',
  requireJwt,
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请选择文件' });
        return;
      }

      // busboy 把 UTF-8 文件名按 Latin-1 解析了，修复回 UTF-8
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
      fs.unlink(req.file.path, () => {});

      res.json({ data: { documentId, chunkCount } });
    } catch (err) {
      // 出错也要清理
      if (req.file) fs.unlink(req.file.path, () => {});
      next(err);
    }
  },
);

// GET /api/knowledge
router.get('/', requireJwt, async (req: AuthRequest, res, next) => {
  try {
    const docs = await documentModel.listByUser(req.userId!);
    res.json({ data: docs });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/knowledge/:id
router.delete('/:id', requireJwt, async (req: AuthRequest, res, next) => {
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
});

export default router;