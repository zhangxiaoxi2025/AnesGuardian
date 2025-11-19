/**
 * 患者CRUD权限集成测试
 * 测试不同角色对患者的CRUD操作权限
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUsers, testPatients } from '../../helpers/test-data';
import { canAccessPatient, canModifyPatient, canDeletePatient } from '../../../server/utils/rbac';
import type { UserRole } from '../../../server/types';

describe('患者CRUD权限集成测试', () => {
  describe('患者访问权限 (canAccessPatient)', () => {
    it('✅ Admin可以访问所有患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.admin.id,
        userRole: 'admin',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
        patientSharedWith: testPatients.patient1.sharedWith,
      });

      expect(result).toBe(true);
    });

    it('✅ Doctor可以访问自己创建的患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.doctor1.id, // 创建者
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId,
        patientCreatedBy: testPatients.patient1.createdBy, // doctor1创建
        patientOrgId: testPatients.patient1.organizationId,
        patientSharedWith: testPatients.patient1.sharedWith,
      });

      expect(result).toBe(true);
    });

    it('✅ Nurse可以访问同组织患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.nurse1.id, // 同组织
        userRole: 'nurse',
        userOrgId: testUsers.nurse1.organizationId, // 组织1
        patientCreatedBy: testPatients.patient1.createdBy, // doctor1创建
        patientOrgId: testPatients.patient1.organizationId, // 组织1
        patientSharedWith: testPatients.patient1.sharedWith,
      });

      expect(result).toBe(true);
    });

    it('❌ Doctor不能访问其他组织的患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient2.id,
        userId: testUsers.doctor1.id, // 组织1
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId, // 组织1
        patientCreatedBy: testPatients.patient2.createdBy, // doctor2创建
        patientOrgId: testPatients.patient2.organizationId, // 组织2
        patientSharedWith: testPatients.patient2.sharedWith,
      });

      expect(result).toBe(false);
    });

    it('✅ User可以访问共享给自己的患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient3.id,
        userId: testUsers.user1.id,
        userRole: 'user',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient3.createdBy,
        patientOrgId: testPatients.patient3.organizationId,
        patientSharedWith: testPatients.patient3.sharedWith, // 包含user1
      });

      expect(result).toBe(true);
    });

    it('❌ User不能访问未共享的患者', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.user1.id,
        userRole: 'user',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
        patientSharedWith: testPatients.patient1.sharedWith, // 空数组
      });

      expect(result).toBe(false);
    });
  });

  describe('患者修改权限 (canModifyPatient)', () => {
    it('✅ Admin可以修改所有患者', () => {
      const result = canModifyPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.admin.id,
        userRole: 'admin',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(true);
    });

    it('✅ Doctor可以修改自己创建的患者', () => {
      const result = canModifyPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.doctor1.id,
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(true);
    });

    it('✅ Nurse可以修改同组织患者', () => {
      const result = canModifyPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.nurse1.id,
        userRole: 'nurse',
        userOrgId: testUsers.nurse1.organizationId,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(true);
    });

    it('❌ User不能修改共享患者（即使可以查看）', () => {
      const result = canModifyPatient({
        patientId: testPatients.patient3.id,
        userId: testUsers.user1.id,
        userRole: 'user',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient3.createdBy,
        patientOrgId: testPatients.patient3.organizationId,
      });

      expect(result).toBe(false);
    });
  });

  describe('患者删除权限 (canDeletePatient)', () => {
    it('✅ Admin可以删除所有患者', () => {
      const result = canDeletePatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.admin.id,
        userRole: 'admin',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(true);
    });

    it('✅ 创建者Doctor可以删除自己创建的患者', () => {
      const result = canDeletePatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.doctor1.id,
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(true);
    });

    it('❌ Nurse不能删除患者（即使同组织）', () => {
      const result = canDeletePatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.nurse1.id,
        userRole: 'nurse',
        userOrgId: testUsers.nurse1.organizationId,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
      });

      expect(result).toBe(false);
    });

    it('❌ 非创建者Doctor不能删除他人患者', () => {
      const result = canDeletePatient({
        patientId: testPatients.patient2.id,
        userId: testUsers.doctor1.id,
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId,
        patientCreatedBy: testPatients.patient2.createdBy, // doctor2创建
        patientOrgId: testPatients.patient2.organizationId,
      });

      expect(result).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('无organizationId的个人患者只能创建者访问', () => {
      // doctor1创建的个人患者
      const creatorAccess = canAccessPatient({
        patientId: testPatients.patient4.id,
        userId: testUsers.doctor1.id,
        userRole: 'doctor',
        userOrgId: testUsers.doctor1.organizationId,
        patientCreatedBy: testPatients.patient4.createdBy,
        patientOrgId: null, // 无组织
        patientSharedWith: [],
      });

      // doctor2不能访问
      const otherDoctorAccess = canAccessPatient({
        patientId: testPatients.patient4.id,
        userId: testUsers.doctor2.id,
        userRole: 'doctor',
        userOrgId: testUsers.doctor2.organizationId,
        patientCreatedBy: testPatients.patient4.createdBy,
        patientOrgId: null,
        patientSharedWith: [],
      });

      expect(creatorAccess).toBe(true);
      expect(otherDoctorAccess).toBe(false);
    });

    it('sharedWith为空数组时普通用户无法访问', () => {
      const result = canAccessPatient({
        patientId: testPatients.patient1.id,
        userId: testUsers.user1.id,
        userRole: 'user',
        userOrgId: undefined,
        patientCreatedBy: testPatients.patient1.createdBy,
        patientOrgId: testPatients.patient1.organizationId,
        patientSharedWith: [], // 空数组
      });

      expect(result).toBe(false);
    });
  });
});
