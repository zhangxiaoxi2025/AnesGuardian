# Anesthesia Guardian - Medical AI Assessment System

## Overview

Anesthesia Guardian (麻醉守护神) is a comprehensive medical AI system designed to provide intelligent perioperative risk assessment for anesthesia care. The application utilizes multiple AI agents to analyze patient data, assess risks, check drug interactions, and provide evidence-based clinical recommendations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: In-memory storage for development (MemStorage)
- **AI Integration**: Google Gemini API (gemini-1.5-flash) for medical analysis
- **Session Management**: In-memory session storage

### Database Design
The system uses three main tables:
- **patients**: Core patient information including demographics, medical history, and vital signs
- **assessments**: Risk assessment results with AI agent status tracking
- **agentLogs**: Detailed logging of AI agent activities and results

## Key Components

### AI Agent Orchestrator
A multi-agent system that coordinates different specialized AI agents:
- **Orchestrator Agent**: Main coordinator managing the assessment workflow
- **EMR Extractor Agent**: Extracts and processes medical record information
- **Risk Assessor Agent**: Evaluates perioperative risks using established scoring systems
- **Drug Analyzer Agent**: Analyzes medication interactions and contraindications
- **Guideline Consultant Agent**: Searches and applies relevant clinical guidelines
- **Quality Checker Agent**: Validates and cross-checks assessment results

### Medical Risk Assessment
The system evaluates multiple risk categories:
- Airway management risks (Mallampati, BMI, neck mobility)
- Cardiovascular risks (Goldman score, comorbidities)
- Thrombosis risks (Caprini score)
- Postoperative nausea and vomiting (PONV) risks (Apfel score)
- Other perioperative complications

### User Interface Components
- **Dashboard**: Real-time monitoring of AI agent activities and assessment progress
- **Patient Management**: CRUD operations for patient data
- **Risk Visualization**: Color-coded risk factor displays with severity indicators
- **Drug Interaction Alerts**: Comprehensive medication interaction warnings
- **Clinical Guidelines**: Contextual display of relevant medical guidelines

## Data Flow

1. **Patient Data Input**: Medical staff input patient information through forms
2. **Assessment Initialization**: System creates assessment record and initializes AI agents
3. **Agent Orchestration**: Multiple AI agents analyze different aspects of patient data in parallel
4. **Risk Calculation**: Agents calculate risk scores using established medical scoring systems
5. **Result Aggregation**: Orchestrator combines results from all agents
6. **Quality Validation**: Quality checker validates the comprehensive assessment
7. **Report Generation**: System generates actionable recommendations for medical staff

## External Dependencies

### Core Dependencies
- **OpenAI API**: For advanced medical text analysis and risk assessment
- **Neon Database**: Serverless PostgreSQL for data persistence
- **Drizzle ORM**: Type-safe database operations with automatic migrations
- **Radix UI**: Accessible component primitives for the UI

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment optimization

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite HMR for instant frontend updates
- **Database Migrations**: Automatic schema synchronization with Drizzle
- **Error Handling**: Runtime error overlays and comprehensive logging

### Production Build
- **Frontend**: Static assets built and optimized by Vite
- **Backend**: ESBuild bundles the Express server with external dependencies
- **Database**: PostgreSQL connection via DATABASE_URL environment variable
- **AI Services**: OpenAI API integration via OPENAI_API_KEY

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API authentication key
- `NODE_ENV`: Environment specification (development/production)

## User Preferences

Preferred communication style: Simple, everyday language.

## 系统功能总结

### 核心功能模块
1. **多模态AI医疗记录分析** - 支持上传医疗记录图片，使用Google Gemini 2.5 Flash进行OCR识别和智能信息提取
2. **多Agent协同评估系统** - 6个专业AI代理协同工作，提供全面的围术期风险评估
3. **智能药物相互作用分析** - 基于PostgreSQL药物数据库的智能检索和AI深度分析
4. **临床指南智能匹配** - 根据患者情况自动匹配相关的麻醉和手术指南
5. **实时风险评估仪表板** - 可视化展示评估进度和结果的专业医疗界面
6. **患者数据管理** - 完整的患者信息录入、存储和查询系统
7. **医疗问答聊天** - 专业的AI问答系统，支持麻醉相关医疗咨询
8. **报告生成和分享** - 生成专业的医疗评估报告，支持PDF导出

### 技术特色
- **多模态AI集成** - 同时支持文本、图像分析的医疗AI系统
- **中文医疗专业化** - 完全中文界面，专业医疗术语准确
- **实时协作展示** - 可视化显示多个AI代理的工作状态
- **数据完整性保证** - 严格的医疗数据验证和错误处理机制

## Changelog

