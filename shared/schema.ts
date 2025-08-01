import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
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
});

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
  aliases: json("aliases").$type<string[]>().default([]).notNull(),
  category: text("category").notNull(), // '麻醉药物', '心血管药物', '抗凝药物' 等
  stopGuideline: text("stop_guideline"), // 术前停药指南
  contraindications: json("contraindications").$type<string[]>().default([]),
  sideEffects: json("side_effects").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
}).extend({
  surgeryType: z.string().optional().default(""),
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
