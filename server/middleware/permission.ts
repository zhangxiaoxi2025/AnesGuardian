import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { asyncHandler } from './error-handler';
import { db } from '../db';
import { patients } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { canAccessPatient } from '../utils/rbac';
import { auditLogger } from '../utils/audit-logger';
import { permissionCache } from '../utils/permission-cache';

/**
 * 用户角色定义
 */
export type UserRole = 'admin' | 'doctor' | 'nurse' | 'user' | 'guest';

/**
 * 权限定义
 */
export interface Permission {
  resource: string; // 资源类型: 'patient', 'assessment', 'drug', 'report' 等
  action: 'create' | 'read' | 'update' | 'delete' | 'share'; // 操作类型
}

/**
 * 角色权限映射表
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // 管理员：所有权限
  admin: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
    { resource: '*', action: 'share' },
  ],

  // 医生：完整的患者管理权限
  doctor: [
    { resource: 'patient', action: 'create' },
    { resource: 'patient', action: 'read' },
    { resource: 'patient', action: 'update' },
    { resource: 'patient', action: 'delete' },
    { resource: 'patient', action: 'share' },
    { resource: 'assessment', action: 'create' },
    { resource: 'assessment', action: 'read' },
    { resource: 'report', action: 'create' },
    { resource: 'report', action: 'read' },
    { resource: 'drug', action: 'read' },
  ],

  // 护士：有限的患者管理权限
  nurse: [
    { resource: 'patient', action: 'read' },
    { resource: 'patient', action: 'update' }, // 可以更新患者信息
    { resource: 'assessment', action: 'read' },
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'create' }, // 可以上传报告
    { resource: 'drug', action: 'read' },
  ],

  // 普通用户：只读权限
  user: [
    { resource: 'patient', action: 'read' }, // 仅限被共享的患者
    { resource: 'assessment', action: 'read' },
    { resource: 'report', action: 'read' },
    { resource: 'drug', action: 'read' },
  ],

  // 访客：无权限
  guest: [],
};

/**
 * 检查角色是否有指定权限
 * @param role 用户角色
 * @param permission 需要的权限
 * @returns 是否有权限
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];

  return rolePermissions.some(p => {
    // 通配符匹配
    const resourceMatch = p.resource === '*' || p.resource === permission.resource;
    const actionMatch = p.action === permission.action;

    return resourceMatch && actionMatch;
  });
}

/**
 * 角色检查中间件 - 要求用户具有指定角色之一
 *
 * 使用方式:
 * ```typescript
 * app.post('/api/patients', authenticate, requireRole('admin', 'doctor'), (req, res) => {
 *   // 只有admin和doctor可以访问
 * });
 * ```
 *
 * @param roles 允许的角色列表
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否已认证
    if (!req.user) {
      throw new UnauthorizedError('需要登录才能访问');
    }

    // 检查角色
    if (!roles.includes(req.user.role as UserRole)) {
      console.warn(`⚠️ 权限不足: 用户${req.user.email}(${req.user.role}) 尝试访问需要 [${roles.join(', ')}] 角色的资源`);
      throw new ForbiddenError(`需要以下角色之一: ${roles.join('、')}`);
    }

    next();
  };
}

/**
 * 权限检查中间件 - 要求用户具有指定权限
 *
 * 使用方式:
 * ```typescript
 * app.delete('/api/patients/:id', authenticate, requirePermission('patient', 'delete'), (req, res) => {
 *   // 只有有删除患者权限的用户可以访问
 * });
 * ```
 *
 * @param resource 资源类型
 * @param action 操作类型
 */
export function requirePermission(resource: string, action: Permission['action']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否已认证
    if (!req.user) {
      throw new UnauthorizedError('需要登录才能访问');
    }

    const userRole = req.user.role as UserRole;
    const permission: Permission = { resource, action };

    // 检查权限
    if (!hasPermission(userRole, permission)) {
      console.warn(`⚠️ 权限不足: 用户${req.user.email}(${req.user.role}) 尝试 ${action} ${resource}`);
      throw new ForbiddenError(`您没有权限进行此操作`);
    }

    next();
  };
}

/**
 * 数据访问权限检查 - 检查用户是否可以访问指定患者
 *
 * 规则:
 * 1. Admin可以访问所有患者
 * 2. 创建者可以访问自己创建的患者
 * 3. 同组织成员（医生/护士）可以访问组织内的患者
 * 4. 被共享的用户可以访问共享给他的患者
 *
 * 使用方式:
 * ```typescript
 * app.get('/api/patients/:id', authenticate, checkPatientAccess, (req, res) => {
 *   // 已验证用户有权访问该患者
 * });
 * ```
 */
