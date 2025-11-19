import helmet from 'helmet';

/**
 * Helmet安全中间件配置
 * 设置各种HTTP安全头部，防止常见的Web漏洞
 */
export const securityHeaders = helmet({
  // Content Security Policy - 防止XSS攻击
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // 允许内联脚本（React需要）
        "'unsafe-eval'", // 允许eval（开发环境需要）
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // 允许内联样式（Tailwind需要）
        "https:",
      ],
      imgSrc: [
        "'self'",
        "data:", // 允许data URLs（base64图片）
        "https:", // 允许HTTPS图片
        "blob:", // 允许blob URLs（文件上传预览）
      ],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://generativelanguage.googleapis.com", // Gemini API
        "wss:", // WebSocket
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security - 强制HTTPS（仅生产环境）
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true,
  } : false,

  // 防止点击劫持
  frameguard: {
    action: 'deny',
  },

  // 禁用浏览器MIME类型嗅探
  noSniff: true,

  // 防止在旧版浏览器中的XSS攻击
  xssFilter: true,

  // 隐藏X-Powered-By头部
  hidePoweredBy: true,

  // DNS预取控制
  dnsPrefetchControl: {
    allow: false,
  },

  // 禁止在iframe中打开
  ieNoOpen: true,

  // 推荐的安全头部
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

/**
 * CORS配置
 * 控制跨域资源共享
 */
export function getCorsOptions() {
  // 从环境变量读取允许的源
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173', // Vite开发服务器
    'http://localhost:5000', // 生产服务器
    'http://localhost:3000', // 备用端口
  ];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 允许没有origin的请求（如移动应用、Postman等）
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`来源 ${origin} 不被CORS策略允许`));
      }
    },
    credentials: true, // 允许发送cookies
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  };
}
