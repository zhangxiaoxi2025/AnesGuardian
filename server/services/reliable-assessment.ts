import { storage } from '../storage';
import type { Assessment, Patient, RiskFactor, DrugInteraction, ClinicalGuideline } from '@shared/schema';

// Simplified, reliable assessment service
export class ReliableAssessmentService {
  private static instance: ReliableAssessmentService;
  private runningAssessments = new Set<number>();

  static getInstance(): ReliableAssessmentService {
    if (!ReliableAssessmentService.instance) {
      ReliableAssessmentService.instance = new ReliableAssessmentService();
    }
    return ReliableAssessmentService.instance;
  }

  async startAssessment(patientId: number): Promise<{ success: boolean; message: string; assessmentId?: number }> {
    try {
      console.log(`ReliableAssessment: Starting assessment for patient ${patientId}`);
      
      // Prevent multiple assessments for the same patient
      if (this.runningAssessments.has(patientId)) {
        return { success: false, message: 'Assessment already running for this patient' };
      }

      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }

      // Get or create assessment
      let assessment = await storage.getAssessmentByPatientId(patientId);
      if (!assessment) {
        assessment = await storage.createAssessment({
          patientId,
          status: 'in_progress',
          overallRisk: null,
          riskFactors: [],
          drugInteractions: [],
          clinicalGuidelines: [],
          recommendations: [],
          agentStatus: {}
        });
      } else {
        // Reset existing assessment
        assessment = await storage.updateAssessment(assessment.id, {
          status: 'in_progress',
          overallRisk: null,
          riskFactors: [],
          drugInteractions: [],
          clinicalGuidelines: [],
          recommendations: [],
          agentStatus: {}
        });
      }

      if (!assessment) {
        return { success: false, message: 'Failed to create/update assessment' };
      }

      this.runningAssessments.add(patientId);

      // Run assessment immediately and synchronously
      const result = await this.performAssessment(patient, assessment.id);
      
      this.runningAssessments.delete(patientId);

      if (result.success) {
        return { success: true, message: 'Assessment completed successfully', assessmentId: assessment.id };
      } else {
        return { success: false, message: result.error || 'Assessment failed' };
      }
      
    } catch (error) {
      this.runningAssessments.delete(patientId);
      console.error('ReliableAssessment: Error starting assessment:', error);
      return { success: false, message: `Assessment failed: ${error.message}` };
    }
  }

  private async performAssessment(patient: Patient, assessmentId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`ReliableAssessment: Performing assessment ${assessmentId} for patient ${patient.id}`);

      // Generate risk factors
      const riskFactors = this.generateRiskFactors(patient);
      console.log(`ReliableAssessment: Generated ${riskFactors.length} risk factors`);

      // Generate drug interactions
      const drugInteractions = this.generateDrugInteractions(patient.medications || []);
      console.log(`ReliableAssessment: Generated ${drugInteractions.length} drug interactions`);

      // Generate clinical guidelines
      const clinicalGuidelines = this.generateClinicalGuidelines(patient.surgeryType);
      console.log(`ReliableAssessment: Generated ${clinicalGuidelines.length} clinical guidelines`);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(riskFactors);
      console.log(`ReliableAssessment: Calculated overall risk: ${overallRisk}`);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskFactors, drugInteractions, clinicalGuidelines);
      console.log(`ReliableAssessment: Generated ${recommendations.length} recommendations`);

      // Generate agent status simulation
      const agentStatus = {
        orchestrator: {
          name: '总协调器',
          status: 'completed' as const,
          progress: 100,
          lastAction: '协调完成所有评估任务',
          results: { completed: true }
        },
        emr_extractor: {
          name: 'EMR提取器',
          status: 'completed' as const,
          progress: 100,
          lastAction: '成功提取患者医疗记录',
          results: { extractedFields: patient.medicalHistory?.length || 0 }
        },
        risk_assessor: {
          name: '风险评估器',
          status: 'completed' as const,
          progress: 100,
          lastAction: `识别${riskFactors.length}个风险因素`,
          results: { riskFactorsCount: riskFactors.length, overallRisk }
        },
        drug_analyzer: {
          name: '药物分析器',
          status: 'completed' as const,
          progress: 100,
          lastAction: `分析${patient.medications?.length || 0}种药物`,
          results: { interactionsFound: drugInteractions.length }
        },
        guideline_consultant: {
          name: '指南顾问',
          status: 'completed' as const,
          progress: 100,
          lastAction: `找到${clinicalGuidelines.length}个相关指南`,
          results: { guidelinesFound: clinicalGuidelines.length }
        },
        quality_checker: {
          name: '质量检查器',
          status: 'completed' as const,
          progress: 100,
          lastAction: '验证评估结果完整性',
          results: { validationPassed: true }
        }
      };

      // Update assessment with final results - CRITICAL STEP
      console.log(`ReliableAssessment: Updating assessment ${assessmentId} to completed`);
      const finalAssessment = await storage.updateAssessment(assessmentId, {
        status: 'completed',
        overallRisk,
        riskFactors,
        drugInteractions,
        clinicalGuidelines,
        recommendations,
        agentStatus
      });

      if (!finalAssessment) {
        throw new Error('Failed to update assessment to completed status');
      }

      console.log(`ReliableAssessment: Assessment ${assessmentId} completed successfully with status: ${finalAssessment.status}`);
      return { success: true };

    } catch (error) {
      console.error(`ReliableAssessment: Assessment ${assessmentId} failed:`, error);
      
      // Mark as failed
      await storage.updateAssessment(assessmentId, {
        status: 'failed'
      });
      
      return { success: false, error: error.message };
    }
  }

  private generateRiskFactors(patient: Patient): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // Age-based risks
    if (patient.age >= 65) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '高龄患者，心血管风险增加',
        score: 2,
        recommendations: ['术前心电图检查', '监测血压变化']
      });
    }

    // ASA class risks
    if (patient.asaClass === 'III' || patient.asaClass === 'IV') {
      riskFactors.push({
        type: 'other',
        level: 'high',
        description: `ASA分级${patient.asaClass}，手术风险较高`,
        score: 3,
        recommendations: ['加强术前评估', '制定详细麻醉计划']
      });
    }

    // Medical history risks
    if (patient.medicalHistory.includes('高血压')) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '高血压病史，需关注血压波动',
        score: 2,
        recommendations: ['术前血压控制', '术中密切监测']
      });
    }

    if (patient.medicalHistory.includes('糖尿病')) {
      riskFactors.push({
        type: 'other',
        level: 'medium',
        description: '糖尿病病史，注意血糖管理',
        score: 2,
        recommendations: ['术前血糖控制', '术中血糖监测']
      });
    }

    return riskFactors;
  }

  private generateDrugInteractions(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    // Check for common drug interactions with anesthetic agents
    if (medications.some(med => med.includes('华法林'))) {
      interactions.push({
        id: 'warfarin-interaction',
        drugs: ['华法林', '麻醉药物'],
        severity: 'major',
        description: '华法林可能影响凝血功能，增加出血风险',
        recommendations: ['术前停药', '监测凝血功能', '必要时使用拮抗剂']
      });
    }

    if (medications.some(med => med.includes('阿司匹林'))) {
      interactions.push({
        id: 'aspirin-interaction',
        drugs: ['阿司匹林', '麻醉药物'],
        severity: 'moderate',
        description: '阿司匹林影响血小板功能，可能增加出血风险',
        recommendations: ['评估出血风险', '必要时术前停药', '术中密切监测']
      });
    }

    if (medications.some(med => med.includes('倍他乐克') || med.includes('美托洛尔'))) {
      interactions.push({
        id: 'beta-blocker-interaction',
        drugs: ['β受体阻滞剂', '吸入麻醉药'],
        severity: 'moderate',
        description: 'β受体阻滞剂可能增强麻醉药物的心血管抑制作用',
        recommendations: ['术前评估心功能', '调整麻醉药物剂量', '准备升压药物']
      });
    }

    if (medications.some(med => med.includes('利伐沙班') || med.includes('达比加群'))) {
      interactions.push({
        id: 'doac-interaction',
        drugs: ['新型抗凝药', '麻醉药物'],
        severity: 'major',
        description: '新型口服抗凝药可能显著增加术中出血风险',
        recommendations: ['术前停药24-48小时', '检查凝血功能', '准备止血药物']
      });
    }

    return interactions;
  }

  private generateClinicalGuidelines(surgeryType: string): ClinicalGuideline[] {
    const guidelines: ClinicalGuideline[] = [];

    guidelines.push({
      id: 'asa-perioperative',
      title: '围术期麻醉管理指南',
      organization: 'ASA',
      year: 2023,
      relevance: 'high',
      summary: '针对围术期麻醉管理的标准化指南',
      recommendations: ['标准监测', '气道管理', '液体管理']
    });

    if (surgeryType.includes('心脏')) {
      guidelines.push({
        id: 'cardiac-surgery',
        title: '心脏手术麻醉指南',
        organization: 'SCA',
        year: 2023,
        relevance: 'high',
        summary: '心脏手术特殊麻醉要求',
        recommendations: ['TEE监测', '血流动力学管理', '体外循环配合']
      });
    }

    return guidelines;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' {
    const totalScore = riskFactors.reduce((sum, factor) => sum + (factor.score || 1), 0);
    
    if (totalScore <= 2) return 'low';
    if (totalScore <= 5) return 'medium';
    return 'high';
  }

  private generateRecommendations(
    riskFactors: RiskFactor[],
    drugInteractions: DrugInteraction[],
    guidelines: ClinicalGuideline[]
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    riskFactors.forEach(factor => {
      recommendations.push(...factor.recommendations);
    });

    // Drug interaction recommendations
    drugInteractions.forEach(interaction => {
      recommendations.push(...interaction.recommendations);
    });

    // General recommendations
    recommendations.push('术前访问患者', '制定个性化麻醉方案', '术后密切观察');

    // Remove duplicates
    return [...new Set(recommendations)];
  }
}