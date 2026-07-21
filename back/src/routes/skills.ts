/**
 * 技能路由 — 查询可用技能
 */
import { Router } from "express";
import * as skillController from "../controllers/skillController.js";
import { requireJwt } from "../middleware/auth.js";

const router = Router();

router.use(requireJwt);

/** GET /api/skills — 获取所有可用技能 */
router.get("/", skillController.getList);

export default router;
