/**
 * 知识库管理 API
 *
 * POST   /api/knowledge/upload      — 上传文档并入库
 * GET    /api/knowledge             — 文档列表
 * GET    /api/knowledge/:id/download — 下载文档原文件
 * DELETE /api/knowledge/:id         — 删除文档（向量 + 记录 + 文件）
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireJwt } from '../middleware/auth.js';
import * as knowledgeController from '../controllers/knowledgeController.js';
import { log } from '../lib/logger.js';

const router = Router();

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
  knowledgeController.upload,
);

// GET /api/knowledge
router.get('/', requireJwt, knowledgeController.list);

// GET /api/knowledge/:id/download
router.get('/:id/download', requireJwt, knowledgeController.download);

// DELETE /api/knowledge/:id
router.delete('/:id', requireJwt, knowledgeController.remove);

export default router;