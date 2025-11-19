/**
 * Vitest测试环境配置
 */
import { beforeAll, afterAll, afterEach } from 'vitest';

// 模拟环境变量
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
});

// 清理定时器
afterAll(() => {
  // 清理所有定时器
  vi.clearAllTimers();
});

afterEach(() => {
  // 清理模拟
  vi.clearAllMocks();
});
