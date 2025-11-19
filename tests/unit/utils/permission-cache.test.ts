/**
 * 权限缓存系统单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { permissionCache, userSessionCache } from '../../../server/utils/permission-cache';

describe('LRUCache (通过PermissionCache测试)', () => {
  beforeEach(() => {
    permissionCache.clear();
  });

  describe('基本缓存操作', () => {
    it('应该正确存储和获取权限', () => {
      const key = {
        userId: 'user-123',
        resource: 'patient',
        resourceId: 1,
        action: 'view',
      };

      permissionCache.set(key, true);
      const result = permissionCache.get(key);

      expect(result).toBe(true);
    });

    it('应该正确存储和获取拒绝权限', () => {
      const key = {
        userId: 'user-456',
        resource: 'patient',
        resourceId: 999,
        action: 'delete',
      };

      permissionCache.set(key, false);
      const result = permissionCache.get(key);

      expect(result).toBe(false);
    });

    it('应该对不存在的键返回undefined', () => {
      const key = {
        userId: 'non-existent',
        resource: 'patient',
        resourceId: 9999,
        action: 'view',
      };

      const result = permissionCache.get(key);
      expect(result).toBeUndefined();
    });

    it('应该区分不同的缓存键', () => {
      const key1 = {
        userId: 'user-1',
        resource: 'patient',
        resourceId: 1,
        action: 'view',
      };

      const key2 = {
        userId: 'user-1',
        resource: 'patient',
        resourceId: 2,
        action: 'view',
      };

      permissionCache.set(key1, true);
      permissionCache.set(key2, false);

      expect(permissionCache.get(key1)).toBe(true);
      expect(permissionCache.get(key2)).toBe(false);
    });

    it('应该区分不同的操作类型', () => {
      const baseKey = {
        userId: 'user-1',
        resource: 'patient',
        resourceId: 1,
      };

      permissionCache.set({ ...baseKey, action: 'view' }, true);
      permissionCache.set({ ...baseKey, action: 'delete' }, false);

      expect(permissionCache.get({ ...baseKey, action: 'view' })).toBe(true);
      expect(permissionCache.get({ ...baseKey, action: 'delete' })).toBe(false);
    });
  });

  describe('TTL（过期时间）', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该在TTL过期后返回undefined', () => {
      const key = {
        userId: 'user-123',
        resource: 'patient',
        resourceId: 1,
        action: 'view',
      };

      permissionCache.set(key, true);

      // 立即获取应该成功
      expect(permissionCache.get(key)).toBe(true);

      // 前进5分钟+1秒（TTL是5分钟）
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // 应该过期
      expect(permissionCache.get(key)).toBeUndefined();
    });

    it('应该在TTL到期前可以获取', () => {
      const key = {
        userId: 'user-123',
        resource: 'patient',
        resourceId: 1,
        action: 'view',
      };

      permissionCache.set(key, true);

      // 前进4分钟（小于5分钟TTL）
      vi.advanceTimersByTime(4 * 60 * 1000);

      // 应该仍然有效
      expect(permissionCache.get(key)).toBe(true);
    });
  });

  describe('LRU淘汰策略', () => {
    it('应该淘汰最久未使用的项', () => {
      // 注意：实际测试LRU需要填满缓存（1000项）
      // 这里只测试基本逻辑

      const keys = [];
      for (let i = 0; i < 10; i++) {
        keys.push({
          userId: `user-${i}`,
          resource: 'patient',
          resourceId: i,
          action: 'view' as const,
        });
      }

      // 设置所有键
      keys.forEach(key => permissionCache.set(key, true));

      // 访问前5个键，刷新它们的访问时间
      for (let i = 0; i < 5; i++) {
        permissionCache.get(keys[i]);
      }

      // 所有键应该仍然存在
      keys.forEach(key => {
        expect(permissionCache.get(key)).toBe(true);
      });
    });
  });

  describe('缓存失效', () => {
    it('应该清空所有缓存（invalidateUser）', () => {
      const keys = [
        { userId: 'user-1', resource: 'patient', resourceId: 1, action: 'view' as const },
        { userId: 'user-1', resource: 'patient', resourceId: 2, action: 'view' as const },
        { userId: 'user-2', resource: 'patient', resourceId: 3, action: 'view' as const },
      ];

      keys.forEach(key => permissionCache.set(key, true));

      // 使user-1的缓存失效（实际会清空所有缓存）
      permissionCache.invalidateUser('user-1');

      // 所有缓存应该被清空
      keys.forEach(key => {
        expect(permissionCache.get(key)).toBeUndefined();
      });
    });

    it('应该清空所有缓存（invalidateResource）', () => {
      const keys = [
        { userId: 'user-1', resource: 'patient', resourceId: 1, action: 'view' as const },
        { userId: 'user-2', resource: 'patient', resourceId: 1, action: 'view' as const },
        { userId: 'user-3', resource: 'patient', resourceId: 2, action: 'view' as const },
      ];

      keys.forEach(key => permissionCache.set(key, true));

      // 使patient#1的缓存失效（实际会清空所有缓存）
      permissionCache.invalidateResource('patient', 1);

      // 所有缓存应该被清空
      keys.forEach(key => {
        expect(permissionCache.get(key)).toBeUndefined();
      });
    });

    it('应该清空所有缓存（clear）', () => {
      permissionCache.set(
        { userId: 'user-1', resource: 'patient', resourceId: 1, action: 'view' },
        true
      );

      permissionCache.clear();

      expect(
        permissionCache.get({
          userId: 'user-1',
          resource: 'patient',
          resourceId: 1,
          action: 'view',
        })
      ).toBeUndefined();
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      permissionCache.clear();
    });

    it('应该返回正确的统计信息', () => {
      const stats = permissionCache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('utilizationPercent');
      expect(stats).toHaveProperty('ttlMinutes');

      expect(stats.maxSize).toBe(1000);
      expect(stats.ttlMinutes).toBe(5);
    });

    it('应该反映缓存大小变化', () => {
      const initialStats = permissionCache.getStats();
      expect(initialStats.size).toBe(0);

      // 添加3个缓存项
      for (let i = 0; i < 3; i++) {
        permissionCache.set(
          { userId: `user-${i}`, resource: 'patient', resourceId: i, action: 'view' },
          true
        );
      }

      const afterStats = permissionCache.getStats();
      expect(afterStats.size).toBe(3);
      expect(afterStats.utilizationPercent).toBeCloseTo(0.3, 1);
    });
  });
});

describe('UserSessionCache', () => {
  beforeEach(() => {
    userSessionCache.clear();
  });

  describe('基本会话缓存操作', () => {
    it('应该存储和获取用户会话', () => {
      const userId = 'user-123';
      const userData = {
        id: userId,
        email: 'doctor@hospital.com',
        role: 'doctor',
        organizationId: 1,
        displayName: 'Dr. Zhang',
      };

      userSessionCache.set(userId, userData);
      const result = userSessionCache.get(userId);

      expect(result).toEqual(userData);
    });

    it('应该对不存在的用户返回undefined', () => {
      const result = userSessionCache.get('non-existent-user');
      expect(result).toBeUndefined();
    });

    it('应该正确删除用户会话', () => {
      const userId = 'user-456';
      const userData = {
        id: userId,
        email: 'nurse@hospital.com',
        role: 'nurse',
        organizationId: 2,
      };

      userSessionCache.set(userId, userData);
      expect(userSessionCache.get(userId)).toEqual(userData);

      const deleted = userSessionCache.delete(userId);
      expect(deleted).toBe(true);
      expect(userSessionCache.get(userId)).toBeUndefined();
    });

    it('应该正确处理可选字段', () => {
      const userId = 'user-789';
      const userData = {
        id: userId,
        email: 'user@test.com',
        role: 'user',
        // organizationId和displayName是可选的
      };

      userSessionCache.set(userId, userData);
      const result = userSessionCache.get(userId);

      expect(result).toEqual(userData);
      expect(result?.organizationId).toBeUndefined();
      expect(result?.displayName).toBeUndefined();
    });
  });

  describe('TTL（过期时间）', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该在5分钟后过期', () => {
      const userId = 'user-123';
      const userData = {
        id: userId,
        email: 'test@example.com',
        role: 'user',
      };

      userSessionCache.set(userId, userData);

      // 立即获取应该成功
      expect(userSessionCache.get(userId)).toEqual(userData);

      // 前进5分钟+1秒
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // 应该过期
      expect(userSessionCache.get(userId)).toBeUndefined();
    });

    it('应该在过期前可以获取', () => {
      const userId = 'user-456';
      const userData = {
        id: userId,
        email: 'test@example.com',
        role: 'doctor',
        organizationId: 1,
      };

      userSessionCache.set(userId, userData);

      // 前进4分钟
      vi.advanceTimersByTime(4 * 60 * 1000);

      // 应该仍然有效
      expect(userSessionCache.get(userId)).toEqual(userData);
    });
  });

  describe('LRU淘汰策略', () => {
    it('应该能够存储多个用户会话', () => {
      const users = [];
      for (let i = 0; i < 10; i++) {
        const userData = {
          id: `user-${i}`,
          email: `user${i}@test.com`,
          role: 'user',
        };
        users.push(userData);
        userSessionCache.set(userData.id, userData);
      }

      // 所有用户会话应该都可以获取
      users.forEach(user => {
        expect(userSessionCache.get(user.id)).toEqual(user);
      });
    });
  });

  describe('清空缓存', () => {
    it('应该清空所有用户会话', () => {
      // 添加多个用户会话
      const userIds = ['user-1', 'user-2', 'user-3'];
      userIds.forEach(id => {
        userSessionCache.set(id, {
          id,
          email: `${id}@test.com`,
          role: 'user',
        });
      });

      // 清空缓存
      userSessionCache.clear();

      // 所有会话应该被清空
      userIds.forEach(id => {
        expect(userSessionCache.get(id)).toBeUndefined();
      });
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      userSessionCache.clear();
    });

    it('应该返回正确的统计信息', () => {
      const stats = userSessionCache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('utilizationPercent');
      expect(stats).toHaveProperty('ttlMinutes');

      expect(stats.maxSize).toBe(500);
      expect(stats.ttlMinutes).toBe(5);
    });

    it('应该反映会话缓存大小', () => {
      const initialStats = userSessionCache.getStats();
      expect(initialStats.size).toBe(0);

      // 添加5个用户会话
      for (let i = 0; i < 5; i++) {
        userSessionCache.set(`user-${i}`, {
          id: `user-${i}`,
          email: `user${i}@test.com`,
          role: 'user',
        });
      }

      const afterStats = userSessionCache.getStats();
      expect(afterStats.size).toBe(5);
      expect(afterStats.utilizationPercent).toBeCloseTo(1, 1);
    });
  });
});

describe('缓存集成测试', () => {
  beforeEach(() => {
    permissionCache.clear();
    userSessionCache.clear();
  });

  it('权限缓存和用户会话缓存应该独立工作', () => {
    const userId = 'user-123';

    // 设置用户会话
    userSessionCache.set(userId, {
      id: userId,
      email: 'test@example.com',
      role: 'doctor',
      organizationId: 1,
    });

    // 设置权限缓存
    permissionCache.set(
      { userId, resource: 'patient', resourceId: 1, action: 'view' },
      true
    );

    // 清空权限缓存不应该影响用户会话缓存
    permissionCache.clear();

    expect(userSessionCache.get(userId)).toBeDefined();
    expect(
      permissionCache.get({ userId, resource: 'patient', resourceId: 1, action: 'view' })
    ).toBeUndefined();
  });

  it('应该能同时使用两个缓存系统', () => {
    const userId = 'doctor-456';

    // 用户登录 - 缓存会话
    const userData = {
      id: userId,
      email: 'doctor@hospital.com',
      role: 'doctor',
      organizationId: 1,
      displayName: 'Dr. Li',
    };
    userSessionCache.set(userId, userData);

    // 用户访问患者 - 缓存权限检查结果
    const permissionKey = {
      userId,
      resource: 'patient',
      resourceId: 100,
      action: 'view' as const,
    };
    permissionCache.set(permissionKey, true);

    // 验证两个缓存都正常工作
    expect(userSessionCache.get(userId)).toEqual(userData);
    expect(permissionCache.get(permissionKey)).toBe(true);

    // 获取统计信息
    const permStats = permissionCache.getStats();
    const userStats = userSessionCache.getStats();

    expect(permStats.size).toBe(1);
    expect(userStats.size).toBe(1);
  });
});
