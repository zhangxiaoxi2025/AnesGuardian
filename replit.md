# Anesthesia Guardian - Medical AI Assessment System

## Overview
Anesthesia Guardian (麻醉守护神) is a comprehensive medical AI system providing intelligent perioperative risk assessment for anesthesia care. It utilizes multiple AI agents to analyze patient data, assess risks, check drug interactions, and offer evidence-based clinical recommendations. The system aims to provide real-time monitoring, patient management, and professional medical guidance, enhancing decision-making for medical staff. Key capabilities include multi-modal AI medical record analysis, multi-agent collaborative assessment, intelligent drug interaction analysis, clinical guideline matching, and professional report generation.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-10-09: 病历识别AI精神科信息提取优化
- **优化内容**: 增强AI提示词，解决精神科疾病缺失和药物名称混淆问题
- **问题修复**:
  - 精神科疾病（如抑郁症）现在必须作为独立病史条目提取
  - 强化药物名称准确性，防止混淆（如氟哌嗪吨美利曲 vs 氟哌啶醇）
- **技术实现**: 在AI提示词中添加强制逻辑规则和具体示例
- **修改文件**: `server/routes.ts`, `server/services/medical-record-processor.ts`
- **详细文档**: `docs/优化记录-病历识别AI精神科信息提取-20251009.md`

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ESM)
- **Database**: PostgreSQL (Neon Database) for persistence, Drizzle ORM for type-safe operations. In-memory storage (MemStorage) for development.
- **AI Integration**: Google Gemini API (gemini-1.5-flash, gemini-2.5-flash-lite-preview-06-17) for medical analysis and AI chat.
- **Session Management**: In-memory session storage.

### Database Design
- **patients**: Patient demographics, medical history, vital signs.
- **assessments**: Risk assessment results, AI agent status.
- **agentLogs**: AI agent activity logs.
- **drugs**: Comprehensive drug information including name, aliases, category, and preoperative guidelines.

### Core Architectural Decisions & Features
- **Multi-Agent System**: Orchestrates specialized AI agents (Orchestrator, EMR Extractor, Risk Assessor, Drug Analyzer, Guideline Consultant, Quality Checker).
- **Medical Risk Assessment**: Evaluates Airway, Cardiovascular, Thrombosis, PONV, and other perioperative risks using established scoring systems (Mallampati, Goldman, Caprini, Apfel).
- **Multi-modal AI**: Supports text and image analysis for medical records (OCR and intelligent information extraction).
- **Intelligent Drug Interaction Analysis**: Leverages a comprehensive drug database and AI for deep analysis, providing warnings and clinical management strategies.
- **Clinical Guideline Matching**: Automatically matches relevant anesthesia and surgical guidelines based on patient data.
- **Real-time Assessment Dashboard**: Visualizes AI agent activities and assessment progress.
- **AI Q&A Chat**: Professional AI question-answering system for medical inquiries.
- **Comprehensive Reporting**: Generates structured medical assessment reports with detailed risk factor analysis, exportable as HTML/PDF.
- **Robustness**: Implements AI smart retry mechanisms for truncated responses and an AssessmentManager with timeout protection for stuck evaluations.
- **UI/UX**: Features a single-column vertical layout for consistent display across devices, interactive drug interaction alerts, and professional patient management interfaces.

## External Dependencies
- **Google Gemini API**: (gemini-1.5-flash, gemini-2.5-flash-lite-preview-06-17) For all AI-powered medical analysis and chat functionalities.
- **Neon Database**: Serverless PostgreSQL for data persistence.
- **Drizzle ORM**: For database interactions and schema management.
- **Radix UI**: Accessible component primitives for the user interface.
- **Tesseract.js**: For OCR text recognition from medical documents.

## Environment Configuration

### Required Environment Variables
The application requires the following environment variables to be configured:

#### Essential Variables (Required)
- `GEMINI_API_KEY`: Google Gemini AI API key for medical analysis and chat functionality
- `DATABASE_URL`: PostgreSQL database connection string
- `NODE_ENV`: Application environment (development/production)

#### Optional Variables
- `OPENAI_API_KEY`: OpenAI API key (backup AI service)
- `ANTHROPIC_API_KEY`: Anthropic Claude API key (backup AI service)
- `SESSION_SECRET`: Secret key for session management (required in production)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging verbosity (error/warn/info/debug)

### Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your actual API keys and database URL
   nano .env
   ```

3. **Set up the database**:
   ```bash
   # The application will automatically create tables on first run
   # Ensure your DATABASE_URL points to a valid PostgreSQL instance
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Production Deployment

#### Security Considerations
- **Never commit .env files** to version control
- **Use environment-specific secrets management** for production deployments
- **Rotate API keys regularly** and implement monitoring for unusual usage
- **Use HTTPS** for all production deployments
- **Implement rate limiting** for API endpoints

#### Deployment Steps
1. **Prepare environment variables** in your hosting platform
2. **Set NODE_ENV=production**
3. **Configure database** with proper connection pooling
4. **Set up monitoring** for application health and performance
5. **Configure backup strategies** for database and critical data

#### Recommended Production Configuration
```bash
NODE_ENV=production
SESSION_SECRET=<strong-random-secret>
DATABASE_URL=<production-database-url>
GEMINI_API_KEY=<production-api-key>
LOG_LEVEL=warn
CORS_ORIGIN=<your-domain>
```

### Security Guidelines

#### API Key Management
- Store all API keys in environment variables, never in code
- Use different API keys for development and production environments
- Implement proper error handling to avoid exposing keys in error messages
- Monitor API usage and set up alerts for unusual activity

#### Database Security
- Use connection pooling and prepared statements
- Implement proper backup and recovery procedures
- Regularly update database credentials
- Monitor for unauthorized access attempts

#### Application Security
- Keep all dependencies updated
- Implement proper input validation and sanitization
- Use HTTPS for all communications
- Implement proper session management and CSRF protection