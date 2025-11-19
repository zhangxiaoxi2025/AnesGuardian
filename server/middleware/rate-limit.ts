import rateLimit from 'express-rate-limit';

/**
 * 全局API速率限制
 * 防止滥用API，保护服务器资源
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100次请求
  message: '请求过于频繁，请15分钟后再试',
  standardHeaders: true, // 返回 `RateLimit-*` headers
  legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
  // 自定义响应
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请15分钟后再试',
    });
  },
});

/**
 * AI服务专用速率限制
 * AI调用成本高，需要更严格的限制
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 限制每个IP 10次请求
  message: 'AI服务请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI服务请求过于频繁，请稍后再试',
    });
  },
});

/**
 * 文件上传速率限制
 * 防止大量文件上传攻击
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 5, // 限制每个IP 5次上传
  message: '文件上传过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: '文件上传过于频繁，请稍后再试',
    });
  },
});

/**
 * 登录尝试速率限制
 * 防止暴力破解攻击
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 5次登录尝试
  message: '登录尝试次数过多，请15分钟后再试',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: '登录尝试次数过多，请15分钟后再试',
    });
  },
});
