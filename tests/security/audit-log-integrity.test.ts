/**
 * 审计日志完整性测试
 * 验证所有关键操作都被正确记录
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditLogger } from '../../../server/utils/audit-logger';
import { testUsers } from '../../helpers/test-data';

describe('审计日志完整性测试', () => {
  beforeEach(() => {
    auditLogger['logs'] = [];
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('认证事件记录', () => {
    it('成功登录被记录', () => {
      auditLogger.logAuth({
        userId: testUsers.doctor1.id,
        userEmail: testUsers.doctor1.email,
        action: 'login',
        status: 'success',
        ipAddress: '192.168.1.100',
      });

      const logs = auditLogger.query({ action: 'login' });
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('success');
      expect(logs[0].userId).toBe(testUsers.doctor1.id);
    });

    it('失败登录被记录', () => {
      auditLogger.logAuth({
        userId: 'unknown',
        userEmail: 'hacker@evil.com',
        action: 'login',
        status: 'failure',
        errorMessage: 'Invalid credentials',
      });

      const logs = auditLogger.query({ status: 'failure' });
      expect(logs).toHaveLength(1);
      expect(logs[0].errorMessage).toBe('Invalid credentials');
    });
  });

  describe('数据访问记录', () => {
    it('患者查看被记录', () => {
      auditLogger.logDataAccess({
        userId: testUsers.doctor1.id,
        userEmail: testUsers.doctor1.email,
        userRole: 'doctor',
        action: 'view',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
      });

      const logs = auditLogger.query({ action: 'view', resource: 'patient' });
      expect(logs).toHaveLength(1);
      expect(logs[0].resourceId).toBe(1);
    });

    it('权限拒绝被记录', () => {
      auditLogger.logPermissionCheck({
        userId: testUsers.user1.id,
        userEmail: testUsers.user1.email,
        userRole: 'user',
        action: 'delete',
        resource: 'patient',
        resourceId: 1,
        status: 'failure',
        reason: 'No delete permission',
      });

      const logs = auditLogger.query({ status: 'failure' });
      expect(logs).toHaveLength(1);
      expect(logs[0].errorMessage).toBe('No delete permission');
    });
  });

  describe('敏感操作记录', () => {
    it('患者删除被记录', () => {
      auditLogger.logSensitiveOperation({
        userId: testUsers.admin.id,
        userEmail: testUsers.admin.email,
        userRole: 'admin',
        action: 'delete',
        resource: 'patient',
        resourceId: 999,
        status: 'success',
        details: {
          patientName: '测试患者',
          deletedAt: new Date().toISOString(),
        },
      });

      const logs = auditLogger.query({ action: 'delete' });
      expect(logs).toHaveLength(1);
      expect(logs[0].details?.sensitive).toBe(true);
      expect(logs[0].details?.patientName).toBe('测试患者');
    });

    it('患者共享被记录', () => {
      auditLogger.logSensitiveOperation({
        userId: testUsers.doctor1.id,
        userEmail: testUsers.doctor1.email,
        userRole: 'doctor',
        action: 'share',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
        details: {
          sharedWithUserId: testUsers.user1.id,
          sharedAt: new Date().toISOString(),
        },
      });

      const logs = auditLogger.query({ action: 'share' });
      expect(logs).toHaveLength(1);
      expect(logs[0].details?.sharedWithUserId).toBe(testUsers.user1.id);
    });
  });

  describe('审计日志必需字段', () => {
    it('所有日志包含关键上下文', () => {
      // 记录多种类型的操作
      auditLogger.logAuth({
        userId: testUsers.doctor1.id,
        userEmail: testUsers.doctor1.email,
        action: 'login',
        status: 'success',
      });

      auditLogger.logDataAccess({
        userId: testUsers.nurse1.id,
        userEmail: testUsers.nurse1.email,
        userRole: 'nurse',
        action: 'view',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
      });

      auditLogger.logSensitiveOperation({
        userId: testUsers.admin.id,
        userEmail: testUsers.admin.email,
        userRole: 'admin',
        action: 'delete',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
        details: {},
      });

      const allLogs = auditLogger.query({});

      // 验证所有日志包含必需字段
      allLogs.forEach(log => {
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.userId).toBeTruthy();
        expect(log.userEmail).toBeTruthy();
        expect(log.action).toBeTruthy();
        expect(log.resource).toBeTruthy();
        expect(log.status).toMatch(/^(success|failure)$/);
      });
    });
  });

  describe('日志查询功能', () => {
    beforeEach(() => {
      // 准备测试数据
      for (let i = 0; i < 10; i++) {
        auditLogger.logDataAccess({
          userId: i % 2 === 0 ? testUsers.doctor1.id : testUsers.nurse1.id,
          userEmail: i % 2 === 0 ? testUsers.doctor1.email : testUsers.nurse1.email,
          userRole: i % 2 === 0 ? 'doctor' : 'nurse',
          action: i % 3 === 0 ? 'create' : 'view',
          resource: 'patient',
          resourceId: i,
          status: i % 4 === 0 ? 'failure' : 'success',
        });
      }
    });

    it('按userId过滤', () => {
      const logs = auditLogger.query({ userId: testUsers.doctor1.id });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.userId === testUsers.doctor1.id)).toBe(true);
    });

    it('按action过滤', () => {
      const logs = auditLogger.query({ action: 'create' });
      expect(logs.every(log => log.action === 'create')).toBe(true);
    });

    it('按status过滤', () => {
      const logs = auditLogger.query({ status: 'failure' });
      expect(logs.every(log => log.status === 'failure')).toBe(true);
    });

    it('限制返回数量', () => {
      const logs = auditLogger.query({ limit: 5 });
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });
});
