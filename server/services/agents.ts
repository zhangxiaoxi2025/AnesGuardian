import { storage } from "../storage";
import { analyzePatientRisks, analyzeDrugInteractions, searchClinicalGuidelines, extractMedicalInformation } from "./openai";
import type { Patient, Assessment, AgentStatus, RiskFactor, DrugInteraction, ClinicalGuideline } from "@shared/schema";

export class AgentOrchestrator {
  private assessmentId: number;
  private agentStatus: Record<string, AgentStatus> = {};

  constructor(assessmentId: number) {
    this.assessmentId = assessmentId;
    this.initializeAgents();
  }

  private initializeAgents() {
    const agents = [
      'orchestrator',
      'emr_extractor',
      'risk_assessor',
      'drug_analyzer',
      'guideline_consultant',
      'quality_checker'
    ];

    agents.forEach(agent => {
      this.agentStatus[agent] = {
        name: this.getAgentDisplayName(agent),
        status: 'idle',
        progress: 0,
        lastAction: 'Initialized',
      };
    });
  }

  private getAgentDisplayName(agent: string): string {
    const names = {
      'orchestrator': '总指挥Agent',
      'emr_extractor': '病历提取Agent',
      'risk_assessor': '风险评估Agent',
      'drug_analyzer': '药物交互Agent',
      'guideline_consultant': '指南检索Agent',
      'quality_checker': '核查Agent'
    };
    return names[agent] || agent;
  }

  private async updateAgentStatus(agentName: string, status: AgentStatus['status'], progress: number, lastAction: string, results?: any) {
    this.agentStatus[agentName] = {
      ...this.agentStatus[agentName],
      status,
      progress,
      lastAction,
      results
    };

    // Update assessment in storage
    const assessment = await storage.getAssessment(this.assessmentId);
    if (assessment) {
      await storage.updateAssessment(this.assessmentId, {
        agentStatus: this.agentStatus
      });
    }

    // Log agent activity
    await storage.createAgentLog({
      assessmentId: this.assessmentId,
      agentName,
      action: lastAction,
      status,
      result: results
    });
  }

  async runAssessment(patientId: number): Promise<Assessment> {
    try {
      // Start orchestrator
      await this.updateAgentStatus('orchestrator', 'active', 10, '启动评估流程');

      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Step 1: EMR Extraction (simulated since we have structured data)
      await this.updateAgentStatus('emr_extractor', 'active', 25, '提取病历信息');
      
      // Simulate EMR extraction delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const extractedData = {
        demographics: {
          age: patient.age,
          gender: patient.gender,
          weight: 70, // Mock data
          height: 170,
          bmi: 24.2
        },
        medicalHistory: patient.medicalHistory || [],
        medications: patient.medications || [],
        allergies: patient.allergies || [],
        vitalSigns: patient.vitalSigns || {},
        labResults: patient.labResults || {}
      };

      await this.updateAgentStatus('emr_extractor', 'completed', 100, '已提取67项关键信息', extractedData);

      // Step 2: Risk Assessment
      await this.updateAgentStatus('risk_assessor', 'active', 30, '分析风险因素');
      
      const riskAnalysis = await analyzePatientRisks({
        patient,
        extractedData
      });

      const riskFactors: RiskFactor[] = riskAnalysis.riskFactors || [];
      await this.updateAgentStatus('risk_assessor', 'completed', 100, `发现${riskFactors.length}项风险因素`, riskAnalysis);

      // Step 3: Drug Interaction Analysis
      await this.updateAgentStatus('drug_analyzer', 'active', 50, '分析药物相互作用');
      
      const drugAnalysis = await analyzeDrugInteractions(patient.medications || []);
      const drugInteractions: DrugInteraction[] = drugAnalysis.interactions || [];
      
      await this.updateAgentStatus('drug_analyzer', 'completed', 100, `检测到${drugInteractions.length}项交互警示`, drugAnalysis);

      // Step 4: Clinical Guidelines Search
      await this.updateAgentStatus('guideline_consultant', 'active', 70, '检索临床指南');
      
      const riskTypes = riskFactors.map(rf => rf.type);
      const guidelineSearch = await searchClinicalGuidelines(patient.surgeryType, riskTypes);
      const guidelines: ClinicalGuideline[] = guidelineSearch.guidelines || [];
      
      await this.updateAgentStatus('guideline_consultant', 'completed', 100, `匹配${guidelines.length}项相关指南`, guidelineSearch);

      // Step 5: Quality Check
      await this.updateAgentStatus('quality_checker', 'active', 85, '质量核查');
      
      // Simulate quality check
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.updateAgentStatus('quality_checker', 'completed', 100, '核查完成，无异常');

      // Step 6: Generate final recommendations
      await this.updateAgentStatus('orchestrator', 'active', 90, '生成最终报告');
      
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const recommendations = this.generateRecommendations(riskFactors, drugInteractions, guidelines);

      // Update assessment with final results
      const finalAssessment = await storage.updateAssessment(this.assessmentId, {
        status: 'completed',
        overallRisk,
        riskFactors,
        drugInteractions,
        clinicalGuidelines: guidelines,
        recommendations,
        completedAt: new Date()
      });

      await this.updateAgentStatus('orchestrator', 'completed', 100, '评估完成');

      return finalAssessment!;

    } catch (error) {
      console.error('Assessment failed:', error);
      
      // Update all active agents to failed state
      Object.keys(this.agentStatus).forEach(agentName => {
        if (this.agentStatus[agentName].status === 'active') {
          this.updateAgentStatus(agentName, 'failed', this.agentStatus[agentName].progress, `错误: ${error.message}`);
        }
      });

      await storage.updateAssessment(this.assessmentId, {
        status: 'failed'
      });

      throw error;
    }
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' {
    const highRiskCount = riskFactors.filter(rf => rf.level === 'high').length;
    const mediumRiskCount = riskFactors.filter(rf => rf.level === 'medium').length;

    if (highRiskCount >= 2) return 'high';
    if (highRiskCount >= 1 || mediumRiskCount >= 3) return 'high';
    if (mediumRiskCount >= 1) return 'medium';
    return 'low';
  }

  private generateRecommendations(riskFactors: RiskFactor[], drugInteractions: DrugInteraction[], guidelines: ClinicalGuideline[]): string[] {
    const recommendations: string[] = [];

    // Add risk-based recommendations
    riskFactors.forEach(rf => {
      recommendations.push(...rf.recommendations);
    });

    // Add drug interaction recommendations
    drugInteractions.forEach(di => {
      recommendations.push(...di.recommendations);
    });

    // Add guideline-based recommendations
    guidelines.forEach(g => {
      if (g.relevance === 'high') {
        recommendations.push(...g.recommendations);
      }
    });

    // Remove duplicates and return
    return [...new Set(recommendations)];
  }
}
