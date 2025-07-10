import { patients, assessments, agentLogs, type Patient, type InsertPatient, type Assessment, type InsertAssessment, type AgentLog, type InsertAgentLog } from "@shared/schema";

export interface IStorage {
  // Patient operations
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;
  getAllPatients(): Promise<Patient[]>;

  // Assessment operations
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentByPatientId(patientId: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  getAllAssessments(): Promise<Assessment[]>;

  // Agent log operations
  createAgentLog(log: InsertAgentLog): Promise<AgentLog>;
  getAgentLogsByAssessment(assessmentId: number): Promise<AgentLog[]>;
}

export class MemStorage implements IStorage {
  private patients: Map<number, Patient> = new Map();
  private assessments: Map<number, Assessment> = new Map();
  private agentLogs: Map<number, AgentLog> = new Map();
  private currentPatientId: number = 1;
  private currentAssessmentId: number = 1;
  private currentAgentLogId: number = 1;

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.currentPatientId++;
    const patient: Patient = {
      id,
      name: insertPatient.name,
      age: insertPatient.age,
      gender: insertPatient.gender,
      surgeryType: insertPatient.surgeryType,
      asaClass: insertPatient.asaClass,
      medicalHistory: Array.isArray(insertPatient.medicalHistory) ? insertPatient.medicalHistory : [],
      medications: Array.isArray(insertPatient.medications) ? insertPatient.medications : [],
      allergies: Array.isArray(insertPatient.allergies) ? insertPatient.allergies : [],
      vitalSigns: insertPatient.vitalSigns || {},
      labResults: insertPatient.labResults || {},
      createdAt: new Date(),
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: number, update: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updatedPatient = { ...patient, ...update };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  async deletePatient(id: number): Promise<boolean> {
    const existed = this.patients.has(id);
    if (existed) {
      this.patients.delete(id);
      // Also clean up related assessments and agent logs
      const assessments = Array.from(this.assessments.values()).filter(a => a.patientId === id);
      assessments.forEach(assessment => {
        this.assessments.delete(assessment.id);
        // Clean up agent logs for this assessment
        const logs = Array.from(this.agentLogs.values()).filter(log => log.assessmentId === assessment.id);
        logs.forEach(log => this.agentLogs.delete(log.id));
      });
    }
    return existed;
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async getAssessmentByPatientId(patientId: number): Promise<Assessment | undefined> {
    return Array.from(this.assessments.values()).find(a => a.patientId === patientId);
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.currentAssessmentId++;
    const assessment: Assessment = {
      id,
      patientId: insertAssessment.patientId,
      status: insertAssessment.status || "in_progress",
      overallRisk: insertAssessment.overallRisk || null,
      riskFactors: Array.isArray(insertAssessment.riskFactors) ? insertAssessment.riskFactors : [],
      drugInteractions: Array.isArray(insertAssessment.drugInteractions) ? insertAssessment.drugInteractions : [],
      clinicalGuidelines: Array.isArray(insertAssessment.clinicalGuidelines) ? insertAssessment.clinicalGuidelines : [],
      recommendations: Array.isArray(insertAssessment.recommendations) ? insertAssessment.recommendations : [],
      agentStatus: insertAssessment.agentStatus || {},
      createdAt: new Date(),
      completedAt: null,
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  async updateAssessment(id: number, update: Partial<InsertAssessment>): Promise<Assessment | undefined> {
    console.log(`Storage: Updating assessment ${id} with:`, JSON.stringify(update, null, 2));
    const assessment = this.assessments.get(id);
    if (!assessment) {
      console.log(`Storage: Assessment ${id} not found`);
      return undefined;
    }
    
    const updatedAssessment = { ...assessment, ...update };
    this.assessments.set(id, updatedAssessment);
    console.log(`Storage: Assessment ${id} updated successfully. New status: ${updatedAssessment.status}`);
    return updatedAssessment;
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return Array.from(this.assessments.values());
  }

  async createAgentLog(insertLog: InsertAgentLog): Promise<AgentLog> {
    const id = this.currentAgentLogId++;
    const log: AgentLog = {
      id,
      assessmentId: insertLog.assessmentId,
      agentName: insertLog.agentName,
      action: insertLog.action,
      status: insertLog.status,
      result: insertLog.result || null,
      createdAt: new Date(),
    };
    this.agentLogs.set(id, log);
    return log;
  }

  async getAgentLogsByAssessment(assessmentId: number): Promise<AgentLog[]> {
    return Array.from(this.agentLogs.values()).filter(log => log.assessmentId === assessmentId);
  }
}

export const storage = new MemStorage();
