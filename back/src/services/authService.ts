/**
 * 认证服务 — 注册 / 登录 / token 签发
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { log } from '../lib/logger.js';
import { v4 as uuid } from 'uuid';
import * as userModel from '../models/user.js';
import { AppError } from '../middleware/errorHandler.js';

import { config } from '../lib/envConfig.js';

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = config.jwtExpiresIn;
const JWT_REFRESH_EXPIRES_IN = config.jwtRefreshExpiresIn;
interface TokenPair {
  token: string;
  refreshToken: string;
}

interface UserPayload {
  id: string;
  username: string;
}

/** 签发 token + refreshToken */
function generateTokens(user: UserPayload): TokenPair {
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  );

  return { token, refreshToken };
}

/** 注册新用户 */
export async function registerUser(username: string, password: string) {
  // 1. 校验参数
  if (!username || !password) {
    throw new AppError(400, '用户名和密码不能为空');
  }
  if (username.length < 3) {
    throw new AppError(400, '用户名至少 3 个字符');
  }
  if (password.length < 6) {
    throw new AppError(400, '密码至少 6 个字符');
  }

  // 2. 查重
  const existing = await userModel.findUserByUsername(username);
  if (existing) {
    throw new AppError(409, '用户名已存在');
  }

  // 3. 哈希密码
  const hashed = await bcrypt.hash(password, 10);

  // 4. 写入数据库
  const user = await userModel.createUser(uuid(), username, hashed);

  // 5. 签发 token
  const tokens = generateTokens(user);

  return {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
    user: { id: user.id, username: user.username },
  };
}

/** 登录 */
export async function loginUser(username: string, password: string) {
  // 1. 查找用户
  const user = await userModel.findUserByUsername(username);
  if (!user) {
    throw new AppError(401, '用户名或密码错误');
  }

  // 2. 比对密码
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError(401, '用户名或密码错误');
  }

  // 3. 签发 token
  const tokens = generateTokens(user);

  return {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
    user: { id: user.id, username: user.username },
  };
}

/** 根据 userId 获取用户信息 */
export async function getUserById(id: string) {
  const user = await userModel.findUserById(id);
  if (!user) {
    throw new AppError(404, '用户不存在');
  }
  return {
    id: user.id,
    username: user.username,
    smtpHost: user.smtpHost || '',
    smtpPort: user.smtpPort || 587,
    smtpUser: user.smtpUser || '',
    smtpPass: user.smtpPass || '',
    smtpFrom: user.smtpFrom || '',
  };
}