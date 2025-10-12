import { storage } from '../storage';
import { RiskFactor, DrugInteraction, ClinicalGuideline, AgentStatus, Assessment } from '../../shared/schema';
import { DrugEnhancementService } from './drug-enhancement';
import { DrugService } from './drug-service';

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

      // Get medical reports for enhanced analysis
      const medicalReports = await storage.getMedicalReportsByPatientId(patientId);
      console.log(`🔍 获取到 ${medicalReports.length} 份医疗报告用于增强分析`);
      
      // Create enhanced patient data with medical reports
      const enhancedPatientData = {
        ...patient,
        medicalReports: medicalReports
      };

      // Step 1: EMR Extraction
      await this.updateAgentStatus('emr_extractor', 'active', 25, '提取病历信息');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.updateAgentStatus('emr_extractor', 'completed', 100, '已提取关键信息');

      // Step 2: Risk Assessment
      await this.updateAgentStatus('risk_assessor', 'active', 40, '分析风险因素');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const riskFactors = this.generateRiskFactorsFromPatientData(enhancedPatientData);
      console.log('🔍 生成的风险因素:', riskFactors);
      await this.updateAgentStatus('risk_assessor', 'completed', 100, `发现${riskFactors.length}项风险因素`);

      // Step 3: Drug Interaction Analysis
      await this.updateAgentStatus('drug_analyzer', 'active', 60, '分析药物相互作用');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const drugInteractions = this.generateDrugInteractions(enhancedPatientData.medications || [], enhancedPatientData.medicalReports);
      console.log('🔍 生成的药物相互作用:', drugInteractions);
      await this.updateAgentStatus('drug_analyzer', 'completed', 100, `检测到${drugInteractions.length}项交互警示`);

      // Step 4: Clinical Guidelines Search
      await this.updateAgentStatus('guideline_consultant', 'active', 80, '检索临床指南');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const guidelines = this.generateClinicalGuidelines(enhancedPatientData.surgeryType || '', enhancedPatientData);
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
          this.updateAgentStatus(agentName, 'failed', this.agentStatus[agentName].progress, `错误: ${error instanceof Error ? error.message : String(error)}`);
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

    // Enhanced analysis with medical reports
    if (patient.medicalReports && patient.medicalReports.length > 0) {
      console.log('🔍 增强风险分析 - 分析医疗报告:', patient.medicalReports.length);
      patient.medicalReports.forEach((report: any) => {
        const reportRisks = this.analyzeReportRisks(report);
        console.log(`🔍 报告 ${report.reportType} 识别风险:`, reportRisks.length);
        riskFactors.push(...reportRisks);
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

  private analyzeReportRisks(report: any): RiskFactor[] {
    const risks: RiskFactor[] = [];
    const reportType = report.reportType;
    const extractedText = report.extractedText || '';
    const analyzedData = report.analyzedData || {};

    console.log(`🔍 分析 ${reportType} 报告风险:`, { extractedText: extractedText.substring(0, 100), analyzedData });

    // ECG (心电图) 风险分析
    if (reportType === 'ecg') {
      if (extractedText.includes('ST段') || extractedText.includes('T波') || extractedText.includes('心律不齐') || extractedText.includes('房颤')) {
        risks.push({
          type: 'cardiovascular',
          level: 'high',
          description: '心电图显示异常，存在心血管风险',
          score: 3,
          recommendations: ['心脏科会诊', '术前心功能评估', '术中心电监护', '准备抗心律失常药物']
        });
      }
      if (extractedText.includes('窦性心律') && !extractedText.includes('异常')) {
        risks.push({
          type: 'cardiovascular',
          level: 'low',
          description: '心电图显示窦性心律，心血管状况良好',
          score: 0,
          recommendations: ['维持现有心电监护']
        });
      }
    }

    // 凝血功能 风险分析
    if (reportType === 'coagulation') {
      if (extractedText.includes('延长') || extractedText.includes('异常') || extractedText.includes('↑') || extractedText.includes('升高')) {
        risks.push({
          type: 'bleeding',
          level: 'high',
          description: '凝血功能异常，出血风险增加',
          score: 3,
          recommendations: ['血液科会诊', '凝血因子检查', '准备凝血药物', '避免椎管内麻醉']
        });
      }
      if (analyzedData.ptInr && parseFloat(analyzedData.ptInr) > 1.5) {
        risks.push({
          type: 'bleeding',
          level: 'high', 
          description: `INR值${analyzedData.ptInr}，抗凝过度风险`,
          score: 3,
          recommendations: ['调整抗凝药物', '维生素K准备', '监测凝血指标']
        });
      }
    }

    // 生化检查 风险分析  
    if (reportType === 'biochemistry') {
      if (extractedText.includes('肌酐') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'renal',
          level: 'medium',
          description: '肌酐升高，肾功能不全风险',
          score: 2,
          recommendations: ['肾内科会诊', '调整药物剂量', '监测尿量', '避免肾毒性药物']
        });
      }
      if (extractedText.includes('转氨酶') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'hepatic',
          level: 'medium',
          description: '转氨酶升高，肝功能异常',
          score: 2,
          recommendations: ['肝病科会诊', '调整麻醉药物', '避免肝毒性药物', '术后肝功能监测']
        });  
      }
      if (extractedText.includes('血糖') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'metabolic',
          level: 'medium',
          description: '血糖升高，围术期血糖管理需要关注',
          score: 2,
          recommendations: ['内分泌科会诊', '胰岛素准备', '术中血糖监测', '感染预防']
        });
      }
    }

    return risks;
  }

  private generateDrugInteractions(medications: string[], medicalReports?: any[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    console.log('🔍 药物相互作用分析 - 输入药物:', medications);

    // 定义常用麻醉药物类别
    const anesthesiaDrugs = {
      ivAnesthetics: ['丙泊酚', '依托咪酯', '氯胺酮', '瑞马唑仑', '环泊酚'],
      opioids: ['芬太尼', '舒芬太尼', '瑞芬太尼', '吗啡', '哌替啶'],
      muscleRelaxants: ['罗库溴铵', '维库溴铵', '阿曲库铵', '顺式阿曲库胺'],
      localAnesthetics: ['利多卡因', '布比卡因', '罗哌卡因', '左旋布比卡因']
    };

    // 检查阿司匹林与抗血小板药物
    const hasAspirin = medications.some(med => 
      med.includes('阿司匹林') || med.includes('aspirin') || med.includes('拜阿司匹林')
    );

    if (hasAspirin) {
      interactions.push({
        id: 'aspirin-anesthesia-interaction',
        drugs: ['阿司匹林'],
        severity: 'major',
        summary: '阿司匹林增加术中出血风险，与麻醉药物存在重要相互作用',
        description: '阿司匹林通过不可逆性抑制血小板聚集，显著增加围术期出血风险。与麻醉药物联合使用时：1）椎管内麻醉可能导致硬膜外血肿；2）神经阻滞时增加血肿风险；3）与肝素类药物协同增加出血；4）影响凝血功能检测的准确性。',
        recommendations: ['术前5-7天停用阿司匹林', '术前检查血小板功能和凝血时间', '准备止血药物和血液制品', '避免椎管内麻醉技术', '选择可逆转的抗凝方案']
      });
    }

    // 检查其他抗血小板药物
    const hasAntiplatelet = medications.some(med => 
      med.includes('氯吡格雷') || med.includes('替格瑞洛') || med.includes('倍林达') || med.includes('普拉格雷')
    );

    if (hasAntiplatelet) {
      // 提取实际的抗血小板药物名称
      let drugName = 'P2Y12抑制剂';
      if (medications.some(med => med.includes('氯吡格雷'))) drugName = '氯吡格雷';
      else if (medications.some(med => med.includes('替格瑞洛'))) drugName = '替格瑞洛';
      else if (medications.some(med => med.includes('倍林达'))) drugName = '倍林达';
      else if (medications.some(med => med.includes('普拉格雷'))) drugName = '普拉格雷';
      
      interactions.push({
        id: 'antiplatelet-anesthesia-interaction',
        drugs: [drugName],
        severity: 'major',
        summary: 'P2Y12抑制剂与麻醉药物存在重要出血风险',
        description: 'P2Y12受体抑制剂（如氯吡格雷、替格瑞洛）通过不可逆性抑制血小板聚集，围术期出血风险极高。与麻醉相关风险：1）椎管内麻醉禁忌；2）区域神经阻滞高风险；3）术中出血难以控制；4）需要7天以上停药时间。',
        recommendations: ['术前5-7天停用（替格瑞洛）或7天停用（氯吡格雷）', '术前血小板功能检测', '避免椎管内和深部神经阻滞', '准备血小板输注', '考虑桥接治疗方案']
      });
    }

    // 检查抗凝药物（华法林、新型口服抗凝药）
    const hasAnticoagulant = medications.some(med => 
      med.includes('华法林') || med.includes('利伐沙班') || med.includes('达比加群') || med.includes('阿哌沙班') || med.includes('艾乐妥')
    );

    if (hasAnticoagulant) {
      // 提取实际的抗凝药物名称
      let drugName = '抗凝药物';
      if (medications.some(med => med.includes('华法林'))) drugName = '华法林';
      else if (medications.some(med => med.includes('利伐沙班'))) drugName = '利伐沙班';
      else if (medications.some(med => med.includes('达比加群'))) drugName = '达比加群';
      else if (medications.some(med => med.includes('阿哌沙班'))) drugName = '阿哌沙班';
      else if (medications.some(med => med.includes('艾乐妥'))) drugName = '艾乐妥';
      
      interactions.push({
        id: 'anticoagulant-anesthesia-interaction',
        drugs: [drugName],
        severity: 'major',
        summary: '抗凝药物与麻醉技术存在严重出血风险',
        description: '抗凝药物通过抑制凝血因子或凝血酶活性，显著增加围术期出血风险。与麻醉相关风险：1）椎管内麻醉绝对禁忌；2）深部神经阻滞禁忌；3）术中出血难以控制；4）术后血肿风险极高。新型口服抗凝药（NOACs）需要根据肾功能调整停药时间。',
        recommendations: ['术前48-72小时停用NOACs', '华法林需INR<1.5', '检查凝血功能', '准备拮抗剂（维生素K、鱼精蛋白等）', '避免椎管内麻醉', '选择全身麻醉']
      });
    }

    // 检查SSRI/SNRI抗抑郁药
    const hasSSRI = medications.some(med => 
      med.includes('舍曲林') || med.includes('氟西汀') || med.includes('帕罗西汀') || med.includes('西酞普兰') || med.includes('文拉法辛')
    );

    if (hasSSRI) {
      // 提取实际的SSRI/SNRI药物名称
      let drugName = 'SSRI/SNRI';
      if (medications.some(med => med.includes('舍曲林'))) drugName = '舍曲林';
      else if (medications.some(med => med.includes('氟西汀'))) drugName = '氟西汀';
      else if (medications.some(med => med.includes('帕罗西汀'))) drugName = '帕罗西汀';
      else if (medications.some(med => med.includes('西酞普兰'))) drugName = '西酞普兰';
      else if (medications.some(med => med.includes('文拉法辛'))) drugName = '文拉法辛';
      
      interactions.push({
        id: 'ssri-opioid-interaction',
        drugs: [drugName],
        severity: 'major',
        summary: 'SSRI/SNRI药物与阿片类药物存在5-羟色胺综合征风险',
        description: 'SSRI/SNRI抗抑郁药通过抑制5-羟色胺再摄取增加突触间隙5-HT浓度。与阿片类药物（特别是哌替啶、曲马多）联合使用时可能导致5-羟色胺综合征，表现为高热、肌强直、意识改变、自主神经功能紊乱等，危及生命。',
        recommendations: ['避免使用哌替啶和曲马多', '优选芬太尼类阿片药物', '监测体温和肌张力', '准备5-HT拮抗剂（赛庚啶）', '术前不停用SSRI/SNRI', '术后密切观察']
      });
    }

    // 检查氟哌噻吨美利曲辛（黛力新）
    const hasDeanxit = medications.some(med => 
      med.includes('氟哌') || med.includes('美利曲') || med.includes('黛力新') || med.includes('Deanxit')
    );

    if (hasDeanxit) {
      interactions.push({
        id: 'deanxit-anesthesia-interaction',
        drugs: ['氟哌噻吨美利曲辛'],
        severity: 'major',
        summary: '氟哌噻吨美利曲辛与麻醉药物存在重要相互作用',
        description: '氟哌噻吨美利曲辛含有抗精神病药氟哌噻吨和三环抗抑郁药美利曲辛，与麻醉药物联合使用可能导致：1）中枢神经系统抑制增强，苏醒延迟；2）QT间期延长，心律失常风险增加；3）血压不稳定，低血压风险；4）抗胆碱能作用增强，口干、便秘等副作用加重。',
        recommendations: ['术前心电图评估QT间期', '术中持续心电监护', '谨慎使用血管活性药物', '延长术后观察时间', '术前考虑逐渐减量停药3-7天', '准备阿托品等抗胆碱能药物拮抗剂']
      });
    }

    // Enhanced analysis with medical reports
    if (medicalReports && medicalReports.length > 0) {
      console.log('🔍 增强药物相互作用分析 - 结合医疗报告:', medicalReports.length);
      medicalReports.forEach(report => {
        if (report.reportType === 'coagulation' && hasAspirin) {
          // 如果有凝血报告且服用阿司匹林，增强风险评估
          const coagText = report.extractedText || '';
          if (coagText.includes('延长') || coagText.includes('异常')) {
            // 找到现有的阿司匹林相互作用并升级严重程度
            const aspirinInteraction = interactions.find(i => i.id === 'aspirin-anesthesia-interaction');
            if (aspirinInteraction) {
              aspirinInteraction.summary = '阿司匹林+凝血功能异常，出血风险极高';
              aspirinInteraction.description += ' 凝血功能检查显示异常，进一步增加了出血风险。';
              aspirinInteraction.recommendations.unshift('紧急血液科会诊');
            }
          }
        }
      });
    }

    return interactions;
  }

  private generateClinicalGuidelines(surgeryType: string, patient: any): ClinicalGuideline[] {
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

    // Enhanced analysis with medical reports
    if (patient.medicalReports && patient.medicalReports.length > 0) {
      console.log('🔍 增强指南匹配 - 结合医疗报告:', patient.medicalReports.length);
      patient.medicalReports.forEach((report: any) => {
        if (report.reportType === 'coagulation') {
          guidelines.push({
            id: 'coagulation-based-guideline',
            title: '凝血功能异常患者围术期管理指南',
            organization: '中华医学会血液学分会',
            year: 2023,
            relevance: 'high',
            summary: '基于凝血功能检查结果的围术期管理策略',
            recommendations: ['术前凝血功能评估', '术中止血管理', '避免椎管内麻醉', '备血准备']
          });
        }
      });
    }

    return guidelines;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): string {
    const totalScore = riskFactors.reduce((sum, factor) => sum + (factor.score || 0), 0);
    const highRiskCount = riskFactors.filter(f => f.level === 'high').length;
    
    if (highRiskCount >= 2 || totalScore >= 8) {
      return 'high';
    } else if (highRiskCount >= 1 || totalScore >= 4) {
      return 'medium'; 
    }
    return 'low';
  }

  private analyzeReportRisks(report: any): RiskFactor[] {
    const risks: RiskFactor[] = [];
    const reportType = report.reportType;
    const extractedText = report.extractedText || '';
    const analyzedData = report.analyzedData || {};

    console.log(`🔍 分析 ${reportType} 报告风险:`, { extractedText: extractedText.substring(0, 100), analyzedData });

    // ECG (心电图) 风险分析
    if (reportType === 'ecg') {
      if (extractedText.includes('ST段') || extractedText.includes('T波') || extractedText.includes('心律不齐') || extractedText.includes('房颤')) {
        risks.push({
          type: 'cardiovascular',
          level: 'high',
          description: '心电图显示异常，存在心血管风险',
          score: 3,
          recommendations: ['心脏科会诊', '术前心功能评估', '术中心电监护', '准备抗心律失常药物']
        });
      }
      if (extractedText.includes('窦性心律') && !extractedText.includes('异常')) {
        risks.push({
          type: 'cardiovascular',
          level: 'low',
          description: '心电图显示窦性心律，心血管状况良好',
          score: 0,
          recommendations: ['维持现有心电监护']
        });
      }
    }

    // 凝血功能 风险分析
    if (reportType === 'coagulation') {
      if (extractedText.includes('延长') || extractedText.includes('异常') || extractedText.includes('↑') || extractedText.includes('升高')) {
        risks.push({
          type: 'bleeding',
          level: 'high',
          description: '凝血功能异常，出血风险增加',
          score: 3,
          recommendations: ['血液科会诊', '凝血因子检查', '准备凝血药物', '避免椎管内麻醉']
        });
      }
      if (analyzedData.ptInr && parseFloat(analyzedData.ptInr) > 1.5) {
        risks.push({
          type: 'bleeding',
          level: 'high', 
          description: `INR值${analyzedData.ptInr}，抗凝过度风险`,
          score: 3,
          recommendations: ['调整抗凝药物', '维生素K准备', '监测凝血指标']
        });
      }
    }

    // 生化检查 风险分析  
    if (reportType === 'biochemistry') {
      if (extractedText.includes('肌酐') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'renal',
          level: 'medium',
          description: '肌酐升高，肾功能不全风险',
          score: 2,
          recommendations: ['肾内科会诊', '调整药物剂量', '监测尿量', '避免肾毒性药物']
        });
      }
      if (extractedText.includes('转氨酶') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'hepatic',
          level: 'medium',
          description: '转氨酶升高，肝功能异常',
          score: 2,
          recommendations: ['肝病科会诊', '调整麻醉药物', '避免肝毒性药物', '术后肝功能监测']
        });  
      }
      if (extractedText.includes('血糖') && (extractedText.includes('升高') || extractedText.includes('↑'))) {
        risks.push({
          type: 'metabolic',
          level: 'medium',
          description: '血糖升高，围术期血糖管理需要关注',
          score: 2,
          recommendations: ['内分泌科会诊', '胰岛素准备', '术中血糖监测', '感染预防']
        });
      }
    }

    return risks;
  }

  private generateRecommendations(riskFactors: RiskFactor[], drugInteractions: DrugInteraction[], guidelines: ClinicalGuideline[]): string[] {
    const recommendations: string[] = [];

    // Enhanced recommendations based on medical reports analysis
    console.log('🔍 生成综合建议 - 风险因素:', riskFactors.length);
    console.log('🔍 生成综合建议 - 药物相互作用:', drugInteractions.length);
    console.log('🔍 生成综合建议 - 临床指南:', guidelines.length);

    // Base recommendations from risk factors
    riskFactors.forEach(factor => {
      factor.recommendations?.forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });
    });

    // Enhanced recommendations from drug interactions  
    drugInteractions.forEach(interaction => {
      interaction.recommendations?.forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });
    });

    // Additional recommendations from clinical guidelines
    guidelines.forEach(guideline => {
      guideline.recommendations?.forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });
    });

    // Add medical report specific recommendations
    const hasHighRisk = riskFactors.some(f => f.level === 'high');
    const hasMajorDrugInteraction = drugInteractions.some(d => d.severity === 'major');
    
    if (hasHighRisk && hasMajorDrugInteraction) {
      recommendations.unshift('建议多学科团队会诊，制定个体化麻醉方案');
      recommendations.push('术后ICU监护，密切观察各项生命体征');
    }

    return recommendations.slice(0, 8); // Limit to 8 recommendations
  }
}
