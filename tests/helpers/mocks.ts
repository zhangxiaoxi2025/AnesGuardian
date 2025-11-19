/**
 * Mock辅助函数
 */
import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';

/**
 * Mock Supabase认证
 */
export function mockSupabaseAuth(userId: string, email: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: email,
            user_metadata: { display_name: 'Test User' },
          } as User,
        },
        error: null,
      }),
    },
  };
}

/**
 * Mock Supabase认证失败
 */
export function mockSupabaseAuthFailure(errorMessage: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: errorMessage },
      }),
    },
  };
}

/**
 * Mock Express Request对象
 */
export function mockRequest(options: {
  user?: any;
  params?: Record<string, string>;
  body?: Record<string, any>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}): Partial<Request> {
  return {
    user: options.user,
    params: options.params || {},
    body: options.body || {},
    headers: options.headers || {},
    query: options.query || {},
  } as Partial<Request>;
}

/**
 * Mock Express Response对象
 */
export function mockResponse(): Partial<Response> {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Mock Express NextFunction
 */
export function mockNext(): NextFunction {
  return vi.fn();
}

/**
 * Mock数据库查询结果
 */
export function mockDatabaseQuery<T>(result: T[]) {
  return vi.fn().mockResolvedValue(result);
}

/**
 * Mock数据库插入结果
 */
export function mockDatabaseInsert<T>(result: T) {
  return vi.fn().mockResolvedValue([result]);
}

/**
 * Mock数据库更新结果
 */
export function mockDatabaseUpdate<T>(result: T) {
  return vi.fn().mockResolvedValue([result]);
}

/**
 * Mock数据库删除结果
 */
export function mockDatabaseDelete() {
  return vi.fn().mockResolvedValue({ rowCount: 1 });
}

/**
 * Mock缓存
 */
export function mockCache() {
  const cache = new Map<string, any>();
  return {
    get: vi.fn((key: any) => cache.get(JSON.stringify(key))),
    set: vi.fn((key: any, value: any) => cache.set(JSON.stringify(key), value)),
    delete: vi.fn((key: any) => cache.delete(JSON.stringify(key))),
    clear: vi.fn(() => cache.clear()),
    invalidateUser: vi.fn(() => cache.clear()),
    invalidateResource: vi.fn(() => cache.clear()),
  };
}

/**
 * Mock审计日志
 */
export function mockAuditLogger() {
  return {
    log: vi.fn(),
    logAuth: vi.fn(),
    logPermissionCheck: vi.fn(),
    logDataAccess: vi.fn(),
    logSensitiveOperation: vi.fn(),
    query: vi.fn().mockReturnValue([]),
    getStatistics: vi.fn().mockReturnValue({
      totalLogs: 0,
      successCount: 0,
      failureCount: 0,
    }),
  };
}

/**
 * 等待异步操作完成
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 捕获异步错误
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  errorClass: any,
  errorMessage?: string
) {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (!(error instanceof errorClass)) {
      throw new Error(
        `Expected error to be instance of ${errorClass.name}, but got ${error.constructor.name}`
      );
    }
    if (errorMessage && error.message !== errorMessage) {
      throw new Error(
        `Expected error message to be "${errorMessage}", but got "${error.message}"`
      );
    }
  }
}
