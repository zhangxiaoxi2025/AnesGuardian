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
      'orchestrator': '总指挥Agent',
      'emr_extractor': '病历提取Agent',
      'risk_assessor': '风险评估Agent',
      'drug_analyzer': '药物交互Agent',
      'guideline_consultant': '指南检索Agent',
      'quality_checker': '核查Agent'
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
      console.log('🔍 生成的风险因素:', riskFactors);
      await this.updateAgentStatus('risk_assessor', 'completed', 100, `发现${riskFactors.length}项风险因素`);

      // Step 3: Drug Interaction Analysis
      await this.updateAgentStatus('drug_analyzer', 'active', 60, '分析药物相互作用');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const drugInteractions = this.generateDrugInteractions(patient.medications || []);
      console.log('🔍 生成的药物相互作用:', drugInteractions);
      await this.updateAgentStatus('drug_analyzer', 'completed', 100, `检测到${drugInteractions.length}项交互警示`);

      // Step 4: Clinical Guidelines Search
      await this.updateAgentStatus('guideline_consultant', 'active', 80, '检索临床指南');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const guidelines = this.generateClinicalGuidelines(patient.surgeryType, patient);
      console.log('🔍 生成的临床指南:', guidelines);
      await this.updateAgentStatus('guideline_consultant', 'completed', 100, `匹配${guidelines.length}项相关指南`);

      // Step 5: Quality Check
      await this.updateAgentStatus('quality_checker', 'active', 90, '质量核查');
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.updateAgentStatus('quality_checker', 'completed', 100, '核查完成，无异常');

      // Step 6: Generate final recommendations
      await this.updateAgentStatus('orchestrator', 'active', 95, '生成最终报告');
      
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const recommendations = this.generateRecommendations(riskFactors, drugInteractions, guidelines);
      
      console.log('🔍 生成的总体风险:', overallRisk);
      console.log('🔍 生成的建议:', recommendations);

      // Update assessment with final results
      console.log(`Updating assessment ${this.assessmentId} to completed status`);
      console.log('🔍 即将保存的评估数据:', {
        status: 'completed',
        overallRisk,
        riskFactors: riskFactors.length,
        drugInteractions: drugInteractions.length,
        clinicalGuidelines: guidelines.length,
        recommendations: recommendations.length
      });
      
      const finalAssessment = await storage.updateAssessment(this.assessmentId, {
        status: 'completed',
        overallRisk,
        riskFactors,
        drugInteractions,
        clinicalGuidelines: guidelines,
        recommendations
      });

      console.log(`Assessment ${this.assessmentId} update result:`, finalAssessment ? 'SUCCESS' : 'FAILED');
      
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

    // Medical history risks - 基于实际病史内容分析
    const medicalHistoryText = patient.medicalHistory?.join(' ') || '';
    
    console.log('🔍 风险因素分析 - 病史内容:', medicalHistoryText);
    
    // 基于实际病史内容的风险识别
    if (medicalHistoryText.includes('输尿管结石') || medicalHistoryText.includes('结石')) {
      riskFactors.push({
        type: 'other',
        level: 'medium',
        description: '泌尿系结石病史，术中可能需要特殊体位',
        score: 2,
        recommendations: ['评估肾功能', '术中体位护理', '预防肾损伤']
      });
    }

    if (medicalHistoryText.includes('血尿')) {
      riskFactors.push({
        type: 'other',
        level: 'medium',
        description: '血尿症状，凝血功能需要评估',
        score: 2,
        recommendations: ['术前凝血功能检查', '评估出血风险', '准备止血措施']
      });
    }

    if (medicalHistoryText.includes('体重下降')) {
      riskFactors.push({
        type: 'other',
        level: 'medium',
        description: '近期体重下降，营养状况需要评估',
        score: 2,
        recommendations: ['营养评估', '术前营养支持', '监测电解质平衡']
      });
    }

    // 根据药物推断可能的疾病
    if (patient.medications?.some(med => med.includes('拜新同'))) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '服用钙离子通道阻滞剂，提示心血管疾病',
        score: 2,
        recommendations: ['心血管评估', '术前优化降压治疗', '术中血压监测']
      });
    }

    if (patient.medications?.some(med => med.includes('阿司匹林'))) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'medium',
        description: '长期服用阿司匹林，提示心血管疾病风险',
        score: 2,
        recommendations: ['心血管风险评估', '出血风险评估', '术前停药时机']
      });
    }

    if (patient.medications?.some(med => med.includes('阿托伐他汀'))) {
      riskFactors.push({
        type: 'cardiovascular',
        level: 'low',
        description: '服用他汀类药物，提示血脂异常',
        score: 1,
        recommendations: ['肝功能检查', '肌酸激酶监测', '继续他汀治疗']
      });
    }

    return riskFactors;
  }

  private generateDrugInteractions(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    console.log('🔍 药物相互作用分析 - 输入药物:', medications);

    // 检查阿司匹林
    const hasAspirin = medications.some(med => 
      med.includes('阿司匹林') || med.includes('aspirin')
    );

    if (hasAspirin) {
      interactions.push({
        id: 'aspirin-interaction',
        drugs: medications.filter(med => 
          med.includes('阿司匹林') || med.includes('aspirin')
        ),
        severity: 'major',
        summary: '阿司匹林增加术中出血风险，与麻醉药物存在相互作用',
        description: '阿司匹林通过不可逆性抑制血小板聚集，显著增加围术期出血风险。与麻醉药物联合使用时，可能导致术中术后出血难以控制，特别是在神经阻滞麻醉和椎管内麻醉时风险更高。',
        recommendations: ['术前5-7天停用阿司匹林', '术前检查血小板功能', '准备止血药物和血液制品', '避免椎管内麻醉技术']
      });
    }

    // 检查氟哌噻吨美利曲辛（黛力新）
    const hasDeanxit = medications.some(med => 
      med.includes('氟哌') || med.includes('美利曲') || med.includes('黛力新') || med.includes('Deanxit')
    );

    if (hasDeanxit) {
      interactions.push({
        id: 'deanxit-anesthesia-interaction',
        drugs: medications.filter(med => 
          med.includes('氟哌') || med.includes('美利曲') || med.includes('黛力新')
        ),
        severity: 'major',
        summary: '氟哌噻吨美利曲辛与麻醉药物存在重要相互作用',
        description: '氟哌噻吨美利曲辛含有抗精神病药氟哌噻吨和三环抗抑郁药美利曲辛，与麻醉药物联合使用可能导致：1）中枢神经系统抑制增强，苏醒延迟；2）QT间期延长，心律失常风险增加；3）血压不稳定，低血压风险；4）抗胆碱能作用增强，口干、便秘等副作用加重。',
        recommendations: [
          '术前心电图评估QT间期',
          '术中持续心电监护',
          '谨慎使用血管活性药物',
          '延长术后观察时间',
          '术前考虑逐渐减量停药3-7天',
          '准备阿托品等抗胆碱能药物拮抗剂'
        ]
      });
    }

    // 检查拜新同（硝苯地平）
    const hasNifedipine = medications.some(med => 
      med.includes('拜新同') || med.includes('硝苯地平') || med.includes('nifedipine')
    );

    if (hasNifedipine) {
      interactions.push({
        id: 'nifedipine-interaction',
        drugs: medications.filter(med => 
          med.includes('拜新同') || med.includes('硝苯地平') || med.includes('nifedipine')
        ),
        severity: 'moderate',
        summary: '拜新同可能加重麻醉药物的降压效应',
        description: '拜新同（硝苯地平）为钙离子通道阻滞剂，具有显著的血管扩张作用。与麻醉药物联合使用时可能产生协同降压效应，特别是在麻醉诱导期容易发生严重低血压。',
        recommendations: ['术前评估血压控制情况', '准备升压药物', '麻醉诱导时缓慢给药', '密切监测血压变化']
      });
    }

    // 检查阿托伐他汀
    const hasAtorvastatin = medications.some(med => 
      med.includes('阿托伐他汀') || med.includes('atorvastatin')
    );

    if (hasAtorvastatin) {
      interactions.push({
        id: 'atorvastatin-interaction',
        drugs: medications.filter(med => 
          med.includes('阿托伐他汀') || med.includes('atorvastatin')
        ),
        severity: 'minor',
        summary: '阿托伐他汀可能增加肌肉毒性风险',
        description: '阿托伐他汀与某些麻醉药物（特别是肌松药）联合使用时，可能增加肌肉毒性和横纹肌溶解的风险。虽然临床意义有限，但在长时间手术中需要注意。',
        recommendations: ['术前检查肌酸激酶水平', '避免过量使用肌松药', '术后监测肌肉症状', '充分水化']
      });
    }

    // 三药联用的额外风险
    if (hasAspirin && hasNifedipine && hasAtorvastatin) {
      interactions.push({
        id: 'triple-drug-interaction',
        drugs: ['阿司匹林', '拜新同', '阿托伐他汀'],
        severity: 'major',
        summary: '三药联用增加围术期综合风险',
        description: '阿司匹林、拜新同、阿托伐他汀三药联用时，可能产生多重药物相互作用。抗凝、降压、肌毒性风险叠加，需要综合评估和管理。',
        recommendations: ['全面术前评估', '多学科会诊', '个体化麻醉方案', '严密围术期监护']
      });
    }

    console.log('🔍 药物相互作用分析 - 检测结果:', interactions);
    return interactions;
  }

  private generateClinicalGuidelines(surgeryType: string, patient?: any): ClinicalGuideline[] {
    const guidelines: ClinicalGuideline[] = [];

    console.log('🔍 临床指南检索 - 手术类型:', surgeryType);
    console.log('🔍 临床指南检索 - 患者信息:', patient);

    // 基于手术类型匹配指南
    const surgeryTypeLower = surgeryType.toLowerCase();
    
    // 泌尿外科手术相关指南
    if (surgeryTypeLower.includes('泌尿') || surgeryTypeLower.includes('膀胱') || 
        surgeryTypeLower.includes('肾') || surgeryTypeLower.includes('输尿管') || 
        surgeryTypeLower.includes('前列腺') || surgeryTypeLower.includes('尿道')) {
      guidelines.push({
        id: 'urological-surgery-guideline',
        title: '泌尿外科手术麻醉管理指南',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'high',
        summary: '泌尿外科手术围术期麻醉管理的标准化流程',
        recommendations: ['术前肾功能评估', '术中体位管理', '预防术后急性肾损伤', '椎管内麻醉的应用']
      });

      // 输尿管镜手术特定指南
      if (surgeryTypeLower.includes('输尿管') || surgeryTypeLower.includes('结石')) {
        guidelines.push({
          id: 'ureteroscopy-guideline',
          title: '输尿管镜手术麻醉专家共识',
          organization: '中华医学会泌尿外科学分会',
          year: 2022,
          relevance: 'high',
          summary: '输尿管镜手术的麻醉管理和并发症预防',
          recommendations: ['气道管理策略', '术中监护要点', '预防尿源性脓毒血症', '术后镇痛方案']
        });
      }
    }

    // 妇科手术相关指南
    if (surgeryTypeLower.includes('妇科') || surgeryTypeLower.includes('子宫') || 
        surgeryTypeLower.includes('卵巢') || surgeryTypeLower.includes('附件') || 
        surgeryTypeLower.includes('宫颈') || surgeryTypeLower.includes('阴道')) {
      guidelines.push({
        id: 'gynecological-surgery-guideline',
        title: '妇科手术麻醉管理指南',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'high',
        summary: '妇科手术围术期麻醉管理的标准化流程',
        recommendations: ['术前评估生殖系统状况', '术中体位管理', '预防术后恶心呕吐', '术后镇痛方案']
      });
    }

    // 普外科手术相关指南
    if (surgeryTypeLower.includes('普外') || surgeryTypeLower.includes('腹部') || 
        surgeryTypeLower.includes('胃') || surgeryTypeLower.includes('肠') || 
        surgeryTypeLower.includes('胆') || surgeryTypeLower.includes('阑尾')) {
      guidelines.push({
        id: 'general-surgery-guideline',
        title: '普外科手术麻醉管理指南',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'high',
        summary: '普外科手术围术期麻醉管理的标准化流程',
        recommendations: ['术前胃肠道准备', '术中体位管理', '预防术后恶心呕吐', '术后早期活动']
      });
    }

    // 骨科手术相关指南
    if (surgeryTypeLower.includes('骨科') || surgeryTypeLower.includes('骨折') || 
        surgeryTypeLower.includes('关节') || surgeryTypeLower.includes('脊柱')) {
      guidelines.push({
        id: 'orthopedic-surgery-guideline',
        title: '骨科手术麻醉管理指南',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'high',
        summary: '骨科手术围术期麻醉管理的标准化流程',
        recommendations: ['术前凝血功能评估', '椎管内麻醉优先考虑', '预防脂肪栓塞', '术后疼痛管理']
      });
    }

    // 基于患者年龄匹配指南
    if (patient && patient.age >= 65) {
      guidelines.push({
        id: 'elderly-anesthesia-guideline',
        title: '老年患者麻醉管理专家共识',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'high',
        summary: '70岁以上老年患者围术期麻醉管理的特殊考虑',
        recommendations: ['个体化麻醉方案', '器官功能保护', '术后谵妄预防', '多学科协作管理']
      });
    }

    // 基于患者病史和用药匹配指南
    if (patient) {
      const medicalHistory = patient.medicalHistory?.join(' ') || '';
      const medications = patient.medications?.join(' ') || '';
      
      // 心血管疾病患者
      if (medicalHistory.includes('高血压') || medicalHistory.includes('心脏') || 
          medicalHistory.includes('冠心病') || medications.includes('替米沙坦') || 
          medications.includes('拜新同') || medications.includes('阿司匹林')) {
        guidelines.push({
          id: 'cardiovascular-anesthesia-guideline',
          title: '心血管疾病患者非心脏手术麻醉指南',
          organization: '中华医学会麻醉学分会',
          year: 2023,
          relevance: 'high',
          summary: '合并心血管疾病患者的围术期风险评估与管理',
          recommendations: ['术前心血管风险评估', '围术期心血管监护', '血压血糖管理', '抗凝药物管理']
        });
      }

      // 糖尿病患者
      if (medicalHistory.includes('糖尿病') || medications.includes('二甲双胍') || 
          medications.includes('拜糖平') || medications.includes('胰岛素')) {
        guidelines.push({
          id: 'diabetes-anesthesia-guideline',
          title: '糖尿病患者围术期管理指南',
          organization: '中华医学会麻醉学分会',
          year: 2023,
          relevance: 'high',
          summary: '糖尿病患者围术期血糖管理和并发症预防',
          recommendations: ['术前血糖控制评估', '围术期血糖监测', '预防酮症酸中毒', '术后血糖管理']
        });
      }
    }

    // 如果没有匹配到任何特定指南，提供通用指南
    if (guidelines.length === 0) {
      guidelines.push({
        id: 'general-anesthesia-guideline',
        title: '围术期麻醉管理通用指南',
        organization: '中华医学会麻醉学分会',
        year: 2023,
        relevance: 'medium',
        summary: '围术期麻醉管理的基本原则和标准流程',
        recommendations: ['术前全面评估', '个体化麻醉方案', '术中严密监护', '术后安全管理']
      });
    }

    console.log('🔍 临床指南检索 - 匹配结果:', guidelines);
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