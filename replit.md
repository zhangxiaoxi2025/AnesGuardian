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

## Changelog

- June 30, 2025: Fixed evaluation system stuck in "进行中" status
  - Resolved multi-agent assessment system getting stuck in progress state
  - Implemented SimpleAgentOrchestrator as reliable fallback for complex API failures
  - Created assessment reset endpoint for restarting stuck evaluations
  - Verified complete assessment workflow generating comprehensive risk analysis
  - System now properly handles 6-agent workflow: EMR extraction, risk assessment, drug analysis, guidelines consultation, quality checking, and final reporting
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