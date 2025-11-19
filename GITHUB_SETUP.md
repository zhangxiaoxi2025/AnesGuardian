# GitHub 仓库设置指南

本文档指导你完成 AnesGuardian 项目在 GitHub 上的完整配置。

## 📋 前置准备

- ✅ GitHub 账号
- ✅ 已创建空仓库或准备创建新仓库
- ✅ Git 已安装在本地

---

## 🚀 首次推送到 GitHub

### 1. 初始化 Git 仓库（如果还未初始化）

```bash
cd /Users/emma/Desktop/决赛备份/10.15/AnesGuardian
git init
```

### 2. 添加远程仓库

将 `yourusername` 和 `AnesGuardian` 替换为你的实际 GitHub 用户名和仓库名：

```bash
git remote add origin https://github.com/yourusername/AnesGuardian.git
```

### 3. 添加文件并提交

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Complete project with documentation"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## ⚙️ GitHub 仓库设置

### 1. 仓库描述

在仓库页面，点击 ⚙️ 设置，添加：

**Description（描述）:**
```
🏥 围手术期智能决策支持系统 - AI-powered perioperative intelligent decision support system
```

**Website（网站）:**
```
https://your-domain.com
```

**Topics（标签）:**
```
ai, healthcare, anesthesia, react, typescript, medical-ai, drug-interaction, 
risk-assessment, google-gemini, perioperative-care
```

### 2. 关于部分

勾选以下选项：
- ☑️ Releases（发布）
- ☑️ Packages（包）
- ☑️ Discussions（讨论）
- ☑️ Issues（问题）

### 3. 社交预览图片

1. 进入仓库 Settings → General
2. 滚动到 "Social preview"
3. 点击 "Upload an image..."
4. 上传项目 logo 或截图（建议尺寸：1280x640px）

---

## 📝 README 更新

### 替换占位符

在 `README.md` 中，将以下占位符替换为实际内容：

1. **GitHub 链接**
```markdown
# 替换所有的
https://github.com/yourusername/AnesGuardian
# 为你的实际仓库地址
https://github.com/your-actual-username/AnesGuardian
```

2. **联系邮箱**
```markdown
# 替换
your-email@example.com
# 为你的实际邮箱
```

3. **徽章（可选）**

在 README.md 顶部添加更多徽章：

```markdown
![Build Status](https://img.shields.io/github/workflow/status/yourusername/AnesGuardian/CI)
![Last Commit](https://img.shields.io/github/last-commit/yourusername/AnesGuardian)
![Stars](https://img.shields.io/github/stars/yourusername/AnesGuardian?style=social)
![Forks](https://img.shields.io/github/forks/yourusername/AnesGuardian?style=social)
```

---

## 🏷️ 发布第一个版本

### 创建 Release

1. 进入仓库主页
2. 点击右侧 "Releases" → "Create a new release"
3. 填写发布信息：

**Tag version:**
```
v2.1.0
```

**Release title:**
```
AnesGuardian v2.1.0 - 初始发布
```

**Description:**
```markdown
## 🎉 首次发布

### ✨ 主要功能
- 🤖 多智能体风险评估系统
- 💊 318种药物数据库和相互作用分析
- 📄 AI驱动的医疗记录分析
- 📚 临床指南智能检索
- 💬 AI医疗问答系统
- 📊 实时监控面板

### 📦 安装

查看 [README.md](https://github.com/yourusername/AnesGuardian/blob/main/README.md) 获取详细安装说明。

### 📚 文档

- [用户指南](./docs/USER_GUIDE.md)
- [API 文档](./docs/API.md)
- [架构文档](./docs/ARCHITECTURE.md)
- [部署指南](./docs/DEPLOYMENT.md)

### 🙏 致谢

感谢所有贡献者和支持者！
```

4. 点击 "Publish release"

---

## 🛡️ 设置分支保护

### 保护 main 分支

1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. 勾选以下选项：
   - ☑️ Require pull request reviews before merging
   - ☑️ Require status checks to pass before merging
   - ☑️ Require branches to be up to date before merging
   - ☑️ Include administrators

---

## 🤖 设置 GitHub Actions（可选）

### 创建 CI/CD 工作流

创建 `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run check
    
    - name: Build
      run: npm run build
```

---

## 📊 启用 GitHub Insights

### 1. Discussions（讨论区）

1. Settings → General → Features
2. 勾选 ☑️ Discussions
3. 创建初始分类：
   - 💡 Ideas - 功能建议
   - 🙏 Q&A - 问答
   - 📣 Announcements - 公告
   - 🐛 Bug Reports - Bug报告

### 2. Projects（项目看板）

1. 点击 "Projects" 标签
2. New project → Board
3. 创建列：
   - 📋 Backlog
   - 🚧 In Progress
   - 👀 Review
   - ✅ Done

### 3. Wiki（维基）

1. Settings → General → Features
2. 勾选 ☑️ Wikis
3. 创建首页，链接到主要文档

---

## 🌟 优化仓库可见性

### 1. 添加 .gitattributes

创建 `.gitattributes` 文件：

```gitattributes
# 标记语言统计
*.ts linguist-detectable=true
*.tsx linguist-detectable=true
*.js linguist-vendored=false
*.jsx linguist-vendored=false

# 排除特定文件
*.md linguist-documentation=true
attached_assets/* linguist-vendored=true
```

### 2. 添加 CODE_OF_CONDUCT.md

GitHub 提供模板，选择 "Contributor Covenant"。

### 3. 添加 SECURITY.md

创建安全政策文件：

```markdown
# 安全政策

## 支持的版本

| 版本 | 支持状态 |
| --- | --- |
| 2.1.x | :white_check_mark: |
| < 2.0 | :x: |

## 报告漏洞

如果发现安全漏洞，请发送邮件到 security@example.com

请不要公开报告安全问题。
```

---

## 📢 推广项目

### 1. 社交媒体

分享到：
- Twitter
- LinkedIn
- 技术论坛

### 2. 提交到列表

- [Awesome React](https://github.com/enaqx/awesome-react)
- [Awesome TypeScript](https://github.com/dzharii/awesome-typescript)
- [Awesome Medical AI](相关列表)

### 3. 撰写博客

分享项目开发故事和技术细节。

---

## ✅ 检查清单

完成 GitHub 设置后，确认以下项目：

- [ ] 仓库已推送到 GitHub
- [ ] README.md 占位符已替换
- [ ] 仓库描述和标签已设置
- [ ] 第一个 Release 已创建
- [ ] 分支保护规则已配置
- [ ] Issue 模板已添加
- [ ] PR 模板已添加
- [ ] LICENSE 文件已包含
- [ ] CONTRIBUTING.md 已包含
- [ ] .gitignore 配置正确
- [ ] GitHub Actions 已配置（可选）
- [ ] Discussions 已启用（可选）

---

## 📞 需要帮助？

如有任何问题，请：
- 查看 [GitHub 文档](https://docs.github.com)
- 在 [GitHub Community](https://github.community) 提问
- 联系项目维护者

---

**祝你的项目获得更多 Star！** ⭐




