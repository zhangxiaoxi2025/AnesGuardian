# 贡献指南 (Contributing Guide)

感谢你考虑为 AnesGuardian 做出贡献！

## 🎯 如何贡献

### 报告 Bug

如果你发现了 bug，请：

1. 检查 [Issues](https://github.com/yourusername/AnesGuardian/issues) 确保问题尚未被报告
2. 创建新 issue，包含以下信息：
   - 清晰的标题和描述
   - 重现步骤
   - 预期行为和实际行为
   - 截图（如适用）
   - 环境信息（操作系统、浏览器、Node.js 版本等）

### 提出新功能

我们欢迎新功能建议：

1. 先创建一个 issue 讨论该功能
2. 说明功能的用例和价值
3. 等待维护者反馈
4. 获得批准后开始开发

### 提交代码

1. **Fork 仓库**
   ```bash
   git clone https://github.com/your-username/AnesGuardian.git
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **进行更改**
   - 遵循代码规范
   - 添加必要的测试
   - 更新相关文档

4. **提交更改**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `style:` 代码格式（不影响功能）
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

5. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **创建 Pull Request**
   - 清晰描述更改内容
   - 关联相关 issue
   - 等待代码审查

## 📝 开发规范

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 配置
- 使用 2 空格缩进
- 使用有意义的变量和函数名
- 添加必要的注释

### 提交规范

- 使用语义化提交信息
- 每个提交应该是一个逻辑单元
- 避免大型提交，拆分为小的、可管理的提交

### 测试

- 为新功能添加测试
- 确保所有测试通过
- 保持测试覆盖率

## 🔍 代码审查流程

1. 提交 PR 后，维护者会进行代码审查
2. 根据反馈进行必要的修改
3. 所有检查通过后，PR 将被合并
4. 你的贡献将出现在下一个版本中

## 📚 开发环境设置

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

## 🤔 需要帮助？

- 查看 [文档](./docs)
- 在 [Issues](https://github.com/yourusername/AnesGuardian/issues) 提问
- 联系维护者

## 📜 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

## 🙏 致谢

感谢所有为 AnesGuardian 做出贡献的人！

---

**再次感谢你的贡献！** 🎉


