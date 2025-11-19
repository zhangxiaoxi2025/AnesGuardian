/**
 * 认证流程集成测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticate } from '../../../server/middleware/auth';
import { mockRequest, mockResponse, mockNext, mockSupabaseAuth, mockSupabaseAuthFailure } from '../../helpers/mocks';
import { testUsers } from '../../helpers/test-data';
import { UnauthorizedError } from '../../../server/utils/errors';
import { userSessionCache } from '../../../server/utils/permission-cache';

// Mock Supabase client
vi.mock('../../../server/db', () => ({
  createClient: vi.fn(),
}));

// Mock数据库
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
};

vi.mock('../../../server/db', () => ({
  db: mockDb,
}));

describe('认证流程集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userSessionCache.clear();
    process.env.NODE_ENV = 'test';
  });

  describe('完整认证流程', () => {
    it('有效JWT → Supabase验证 → 数据库查询 → 附加req.user', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer valid-token' },
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      // Mock Supabase验证成功
      const supabase = mockSupabaseAuth(testUsers.doctor1.id, testUsers.doctor1.email);
      vi.mock('@supabase/supabase-js', () => ({
        createClient: () => supabase,
      }));

      // Mock数据库返回用户
      mockDb.limit.mockResolvedValueOnce([{
        id: testUsers.doctor1.id,
        email: testUsers.doctor1.email,
        role: testUsers.doctor1.role,
        organizationId: testUsers.doctor1.organizationId,
        displayName: testUsers.doctor1.displayName,
      }]);

      // Mock更新lastLoginAt
      mockDb.returning.mockResolvedValueOnce([{
        ...testUsers.doctor1,
        lastLoginAt: new Date(),
      }]);

      await authenticate(req, res, next);

      // 验证req.user被设置
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUsers.doctor1.id);
      expect(req.user.email).toBe(testUsers.doctor1.email);
      expect(req.user.role).toBe('doctor');
      expect(next).toHaveBeenCalled();
    });

    it('首次登录 → 自动创建users记录 → 返回默认角色', async () => {
      const newUserId = 'uuid-new-user-123';
      const newUserEmail = 'newuser@test.com';

      const req = mockRequest({
        headers: { authorization: 'Bearer new-user-token' },
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      // Mock Supabase验证成功
      const supabase = mockSupabaseAuth(newUserId, newUserEmail);
      vi.mock('@supabase/supabase-js', () => ({
        createClient: () => supabase,
      }));

      // Mock数据库查询返回空（用户不存在）
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock插入新用户
      mockDb.returning.mockResolvedValueOnce([{
        id: newUserId,
        email: newUserEmail,
        role: 'user', // 默认角色
        organizationId: null,
        displayName: null,
      }]);

      await authenticate(req, res, next);

      // 验证自动创建用户
      expect(mockDb.insert).toHaveBeenCalled();
      expect(req.user.role).toBe('user');
      expect(next).toHaveBeenCalled();
    });

    it('数据库故障 → 降级策略 → 返回基本用户信息', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer valid-token' },
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      // Mock Supabase验证成功
      const supabase = mockSupabaseAuth(testUsers.user1.id, testUsers.user1.email);
      vi.mock('@supabase/supabase-js', () => ({
        createClient: () => supabase,
      }));

      // Mock数据库查询失败
      mockDb.limit.mockRejectedValueOnce(new Error('Database connection failed'));

      await authenticate(req, res, next);

      // 验证降级策略生效：返回基本信息
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUsers.user1.id);
      expect(req.user.email).toBe(testUsers.user1.email);
      expect(req.user.role).toBe('user'); // 降级默认角色
      expect(next).toHaveBeenCalled();
    });

    it('用户会话缓存命中 → 跳过数据库查询', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer cached-user-token' },
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      // 预先设置缓存
      userSessionCache.set(testUsers.doctor1.id, testUsers.doctor1);

      // Mock Supabase验证成功
      const supabase = mockSupabaseAuth(testUsers.doctor1.id, testUsers.doctor1.email);
      vi.mock('@supabase/supabase-js', () => ({
        createClient: () => supabase,
      }));

      await authenticate(req, res, next);

      // 验证缓存命中，数据库查询未被调用
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(req.user.id).toBe(testUsers.doctor1.id);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('认证失败场景', () => {
    it('无Token → 401 Unauthorized', async () => {
      const req = mockRequest({
        headers: {}, // 无Authorization header
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      await expect(authenticate(req, res, next)).rejects.toThrow(UnauthorizedError);
      await expect(authenticate(req, res, next)).rejects.toThrow('缺少认证令牌');
    });

    it('过期Token → 401 Unauthorized', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer expired-token' },
      }) as any;
      const res = mockResponse() as any;
      const next = mockNext();

      // Mock Supabase验证失败（过期Token）
      const supabase = mockSupabaseAuthFailure('Token has expired');
      vi.mock('@supabase/supabase-js', () => ({
        createClient: () => supabase,
      }));

      await expect(authenticate(req, res, next)).rejects.toThrow(UnauthorizedError);
      await expect(authenticate(req, res, next)).rejects.toThrow('认证失败');
    });
  });
});
