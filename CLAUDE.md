# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AnesGuardian (麻醉守护神)** is a perioperative intelligent decision support system for anesthesiologists, providing AI-driven preoperative risk assessment, drug interaction analysis, and clinical decision support.

**Tech Stack**: Full-stack TypeScript with React 18 + Vite frontend, Express backend, PostgreSQL + Drizzle ORM, and Google Gemini AI integration.

## Development Commands

```bash
# Development
npm run dev              # Start dev server (frontend on :5173, backend on :5000)
npm run check            # Run TypeScript type checking

# Testing
npm run test             # Run all tests with Vitest
npm run test:ui          # Open Vitest UI (interactive test interface)
npm run test:coverage    # Generate test coverage report

# Database
npm run db:push          # Sync Drizzle schema to PostgreSQL database

# Build & Deploy
npm run build            # Build for production (outputs to dist/)
npm start                # Start production server
```

## Architecture

### Project Structure

```
├── client/              # React SPA (Vite + TypeScript)
│   └── src/
│       ├── pages/       # 10 page components (dashboard, patients, chat, etc.)
│       ├── components/  # Reusable components + 47 shadcn/ui components
│       └── contexts/    # AuthContext for Supabase authentication
├── server/              # Express API (TypeScript ESM)
│   ├── services/        # 11 business logic services
│   ├── middleware/      # auth, permission, rate-limit, security, error-handler
│   ├── utils/           # sanitize, errors, rbac utilities
│   ├── routes.ts        # ~1500 lines of API endpoints
│   └── storage.ts       # Data access layer abstraction
└── shared/
    └── schema.ts        # Drizzle ORM schema (8 tables, ~293 lines)
```

### Three-Layer Architecture

```
Frontend (React + TanStack Query)
    ↕ REST API
Backend (Express + Services)
    ↕ Drizzle ORM
Database (PostgreSQL)
```

## Authentication & Authorization

**Critical**: This system implements enterprise-grade RBAC with multi-tenant isolation.

### Auth Flow

1. **Supabase Authentication**: JWT-based user authentication
2. **Auth Middleware** (`server/middleware/auth.ts`):
   - Extracts JWT from `Authorization: Bearer <token>` header or cookies
   - Verifies token with Supabase
   - Queries/creates user record in local database
   - Attaches `req.user` with: `{ id, email, role, organizationId, displayName }`

3. **Permission Middleware** (`server/middleware/permission.ts`):
   - **Roles**: `admin` | `doctor` | `nurse` | `user` | `guest`
   - **Resources**: `patient`, `assessment`, `report`, `drug`
   - **Actions**: `create`, `read`, `update`, `delete`, `share`

### Permission Rules (RBAC)

**Patient Access Rules** (implemented in `server/utils/rbac.ts`):
1. **Admin**: Can access all patients
2. **Creator**: Can access patients they created
3. **Organization Members**: Doctors/nurses can access org patients
4. **Shared Access**: Users can access patients shared with them

**Data Isolation**: Every patient record has:
- `createdBy`: UUID (creator user ID)
- `organizationId`: number (optional, for team isolation)
- `sharedWith`: UUID[] (array of user IDs with shared access)

### Environment Variables

**CRITICAL SECURITY**: Different keys for frontend vs backend!

```env
# Backend (private, never exposed to client)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...    # Full database access
GEMINI_API_KEY=...

# Frontend (public, bundled into client)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...       # Limited by RLS rules
```

## Multi-Agent AI System

The core innovation is a **6-agent orchestration system** for risk assessment:

```
SimpleAgentOrchestrator (server/services/simple-agents.ts)
├── EMR Extractor Agent       → Extract data from medical records
├── Risk Assessor Agent       → Evaluate airway, cardiovascular, etc.
├── Drug Analyzer Agent       → Check drug interactions
├── Guideline Consultant      → Search clinical guidelines
├── Quality Checker Agent     → Validate results
└── Report Generator          → Generate comprehensive reports
```

**Key Implementation**: `server/services/simple-agents.ts` (~600 lines)

### AI Services

**Google Gemini Integration** (`server/services/gemini.ts`):
- **gemini-1.5-flash**: Multimodal image analysis (OCR medical records)
- **gemini-2.5-flash-lite**: Text generation (drug analysis, chat)

