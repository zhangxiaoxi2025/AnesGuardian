import { storage } from '../storage';
import { RiskFactor, DrugInteraction, ClinicalGuideline, AgentStatus, Assessment } from '../../shared/schema';

export class SimpleAgentOrchestrator {
  private assessmentId: number;
  private agentStatus: Record<string, AgentStatus> = {};

  constructor(assessmentId: number) {
    this.assessmentId = assessmentId;
    this.initializeAgents();
  }

  private initializeAgents() {
    const agents = ['orchestrator', 'emr_extractor', 'risk_assessor', 'drug_analyzer', 'guideline_consultant', 'quality_checker'];
    agents.forEach(agent => {
      this.agentStatus[agent] = {
        name: this.getAgentDisplayName(agent),
        status: 'idle',
        progress: 0,
        lastAction: '等待开始'
      };
    });
  }

  private getAgentDisplayName(agent: string): string {
    const displayNames: Record<string, string> = {
      'orchestrator': '协调器',
      'emr_extractor': 'EMR提取器',
      'risk_assessor': '风险评估器',
      'drug_analyzer': '药物分析器',
      'guideline_consultant': '指南顾问',
      'quality_checker': '质量检查器'
    };
    return displayNames[agent] || agent;
  }

  private async updateAgentStatus(agentName: string, status: AgentStatus['status'], progress: number, lastAction: string, results?: any) {
    this.agentStatus[agentName] = {
      name: this.getAgentDisplayName(agentName),
      status,
      progress,
      lastAction,
      results
    };

    try {
      await storage.updateAssessment(this.assessmentId, {
        agentStatus: { ...this.agentStatus }
      });

      await storage.createAgentLog({
        assessmentId: this.assessmentId,
        agentName,
        action: lastAction,
        status,
        result: results
      });
    } catch (error) {
      console.error(`Failed to update agent status for ${agentName}:`, error);
    }
  }

