import { 
  patients, assessments, agentLogs, medicalReports, clinicalGuidelineDocuments, guidelineSections,
  type Patient, type InsertPatient, 
  type Assessment, type InsertAssessment, 
  type AgentLog, type InsertAgentLog, 
  type MedicalReport, type InsertMedicalReport,
  type ClinicalGuidelineDocument, type InsertClinicalGuidelineDocument,
  type GuidelineSectionType, type InsertGuidelineSection
} from "@shared/schema";

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

  // Medical report operations
  getMedicalReport(id: number): Promise<MedicalReport | undefined>;
  getMedicalReportsByPatientId(patientId: number): Promise<MedicalReport[]>;
  createMedicalReport(report: InsertMedicalReport): Promise<MedicalReport>;
  updateMedicalReport(id: number, report: Partial<InsertMedicalReport>): Promise<MedicalReport | undefined>;
  deleteMedicalReport(id: number): Promise<boolean>;

  // Clinical guideline operations
  getClinicalGuideline(id: number): Promise<ClinicalGuidelineDocument | undefined>;
  getAllClinicalGuidelines(): Promise<ClinicalGuidelineDocument[]>;
  getClinicalGuidelinesByCategory(category: string): Promise<ClinicalGuidelineDocument[]>;
  createClinicalGuideline(guideline: InsertClinicalGuidelineDocument): Promise<ClinicalGuidelineDocument>;
  updateClinicalGuideline(id: number, guideline: Partial<InsertClinicalGuidelineDocument>): Promise<ClinicalGuidelineDocument | undefined>;
  deleteClinicalGuideline(id: number): Promise<boolean>;
  searchClinicalGuidelines(keywords: string[], patientContext?: any): Promise<ClinicalGuidelineDocument[]>;

  // Guideline section operations
  getGuidelineSection(id: number): Promise<GuidelineSectionType | undefined>;
  getGuidelineSectionsByGuidelineId(guidelineId: number): Promise<GuidelineSectionType[]>;
  createGuidelineSection(section: InsertGuidelineSection): Promise<GuidelineSectionType>;
  updateGuidelineSection(id: number, section: Partial<InsertGuidelineSection>): Promise<GuidelineSectionType | undefined>;
  deleteGuidelineSection(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private patients: Map<number, Patient> = new Map();
  private assessments: Map<number, Assessment> = new Map();
  private agentLogs: Map<number, AgentLog> = new Map();
  private medicalReports: Map<number, MedicalReport> = new Map();
  private clinicalGuidelines: Map<number, ClinicalGuidelineDocument> = new Map();
  private guidelineSections: Map<number, GuidelineSectionType> = new Map();
  private currentPatientId: number = 1;
  private currentAssessmentId: number = 1;
  private currentAgentLogId: number = 1;
  private currentMedicalReportId: number = 1;
  private currentGuidelineId: number = 1;
  private currentSectionId: number = 1;

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

  // Clinical guideline operations
  async getClinicalGuideline(id: number): Promise<ClinicalGuidelineDocument | undefined> {
    return this.clinicalGuidelines.get(id);
  }

  async getAllClinicalGuidelines(): Promise<ClinicalGuidelineDocument[]> {
    return Array.from(this.clinicalGuidelines.values());
  }

  async getClinicalGuidelinesByCategory(category: string): Promise<ClinicalGuidelineDocument[]> {
    return Array.from(this.clinicalGuidelines.values()).filter(guideline => guideline.category === category);
  }

  async createClinicalGuideline(insertGuideline: InsertClinicalGuidelineDocument): Promise<ClinicalGuidelineDocument> {
    const id = this.currentGuidelineId++;
    const now = new Date();
    const guideline: ClinicalGuidelineDocument = {
      id,
      title: insertGuideline.title,
      organization: insertGuideline.organization,
      year: insertGuideline.year,
      category: insertGuideline.category,
      description: insertGuideline.description || null,
      originalFileName: insertGuideline.originalFileName || null,
      fileType: insertGuideline.fileType || null,
      extractedText: insertGuideline.extractedText || null,
      structuredData: insertGuideline.structuredData || {},
      keywords: Array.isArray(insertGuideline.keywords) ? insertGuideline.keywords : [],
      sections: Array.isArray(insertGuideline.sections) ? insertGuideline.sections : [],
      status: insertGuideline.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.clinicalGuidelines.set(id, guideline);
    return guideline;
  }

  async updateClinicalGuideline(id: number, updateGuideline: Partial<InsertClinicalGuidelineDocument>): Promise<ClinicalGuidelineDocument | undefined> {
    const guideline = this.clinicalGuidelines.get(id);
    if (!guideline) return undefined;

    const updatedGuideline: ClinicalGuidelineDocument = {
      ...guideline,
      ...updateGuideline,
      updatedAt: new Date(),
    };
    this.clinicalGuidelines.set(id, updatedGuideline);
    return updatedGuideline;
  }

  async deleteClinicalGuideline(id: number): Promise<boolean> {
    return this.clinicalGuidelines.delete(id);
  }

  async searchClinicalGuidelines(keywords: string[], patientContext?: any): Promise<ClinicalGuidelineDocument[]> {
    const allGuidelines = Array.from(this.clinicalGuidelines.values());
    if (keywords.length === 0) return allGuidelines;

    return allGuidelines.filter(guideline => {
      const guidelineKeywords = guideline.keywords || [];
      const titleWords = guideline.title.toLowerCase().split(/\s+/);
      const descriptionWords = (guideline.description || '').toLowerCase().split(/\s+/);
      
      return keywords.some(keyword => 
        guidelineKeywords.some(gk => gk.toLowerCase().includes(keyword.toLowerCase())) ||
        titleWords.some(tw => tw.includes(keyword.toLowerCase())) ||
        descriptionWords.some(dw => dw.includes(keyword.toLowerCase()))
      );
    });
  }

  // Guideline section operations
  async getGuidelineSection(id: number): Promise<GuidelineSectionType | undefined> {
    return this.guidelineSections.get(id);
  }

  async getGuidelineSectionsByGuidelineId(guidelineId: number): Promise<GuidelineSectionType[]> {
    return Array.from(this.guidelineSections.values()).filter(section => section.guidelineId === guidelineId);
  }

  async createGuidelineSection(insertSection: InsertGuidelineSection): Promise<GuidelineSectionType> {
    const id = this.currentSectionId++;
    const now = new Date();
    const section: GuidelineSectionType = {
      id,
      guidelineId: insertSection.guidelineId,
      sectionTitle: insertSection.sectionTitle,
      content: insertSection.content,
      sectionType: insertSection.sectionType || null,
      relevanceKeywords: Array.isArray(insertSection.relevanceKeywords) ? insertSection.relevanceKeywords : [],
      priority: insertSection.priority || 1,
      createdAt: now,
    };
    this.guidelineSections.set(id, section);
    return section;
  }

  async updateGuidelineSection(id: number, updateSection: Partial<InsertGuidelineSection>): Promise<GuidelineSectionType | undefined> {
    const section = this.guidelineSections.get(id);
    if (!section) return undefined;

    const updatedSection: GuidelineSectionType = {
      ...section,
      ...updateSection,
    };
    this.guidelineSections.set(id, updatedSection);
    return updatedSection;
  }

  async deleteGuidelineSection(id: number): Promise<boolean> {
    return this.guidelineSections.delete(id);
  }
}

export const storage = new MemStorage();
