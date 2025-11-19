import { patients, assessments, agentLogs, medicalReports, users, type Patient, type InsertPatient, type Assessment, type InsertAssessment, type AgentLog, type InsertAgentLog, type MedicalReport, type InsertMedicalReport, type User } from "@shared/schema";
import type { UserRole } from './middleware/permission';

export interface IStorage {
  // Patient operations
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;
  getAllPatients(): Promise<Patient[]>;

  // 🆕 User-scoped patient operations (权限过滤的患者查询)
  getPatientsByUser(userId: string, userRole: UserRole, userOrgId?: number): Promise<Patient[]>;
  sharePatient(patientId: number, sharedWithUserId: string): Promise<boolean>;
  unsharePatient(patientId: number, sharedWithUserId: string): Promise<boolean>;

  // Assessment operations
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentByPatientId(patientId: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  getAllAssessments(): Promise<Assessment[]>;

  // Agent log operations
  createAgentLog(log: InsertAgentLog): Promise<AgentLog>;
  getAgentLogsByAssessment(assessmentId: number): Promise<AgentLog[]>;

  // Medical report operations
  getMedicalReport(id: number): Promise<MedicalReport | undefined>;
  getMedicalReportsByPatientId(patientId: number): Promise<MedicalReport[]>;
  createMedicalReport(report: InsertMedicalReport): Promise<MedicalReport>;
  updateMedicalReport(id: number, report: Partial<InsertMedicalReport>): Promise<MedicalReport | undefined>;
  deleteMedicalReport(id: number): Promise<boolean>;

  // 🆕 User operations
  getUser(id: string): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private patients: Map<number, Patient> = new Map();
  private assessments: Map<number, Assessment> = new Map();
  private agentLogs: Map<number, AgentLog> = new Map();
  private medicalReports: Map<number, MedicalReport> = new Map();
  private users: Map<string, User> = new Map(); // 🆕 用户存储（UUID -> User）
  private currentPatientId: number = 1;
  private currentAssessmentId: number = 1;
  private currentAgentLogId: number = 1;
  private currentMedicalReportId: number = 1;

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

  // Medical report operations
  async getMedicalReport(id: number): Promise<MedicalReport | undefined> {
    return this.medicalReports.get(id);
  }

  async getMedicalReportsByPatientId(patientId: number): Promise<MedicalReport[]> {
    return Array.from(this.medicalReports.values()).filter(report => report.patientId === patientId);
  }

  async createMedicalReport(insertReport: InsertMedicalReport): Promise<MedicalReport> {
    const id = this.currentMedicalReportId++;
    const report: MedicalReport = {
      id,
      patientId: insertReport.patientId,
      reportType: insertReport.reportType,
      uploadMethod: insertReport.uploadMethod,
      originalContent: insertReport.originalContent,
      extractedText: insertReport.extractedText || null,
      analysisResult: insertReport.analysisResult || null,
      status: insertReport.status || "pending",
      createdAt: new Date(),
    };
    this.medicalReports.set(id, report);
    return report;
  }

  async updateMedicalReport(id: number, update: Partial<InsertMedicalReport>): Promise<MedicalReport | undefined> {
    const report = this.medicalReports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...update };
    this.medicalReports.set(id, updatedReport);
    return updatedReport;
  }

  async deleteMedicalReport(id: number): Promise<boolean> {
    const existed = this.medicalReports.has(id);
    if (existed) {
      this.medicalReports.delete(id);
    }
    return existed;
  }

  // 🆕 User-scoped patient operations implementation

  /**
   * 根据用户权限获取患者列表
   * @param userId 用户ID
   * @param userRole 用户角色
   * @param userOrgId 用户所属组织ID
   * @returns 用户可访问的患者列表
   */
  async getPatientsByUser(userId: string, userRole: UserRole, userOrgId?: number): Promise<Patient[]> {
    const allPatients = Array.from(this.patients.values());

    // Admin可以查看所有患者
    if (userRole === 'admin') {
      return allPatients;
    }

    // 过滤出用户可以访问的患者
    return allPatients.filter(patient => {
      // 1. 创建者可以访问自己创建的患者
      if (patient.createdBy === userId) {
        return true;
      }

      // 2. 同组织的医生/护士可以访问组织内的患者
      if (userOrgId && patient.organizationId === userOrgId) {
        if (userRole === 'doctor' || userRole === 'nurse') {
          return true;
        }
      }

      // 3. 被共享的用户可以访问共享给他的患者
      if (patient.sharedWith && patient.sharedWith.includes(userId)) {
        return true;
      }

      return false;
    });
  }

  /**
   * 共享患者给指定用户
   * @param patientId 患者ID
   * @param sharedWithUserId 被共享用户ID
   * @returns 是否成功
   */
  async sharePatient(patientId: number, sharedWithUserId: string): Promise<boolean> {
    const patient = this.patients.get(patientId);
    if (!patient) {
      return false;
    }

    // 确保sharedWith是数组
    const sharedWith = patient.sharedWith || [];

    // 如果已经共享，不重复添加
    if (sharedWith.includes(sharedWithUserId)) {
      return true;
    }

    // 添加到共享列表
    const updatedPatient = {
      ...patient,
      sharedWith: [...sharedWith, sharedWithUserId],
    };

    this.patients.set(patientId, updatedPatient);
    return true;
  }

  /**
   * 取消共享患者
   * @param patientId 患者ID
   * @param sharedWithUserId 被取消共享的用户ID
   * @returns 是否成功
   */
  async unsharePatient(patientId: number, sharedWithUserId: string): Promise<boolean> {
    const patient = this.patients.get(patientId);
    if (!patient) {
      return false;
    }

    // 确保sharedWith是数组
    const sharedWith = patient.sharedWith || [];

    // 从共享列表移除
    const updatedPatient = {
      ...patient,
      sharedWith: sharedWith.filter((id: string) => id !== sharedWithUserId),
    };

    this.patients.set(patientId, updatedPatient);
    return true;
  }

  /**
   * 获取用户信息
   * @param id 用户ID（UUID）
   * @returns 用户信息
   */
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
}

export const storage = new MemStorage();
