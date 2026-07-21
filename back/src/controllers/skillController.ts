/**
 * 技能控制器 — 查询可用技能列表
 */
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { getAllSkills, getSkillsByCategory } from "../services/skills/index.js";

/** 获取所有可用技能 */
export async function getList(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const skills = getAllSkills();
    const grouped = getSkillsByCategory();
    res.json({ data: { skills, grouped } });
  } catch (err) {
    next(err);
  }
}