export const checkPatientAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // 1. 检查是否已认证
  if (!req.user) {
    throw new UnauthorizedError('需要登录才能访问');
  }

  const patientId = parseInt(req.params.id);
  const userId = req.user.id;
  const userRole = req.user.role as UserRole;
  const userOrgId = req.user.organizationId;

  // 验证patientId是否有效
  if (isNaN(patientId)) {
    throw new NotFoundError('患者不存在');
  }

  // 2. Admin可以访问所有患者（快速通过）
  if (userRole === 'admin') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ 权限检查通过 (Admin): 用户 ${req.user.email} 访问患者 ${patientId}`);
    }

    // 记录审计日志
    auditLogger.logDataAccess({
      userId,
      userEmail: req.user.email,
      userRole,
      action: 'view',
      resource: 'patient',
      resourceId: patientId,
      status: 'success',
    });

    return next();
  }

  // 3. 尝试从缓存获取权限检查结果
  const cacheKey = {
    userId,
    resource: 'patient',
    resourceId: patientId,
    action: 'view',
  };

  const cachedPermission = permissionCache.get(cacheKey);
  if (cachedPermission !== undefined) {
    if (cachedPermission) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📦 从缓存获取权限: 用户 ${req.user.email} 可以访问患者 ${patientId}`);
      }

      // 记录审计日志
      auditLogger.logDataAccess({
        userId,
        userEmail: req.user.email,
        userRole,
        action: 'view',
        resource: 'patient',
        resourceId: patientId,
        status: 'success',
      });

      return next();
    } else {
      // 缓存显示无权限
      auditLogger.logPermissionCheck({
        userId,
        userEmail: req.user.email,
        userRole,
        action: 'view',
        resource: 'patient',
        resourceId: patientId,
        status: 'failure',
        reason: 'Cached: No permission',
      });

      throw new ForbiddenError('您没有权限访问此患者信息');
    }
  }

  // 4. 缓存未命中，查询数据库获取患者信息
  const [patient] = await db
    .select({
      id: patients.id,
      createdBy: patients.createdBy,
      organizationId: patients.organizationId,
      sharedWith: patients.sharedWith,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  // 5. 患者不存在
  if (!patient) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ 患者不存在: 用户 ${req.user.email} 尝试访问患者 ${patientId}`);
    }

    auditLogger.logDataAccess({
      userId,
      userEmail: req.user.email,
      userRole,
      action: 'view',
      resource: 'patient',
      resourceId: patientId,
      status: 'failure',
      errorMessage: 'Patient not found',
    });

    throw new NotFoundError('患者不存在');
  }

  // 6. 使用RBAC工具函数检查权限
  const hasAccess = canAccessPatient({
    patientId: patient.id,
    userId: userId,
    userRole: userRole,
    userOrgId: userOrgId,
    patientCreatedBy: patient.createdBy,
    patientOrgId: patient.organizationId ?? undefined,
    patientSharedWith: patient.sharedWith || [],
  });

  // 7. 将权限检查结果写入缓存
  permissionCache.set(cacheKey, hasAccess);

  // 8. 权限检查结果
  if (!hasAccess) {
    const reason = `User ${userId} (${userRole}) attempted to access patient ${patientId} (creator: ${patient.createdBy}, org: ${patient.organizationId})`;

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`❌ 权限检查失败: ${reason}`);
    }

    // 记录失败的审计日志
    auditLogger.logPermissionCheck({
      userId,
      userEmail: req.user.email,
      userRole,
      action: 'view',
      resource: 'patient',
      resourceId: patientId,
      status: 'failure',
      reason: 'No access permission',
    });

    throw new ForbiddenError('您没有权限访问此患者信息');
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ 权限检查通过: 用户 ${req.user.email} 访问患者 ${patientId}`);
  }

  // 记录成功的审计日志
  auditLogger.logDataAccess({
    userId,
    userEmail: req.user.email,
    userRole,
    action: 'view',
    resource: 'patient',
    resourceId: patientId,
    status: 'success',
  });

  next();
});

/**
 * 组织访问权限检查 - 检查用户是否可以访问指定组织
 *
 * 使用方式:
 * ```typescript
 * app.get('/api/organizations/:id', authenticate, checkOrganizationAccess, (req, res) => {
 *   // 已验证用户属于该组织
 * });
 * ```
 */
export const checkOrganizationAccess = (req: Request, res: Response, next: NextFunction) => {
  // 检查是否已认证
  if (!req.user) {
    throw new UnauthorizedError('需要登录才能访问');
  }

  const organizationId = parseInt(req.params.id || req.params.organizationId);
  const userRole = req.user.role as UserRole;

  // Admin可以访问所有组织
  if (userRole === 'admin') {
    return next();
  }

  // 检查用户是否属于该组织
  if (req.user.organizationId !== organizationId) {
    console.warn(`⚠️ 组织访问被拒绝: 用户${req.user.email} 尝试访问组织 ${organizationId}`);
    throw new ForbiddenError('您无权访问该组织的资源');
  }

  next();
};

/**
 * 检查用户是否为组织管理员
 */
export const requireOrganizationAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new UnauthorizedError('需要登录才能访问');
  }

  const userRole = req.user.role as UserRole;

  // 只有admin和具有admin角色的用户可以管理组织
  if (userRole !== 'admin') {
    throw new ForbiddenError('只有管理员可以执行此操作');
  }

  next();
};

/**
 * 检查用户是否可以共享患者
 */
export function canSharePatient(role: UserRole): boolean {
  return hasPermission(role, { resource: 'patient', action: 'share' });
}

/**
 * 检查用户是否可以删除患者
 */
export function canDeletePatient(role: UserRole): boolean {
  return hasPermission(role, { resource: 'patient', action: 'delete' });
}
