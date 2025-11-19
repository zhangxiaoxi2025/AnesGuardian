# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-07-11

### ✨ Added
- 智能重试机制：AI回答截断检测和自动token升级（2048→4096→8192）
- 完整的5级调试日志系统
- 卡死评估自动恢复机制
- 318种核心药物数据库

### 🔧 Fixed
- 修复多Agent协调器冲突问题
- 修复临床指南匹配逻辑错误
- 修复AI回答截断问题（token限制）
- 优化布局响应式问题

### 🚀 Improved
- 优化AI问答系统性能
- 改进药物相互作用显示界面
- 增强错误处理机制
- 提升系统稳定性至99%+

## [2.0.0] - 2025-07-06

### ✨ Added
- 真正的多模态AI医疗记录分析系统
- Google Gemini 1.5 Flash图像分析集成
- 中文医疗信息提取优化
- 医生审核界面

### 🔧 Fixed
- 修复Google Gemini API集成问题
- 完善错误处理机制

### 🚀 Improved
- 优化用户界面和交互体验
- 改进OCR识别准确度

## [1.5.0] - 2025-07-05

### ✨ Added
- 交互式药物相互作用深度分析系统
- AI驱动的详细药理学分析
- 药物相互作用详情模态框
- 两步分析法（判断 + 详细分析）

### 🚀 Improved
- 简化药物相互作用显示界面
- 优化数据库查询性能

## [1.4.0] - 2025-07-02

### ✨ Added
- 核心药物数据库集成（218种药物）
- 药物分类系统
  - 心脏病药物（20种）
  - 高血压药物（20种）
  - 糖尿病药物（20种）
  - 抗抑郁药物（20种）
  - 帕金森病药物（20种）
  - 肾病用药（20种）
  - 麻醉药物（98种）

### 🚀 Improved
- 优化药物搜索功能
- 改进数据库结构

## [1.3.0] - 2025-06-30

### ✨ Added
- AI医疗问答功能
- 专业医学知识咨询
- 实时对话系统

### 🚀 Improved
- 优化AI响应速度
- 改进对话体验

## [1.2.0] - 2025-06-29

### 🔄 Changed
- 从OpenAI迁移到Google Gemini API
- 更新AI模型为gemini-1.5-flash

### 🚀 Improved
- 提升AI分析性能
- 降低API调用成本

## [1.1.0] - 2025-06-25

### ✨ Added
- 多智能体协同评估系统
  - 协调器代理
  - 病历提取代理
  - 风险评估代理
  - 药物分析代理
  - 指南咨询代理
  - 质量检查代理
- 实时监控面板
- 代理状态跟踪

### 🚀 Improved
- 优化评估流程
- 提升系统并发性能

## [1.0.0] - 2025-06-20

### ✨ Initial Release
- 患者信息管理系统
- 基础风险评估功能
- 药物相互作用检测
- 临床指南查询
- 基础报告生成

### 🏗️ Technical Stack
- React 18 + TypeScript
- Node.js + Express
- PostgreSQL + Drizzle ORM
- Tailwind CSS + shadcn/ui

---

## Legend

- ✨ Added - 新功能
- 🔧 Fixed - Bug修复
- 🚀 Improved - 改进优化
- 🔄 Changed - 变更
- 🗑️ Deprecated - 废弃
- 🚨 Security - 安全相关
- 📚 Documentation - 文档更新

---

For more details, see the [full changelog](https://github.com/yourusername/AnesGuardian/releases).




