# Supabase 配置指南

本指南将帮助您配置 Supabase 作为 AnesGuardian 的认证和数据库服务。

## 📋 前置要求

- 有效的电子邮箱地址
- 网络连接（需要访问 supabase.com）

## 🚀 快速开始

### 步骤 1: 创建 Supabase 账户和项目

1. **访问 Supabase**
   - 打开浏览器，访问 [https://supabase.com](https://supabase.com)
   - 点击 "Start your project" 或 "Sign Up"

2. **注册账户**
   - 使用 GitHub、Google 或邮箱注册
   - 推荐使用 GitHub 登录，更加便捷

3. **创建新项目**
   - 点击 "New Project"
   - 填写项目信息：
     - **Name**: `anesthesia-guardian`（或您喜欢的名字）
     - **Database Password**: 设置一个强密码（请妥善保管）
     - **Region**: 选择 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`（离中国较近）
   - 点击 "Create new project"
   - 等待 1-2 分钟让项目初始化完成

### 步骤 2: 获取 API 密钥

1. **进入项目设置**
   - 在项目仪表板左侧，点击 ⚙️ **Settings**
   - 点击 **API** 选项卡

2. **复制必需的密钥**
   您需要复制以下两个值：

   **① Project URL**
   ```
   示例: https://abcdefghijklmn.supabase.co
   ```
   
   **② anon public key**（在 Project API keys 部分）
   ```
   示例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（很长的字符串）
   ```

### 步骤 3: 配置环境变量

1. **打开项目根目录的 `.env` 文件**

2. **更新 Supabase 配置**
   找到这两行：
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **替换为您的实际值**
   ```bash
   VITE_SUPABASE_URL=https://您的项目id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...您的完整密钥
   ```

4. **保存文件**

### 步骤 4: 配置认证提供商

#### 启用 Email OTP 认证（默认已启用）

1. 在 Supabase 项目中，点击左侧 🔐 **Authentication**
2. 点击 **Providers** 标签
3. 找到 **Email** 提供商
4. 确保 **Enable Email provider** 已开启
5. **Enable Email OTP** 也需要开启

#### 可选：自定义邮件模板

1. 在 Authentication 页面，点击 **Email Templates**
2. 选择 **Magic Link**
3. 您可以自定义邮件的：
   - 主题 (Subject)
   - 内容 (Content)
   - 添加您的品牌元素

   示例模板：
   ```html
   <h2>欢迎使用 AnesGuardian</h2>
   <p>您的验证码是: {{ .Token }}</p>
   <p>此验证码将在 5 分钟后过期。</p>
   ```

### 步骤 5: 配置数据库（可选）

如果您想使用 Supabase 作为主数据库（替代当前的 PostgreSQL）：

1. **获取数据库连接字符串**
   - 在 Supabase 项目中，点击 ⚙️ **Settings** -> **Database**
   - 找到 **Connection string** -> **URI**
   - 复制 "URI" 格式的连接字符串

2. **更新 `.env` 文件**
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   注意：将 `[YOUR-PASSWORD]` 替换为创建项目时设置的数据库密码

3. **运行数据库迁移**
   ```bash
   npm run db:push
   ```

## 🧪 测试配置

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 访问登录页面

打开浏览器访问：`http://localhost:3001/login`

### 3. 测试邮箱登录

1. 输入您的邮箱地址
2. 点击 "发送验证码"
3. 检查您的邮箱（包括垃圾邮件文件夹）
4. 输入 6 位验证码
5. 点击 "验证并登录"

如果成功，您将被重定向到主页面！

## 🔧 故障排查

### 问题 1: 收不到验证码邮件

**解决方案：**
- 检查垃圾邮件文件夹
- 确认 Email OTP 已在 Supabase 中启用
- 等待几分钟，邮件可能会延迟
- Supabase 免费套餐每小时有邮件发送限制

### 问题 2: "Invalid API key" 错误

**解决方案：**
- 确认 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY` 正确
- 确保复制了完整的密钥（通常很长）
- 重启开发服务器

### 问题 3: CORS 错误

**解决方案：**
- 在 Supabase 项目中，进入 **Settings** -> **API**
- 在 **Site URL** 中添加：`http://localhost:3001`
- 在 **Redirect URLs** 中添加：`http://localhost:3001/**`

### 问题 4: 环境变量未生效

**解决方案：**
- 确保环境变量名以 `VITE_` 开头（这是 Vite 的要求）
- 修改 `.env` 后必须重启开发服务器
- 清除浏览器缓存和重新加载页面

## 📊 使用 Supabase Dashboard

### 查看用户

1. 进入 Supabase 项目
2. 点击 🔐 **Authentication** -> **Users**
3. 这里可以看到所有注册用户
4. 可以手动添加、删除或编辑用户

### 查看日志

1. 点击左侧 📊 **Logs**
2. 选择不同的日志类型：
   - **Auth Logs**: 认证相关日志
   - **API Logs**: API 请求日志
   - **Realtime Logs**: 实时订阅日志

## 🎨 自定义登录体验

登录页面已经设计好，位于：`client/src/pages/login.tsx`

您可以根据需要自定义：
- Logo 和品牌颜色
- 文案和提示信息
- 添加更多认证方式（Google、GitHub 等）

## 🔒 安全建议

### 生产环境配置

1. **使用生产环境专用的 Supabase 项目**
   - 不要在生产环境使用开发环境的密钥

2. **配置 RLS (Row Level Security)**
   ```sql
   -- 在 Supabase SQL Editor 中执行
   ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can only see their own data"
   ON patients FOR SELECT
   USING (auth.uid() = user_id);
   ```

3. **限制 Email Rate Limiting**
   - 在 Authentication -> Settings 中配置
   - 防止恶意用户滥用邮件发送

4. **启用 2FA for Admin**
   - 保护您的 Supabase 管理账户

## 📚 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript/introduction)

## 🆘 需要帮助？

如果遇到问题：
1. 查看本指南的故障排查部分
2. 访问 [Supabase Discord](https://discord.supabase.com)
3. 查看项目的 GitHub Issues

---

**祝您配置顺利！🚀**
