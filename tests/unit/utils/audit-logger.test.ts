/**
 * 审计日志系统单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditLogger } from '../../../server/utils/audit-logger';
import type { AuditLogEntry } from '../../../server/utils/audit-logger';

describe('AuditLogger', () => {
  beforeEach(() => {
    // 清空日志
    auditLogger['logs'] = [];
    // 模拟console.log避免测试输出污染
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('log()', () => {
    it('应该记录基本审计日志', () => {
      auditLogger.log({
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'doctor',
        action: 'create',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
      });

      const logs = auditLogger.query({});
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'create',
        resource: 'patient',
        status: 'success',
      });
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('应该限制内存中日志数量', () => {
      const maxLogs = auditLogger['maxLogs'];

      // 插入超过最大值的日志
      for (let i = 0; i < maxLogs + 100; i++) {
        auditLogger.log({
          userId: `user-${i}`,
          userEmail: `test${i}@example.com`,
          userRole: 'user',
          action: 'read',
          resource: 'patient',
          status: 'success',
        });
      }

      const logs = auditLogger.query({});
      expect(logs.length).toBeLessThanOrEqual(maxLogs);
    });

    it('应该在生产环境输出JSON格式日志', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleSpy = vi.spyOn(console, 'log');

      auditLogger.log({
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'admin',
        action: 'delete',
        resource: 'patient',
        resourceId: 999,
        status: 'success',
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(logCall)).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logAuth()', () => {
    it('应该记录登录成功事件', () => {
      auditLogger.logAuth({
        userId: 'user-123',
        userEmail: 'doctor@hospital.com',
        action: 'login',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = auditLogger.query({ resource: 'authentication' });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: 'user-123',
        action: 'login',
        resource: 'authentication',
        status: 'success',
      });
    });

    it('应该记录认证失败事件', () => {
      auditLogger.logAuth({
        userId: 'user-456',
        userEmail: 'hacker@evil.com',
        action: 'auth_failure',
        status: 'failure',
        errorMessage: 'Invalid credentials',
      });

      const logs = auditLogger.query({ status: 'failure' });
      expect(logs).toHaveLength(1);
      expect(logs[0].errorMessage).toBe('Invalid credentials');
    });
  });

  describe('logPermissionCheck()', () => {
    it('应该记录权限检查失败', () => {
      auditLogger.logPermissionCheck({
        userId: 'nurse-123',
        userEmail: 'nurse@hospital.com',
        userRole: 'nurse',
        action: 'delete',
        resource: 'patient',
        resourceId: 999,
        status: 'failure',
        reason: 'No delete permission',
      });

      const logs = auditLogger.query({ action: 'delete' });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        status: 'failure',
        errorMessage: 'No delete permission',
      });
    });

    it('应该记录权限检查成功', () => {
      auditLogger.logPermissionCheck({
        userId: 'admin-123',
        userEmail: 'admin@hospital.com',
        userRole: 'admin',
        action: 'view',
        resource: 'patient',
        resourceId: 1,
        status: 'success',
      });

      const logs = auditLogger.query({ status: 'success' });
      expect(logs).toHaveLength(1);
    });
  });

  describe('logDataAccess()', () => {
    it('应该记录数据访问事件', () => {
      const actions = ['view', 'create', 'update', 'delete', 'share'] as const;

      actions.forEach((action, index) => {
        auditLogger.logDataAccess({
          userId: 'doctor-123',
          userEmail: 'doctor@hospital.com',
          userRole: 'doctor',
          action,
          resource: 'patient',
          resourceId: index + 1,
          status: 'success',
        });
      });

      const logs = auditLogger.query({ userId: 'doctor-123' });
      expect(logs).toHaveLength(5);
      // 验证所有action都存在（不依赖顺序，因为时间戳可能相同）
      const logActions = logs.map(l => l.action);
      expect(logActions).toContain('view');
      expect(logActions).toContain('create');
      expect(logActions).toContain('update');
      expect(logActions).toContain('delete');
      expect(logActions).toContain('share');
    });
  });

  describe('logSensitiveOperation()', () => {
    it('应该记录敏感操作并标记', () => {
      auditLogger.logSensitiveOperation({
        userId: 'admin-123',
        userEmail: 'admin@hospital.com',
        userRole: 'admin',
        action: 'delete',
        resource: 'patient',
        resourceId: 999,
        status: 'success',
        details: {
          patientName: '张三',
          patientAge: 45,
          deletedAt: '2025-11-11T12:00:00Z',
        },
      });

      const logs = auditLogger.query({});
      expect(logs[0].details).toMatchObject({
        sensitive: true,
        patientName: '张三',
        patientAge: 45,
      });
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      // 准备测试数据
      const testLogs: Omit<AuditLogEntry, 'timestamp'>[] = [
        {
          userId: 'user-1',
          userEmail: 'user1@test.com',
          userRole: 'doctor',
          action: 'create',
          resource: 'patient',
          resourceId: 1,
          status: 'success',
        },
        {
          userId: 'user-2',
          userEmail: 'user2@test.com',
          userRole: 'nurse',
          action: 'view',
          resource: 'patient',
          resourceId: 2,
          status: 'success',
        },
        {
          userId: 'user-1',
          userEmail: 'user1@test.com',
          userRole: 'doctor',
          action: 'delete',
          resource: 'patient',
          resourceId: 1,
          status: 'failure',
          errorMessage: 'Permission denied',
        },
      ];

      testLogs.forEach(log => auditLogger.log(log));
    });

    it('应该按userId过滤日志', () => {
      const logs = auditLogger.query({ userId: 'user-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every(l => l.userId === 'user-1')).toBe(true);
    });

    it('应该按action过滤日志', () => {
      const logs = auditLogger.query({ action: 'view' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('view');
    });

    it('应该按resource过滤日志', () => {
      const logs = auditLogger.query({ resource: 'patient' });
      expect(logs).toHaveLength(3);
    });

    it('应该按status过滤日志', () => {
      const logs = auditLogger.query({ status: 'failure' });
      expect(logs).toHaveLength(1);
      expect(logs[0].errorMessage).toBe('Permission denied');
    });

    it('应该按时间范围过滤日志', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const logs = auditLogger.query({
        startTime: oneHourAgo,
        endTime: now,
      });

      expect(logs).toHaveLength(3);
    });

    it('应该限制返回数量', () => {
      const logs = auditLogger.query({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    it('应该按时间倒序排列（最新的在前）', async () => {
      // 插入第一个日志
      auditLogger.log({
        userId: 'user-1', userEmail: 'user1@test.com', userRole: 'doctor',
        action: 'create', resource: 'patient', resourceId: 1, status: 'success',
      });

      // 等待1ms确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 2));

      // 插入第二个日志
      auditLogger.log({
        userId: 'user-2', userEmail: 'user2@test.com', userRole: 'nurse',
        action: 'view', resource: 'patient', resourceId: 2, status: 'success',
      });

      // 等待1ms
      await new Promise(resolve => setTimeout(resolve, 2));

      // 插入第三个日志
      auditLogger.log({
        userId: 'user-1', userEmail: 'user1@test.com', userRole: 'doctor',
        action: 'delete', resource: 'patient', resourceId: 1, status: 'failure',
        errorMessage: 'Permission denied',
      });

      const logs = auditLogger.query({});
      expect(logs[0].action).toBe('delete'); // 最后插入的
      expect(logs[2].action).toBe('create'); // 最先插入的
    });
  });

  describe('getStatistics()', () => {
    beforeEach(() => {
      // 插入测试数据
      for (let i = 0; i < 10; i++) {
        auditLogger.log({
          userId: `user-${i % 3}`,
          userEmail: `user${i % 3}@test.com`,
          userRole: 'doctor',
          action: i % 2 === 0 ? 'create' : 'view',
          resource: i % 3 === 0 ? 'patient' : 'assessment',
          status: i % 4 === 0 ? 'failure' : 'success',
        });
      }
    });

    it('应该统计总日志数', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.totalLogs).toBe(10);
    });

    it('应该统计成功和失败次数', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.successCount).toBeGreaterThan(0);
      expect(stats.failureCount).toBeGreaterThan(0);
      expect(stats.successCount + stats.failureCount).toBe(10);
    });

    it('应该按操作类型统计', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.byAction['create']).toBeGreaterThan(0);
      expect(stats.byAction['view']).toBeGreaterThan(0);
    });

    it('应该按资源类型统计', () => {
      const stats = auditLogger.getStatistics();
      expect(stats.byResource['patient']).toBeGreaterThan(0);
      expect(stats.byResource['assessment']).toBeGreaterThan(0);
    });

    it('应该按用户统计', () => {
      const stats = auditLogger.getStatistics();
      expect(Object.keys(stats.byUser).length).toBeGreaterThan(0);
    });

    it('应该支持时间范围统计', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const stats = auditLogger.getStatistics({
        start: oneMinuteAgo,
        end: now,
      });

      expect(stats.totalLogs).toBe(10);
    });
  });

  describe('clearOldLogs()', () => {
    it('应该清除超过指定天数的日志', () => {
      // 插入旧日志
      const oldTimestamp = new Date();
      oldTimestamp.setDate(oldTimestamp.getDate() - 40); // 40天前

      auditLogger.log({
        userId: 'old-user',
        userEmail: 'old@test.com',
        userRole: 'user',
        action: 'view',
        resource: 'patient',
        status: 'success',
      });

      // 修改时间戳（手动模拟旧日志）
      if (auditLogger['logs'].length > 0) {
        auditLogger['logs'][0].timestamp = oldTimestamp;
      }

      // 插入新日志
      auditLogger.log({
        userId: 'new-user',
        userEmail: 'new@test.com',
        userRole: 'user',
        action: 'view',
        resource: 'patient',
        status: 'success',
      });

      // 清理30天前的日志
      const removed = auditLogger.clearOldLogs(30);

      expect(removed).toBe(1);
      const logs = auditLogger.query({});
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('new-user');
    });

    it('应该保留指定天数内的日志', () => {
      auditLogger.log({
        userId: 'recent-user',
        userEmail: 'recent@test.com',
        userRole: 'user',
        action: 'view',
        resource: 'patient',
        status: 'success',
      });

      const removed = auditLogger.clearOldLogs(30);
      expect(removed).toBe(0);
      expect(auditLogger.query({})).toHaveLength(1);
    });
  });
});
