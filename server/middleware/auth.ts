import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '../utils/errors';
import { asyncHandler } from './error-handler';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { auditLogger } from '../utils/audit-logger';
import { userSessionCache } from '../utils/permission-cache';

/**
 * 扩展Express Request类型，添加user属性
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: number;
        displayName?: string;
      };
    }
  }
}

/**
 * 创建Supabase服务端客户端
 *
 * ⚠️ 安全说明：
 * - 服务端必须使用 SUPABASE_SERVICE_ROLE_KEY，而不是 VITE_SUPABASE_ANON_KEY
 * - Service Role Key 拥有绕过RLS规则的完整权限，适合服务端验证JWT和查询用户信息
 * - Anon Key 仅用于前端，权限受到Row Level Security (RLS) 规则的严格限制
 * - VITE_ 前缀的环境变量会被打包到前端代码中暴露给用户，绝不能在服务端使用私密密钥
 */
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * 从请求中提取JWT token
 * @param req Express Request对象
 * @returns JWT token字符串
 */
function extractToken(req: Request): string | null {
  // 1. 从Authorization header提取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从cookie提取（如果使用cookie存储token）
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  // 3. 从query参数提取（不推荐，仅用于特殊场景）
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * 验证Supabase JWT token并获取用户信息
 * @param token JWT token
 * @returns 用户信息
 */
async function verifySupabaseToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError('无效的认证令牌');
    }

    return data.user;
  } catch (error) {
    console.error('Token验证失败:', error);
    throw new UnauthorizedError('认证令牌验证失败');
  }
}

/**
 * 从数据库获取用户完整信息（包括角色和组织）
 *
 * 功能：
 * 1. 查询数据库获取用户信息
 * 2. 如果用户不存在（首次Supabase登录），创建新用户记录
 * 3. 更新用户最后登录时间
 * 4. 返回用户完整信息（id, email, role, organizationId）
 *
 * @param userId Supabase用户ID (UUID)
 * @param email Supabase用户邮箱
 * @returns 用户完整信息
 */
async function getUserDetails(userId: string, email: string) {
  try {
    // 1. 尝试从缓存获取
    const cachedUser = userSessionCache.get(userId);
    if (cachedUser) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📦 从缓存获取用户信息: ${cachedUser.email}`);
      }
      return cachedUser;
    }

    // 2. 缓存未命中，查询数据库
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser) {
      // 用户已存在，更新最后登录时间
      const [updatedUser] = await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId ?? undefined,
        displayName: updatedUser.displayName ?? undefined,
      };

      // 写入缓存
      userSessionCache.set(userId, userData);

      // 记录审计日志（仅生产环境）
      if (process.env.NODE_ENV === 'production') {
        auditLogger.logAuth({
          userId: updatedUser.id,
          userEmail: updatedUser.email,
          action: 'login',
          status: 'success',
        });
      } else {
        console.log(`✅ 用户登录: ${updatedUser.email} (${updatedUser.role})`);
      }

      return userData;
    } else {
      // 用户不存在，创建新用户（首次Supabase登录同步）
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🆕 首次登录，创建新用户: ${email}`);
      }

      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          email: email,
          role: 'user', // 默认角色
          displayName: null,
          organizationId: null,
          avatar: null,
          isActive: true,
          lastLoginAt: new Date(),
        })
        .returning();

      const userData = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId ?? undefined,
        displayName: newUser.displayName ?? undefined,
      };

      // 写入缓存
      userSessionCache.set(userId, userData);

      // 记录审计日志
      if (process.env.NODE_ENV === 'production') {
        auditLogger.logAuth({
          userId: newUser.id,
          userEmail: newUser.email,
          action: 'login',
          status: 'success',
        });
      } else {
        console.log(`✅ 新用户创建成功: ${newUser.email} (${newUser.role})`);
      }

      return userData;
    }
  } catch (error) {
    console.error('❌ 获取用户详情失败:', error);

    // 记录失败的审计日志
    auditLogger.logAuth({
      userId: userId,
      userEmail: email,
      action: 'login',
      status: 'failure',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // 发生错误时，返回基本信息（使用Supabase提供的数据）
    // 这样即使数据库查询失败，用户仍然可以登录（降级处理）
    return {
      id: userId,
      email: email,
      role: 'user', // 默认角色
      organizationId: undefined,
      displayName: undefined,
    };
  }
}

/**
 * 认证中间件 - 验证JWT token并附加用户信息到请求
 *
 * 使用方式:
 * ```typescript
 * app.get('/api/protected', authenticate, (req, res) => {
 *   const userId = req.user.id;
 *   // ...
 * });
 * ```
 */
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // 提取token
  const token = extractToken(req);

  if (!token) {
    throw new UnauthorizedError('缺少认证令牌，请先登录');
  }

  // 验证token
  const supabaseUser = await verifySupabaseToken(token);

  // 获取用户详细信息（包括角色和组织）
  // 传入email用于首次登录时创建用户记录
  const userDetails = await getUserDetails(supabaseUser.id, supabaseUser.email || '');

  // 将用户信息附加到请求对象
  req.user = {
    id: supabaseUser.id,
    email: supabaseUser.email || userDetails.email,
    role: userDetails.role,
    organizationId: userDetails.organizationId,
    displayName: supabaseUser.user_metadata?.display_name || userDetails.displayName,
  };

  console.log(`✅ 用户认证成功: ${req.user.email} (${req.user.role})`);

  next();
});

/**
 * 可选认证中间件 - 尝试认证但不强制要求
 * 如果有token则验证并附加用户信息，没有token则继续
 *
 * 适用于某些端点需要根据是否登录返回不同内容的场景
 */
export const optionalAuthenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    // 没有token，继续但不设置user
    return next();
  }

  try {
    // 有token，尝试验证
    const supabaseUser = await verifySupabaseToken(token);
    const userDetails = await getUserDetails(supabaseUser.id, supabaseUser.email || '');

    req.user = {
      id: supabaseUser.id,
      email: supabaseUser.email || userDetails.email,
      role: userDetails.role,
      organizationId: userDetails.organizationId,
      displayName: supabaseUser.user_metadata?.display_name || userDetails.displayName,
    };
  } catch (error) {
    // token无效，忽略错误继续
    console.warn('可选认证失败，继续处理请求');
  }

  next();
});

/**
 * 检查用户是否已认证（辅助函数）
 * @param req Express Request对象
 * @returns 是否已认证
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

/**
 * 获取当前用户ID（辅助函数）
 * @param req Express Request对象
 * @returns 用户ID，未认证则返回null
 */
export function getCurrentUserId(req: Request): string | null {
  return req.user?.id || null;
}

/**
 * 获取当前用户角色（辅助函数）
 * @param req Express Request对象
 * @returns 用户角色
 */
export function getCurrentUserRole(req: Request): string {
  return req.user?.role || 'guest';
}
