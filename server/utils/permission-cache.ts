/**
 * 权限结果缓存系统
 * 使用LRU（Least Recently Used）缓存策略
 * 减少数据库查询，提高权限检查性能
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttlMinutes: number = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU: 重新插入到最后（更新访问时间）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T): void {
    // 如果已存在，先删除（更新位置）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果达到最大容量，删除最旧的项（第一个）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // 插入新项
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期项
   */
  cleanExpired(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    ttlMinutes: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      ttlMinutes: this.ttl / (60 * 1000),
    };
  }
}

/**
 * 权限检查结果缓存
 */
interface PermissionCacheKey {
  userId: string;
  resource: string;
  resourceId: string | number;
  action: string;
}

class PermissionCache {
  private cache: LRUCache<boolean>;

  constructor() {
    // 最多缓存1000个权限检查结果，有效期5分钟
    this.cache = new LRUCache<boolean>(1000, 5);

    // 定期清理过期项（每分钟）
    setInterval(() => {
      const removed = this.cache.cleanExpired();
      if (removed > 0 && process.env.NODE_ENV !== 'production') {
        console.log(`🧹 清理了 ${removed} 个过期的权限缓存项`);
      }
    }, 60 * 1000);
  }

  /**
   * 生成缓存键
   */
  private generateKey(params: PermissionCacheKey): string {
    return `${params.userId}:${params.resource}:${params.resourceId}:${params.action}`;
  }

  /**
   * 获取权限检查结果（从缓存）
   */
  get(params: PermissionCacheKey): boolean | undefined {
    const key = this.generateKey(params);
    return this.cache.get(key);
  }

  /**
   * 设置权限检查结果（写入缓存）
   */
  set(params: PermissionCacheKey, hasPermission: boolean): void {
    const key = this.generateKey(params);
    this.cache.set(key, hasPermission);
  }

  /**
   * 使用户的所有权限缓存失效
   */
  invalidateUser(userId: string): void {
    // 由于LRU cache不支持按前缀删除，这里清空整个缓存
    // 在实际生产环境中，可以考虑使用Redis等支持模式匹配的缓存
    this.cache.clear();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔄 清空权限缓存（用户 ${userId} 权限可能已变更）`);
    }
  }

  /**
   * 使资源的所有权限缓存失效
   */
  invalidateResource(resource: string, resourceId: string | number): void {
    // 同样，清空整个缓存
    this.cache.clear();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔄 清空权限缓存（${resource}#${resourceId} 可能已变更）`);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return this.cache.getStats();
  }
}

// 单例实例
export const permissionCache = new PermissionCache();

/**
 * 用户会话缓存（缓存用户详细信息）
 */
interface UserSessionData {
  id: string;
  email: string;
  role: string;
  organizationId?: number;
  displayName?: string;
}

class UserSessionCache {
  private cache: LRUCache<UserSessionData>;

  constructor() {
    // 最多缓存500个用户会话，有效期5分钟
    this.cache = new LRUCache<UserSessionData>(500, 5);
  }

  /**
   * 获取用户会话数据
   */
  get(userId: string): UserSessionData | undefined {
    return this.cache.get(userId);
  }

  /**
   * 设置用户会话数据
   */
  set(userId: string, userData: UserSessionData): void {
    this.cache.set(userId, userData);
  }

  /**
   * 删除用户会话（用户登出时）
   */
  delete(userId: string): boolean {
    return this.cache.delete(userId);
  }

  /**
   * 清空所有会话
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return this.cache.getStats();
  }
}

// 单例实例
export const userSessionCache = new UserSessionCache();

/**
 * 导出缓存统计端点数据
 */
export function getAllCacheStats() {
  return {
    permissionCache: permissionCache.getStats(),
    userSessionCache: userSessionCache.getStats(),
  };
}