**Smart Retry Mechanism**: Auto-increases token limits (2048 → 4096 → 8192) if response truncated

**Two-Step Drug Interaction Analysis**:
1. Quick check: "Does interaction exist?" (Yes/No)
2. Detailed analysis: Only if interaction exists (saves 70% cost)

## Database Schema

8 core tables in `shared/schema.ts`:

```typescript
users                    // Synced from Supabase (UUID primary key)
├── id: UUID
├── email: TEXT (unique)
├── role: TEXT          // 'admin' | 'doctor' | 'nurse' | 'user'
└── organizationId: INTEGER

organizations           // Teams/hospitals
├── id: SERIAL
├── name: TEXT
└── type: TEXT         // 'hospital' | 'clinic' | 'team' | 'personal'

patients                // Core business entity
├── id: SERIAL
├── createdBy: UUID    // 🔑 Multi-tenant isolation
├── organizationId: INTEGER
├── sharedWith: JSON   // UUID[] for sharing
├── name, age, gender, surgeryType, asaClass
├── medicalHistory: JSON (STRING[])
├── medications: JSON (STRING[])
├── allergies: JSON (STRING[])
└── vitalSigns, labResults: JSON (OBJECT)

assessments             // Risk assessment results
├── id: SERIAL
├── patientId: INTEGER
├── status: TEXT       // 'in_progress' | 'completed' | 'failed'
├── overallRisk: TEXT  // 'low' | 'medium' | 'high'
├── riskFactors: JSON (RiskFactor[])
├── drugInteractions: JSON (DrugInteraction[])
└── agentStatus: JSON  // Real-time agent progress

drugs                   // 318 drugs in database
├── id: SERIAL
├── name: TEXT (unique)
├── category: TEXT
├── interactions: JSON
├── anesthesiaRelevant: BOOLEAN
└── isCommonAnesthesia: BOOLEAN

medical_reports         // OCR + AI analyzed reports
├── id: SERIAL
├── patientId: INTEGER
├── reportType: TEXT   // 'ecg' | 'echo' | 'ct' | 'xray' | 'blood_routine' etc.
├── uploadMethod: TEXT // 'image' | 'text'
├── originalImage: TEXT (base64)
└── analyzedData: JSON

agent_logs              // Audit trail for AI agents
└── assessmentId, agentName, action, status, result

user_organizations      // Many-to-many user-org relationship
└── userId, organizationId, role, permissions
```

### Indexes

**Performance-critical indexes**:
- `users(email)`, `users(organizationId)`
- `patients(createdBy)`, `patients(organizationId)`, `patients(createdAt)`
- `drugs(name)`, `drugs(category)`, `drugs(isCommonAnesthesia)`

## API Routes

**All patient routes require authentication + permission checks**:

```typescript
// Patient Management
GET    /api/patients                    // Returns user-accessible patients (filtered)
POST   /api/patients                    // Requires 'patient:create' (doctor/admin only)
GET    /api/patients/:id                // Requires checkPatientAccess middleware
PATCH  /api/patients/:id                // Requires canModifyPatient (creator/org/admin)
DELETE /api/patients/:id                // Requires canDeletePatient (admin/creator-doctor only)

// Patient Sharing (NEW)
POST   /api/patients/:id/share          // Share patient with another user (creator/admin)
DELETE /api/patients/:id/share/:userId  // Unshare patient

// Risk Assessment
POST   /api/patients/:id/assess         // Start AI assessment (rate limited: 10/min)
GET    /api/patients/:id/assessment     // Get assessment results

// Drug Analysis
POST   /api/drugs/interactions          // Analyze drug interactions
GET    /api/drugs/search?q=...          // Search drugs by name

// Medical Reports
POST   /api/medical-reports/analyze     // Upload + OCR + AI analysis (rate limited: 5/min)
```

**Security Middleware Chain**:
```
Request → CORS → Helmet → Rate Limiter → authenticate →
  requirePermission → checkPatientAccess → sanitizeInput →
  Business Logic → asyncHandler → Response
```

## Key Implementation Patterns

### 1. Medical Record Analysis (Multimodal AI)