- July 10, 2025: 临床指南智能匹配逻辑完全修复
  - 修复了关键的临床指南匹配逻辑，之前无论什么手术类型都返回泌尿外科指南的严重bug
  - 更新SimpleAgentOrchestrator中的generateClinicalGuidelines方法，现在能根据患者的实际手术类型和病史匹配专业指南
  - 验证指南匹配准确性：妇科手术患者正确匹配妇科指南，泌尿外科患者正确匹配泌尿外科指南
  - 保持了根据患者年龄和病史的多维度智能匹配功能
  - 彻底解决了指南匹配的硬编码问题，系统现在提供真正个性化的专业医疗建议
- July 7, 2025: 多Agent协同评估系统核心问题完全解决
  - 修复了关键的协调器类冲突问题，完全迁移到SimpleAgentOrchestrator
  - 解决了评估结果为空的核心bug，系统现在能生成完整的医疗分析报告
  - 验证了所有6个AI代理正常工作：总指挥、病历提取、风险评估、药物交互、指南检索、核查Agent
  - 添加了完整的调试日志系统，便于问题追踪和系统监控
  - 系统现在能稳定生成包含风险因素、药物相互作用、临床指南、综合建议的完整评估报告
- July 7, 2025: 药物相互作用界面优化和显示简化完成
  - 实现药物相互作用界面的简化显示，主界面只显示50字以内的核心风险信息
  - 修复了中英文严重程度映射问题，支持AI返回的中文值（严重、中等、轻微）
  - 添加了新的summary字段到DrugInteraction接口，优化用户体验
  - 完整的分析详情移至"查看详情"模态框，保持专业性的同时提高可读性
  - 修复了图标和徽章显示问题，现在正确显示对应的警告级别
- July 7, 2025: 升级到最新Gemini 2.5 Flash Lite模型和修复药物相互作用分析
  - 全面升级所有AI分析服务到gemini-2.5-flash-lite-preview-06-17模型，提升分析准确性
  - 修复了药物相互作用分析的数据结构问题，现在能正确显示检测到的相互作用
  - 优化了返回数据格式，确保前端能正确解析AI分析结果
  - 验证了丙泊酚和阿米替林的中等程度相互作用能正确识别并提供临床建议
  - 系统现在使用最新的多模态AI技术进行医疗分析
- July 6, 2025: 完整系统功能文档创建和AI医疗记录分析系统验证成功
  - 创建了详细的SYSTEM_FEATURES.md系统功能文档，包含8大核心功能模块
  - 验证了AI医疗记录分析功能正常工作，成功处理70岁男性患者医疗记录
  - 修复了前端路由问题，添加/patient-form路径支持
  - 确认了Google Gemini 1.5 Flash多模态图像分析完全正常工作
  - 系统现在能够稳定地从医疗记录图片中提取病史和用药信息
- July 6, 2025: 真正的多模态AI医疗记录分析系统完成
  - 完全替换模拟数据，实现真正的Gemini 1.5 Flash多模态图像分析
  - 修复医疗记录处理路由404错误，添加完整的POST /api/medical-records/process端点
  - 实现base64图像编码和结构化JSON响应处理，支持直接图像分析
  - 更新前端响应格式兼容性，支持summary字段并保持向后兼容
  - 添加完整的错误处理机制，包括API配额限制、网络错误、JSON解析错误
  - 实现多层备用机制：优先使用直接图像分析，失败时降级到OCR+AI方式
  - 系统现在能够真正从医疗记录图片中提取病史总结和用药信息
- July 5, 2025: 综合平台文档创建和两步分析法系统优化
  - 创建了完整的 PLATFORM_DOCUMENTATION.md 文档，包含完整的技术架构、功能模块、开发规范等
  - 实现了革命性的两步分析法：先判断是否存在相互作用，再获取详细分析，提高分析准确性
  - 添加了5级详细调试日志系统，提供完全透明的药物相互作用分析过程
  - 增强了备用逻辑，特别针对阿米替林、丙泊酚等关键药物的相互作用识别
  - 优化了前端空状态显示，提供更友好的"未查询到已知相互作用"提示
  - 系统现在能够处理Gemini API配额限制，自动降级到基于规则的分析
- July 5, 2025: Revolutionary Interactive Drug Interaction Deep Analysis System
  - Transformed static drug interaction alerts into clickable, interactive decision support tools
  - Added AI-powered deep analysis modal with comprehensive pharmacological insights
  - Created new API endpoint /api/interactions/explain for drug interaction analysis
  - Integrated Gemini AI to provide detailed mechanism analysis, clinical consequences, and monitoring recommendations
  - Enhanced user experience with Eye icons, loading states, and professional report display
  - Implemented structured JSON response format for consistent AI analysis output
  - Added hover effects and visual feedback for improved interactivity
  - Built comprehensive error handling and fallback mechanisms for reliable operation