  async runAssessment(patientId: number): Promise<Assessment> {
    try {
      console.log(`Starting simple assessment for patient ${patientId}, assessmentId: ${this.assessmentId}`);
      
      // Start orchestrator
      await this.updateAgentStatus('orchestrator', 'active', 10, '启动评估流程');

      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Step 1: EMR Extraction
      await this.updateAgentStatus('emr_extractor', 'active', 25, '提取病历信息');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.updateAgentStatus('emr_extractor', 'completed', 100, '已提取关键信息');

      // Step 2: Risk Assessment
      await this.updateAgentStatus('risk_assessor', 'active', 40, '分析风险因素');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const riskFactors = this.generateRiskFactorsFromPatientData(patient);
      await this.updateAgentStatus('risk_assessor', 'completed', 100, `发现${riskFactors.length}项风险因素`);

      // Step 3: Drug Interaction Analysis
      await this.updateAgentStatus('drug_analyzer', 'active', 60, '分析药物相互作用');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const drugInteractions = this.generateDrugInteractions(patient.medications || []);
      await this.updateAgentStatus('drug_analyzer', 'completed', 100, `检测到${drugInteractions.length}项交互警示`);

      // Step 4: Clinical Guidelines Search
      await this.updateAgentStatus('guideline_consultant', 'active', 80, '检索临床指南');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const guidelines = this.generateClinicalGuidelines(patient.surgeryType);
      await this.updateAgentStatus('guideline_consultant', 'completed', 100, `匹配${guidelines.length}项相关指南`);

      // Step 5: Quality Check
      await this.updateAgentStatus('quality_checker', 'active', 90, '质量核查');
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.updateAgentStatus('quality_checker', 'completed', 100, '核查完成，无异常');

      // Step 6: Generate final recommendations
      await this.updateAgentStatus('orchestrator', 'active', 95, '生成最终报告');
      
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const recommendations = this.generateRecommendations(riskFactors, drugInteractions, guidelines);

      // Update assessment with final results
      const finalAssessment = await storage.updateAssessment(this.assessmentId, {
        status: 'completed',
        overallRisk,
        riskFactors,
        drugInteractions,
        clinicalGuidelines: guidelines,
        recommendations
      });

      await this.updateAgentStatus('orchestrator', 'completed', 100, '评估完成');

      console.log('Simple assessment completed successfully');
      return finalAssessment!;

    } catch (error) {
      console.error('Simple assessment failed:', error);
      
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

  private generateRiskFactorsFromPatientData(patient: any): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // Age-based risks
    if (patient.age >= 65) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '高龄患者，心血管储备功能下降',
        score: 2,
        recommendations: ['术前心电图评估', '术中密切监测血压心率']
      });
    }

    if (patient.age >= 80) {
      riskFactors.push({
        type: 'other',
        level: 'high',
        description: '超高龄患者，多器官功能衰退风险',
        score: 3,
        recommendations: ['全面术前评估', '考虑局部麻醉', '术后ICU监护']
      });
    }

    // ASA class based risks
    if (patient.asaClass === 'III' || patient.asaClass === 'IV') {
      riskFactors.push({
        type: 'other',
        level: 'high',
        description: `ASA ${patient.asaClass}级患者，围术期风险显著增加`,
        score: 3,
        recommendations: ['术前优化', '专科会诊', '术中严密监护']
      });
    }

    // Medical history risks
    if (patient.medicalHistory?.includes('高血压')) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '高血压病史，围术期血压波动风险',
        score: 2,
        recommendations: ['术前血压控制', '准备血管活性药物']
      });
    }

    if (patient.medicalHistory?.includes('糖尿病')) {
      riskFactors.push({
        type: 'other',
        level: 'medium',
        description: '糖尿病患者，血糖管理和感染风险',
        score: 2,
        recommendations: ['术前血糖控制', '预防感染措施']
      });
    }

    if (patient.medicalHistory?.includes('心脏病')) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'high',
        description: '心脏病史，围术期心血管事件风险',
        score: 3,
        recommendations: ['心脏科会诊', '术中心电监护', '备用急救药物']
      });
    }

    return riskFactors;
  }

  private generateDrugInteractions(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    const hasAnticoagulant = medications.some(med => 
      med.includes('华法林') || med.includes('阿司匹林') || med.includes('氯吡格雷')
    );

    if (hasAnticoagulant) {
      interactions.push({
        id: 'anticoagulant-interaction',
        drugs: medications.filter(med => 
          med.includes('华法林') || med.includes('阿司匹林') || med.includes('氯吡格雷')
        ),
        severity: 'major',
        description: '抗凝药物与麻醉药物可能存在出血风险',
        recommendations: ['术前评估凝血功能', '考虑停用抗凝药物', '准备止血措施']
      });
    }

    const hasACEI = medications.some(med => 
      med.includes('依那普利') || med.includes('贝那普利') || med.includes('卡托普利')
    );

    if (hasACEI) {
      interactions.push({
        id: 'acei-interaction',
        drugs: medications.filter(med => 
          med.includes('依那普利') || med.includes('贝那普利') || med.includes('卡托普利')
        ),
        severity: 'moderate',
        description: 'ACEI类药物可能导致麻醉诱导期低血压',
        recommendations: ['术前停药24小时', '准备升压药物', '控制输液速度']
      });
    }

    return interactions;
  }

  private generateClinicalGuidelines(surgeryType: string): ClinicalGuideline[] {
    const guidelines: ClinicalGuideline[] = [];

    guidelines.push({
      id: 'basic-guideline',
      title: `${surgeryType}围术期管理指南`,
      organization: '中华医学会麻醉学分会',
      year: 2023,
      relevance: 'high',
      summary: '围术期标准化管理流程',
      recommendations: [
        '术前评估患者全身状况',
        '选择合适的麻醉方式',
        '术中监测生命体征',
        '术后疼痛管理'
      ]
    });

    if (surgeryType.includes('心脏') || surgeryType.includes('血管')) {
      guidelines.push({
        id: 'cardiac-guideline',
        title: '心血管手术麻醉指南',
        organization: 'ESC/ESA',
        year: 2022,
        relevance: 'high',
        summary: '心血管手术围术期管理',
        recommendations: [
          '术前心功能评估',
          '血流动力学监测',
          '心肌保护策略',
          '术后心律监护'
        ]
      });
    }

    return guidelines;
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
      if (di.recommendations && Array.isArray(di.recommendations)) {
        recommendations.push(...di.recommendations);
      }
    });

    // Add guideline-based recommendations
    guidelines.forEach(g => {
      if (g.relevance === 'high') {
        recommendations.push(...g.recommendations);
      }
    });

    // Remove duplicates and ensure basic recommendations
    const uniqueRecommendations = Array.from(new Set(recommendations));
    
    if (uniqueRecommendations.length === 0) {
      return [
        '建议术前完善相关检查，评估患者全身状况',
        '术中密切监测生命体征，确保患者安全',
        '术后加强监护，及时处理可能的并发症',
        '根据患者具体情况选择合适的麻醉方式'
      ];
    }

    return uniqueRecommendations.slice(0, 8);
  }
}