```typescript
// Priority: Direct image analysis with Gemini Vision
const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await visionModel.generateContent([
  MEDICAL_RECORD_ANALYSIS_PROMPT,
  { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
]);

// Fallback: Tesseract.js OCR + AI extraction
const { data: { text } } = await Tesseract.recognize(imageBuffer, 'chi_sim+eng');
const extractedData = await gemini.generateContent(`Extract from: ${text}`);
```

### 2. Smart Token Retry

```typescript
// Auto-upgrade token limits if response truncated
const tokenLimits = [2048, 4096, 8192];
for (const maxTokens of tokenLimits) {
  const result = await generateContent({ maxOutputTokens: maxTokens });
  if (!isTruncated(result)) return result;
}

// 4 truncation detection methods:
// 1. Empty response  2. Ends with '...'  3. Incomplete JSON  4. MAX_TOKENS finish reason
```

### 3. Permission Checking Pattern

```typescript
// Always check permissions before data modification
const patient = await storage.getPatient(patientId);
const canModify = canModifyPatient({
  patientId: patient.id,
  userId: req.user!.id,
  userRole: req.user!.role,
  userOrgId: req.user!.organizationId,
  patientCreatedBy: patient.createdBy,
  patientOrgId: patient.organizationId,
});

if (!canModify) {
  throw new ForbiddenError('您没有权限修改此患者信息');
}
```

### 4. TanStack Query Pattern (Frontend)

```typescript
// Server state with automatic refetching
const { data: patients } = useQuery({
  queryKey: ['patients'],
  queryFn: async () => {
    const res = await fetch('/api/patients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  staleTime: 5 * 60 * 1000,  // 5 minutes
});

// Polling for assessment progress
const { data: assessment } = useQuery({
  queryKey: ['assessment', id],
  queryFn: () => fetchAssessment(id),
  refetchInterval: assessment?.status === 'in_progress' ? 2000 : false,
});
```

## Common Tasks

### Adding a New API Endpoint

1. **Add route in `server/routes.ts`**:
```typescript
app.post("/api/your-endpoint",
  authenticate,                    // 1. Require authentication
  requirePermission('resource', 'action'),  // 2. Check permissions
  asyncHandler(async (req, res) => {
    const sanitized = sanitizeInput(req.body);  // 3. Sanitize input
    const result = insertSchema.safeParse(sanitized);  // 4. Validate with Zod

    if (!result.success) {
      throw new ValidationError('Invalid data', result.error.issues);
    }

    // 5. Business logic
    const data = await storage.createSomething(result.data);
    res.json(data);
  })
);
```

2. **Update Storage Layer** if needed (add methods to `IStorage` interface + `MemStorage` class)

3. **Frontend**: Create TanStack Query hook in component

### Adding a Database Table

1. **Define schema in `shared/schema.ts`**:
```typescript
export const yourTable = pgTable("your_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertYourTableSchema = createInsertSchema(yourTable).omit({
  id: true,
  createdAt: true,
});
```

2. **Push to database**: `npm run db:push`

3. **Update Storage**: Add CRUD methods to `server/storage.ts`

### Adding a UI Component

1. **Use shadcn/ui**: `npx shadcn@latest add button` (or any component)
2. **Create in `client/src/components/`**: Follow existing component patterns
3. **Import in page**: `import { YourComponent } from '@/components/your-component'`

## Security Considerations

**Input Validation**: All user input must pass through:
1. Zod schema validation (`insertPatientSchema.safeParse(data)`)
2. `sanitizeInput()` to prevent XSS/SQL injection
3. File upload: Type checking + size limits (max 10MB)

**Authentication**:
- JWT tokens in `Authorization: Bearer <token>` header
- Token refresh handled by Supabase client
- Server-side validation via `authenticate` middleware

**Rate Limiting**:
- Global API: 100 requests/15min per IP
- AI endpoints: 10 requests/min per IP
- File uploads: 5 requests/min per IP

**CORS**: Configured in `server/middleware/security.ts`
- Development: localhost:5173, localhost:5000
- Production: Set `ALLOWED_ORIGINS` environment variable

## Troubleshooting

**"User not found" errors**: Check that:
1. User logged in via Supabase
2. User record created in local `users` table (auto-created on first login)
3. JWT token valid and not expired

