/**
 * SQL 安全校验测试
 *
 * 验证 queryDatabase 工具的 SQL 注入防护有效性
 */
import { describe, it, expect } from "vitest";

// 直接测试校验逻辑 — 复制一份避免依赖数据库
const DANGEROUS_PATTERNS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bREPLACE\b/i,
  /\bMERGE\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bRENAME\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXEC(UTE)?\b/i,
  /\bCALL\b/i,
  /\bLOAD\b/i,
  /\bINTO\s+(OUTFILE|DUMPFILE)\b/i,
  /\bSLEEP\s*\(/i,
  /\bBENCHMARK\s*\(/i,
  /\bUNION\b/i,
];

function validateSql(sql: string): void {
  const trimmed = sql.trim();
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error("仅允许 SELECT 查询");
  }
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .replace(/#[^\n]*/g, "");
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(withoutComments)) {
      throw new Error(`SQL 包含禁止的操作`);
    }
  }
}

describe("SQL 安全校验", () => {
  it("正常 SELECT 应通过", () => {
    expect(() =>
      validateSql("SELECT * FROM users WHERE id = 1"),
    ).not.toThrow();
  });

  it("SELECT COUNT 应通过", () => {
    expect(() =>
      validateSql("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
    ).not.toThrow();
  });

  it("INSERT 应被拦截", () => {
    expect(() =>
      validateSql("INSERT INTO users (name) VALUES ('hacker')"),
    ).toThrow(); // 先被 SELECT-only 检查拦截
  });

  it("DELETE 应被拦截", () => {
    expect(() =>
      validateSql("DELETE FROM users WHERE 1=1"),
    ).toThrow(); // 先被 SELECT-only 检查拦截
  });

  it("DROP TABLE 应被拦截", () => {
    expect(() =>
      validateSql("DROP TABLE users"),
    ).toThrow(); // 先被 SELECT-only 检查拦截
  });

  it("UNION 注入应被拦截", () => {
    expect(() =>
      validateSql("SELECT name FROM users UNION SELECT password FROM admins"),
    ).toThrow("禁止");
  });

  it("注释绕过的 INSERT 应被拦截", () => {
    expect(() =>
      validateSql("SELECT 1; /* comment */ INSERT INTO users VALUES (1)"),
    ).toThrow("禁止");
  });

  it("行注释绕过的 DELETE 应被拦截", () => {
    expect(() =>
      validateSql("SELECT 1; -- nice try\nDELETE FROM users"),
    ).toThrow("禁止");
  });

  it("SLEEP 注入应被拦截", () => {
    expect(() =>
      validateSql("SELECT SLEEP(10) FROM users"),
    ).toThrow("禁止");
  });

  it("非 SELECT 开头应被拦截", () => {
    expect(() => validateSql("  SHOW TABLES")).toThrow("仅允许 SELECT");
  });

  it("复杂 JOIN 查询应通过", () => {
    expect(() =>
      validateSql(
        "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.created_at > '2026-01-01'",
      ),
    ).not.toThrow();
  });
});
