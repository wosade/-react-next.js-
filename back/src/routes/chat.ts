import { Router } from 'express';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { requireJwt } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.post('/send', requireJwt, chatLimiter, chatController.sendMessage);

export default router;