**"Permission denied" errors**: Check:
1. User's `role` in database matches required permission
2. Patient's `createdBy` or `sharedWith` includes user ID
3. User's `organizationId` matches patient's `organizationId` (if applicable)

**AI response truncated**:
- System automatically retries with higher token limits
- If still failing, check `generationConfig.maxOutputTokens` in `server/services/gemini.ts`

**Database connection issues**:
- Verify `DATABASE_URL` in `.env`
- Check Neon database status
- Run `npm run db:push` to sync schema

## Important Files Reference

```
Frontend Entry:        client/src/main.tsx, client/src/App.tsx
API Routes:            server/routes.ts (~1500 lines)
Auth System:           server/middleware/auth.ts, server/middleware/permission.ts
RBAC Utilities:        server/utils/rbac.ts
Database Schema:       shared/schema.ts
Multi-Agent Core:      server/services/simple-agents.ts
AI Integration:        server/services/gemini.ts, server/services/chat.ts
Storage Layer:         server/storage.ts
Security Config:       server/middleware/security.ts, server/middleware/rate-limit.ts
```

## Medical Domain Knowledge

**ASA Physical Status Classification** (used in risk assessment):
- ASA I: Healthy patient
- ASA II: Mild systemic disease
- ASA III: Severe systemic disease
- ASA IV: Severe disease, constant threat to life
- ASA V: Moribund, not expected to survive
- ASA VI: Brain-dead organ donor

**Risk Assessment Categories**:
- Airway: Mallampati score, thyromental distance, mouth opening
- Cardiovascular: RCRI score, ejection fraction, arrhythmias
- Thrombosis: Wells score, Padua score, Caprini score
- PONV: Apfel score (postoperative nausea/vomiting)
- Bleeding: Anticoagulant use, platelet count
- Renal/Hepatic: eGFR, creatinine, liver enzymes

**Drug Interaction Severity Levels**:
- **Minor**: Minimal clinical significance
- **Moderate**: Monitor patient, may need dose adjustment
- **Major**: Avoid combination or use with extreme caution

## Recent System Changes

**v2.1.2 (2025-11-11)**: Account isolation Phase 4-5 completion
- **Phase 4 - Security Hardening**:
  - Implemented comprehensive audit logging system (`server/utils/audit-logger.ts`)
    - Tracks all authentication, authorization, and data access events
    - Structured JSON logging for production, human-readable for development
    - Automatic log cleanup (保留最近30天)
    - Query interface with filters (userId, action, resource, status, time range)
  - Implemented LRU caching system (`server/utils/permission-cache.ts`)
    - Permission cache: 1000 items, 5-minute TTL
    - User session cache: 500 items, 5-minute TTL
    - Automatic cleanup of expired items
    - Explicit cache invalidation on data changes
  - Integrated audit logging and caching into:
    - Authentication middleware (`server/middleware/auth.ts`)
    - Permission checking middleware (`server/middleware/permission.ts`)
    - Patient CRUD and sharing endpoints (`server/routes.ts`)

- **Phase 5.1 - Unit Testing**:
  - Configured Vitest testing framework with happy-dom
  - Created 49 passing unit tests across 2 test files:
    - `tests/unit/utils/audit-logger.test.ts` (24 tests)
    - `tests/unit/utils/permission-cache.test.ts` (25 tests)
  - Test coverage:
    - audit-logger.ts: 96.82% statements, 97.43% branches
    - permission-cache.ts: 73.21% statements, 50% branches
    - Overall: 85.71% statements coverage
  - Testing documentation: `docs/测试文档.md`

**v2.1.1 (2025-11-08)**: Account isolation implementation
- Added multi-tenant RBAC system with organization support
- Implemented patient sharing functionality
- Fixed environment variable security (separated frontend/backend Supabase keys)
- Migrated from `getAllPatients()` to `getPatientsByUser()` for permission filtering
- Added 8 new API endpoints for patient sharing and access control

**Week 1 Security Hardening**:
- Rate limiting (global, AI, upload endpoints)
- Helmet security headers + CSP
- Enhanced CORS configuration
- Input validation and XSS/SQL injection protection
- Unified error handling with custom error classes
