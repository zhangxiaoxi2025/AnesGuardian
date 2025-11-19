# 部署指南 (Deployment Guide)

本文档提供 AnesGuardian 系统的详细部署说明。

## 📋 目录

- [环境要求](#环境要求)
- [本地开发部署](#本地开发部署)
- [生产环境部署](#生产环境部署)
- [数据库配置](#数据库配置)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

---

## 🔧 环境要求

### 系统要求
- **操作系统**: Linux, macOS, Windows (WSL2)
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 或 pnpm >= 8.0.0
- **PostgreSQL**: >= 14.0

### API 密钥
- **Google Gemini API Key**: [获取地址](https://ai.google.dev/)

---

## 💻 本地开发部署

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/AnesGuardian.git
cd AnesGuardian
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
GEMINI_API_KEY=your_actual_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/anesguardian
NODE_ENV=development
```

### 4. 初始化数据库

```bash
# 创建数据库
createdb anesguardian

# 同步数据库 schema
npm run db:push
```

### 5. 导入药物数据（可选）

```bash
npx tsx scripts/import-drugs.ts
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5000`

---

## 🚀 生产环境部署

### 方式一：传统服务器部署

#### 1. 准备服务器
- Ubuntu 20.04+ 或 CentOS 8+
- 至少 2GB RAM
- 10GB 可用磁盘空间

#### 2. 安装 Node.js

```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 3. 安装 PostgreSQL

```bash
# Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE anesguardian;
CREATE USER anesuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE anesguardian TO anesuser;
\q
```

#### 4. 部署应用

```bash
# 克隆代码
cd /opt
sudo git clone https://github.com/yourusername/AnesGuardian.git
cd AnesGuardian

# 安装依赖
npm install --production

# 配置环境变量
sudo nano .env
```

填入生产环境配置：

```env
GEMINI_API_KEY=your_production_api_key
DATABASE_URL=postgresql://anesuser:your_password@localhost:5432/anesguardian
NODE_ENV=production
PGDATABASE=anesguardian
PGHOST=localhost
PGUSER=anesuser
PGPASSWORD=your_password
PGPORT=5432
```

```bash
# 初始化数据库
npm run db:push

# 导入药物数据
npx tsx scripts/import-drugs.ts

# 构建项目
npm run build

# 启动服务
npm start
```

#### 5. 使用 PM2 管理进程

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start dist/index.js --name anesguardian

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs anesguardian

# 监控状态
pm2 status
```

#### 6. 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/anesguardian
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 增加上传文件大小限制
    client_max_body_size 10M;
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/anesguardian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. 配置 SSL 证书（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 方式二：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["npm", "start"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: anesguardian
      POSTGRES_USER: anesuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  app:
    build: .
    depends_on:
      - postgres
    environment:
      NODE_ENV: production
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      DATABASE_URL: postgresql://anesuser:${DB_PASSWORD}@postgres:5432/anesguardian
    ports:
      - "5000:5000"
    restart: unless-stopped
    volumes:
      - ./attached_assets:/app/attached_assets

volumes:
  postgres_data:
```

#### 3. 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式三：云平台部署

#### Vercel 部署（推荐用于前端）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

#### Railway 部署

1. 访问 [Railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 配置环境变量
4. 自动部署

#### Render 部署

1. 访问 [Render.com](https://render.com)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 配置构建命令和启动命令
5. 添加 PostgreSQL 数据库
6. 配置环境变量

---

## 🗄️ 数据库配置

### 生产环境优化

```sql
-- 创建索引
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_assessments_patient_id ON assessments(patient_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_drugs_name ON drugs(name);
CREATE INDEX idx_agent_logs_assessment_id ON agent_logs(assessment_id);

-- 性能优化
ALTER DATABASE anesguardian SET shared_buffers = '256MB';
ALTER DATABASE anesguardian SET effective_cache_size = '1GB';
ALTER DATABASE anesguardian SET maintenance_work_mem = '128MB';
```

### 数据备份

```bash
# 手动备份
pg_dump -U anesuser -d anesguardian > backup_$(date +%Y%m%d).sql

# 自动备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR
pg_dump -U anesuser -d anesguardian | gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz
# 删除30天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup.sh

# 添加到 crontab（每天凌晨2点备份）
echo "0 2 * * * /opt/backup.sh" | crontab -
```

### 数据恢复

```bash
# 从备份恢复
gunzip -c backup_20250711_020000.sql.gz | psql -U anesuser -d anesguardian
```

---

## ⚙️ 环境变量配置

### 必需变量

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `GEMINI_API_KEY` | Google Gemini API密钥 | `AIza...` |
| `DATABASE_URL` | PostgreSQL连接URL | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | 运行环境 | `production` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `PORT` | 服务器端口 | `5000` |
| `SESSION_SECRET` | 会话密钥 | 随机生成 |

---

## 🔍 健康检查

创建健康检查端点（在 `server/routes.ts` 添加）：

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### 监控脚本

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:5000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is unhealthy (HTTP $RESPONSE)"
    # 可选：重启服务
    # pm2 restart anesguardian
    exit 1
fi
```

---

## 🔒 安全建议

### 1. 环境变量保护

```bash
# 限制文件权限
chmod 600 .env
```

### 2. 防火墙配置

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. 数据库安全

```sql
-- 限制数据库用户权限
REVOKE ALL ON DATABASE anesguardian FROM PUBLIC;
GRANT CONNECT ON DATABASE anesguardian TO anesuser;
```

### 4. 应用安全

- 定期更新依赖包
- 使用强密码
- 启用 HTTPS
- 配置 CORS
- 实施速率限制

---

## 🐛 常见问题

### 问题 1: 数据库连接失败

**症状**: `Error: connect ECONNREFUSED`

**解决方案**:
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
psql $DATABASE_URL
```

### 问题 2: API 调用失败

**症状**: `Google Gemini API error`

**解决方案**:
```bash
# 验证 API 密钥
echo $GEMINI_API_KEY

# 测试 API 连接
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### 问题 3: 内存不足

**症状**: `FATAL ERROR: Ineffective mark-compacts near heap limit`

**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在 PM2 配置中
pm2 start dist/index.js --name anesguardian --node-args="--max-old-space-size=4096"
```

### 问题 4: 文件上传失败

**症状**: `413 Payload Too Large`

**解决方案**:
```nginx
# Nginx 配置
client_max_body_size 10M;
```

---

## 📊 性能优化

### 1. 数据库连接池

```typescript
// server/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. 缓存策略

```typescript
// 使用 Redis 缓存（可选）
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

### 3. 压缩响应

```typescript
import compression from 'compression';
app.use(compression());
```

---

## 📞 获取帮助

- 📖 [完整文档](../README.md)
- 🐛 [报告问题](https://github.com/yourusername/AnesGuardian/issues)
- 💬 [讨论区](https://github.com/yourusername/AnesGuardian/discussions)

---

**祝部署顺利！** 🚀




