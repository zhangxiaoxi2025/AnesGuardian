/**
 * 审计日志系统
 * 用于记录安全相关事件，满足合规要求
 */

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // 内存中保留最多10000条日志

  /**
   * 记录审计日志
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // 生产环境输出到日志系统
    if (process.env.NODE_ENV === 'production') {
      // 结构化日志输出（方便日志收集系统解析）
      console.log(JSON.stringify({
        level: 'audit',
        ...logEntry,
      }));
    } else {
      // 开发环境可读输出
      const statusEmoji = entry.status === 'success' ? '✅' : '❌';
      console.log(
        `${statusEmoji} [AUDIT] ${entry.action} on ${entry.resource}` +
        (entry.resourceId ? `#${entry.resourceId}` : '') +
        ` by ${entry.userEmail} (${entry.userRole})` +
        (entry.errorMessage ? ` - ${entry.errorMessage}` : '')
      );
    }

    // 保存到内存（用于审计查询）
    this.logs.push(logEntry);

    // 限制内存占用
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // 移除最旧的日志
    }
  }

  /**
   * 记录认证事件
   */
  logAuth(params: {
    userId: string;
    userEmail: string;
    action: 'login' | 'logout' | 'token_refresh' | 'auth_failure';
    status: 'success' | 'failure';
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): void {
    this.log({
      ...params,
      userRole: 'unknown',
      resource: 'authentication',
      details: {
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * 记录权限检查事件
   */
  logPermissionCheck(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    action: string;
    resource: string;
    resourceId?: string | number;
    status: 'success' | 'failure';
    reason?: string;
  }): void {
    this.log({
      ...params,
      errorMessage: params.reason,
      details: {
        checkType: 'permission',
        reason: params.reason,
      },
    });
  }

  /**
   * 记录数据访问事件
   */
  logDataAccess(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    action: 'view' | 'create' | 'update' | 'delete' | 'share' | 'unshare';
    resource: string;
    resourceId: string | number;
    status: 'success' | 'failure';
    errorMessage?: string;
  }): void {
    this.log({
      ...params,
      details: {
        dataAccess: true,
      },
    });
  }

  /**
   * 记录敏感操作
   */
  logSensitiveOperation(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    action: string;
    resource: string;
    resourceId?: string | number;
    status: 'success' | 'failure';
    details?: Record<string, any>;
    errorMessage?: string;
  }): void {
    this.log({
      ...params,
      details: {
        ...params.details,
        sensitive: true,
      },
    });
  }

  /**
   * 查询审计日志
   */
  query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    status?: 'success' | 'failure';
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let results = this.logs;

    if (filters.userId) {
      results = results.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      results = results.filter(log => log.action === filters.action);
    }

    if (filters.resource) {
      results = results.filter(log => log.resource === filters.resource);
    }

    if (filters.status) {
      results = results.filter(log => log.status === filters.status);
    }

    if (filters.startTime) {
      results = results.filter(log => log.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      results = results.filter(log => log.timestamp <= filters.endTime!);
    }

    // 按时间倒序排列（最新的在前）
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 限制返回数量
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 获取统计信息
   */
  getStatistics(timeRange?: { start: Date; end: Date }): {
    totalLogs: number;
    successCount: number;
    failureCount: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    byUser: Record<string, number>;
  } {
    let logs = this.logs;

    if (timeRange) {
      logs = logs.filter(
        log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const stats = {
      totalLogs: logs.length,
      successCount: logs.filter(log => log.status === 'success').length,
      failureCount: logs.filter(log => log.status === 'failure').length,
      byAction: {} as Record<string, number>,
      byResource: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
    };

    logs.forEach(log => {
      // 按操作统计
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // 按资源统计
      stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;

      // 按用户统计
      stats.byUser[log.userEmail] = (stats.byUser[log.userEmail] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清除旧日志（保留最近N天）
   */
  clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    const removedCount = originalLength - this.logs.length;

    if (removedCount > 0) {
      console.log(`🧹 清理了 ${removedCount} 条超过 ${daysToKeep} 天的审计日志`);
    }

    return removedCount;
  }
}

// 单例实例
export const auditLogger = new AuditLogger();

// 定期清理旧日志（每24小时运行一次）
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    auditLogger.clearOldLogs(30); // 保留30天
  }, 24 * 60 * 60 * 1000); // 24小时
}
