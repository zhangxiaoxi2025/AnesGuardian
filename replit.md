# Anesthesia Guardian - Medical AI Assessment System

## Overview
Anesthesia Guardian (麻醉守护神) is a comprehensive medical AI system providing intelligent perioperative risk assessment for anesthesia care. It utilizes multiple AI agents to analyze patient data, assess risks, check drug interactions, and offer evidence-based clinical recommendations. The system aims to provide real-time monitoring, patient management, and professional medical guidance, enhancing decision-making for medical staff. Key capabilities include multi-modal AI medical record analysis, multi-agent collaborative assessment, intelligent drug interaction analysis, clinical guideline matching, and professional report generation.

## User Preferences
Preferred communication style: Simple, everyday language.

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