/**
 * 输入清理和验证工具
 * 防止XSS、SQL注入等安全威胁
 */

/**
 * 清理字符串输入，移除潜在的恶意脚本
 * @param input 需要清理的字符串
 * @returns 清理后的字符串
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    // 移除script标签
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除iframe标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // 移除on*事件处理器
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除javascript:伪协议
    .replace(/javascript:/gi, '')
    // 移除data:伪协议（除了图片）
    .replace(/data:(?!image\/)/gi, '')
    // 去除首尾空白
    .trim();
}

/**
 * 清理对象输入，递归处理所有字段
 * @param input 需要清理的输入
 * @returns 清理后的输入
 */
export function sanitizeInput(input: any): any {
  // 处理null和undefined
  if (input === null || input === undefined) {
    return input;
  }

  // 处理字符串
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  // 处理数组
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  // 处理对象
  if (typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  // 其他类型（数字、布尔值等）直接返回
  return input;
}

/**
 * 验证文件类型是否允许
 * @param mimetype 文件MIME类型
 * @param allowedTypes 允许的MIME类型列表
 * @returns 是否允许
 */
export function isAllowedFileType(
  mimetype: string,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
): boolean {
  return allowedTypes.includes(mimetype.toLowerCase());
}

/**
 * 验证文件大小是否在限制内
 * @param size 文件大小（字节）
 * @param maxSize 最大大小（字节），默认10MB
 * @returns 是否在限制内
 */
export function isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * 清理文件名，移除特殊字符
 * @param filename 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // 只保留字母、数字、点、下划线、横线和中文字符
    .replace(/[^\w\u4e00-\u9fa5.-]/g, '_')
    // 防止目录遍历
    .replace(/\.\./g, '')
    // 限制长度
    .slice(0, 255);
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号码格式（中国大陆）
 * @param phone 手机号码
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 清理SQL输入（虽然Drizzle已经提供了防护，但多一层保护）
 * @param input SQL输入
 * @returns 清理后的输入
 */
export function sanitizeSQLInput(input: string): string {
  return input
    // 移除SQL注释
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除危险的SQL关键字
    .replace(/;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\s+/gi, '; ')
    .trim();
}

/**
 * 验证对象是否符合基本安全要求
 * @param obj 需要验证的对象
 * @param maxDepth 最大嵌套深度，默认5
 * @returns 是否安全
 */
export function isSecureObject(obj: any, maxDepth: number = 5): boolean {
  // 检查嵌套深度，防止DOS攻击
  function checkDepth(value: any, depth: number): boolean {
    if (depth > maxDepth) {
      return false;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.every(item => checkDepth(item, depth + 1));
      }
      return Object.values(value).every(val => checkDepth(val, depth + 1));
    }

    return true;
  }

  return checkDepth(obj, 0);
}

/**
 * 清理HTML内容，只保留安全的标签
 * @param html HTML内容
 * @returns 清理后的HTML
 */
export function sanitizeHTML(html: string): string {
  // 允许的标签
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  let sanitized = html;

  // 移除不允���的标签
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });

  // 移除所有on*事件
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // 移除javascript:和data:协议
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

  return sanitized;
}