- July 5, 2025: Complete Patient Form Redesign with Integrated AI Medical Record Processing
  - Completely restructured "添加新患者" workflow with two-section design
  - Upper section: Traditional manual patient information input (name, age, gender, surgery type, etc.)
  - Lower section: Revolutionary "病历智能识别" area with photo upload and AI extraction
  - Implemented seamless OCR → AI → Manual Review workflow within single form
  - Added real-time status indicators (idle/success/error) with visual feedback
  - Created dual-mode workflow: doctors can choose manual input OR photo-assisted input
  - AI-extracted information auto-fills into editable text areas for medical review
  - Built comprehensive error handling and file validation
  - Moved upload functionality from standalone dialog to integrated form experience
  - Enhanced UX with loading states, progress indicators, and confirmation messages
- July 5, 2025: Revolutionary Medical Record OCR and AI Information Extraction System
  - Implemented complete medical record photo upload and processing pipeline
  - Added OCR text recognition using Tesseract.js for Chinese and English medical documents
  - Integrated Gemini AI for intelligent information extraction from medical records
  - Built 3-stage processing: OCR → AI Extraction → Medical Review Interface
  - Added comprehensive error handling and file validation (10MB limit, image files only)
  - Implemented safety-first approach requiring medical professional approval before data storage
- July 2, 2025: Comprehensive Core Drug Database Integration with AI Knowledge Base
  - Replaced external search dependency with AI-generated comprehensive drug database containing 218 essential medications
  - Categories include: Heart disease (20), Hypertension (20), Diabetes (20), Depression (20), Parkinson's (20), Kidney disease precautions (20), and Complete anesthesia drugs (98)
  - Created dedicated import script (scripts/import-drugs.ts) for batch drug data insertion
  - Enhanced search algorithm to support both Chinese names and English aliases with PostgreSQL full-text search
  - Fixed critical runtime error: Changed `interaction.drugs.join(' 与 ')` to `(interaction.drugs || []).join(' 与 ')` for null safety
  - Fixed runtime error: Added `Array.isArray(interaction.recommendations) &&` safety check before accessing recommendations.length
  - Added comprehensive drug categories: IV anesthetics, inhalation anesthetics, opioids, muscle relaxants, local anesthetics, vasopressors, sedatives, anticholinergics, antiemetics, steroids
  - Included detailed preoperative drug cessation guidelines for each medication category
  - System now supports robust drug interaction analysis with extensive medical knowledge base
- July 2, 2025: Major Drug Interaction System Architecture Upgrade
  - Migrated from hardcoded drug lists to PostgreSQL database with comprehensive drug information
  - Created dedicated drugs table with id, name, aliases, category, and stopGuideline fields
  - Implemented DrugService with search functionality and 25+ common anesthetic/medical drugs
  - Added dynamic drug search API endpoint (GET /api/drugs/search?q={query})
  - Completely rebuilt drug selection UI with professional multi-select Command/Popover components
  - Added "术前停药建议" (Pre-operative Drug Discontinuation) analysis feature
  - Enhanced error handling with bulletproof crash prevention for API data processing
  - Drug database includes anesthetic induction agents, opioids, muscle relaxants, vasopressors, anticoagulants, etc.
- June 30, 2025: Comprehensive solution for stuck assessment prevention
  - Created AssessmentManager with timeout protection and automatic recovery
  - Added user-accessible reset button in dashboard header for stuck evaluations
  - Implemented 2-minute timeout mechanism with automatic failure detection
  - Added periodic background check for stuck assessments (every 2 minutes)
  - Enhanced error handling with graceful fallback and cleanup mechanisms
  - Users can now easily restart evaluations when they get stuck with prominent UI controls
  - System automatically detects and recovers from assessments stuck longer than 5 minutes
- June 30, 2025: Added AI Chat feature for medical Q&A
  - Created dedicated AI问答 page with real-time chat interface
  - Integrated Gemini API for professional medical question answering
  - Added chat service with specialized prompts for anesthesiology/perioperative care
  - Fixed sidebar navigation routing issues
  - Verified chat functionality with comprehensive medical responses in Chinese
- June 29, 2025: Successfully migrated from OpenAI API to Google Gemini API (gemini-1.5-flash)
  - Replaced all OpenAI API calls with Gemini API integration
  - Updated service files to use GoogleGenAI client with proper authentication
  - Fixed JSON parsing and error handling for Gemini responses
  - Verified multi-agent assessment system working with Gemini AI
  - Updated environment variables from OPENAI_API_KEY to GEMINI_API_KEY
- June 29, 2025: Initial setup with OpenAI integration