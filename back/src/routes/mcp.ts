/**
 * MCP 路由 — 管理外部 MCP Server 连接
 */
import { Router } from "express";
import * as mcpController from "../controllers/mcpController.js";
import { requireJwt } from "../middleware/auth.js";

const router = Router();

// 所有 MCP 路由都需要登录
router.use(requireJwt);

/** GET /api/mcp/servers — 获取 MCP Server 列表 */
router.get("/servers", mcpController.getList);

/** POST /api/mcp/servers — 创建 MCP Server 配置 */
router.post("/servers", mcpController.create);

/** PATCH /api/mcp/servers/:id — 更新 MCP Server 配置 */
router.patch("/servers/:id", mcpController.update);

/** DELETE /api/mcp/servers/:id — 删除 MCP Server 配置 */
router.delete("/servers/:id", mcpController.remove);

/** POST /api/mcp/servers/:id/connect — 连接 MCP Server */
router.post("/servers/:id/connect", mcpController.connect);

/** POST /api/mcp/servers/:id/disconnect — 断开 MCP Server */
router.post("/servers/:id/disconnect", mcpController.disconnect);

/** GET /api/mcp/servers/:id/tools — 查看 MCP Server 提供的工具 */
router.get("/servers/:id/tools", mcpController.getTools);

/** POST /api/mcp/seed — 一键添加推荐 MCP Server */
router.post("/seed", mcpController.seedRecommended);

/** GET /api/mcp/recommended — 获取推荐 MCP Server 列表 */
router.get("/recommended", (_req, res) => {
  res.json({ data: mcpController.RECOMMENDED_MCP });
});

export default router;
