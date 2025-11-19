import { pgTable, text, serial, integer, boolean, timestamp, json, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================================
// 用户与组织管理表 (User & Organization Management)
// ===================================

// 用户表 - 从Supabase同步的用户信息
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // 使用Supabase的UUID
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").notNull().default("user"), // 'admin', 'doctor', 'nurse', 'user'
  organizationId: integer("organization_id"),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  orgIdx: index("users_org_idx").on(table.organizationId),
}));

// 组织/团队表
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("personal"), // 'hospital', 'clinic', 'team', 'personal'
  description: text("description"),
  settings: json("settings").$type<{
    allowSharing?: boolean;
    requireApproval?: boolean;
    [key: string]: any;
  }>().default({}).notNull(),
  createdBy: uuid("created_by"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("orgs_name_idx").on(table.name),
}));

// 用户-组织关联表
export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'
  permissions: json("permissions").$type<{
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    [key: string]: any;
  }>().default({}).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  userOrgIdx: index("user_orgs_user_org_idx").on(table.userId, table.organizationId),
}));

// ===================================
// 核心业务表 (Core Business Tables)
// ===================================

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  // 用户关联字段 (新增)
  createdBy: uuid("created_by").notNull(), // 创建该患者的用户ID
  organizationId: integer("organization_id"), // 所属组织ID
  sharedWith: json("shared_with").$type<string[]>().default([]).notNull(), // 共享给的用户ID数组
  // 患者基本信息
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  surgeryType: text("surgery_type").default(""),
  asaClass: text("asa_class").notNull(),
  medicalHistory: json("medical_history").$type<string[]>().default([]).notNull(),
  medications: json("medications").$type<string[]>().default([]).notNull(),
  allergies: json("allergies").$type<string[]>().default([]).notNull(),
  vitalSigns: json("vital_signs").$type<Record<string, any>>().default({}).notNull(),
  labResults: json("lab_results").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdByIdx: index("patients_created_by_idx").on(table.createdBy),
  orgIdx: index("patients_org_idx").on(table.organizationId),
  createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
}));

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, failed
  overallRisk: text("overall_risk"), // low, medium, high
  riskFactors: json("risk_factors").$type<RiskFactor[]>().default([]).notNull(),
  drugInteractions: json("drug_interactions").$type<DrugInteraction[]>().default([]).notNull(),
  clinicalGuidelines: json("clinical_guidelines").$type<ClinicalGuideline[]>().default([]).notNull(),
  recommendations: json("recommendations").$type<string[]>().default([]).notNull(),
  agentStatus: json("agent_status").$type<Record<string, AgentStatus>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id).notNull(),
  agentName: text("agent_name").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  result: json("result").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drugs = pgTable("drugs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  englishName: text("english_name"),
  aliases: json("aliases").$type<string[]>().default([]).notNull(),
  category: text("category").notNull(), // '麻醉药物', '心血管药物', '抗凝药物' 等
  // 药物详细信息
  mechanism: text("mechanism"), // 作用机制
  indications: json("indications").$type<string[]>().default([]),
  stopGuideline: text("stop_guideline"), // 术前停药指南
  contraindications: json("contraindications").$type<string[]>().default([]),
  sideEffects: json("side_effects").$type<string[]>().default([]),
  interactions: json("interactions").$type<any>().default({}),
  dosage: text("dosage"),
  // 麻醉相关字段 (新增)
  anesthesiaRelevant: boolean("anesthesia_relevant").default(false).notNull(), // 是否为麻醉相关药物
  anesthesiaCategory: text("anesthesia_category"), // 麻醉药物分类
  isCommonAnesthesia: boolean("is_common_anesthesia").default(false).notNull(), // 是否为常用麻醉药
  source: text("source").default("seed").notNull(), // 'seed', 'ai', 'manual' - 数据来源
  searchCount: integer("search_count").default(0).notNull(), // 搜索次数统计
  // 时间戳
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("drugs_name_idx").on(table.name),
  categoryIdx: index("drugs_category_idx").on(table.category),
  commonAnesthesiaIdx: index("drugs_common_anesthesia_idx").on(table.isCommonAnesthesia),
}));

export const medicalReports = pgTable("medical_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  reportType: text("report_type").notNull(), // 'ecg', 'echo', 'ct', 'xray', 'blood_routine', 'biochemistry', 'coagulation', 'blood_gas'
  uploadMethod: text("upload_method").notNull(), // 'image', 'text'
  originalImage: text("original_image"), // base64 encoded image (仅图片上传)
  extractedText: text("extracted_text"), // OCR提取的文本
  manualText: text("manual_text"), // 手动输入的文本
  analyzedData: json("analyzed_data").$type<Record<string, any>>().default({}).notNull(), // AI分析结果
  riskFactors: json("risk_factors").$type<string[]>().default([]).notNull(), // 识别的风险因素
  recommendations: json("recommendations").$type<string[]>().default([]).notNull(), // 围术期建议
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
// 用户和组织相关schema
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  lastLoginAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations).omit({
  id: true,
  joinedAt: true,
});

// 患者相关schema
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
}).extend({
  surgeryType: z.string().optional().default(""),
  createdBy: z.string().uuid(),
  sharedWith: z.array(z.string().uuid()).optional().default([]),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDrugSchema = createInsertSchema(drugs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalReportSchema = createInsertSchema(medicalReports).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
// 用户和组织类型
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;

// 患者和评估类型
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;

export type Drug = typeof drugs.$inferSelect;
export type InsertDrug = z.infer<typeof insertDrugSchema>;

export type MedicalReport = typeof medicalReports.$inferSelect;
export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;

// Additional types for complex data structures
export interface RiskFactor {
  type: 'airway' | 'cardiovascular' | 'thrombosis' | 'ponv' | 'bleeding' | 'renal' | 'hepatic' | 'metabolic' | 'other';
  level: 'low' | 'medium' | 'high';
  description: string;
  score?: number;
  recommendations: string[];
}

export interface DrugInteraction {
  id: string;
  drugs: string[];
  severity: 'minor' | 'moderate' | 'major';
  summary?: string;
  description: string;
  recommendations: string[];
}

export interface ClinicalGuideline {
  id: string;
  title: string;
  organization: string;
  year: number;
  relevance: 'low' | 'medium' | 'high';
  summary: string;
  recommendations: string[];
}

export interface AgentStatus {
  name: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  progress: number;
  lastAction: string;
  results?: any;
}

// Medical report types and interfaces
export type ReportType = 'ecg' | 'echo' | 'ct' | 'xray' | 'blood_routine' | 'biochemistry' | 'coagulation' | 'blood_gas';
export type UploadMethod = 'image' | 'text';

export interface MedicalReportAnalysis {
  reportType: ReportType;
  keyFindings: string[];
  abnormalValues: Array<{
    parameter: string;
    value: string;
    normalRange: string;
    significance: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  clinicalSignificance: string;
  anesthesiaImplications: string[];
}

export interface ReportTypeConfig {
  id: ReportType;
  name: string;
  category: 'examination' | 'laboratory';
  description: string;
  keyParameters: string[];
}
