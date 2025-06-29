import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  surgeryType: text("surgery_type").notNull(),
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

// Zod schemas for validation
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
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

// TypeScript types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;

// Additional types for complex data structures
export interface RiskFactor {
  type: 'airway' | 'cardiovascular' | 'thrombosis' | 'ponv' | 'other';
  level: 'low' | 'medium' | 'high';
  description: string;
  score?: number;
  recommendations: string[];
}

export interface DrugInteraction {
  id: string;
  drugs: string[];
  severity: 'minor' | 'moderate' | 'major';
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
