/**
 * 自定义错误类
 * 提供统一的错误处理机制
 */

/**
 * 应用基础错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // 维护正确的堆栈跟踪
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误（400）
 */
export class ValidationError extends AppError {
  constructor(message: string = '请求数据验证失败') {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * 未授权错误（401）
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问，请先登录') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * 禁止访问错误（403）
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '您没有权限访问此资源') {
    super(403, message, 'FORBIDDEN');
  }
}

/**
 * 资源未找到错误（404）
 */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(404, `${resource}不存在`, 'NOT_FOUND');
  }
}

/**
 * 冲突错误（409）
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源已存在') {
    super(409, message, 'CONFLICT');
  }
}

/**
 * 速率限制错误（429）
 */
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁，请稍后再试') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 内部服务器错误（500）
 */
export class InternalServerError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super(500, message, 'INTERNAL_SERVER_ERROR', false);
  }
}

/**
 * 服务不可用错误（503）
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = '服务暂时不可用') {
    super(503, message, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败') {
    super(500, message, 'DATABASE_ERROR', false);
  }
}

/**
 * AI服务错误
 */
export class AIServiceError extends AppError {
  constructor(message: string = 'AI服务调用失败') {
    super(500, message, 'AI_SERVICE_ERROR');
  }
}

/**
 * 文件上传错误
 */
export class FileUploadError extends AppError {
  constructor(message: string = '文件上传失败') {
    super(400, message, 'FILE_UPLOAD_ERROR');
  }
}

/**
 * 判断错误是否为操作性错误（预期的错误）
 * @param error 错误对象
 * @returns 是否为操作性错误
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * 从Zod错误创建验证错误
 * @param zodError Zod验证错误
 * @returns 验证错误
 */
export function createValidationErrorFromZod(zodError: any): ValidationError {
  const messages = zodError.errors.map((err: any) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return new ValidationError(messages.join(', '));
}
