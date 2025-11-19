import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError } from '../utils/errors';

/**
 * 全局错误处理中间件
 * 捕获所有错误并返回统一格式的错误响应
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 准备错误上下文信息
  const errorContext = {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // 处理AppError（预期的操作性错误）
  if (err instanceof AppError) {
    // 记录警告日志
    console.warn('⚠️ 操作性错误:', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
  }

  // 处理Zod验证错误
  if (err.name === 'ZodError') {
    console.warn('⚠️ 验证错误:', {
      errors: (err as any).errors,
      path: req.path,
    });

    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: '请求数据验证失败',
      details: (err as any).errors,
    });
  }

  // 处理Multer文件上传错误
  if (err.name === 'MulterError') {
    console.warn('⚠️ 文件上传错误:', {
      error: err.message,
      path: req.path,
    });

    let message = '文件上传失败';
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = '文件大小超过限制（最大10MB）';
    } else if ((err as any).code === 'LIMIT_FILE_COUNT') {
      message = '文件数量超过限制';
    } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = '不支持的文件字段';
    }

    return res.status(400).json({
      status: 'error',
      code: 'FILE_UPLOAD_ERROR',
      message,
    });
  }

  // 处理数据库错误
  if (err.message?.includes('database') || err.message?.includes('query')) {
    console.error('❌ 数据库错误:', errorContext);

    return res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '数据库操作失败'
        : err.message,
    });
  }

  // 处理未预期的错误（严重错误）
  console.error('❌ 未预期的错误:', errorContext);

  // 生产环境不暴露错误详情
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message;

  const response: any = {
    status: 'error',
    code: 'INTERNAL_ERROR',
    message,
  };

  // 开发环境返回堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};

/**
 * 异步路由处理器包装器
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404错误处理中间件
 * 处理未匹配到任何路由的请求
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `路径 ${req.path} 不存在`,
  });
};
