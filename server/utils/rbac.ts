/**
 * RBAC (Role-Based Access Control) 辅助工具
 * 提供角色和权限管理的辅助函数
 */

import type { UserRole } from '../middleware/permission';

/**
 * 角色层级定义（数字越大权限越高）
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  user: 10,
  nurse: 20,
  doctor: 30,
  admin: 100,
};

/**
 * 比较两个角色的权限级别
 * @param role1 角色1
 * @param role2 角色2
 * @returns role1的权限级别是否 >= role2
 */
export function isRoleHigherOrEqual(role1: UserRole, role2: UserRole): boolean {
  return (ROLE_HIERARCHY[role1] || 0) >= (ROLE_HIERARCHY[role2] || 0);
}

/**
 * 检查用户是否为管理员
 * @param role 用户角色
 * @returns 是否为管理员
 */
export function isAdmin(role: string): boolean {
  return role === 'admin';
}

/**
 * 检查用户是否为医生或更高级别
 * @param role 用户角色
 * @returns 是否为医生或管理员
 */
export function isDoctorOrHigher(role: string): boolean {
  return isRoleHigherOrEqual(role as UserRole, 'doctor');
}

/**
 * 检查用户是否为护士或更高级别
 * @param role 用户角色
 * @returns 是否为护士、医生或管理员
 */
export function isNurseOrHigher(role: string): boolean {
  return isRoleHigherOrEqual(role as UserRole, 'nurse');
}

/**
 * 获取角色的显示名称
 * @param role 角色
 * @returns 中文显示名称
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: '管理员',
    doctor: '医生',
    nurse: '护士',
    user: '普通用户',
    guest: '访客',
  };

  return names[role] || '未知';
}

/**
 * 获取所有可用角色
 * @returns 角色列表
 */
export function getAllRoles(): UserRole[] {
  return ['admin', 'doctor', 'nurse', 'user'];
}

/**
 * 验证角色字符串是否有效
 * @param role 角色字符串
 * @returns 是否为有效角色
 */
export function isValidRole(role: string): role is UserRole {
  return ['admin', 'doctor', 'nurse', 'user', 'guest'].includes(role);
}

/**
 * 数据访问权限检查逻辑
 * 检查用户是否可以访问指定患者的数据
 */
export interface PatientAccessCheckParams {
  patientId: number;
  userId: string;
  userRole: UserRole;
  userOrgId?: number;
  patientCreatedBy?: string;
  patientOrgId?: number;
  patientSharedWith?: string[];
}

/**
 * 检查用户是否可以访问患者数据
 * @param params 访问检查参数
 * @returns 是否有访问权限
 */
export function canAccessPatient(params: PatientAccessCheckParams): boolean {
  const {
    userId,
    userRole,
    userOrgId,
    patientCreatedBy,
    patientOrgId,
    patientSharedWith,
  } = params;

  // 1. Admin可以访问所有患者
  if (userRole === 'admin') {
    return true;
  }

  // 2. 创建者可以访问自己创建的患者
  if (patientCreatedBy && patientCreatedBy === userId) {
    return true;
  }

  // 3. 同组织的医生和护士可以访问组织内的患者
  if (userOrgId && patientOrgId && userOrgId === patientOrgId) {
    if (userRole === 'doctor' || userRole === 'nurse') {
      return true;
    }
  }

  // 4. 被共享的用户可以访问
  if (patientSharedWith && patientSharedWith.includes(userId)) {
    return true;
  }

  // 没有匹配的权限规则
  return false;
}

/**
 * 检查用户是否可以修改患者数据
 * @param params 访问检查参数
 * @returns 是否有修改权限
 */
export function canModifyPatient(params: PatientAccessCheckParams): boolean {
  const {
    userId,
    userRole,
    userOrgId,
    patientCreatedBy,
    patientOrgId,
  } = params;

  // 1. Admin可以修改所有患者
  if (userRole === 'admin') {
    return true;
  }

  // 2. 创建者可以修改自己创建的患者
  if (patientCreatedBy && patientCreatedBy === userId) {
    return true;
  }

  // 3. 同组织的医生和护士可以修改组织内的患者
  if (userOrgId && patientOrgId && userOrgId === patientOrgId) {
    if (userRole === 'doctor' || userRole === 'nurse') {
      return true;
    }
  }

  // 被共享的用户不能修改（除非他们是医生/护士且在同组织）
  return false;
}

/**
 * 检查用户是否可以删除患者数据
 * @param params 访问检查参数
 * @returns 是否有删除权限
 */
export function canDeletePatient(params: PatientAccessCheckParams): boolean {
  const { userId, userRole, patientCreatedBy } = params;

  // 1. Admin可以删除所有患者
  if (userRole === 'admin') {
    return true;
  }

  // 2. 只有创建者（且是医生）可以删除患者
  if (userRole === 'doctor' && patientCreatedBy && patientCreatedBy === userId) {
    return true;
  }

  // 护士和普通用户不能删除患者
  return false;
}

/**
 * 检查用户是否可以共享患者
 * @param params 访问检查参数
 * @returns 是否有共享权限
 */
export function canSharePatient(params: PatientAccessCheckParams): boolean {
  const { userId, userRole, patientCreatedBy } = params;

  // 1. Admin可以共享任何患者
  if (userRole === 'admin') {
    return true;
  }

  // 2. 只有创建者（且是医生）可以共享患者
  if (userRole === 'doctor' && patientCreatedBy && patientCreatedBy === userId) {
    return true;
  }

  return false;
}

/**
 * 获取用户的默认角色
 * @returns 默认角色
 */
export function getDefaultRole(): UserRole {
  return 'user';
}

/**
 * 组织权限检查
 */
export interface OrganizationMember {
  userId: string;
  organizationId: number;
  role: 'owner' | 'admin' | 'member';
  permissions: {
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
  };
}

/**
 * 检查用户在组织中的角色
 * @param member 组织成员信息
 * @param requiredRole 需要的角色
 * @returns 是否满足角色要求
 */
export function hasOrganizationRole(
  member: OrganizationMember | undefined,
  requiredRole: 'owner' | 'admin' | 'member'
): boolean {
  if (!member) {
    return false;
  }

  const roleHierarchy = {
    member: 1,
    admin: 2,
    owner: 3,
  };

  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
}

/**
 * 检查用户在组织中是否有特定权限
 * @param member 组织成员信息
 * @param permission 权限名称
 * @returns 是否有该权限
 */
export function hasOrganizationPermission(
  member: OrganizationMember | undefined,
  permission: keyof OrganizationMember['permissions']
): boolean {
  if (!member) {
    return false;
  }

  // Owner和Admin默认拥有所有权限
  if (member.role === 'owner' || member.role === 'admin') {
    return true;
  }

  return member.permissions[permission] === true;
}
