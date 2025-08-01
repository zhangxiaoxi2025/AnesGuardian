import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertPatientSchema, insertAssessmentSchema, insertMedicalReportSchema, insertClinicalGuidelineDocumentSchema } from "@shared/schema";
import { SimpleAgentOrchestrator } from "./services/simple-agents";
import { processMedicalReport } from "./services/medical-report-analyzer";
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Block for Image Processing Route ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to get patients" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      console.log("接收到患者数据:", JSON.stringify(req.body, null, 2));
      const result = insertPatientSchema.safeParse(req.body);
      if (!result.success) {
        console.error("患者数据验证失败:", result.error.issues);
        return res.status(400).json({ message: "Invalid patient data", errors: result.error.issues });
      }

      console.log("验证通过，准备创建患者:", result.data);
      const patient = await storage.createPatient(result.data);
      console.log("患者创建成功:", patient);
      res.status(201).json(patient);
    } catch (error) {
      console.error("创建患者时发生错误:", error);
      res.status(500).json({ message: "Failed to create patient", error: (error as Error).message });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to get patient" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const result = insertPatientSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid patient data", errors: result.error.issues });
      }

      const patient = await storage.updatePatient(patientId, result.data);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const deleted = await storage.deletePatient(patientId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Assessment routes
  app.get("/api/patients/:id/assessment", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessment = await storage.getAssessmentByPatientId(patientId);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assessment" });
    }
  });

  app.post("/api/patients/:id/assess", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Check if patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Create initial assessment
      const assessment = await storage.createAssessment({
        patientId,
        status: 'pending',
        overallRisk: 'low',
        riskFactors: [],
        drugInteractions: [],
        clinicalGuidelines: [],
        recommendations: [],
        agentStatus: {}
      });

      // Start agent orchestration
      const orchestrator = new SimpleAgentOrchestrator(assessment.id);
      orchestrator.runAssessment(patientId).catch(console.error);

      res.json({ message: "Assessment started successfully", assessmentId: assessment.id });
    } catch (error) {
      console.error("Assessment error:", error);
      res.status(500).json({ message: "Failed to start assessment" });
    }
  });

  // Reset assessment route
  app.post("/api/patients/:id/reset-assessment", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Check if patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Find existing assessment
      let assessment = await storage.getAssessmentByPatientId(patientId);
      
      if (assessment) {
        // Reset existing assessment
        const updatedAssessment = await storage.updateAssessment(assessment.id, {
          status: 'pending',
          overallRisk: 'low',
          riskFactors: [],
          drugInteractions: [],
          clinicalGuidelines: [],
          recommendations: [],
          agentStatus: {}
        });
        
        if (updatedAssessment) {
          console.log(`Assessment ${updatedAssessment.id} reset for patient ${patientId}`);
          
          // Start new agent orchestration
          const orchestrator = new SimpleAgentOrchestrator(updatedAssessment.id);
          orchestrator.runAssessment(patientId).catch(console.error);
          
          assessment = updatedAssessment;
        }
        
        res.json({ message: "Assessment reset and restarted successfully", assessmentId: assessment?.id });
      } else {
        // Create new assessment if none exists
        assessment = await storage.createAssessment({
          patientId,
          status: 'pending',
          overallRisk: 'low',
          riskFactors: [],
          drugInteractions: [],
          clinicalGuidelines: [],
          recommendations: [],
          agentStatus: {}
        });
        
        console.log(`New assessment ${assessment.id} created for patient ${patientId}`);
        
        // Start agent orchestration
        const orchestrator = new SimpleAgentOrchestrator(assessment.id);
        orchestrator.runAssessment(patientId).catch(console.error);
        
        res.json({ message: "New assessment started successfully", assessmentId: assessment.id });
      }
    } catch (error) {
      console.error("Reset assessment error:", error);
      res.status(500).json({ message: "Failed to reset assessment" });
    }
  });

  // Drug routes
  app.get("/api/drugs/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json({ drugs: [] });
      }

      // Import DrugService dynamically to avoid circular dependency
      const { DrugService } = await import("./services/drug-service");
      const drugs = await DrugService.searchDrugs(query);
      res.json({ drugs });
    } catch (error) {
      console.error("Drug search error:", error);
      res.status(500).json({ message: "Failed to search drugs", drugs: [] });
    }
  });

  // Drug enhancement - AI-powered drug information enhancement
  app.post("/api/drugs/enhance", async (req, res) => {
    try {
      const { drugName } = req.body;
      
      if (!drugName || typeof drugName !== 'string') {
        return res.status(400).json({ message: "Drug name is required" });
      }

      console.log('🔍 开始增强药物信息:', drugName);

      // Import DrugEnhancementService dynamically
      const { DrugEnhancementService } = await import("./services/drug-enhancement");
      
      const enhancementData = await DrugEnhancementService.enhanceDrugInformation(drugName);
      
      console.log('✅ 药物信息增强完成:', drugName);
      
      res.json({ 
        drugName,
        enhancementData,
        success: true 
      });
    } catch (error) {
      console.error("❌ 药物信息增强失败:", error);
      res.status(500).json({ 
        message: "药物信息增强失败", 
        error: (error as Error).message,
        success: false 
      });
    }
  });

  // Drug preoperative guidelines
  app.post("/api/drugs/preoperative-guidelines", async (req, res) => {
    try {
      const { drugName } = req.body;
      
      if (!drugName || typeof drugName !== 'string') {
        return res.status(400).json({ message: "Drug name is required" });
      }

      console.log('🔍 生成术前停药建议:', drugName);

      // Import DrugEnhancementService dynamically
      const { DrugEnhancementService } = await import("./services/drug-enhancement");
      
      const guidelines = await DrugEnhancementService.generatePreoperativeGuidelines(drugName);
      
      console.log('✅ 术前停药建议生成完成:', drugName);
      
      res.json({ 
        drugName,
        guidelines,
        success: true 
      });
    } catch (error) {
      console.error("❌ 术前停药建议生成失败:", error);
      res.status(500).json({ 
        message: "术前停药建议生成失败", 
        error: (error as Error).message,
        success: false 
      });
    }
  });

  // Anesthesia drug interaction analysis
  app.post("/api/drugs/anesthesia-interaction", async (req, res) => {
    try {
      const { patientDrug, anesthesiaDrugs } = req.body;
      
      if (!patientDrug || !Array.isArray(anesthesiaDrugs)) {
        return res.status(400).json({ message: "Patient drug and anesthesia drugs are required" });
      }

      console.log('🔍 分析麻醉药物相互作用:', { patientDrug, anesthesiaDrugs });

      // Import DrugEnhancementService dynamically
      const { DrugEnhancementService } = await import("./services/drug-enhancement");
      
      const analysis = await DrugEnhancementService.analyzeAnesthesiaDrugInteraction(patientDrug, anesthesiaDrugs);
      
      console.log('✅ 麻醉药物相互作用分析完成');
      
      res.json({ 
        patientDrug,
        anesthesiaDrugs,
        analysis,
        success: true 
      });
    } catch (error) {
      console.error("❌ 麻醉药物相互作用分析失败:", error);
      res.status(500).json({ 
        message: "麻醉药物相互作用分析失败", 
        error: (error as Error).message,
        success: false 
      });
    }
  });

  // Drug interaction analysis
  app.post("/api/interactions/analyze", async (req, res) => {
    try {
      const { drugs } = req.body;
      
      if (!Array.isArray(drugs) || drugs.length === 0) {
        return res.json({ interactions: [] });
      }

      console.log('🔍 开始分析药物相互作用...');
      console.log('📋 选中的药物:', drugs.map(d => d.name));

      // Import services dynamically
      const { analyzeDrugInteractions } = await import("./services/gemini");
      const { DrugService } = await import("./services/drug-service");

      // Get full drug objects
      const drugObjects = [];
      for (const drug of drugs) {
        const fullDrug = await DrugService.getDrugByName(drug.name);
        if (fullDrug) {
          drugObjects.push(fullDrug);
        }
      }

      const drugNames = drugs.map(d => d.name);
      const interactions = await analyzeDrugInteractions(drugNames, drugObjects);
      
      console.log('✅ 药物相互作用分析完成，发现', interactions?.length || 0, '个相互作用');
      
      res.json({ interactions: interactions || [] });
    } catch (error) {
      console.error("❌ 药物相互作用分析失败:", error);
      res.status(500).json({ 
        message: "药物相互作用分析失败", 
        interactions: [] 
      });
    }
  });

  // Drug interaction explanation
  app.post("/api/interactions/explain", async (req, res) => {
    try {
      const { drugs, interaction } = req.body;
      
      if (!drugs || !interaction) {
        return res.status(400).json({ message: "Missing required data" });
      }

      console.log('🔍 开始药物相互作用深度分析...');
      console.log('🧪 分析药物组合:', drugs);
      console.log('⚠️ 相互作用类型:', interaction.severity);

      // Import Gemini service
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

      const prompt = `作为一名临床药理学专家，请详细分析以下药物相互作用：

药物组合：${drugs.join(' + ')}
相互作用描述：${interaction.description}
严重程度：${interaction.severity}

请提供详细的JSON格式分析报告，包含以下信息：
{
  "mechanism": "相互作用的药理学机制",
  "clinicalConsequences": "可能的临床后果",
  "monitoringRecommendations": "监测建议",
  "alternativeOptions": "替代治疗方案",
  "timingConsiderations": "给药时间考虑"
}

请确保回答专业、准确、实用。`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-preview-06-17",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const responseText = response.text || "";
      
      // Extract JSON from response
      let analysisData;
      try {
        // Try to parse direct JSON
        analysisData = JSON.parse(responseText);
      } catch {
        // Extract JSON from markdown if needed
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[1]);
        } else {
          // Fallback structured response
          analysisData = {
            mechanism: "详细机制分析暂时不可用",
            clinicalConsequences: "需要进一步临床评估",
            monitoringRecommendations: "建议咨询临床药师",
            alternativeOptions: "请考虑替代治疗方案",
            timingConsiderations: "注意给药时间间隔"
          };
        }
      }

      console.log('✅ 药物相互作用深度分析完成');
      res.json(analysisData);

    } catch (error) {
      console.error("❌ 药物相互作用深度分析失败:", error);
      res.status(500).json({ 
        message: "分析服务暂时不可用",
        mechanism: "系统错误",
        clinicalConsequences: "请咨询临床医师",
        monitoringRecommendations: "建议人工评估",
        alternativeOptions: "请寻求专业建议",
        timingConsiderations: "谨慎给药"
      });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const { getChatResponse } = await import("./services/chat");
      const response = await getChatResponse(message);
      
      res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Chat service is temporarily unavailable" });
    }
  });

  // Clinical Guidelines endpoint
  app.get("/api/clinical-guidelines", async (req, res) => {
    try {
      const { condition, category, relevance, search } = req.query;

      // Comprehensive clinical guidelines database
      const guidelines = [
        {
          id: "asa-2023-periop",
          title: "围术期麻醉管理指南 2023",
          organization: "ASA",
          year: 2023,
          relevance: "high" as const,
          summary: "美国麻醉医师协会发布的围术期麻醉管理标准指南",
          recommendations: ["标准监测", "气道管理", "液体管理", "疼痛控制"],
          keywords: ["围术期", "麻醉管理", "监测", "气道"],
          category: "麻醉管理",
          fullContent: "详细的围术期麻醉管理指南内容...",
          source: "https://pubs.asahq.org/"
        },
        {
          id: "esc-2022-cardiac",
          title: "心脏手术围术期管理指南",
          organization: "ESC",
          year: 2022,
          relevance: "high" as const,
          summary: "欧洲心脏病学会心脏手术围术期管理指南",
          recommendations: ["术前评估", "心肌保护", "血流动力学管理"],
          keywords: ["心脏手术", "围术期", "血流动力学"],
          category: "心脏外科",
          fullContent: "心脏手术围术期管理的详细指南...",
          source: "https://www.escardio.org/"
        },
        {
          id: "das-difficult-airway-2023",
          title: "困难气道管理指南",
          organization: "DAS",
          year: 2023,
          relevance: "high" as const,
          summary: "英国困难气道协会最新发布的困难气道识别和管理标准指南",
          recommendations: ["术前气道评估", "困难气道预测", "备用气道计划", "团队协作"],
          keywords: ["困难气道", "气道管理", "插管", "声门上器械"],
          category: "气道管理",
          fullContent: "困难气道管理指南详细内容...",
          source: "https://das.uk.com/"
        },
        {
          id: "ponv-consensus-2023",
          title: "术后恶心呕吐防治指南",
          organization: "SAMBA",
          year: 2023,
          relevance: "high" as const,
          summary: "美国基于回合的麻醉协会术后恶心呕吐预防和治疗共识",
          recommendations: ["风险评估", "预防性用药", "多模式治疗", "救援治疗"],
          keywords: ["PONV", "恶心", "呕吐", "预防", "治疗"],
          category: "术后管理",
          fullContent: "术后恶心呕吐防治指南详细内容...",
          source: "https://www.sambahq.org/"
        },
        {
          id: "regional-anesthesia-2023",
          title: "区域阻滞麻醉安全指南",
          organization: "ASRA",
          year: 2023,
          relevance: "high" as const,
          summary: "美国区域麻醉和疼痛医学会区域阻滞安全实践指南",
          recommendations: ["超声引导技术", "无菌操作", "局麻药选择", "并发症预防"],
          keywords: ["区域阻滞", "神经阻滞", "脊髓麻醉", "硬膜外"],
          category: "区域麻醉",
          fullContent: "区域阻滞麻醉安全指南详细内容...",
          source: "https://www.asra.com/"
        },
        {
          id: "pediatric-anesthesia-2023",
          title: "小儿麻醉安全指南",
          organization: "SPA",
          year: 2023,
          relevance: "high" as const,
          summary: "小儿麻醉协会儿童麻醉安全管理指南",
          recommendations: ["年龄体重计算", "体温管理", "液体治疗", "家属沟通"],
          keywords: ["小儿麻醉", "儿童", "新生儿", "婴儿"],
          category: "专科麻醉",
          fullContent: "小儿麻醉安全指南详细内容...",
          source: "https://www.pedsanesthesia.org/"
        },
        {
          id: "obstetric-anesthesia-2023",
          title: "产科麻醉管理指南",
          organization: "SOAP",
          year: 2023,
          relevance: "high" as const,
          summary: "产科麻醉和围产期医学会产科麻醉管理指南",
          recommendations: ["分娩镇痛", "剖宫产麻醉", "产科急症", "胎儿监护"],
          keywords: ["产科麻醉", "分娩", "剖宫产", "妊娠"],
          category: "专科麻醉",
          fullContent: "产科麻醉管理指南详细内容...",
          source: "https://www.soap.org/"
        },
        {
          id: "geriatric-anesthesia-2023",
          title: "老年患者麻醉指南",
          organization: "IARS",
          year: 2023,
          relevance: "high" as const,
          summary: "国际麻醉研究协会老年患者麻醉管理专家共识",
          recommendations: ["认知功能评估", "药物剂量调整", "术后谵妄预防", "早期康复"],
          keywords: ["老年麻醉", "认知", "谵妄", "衰弱"],
          category: "专科麻醉",
          fullContent: "老年患者麻醉指南详细内容...",
          source: "https://www.iars.org/"
        },
        {
          id: "pain-management-2023",
          title: "围术期疼痛管理指南",
          organization: "ASA",
          year: 2023,
          relevance: "high" as const,
          summary: "美国麻醉医师协会围术期疼痛管理循证指南",
          recommendations: ["多模式镇痛", "个体化方案", "非阿片类药物", "区域技术"],
          keywords: ["疼痛管理", "镇痛", "阿片类", "多模式"],
          category: "疼痛管理",
          fullContent: "围术期疼痛管理指南详细内容...",
          source: "https://pubs.asahq.org/"
        },
        {
          id: "ambulatory-anesthesia-2023",
          title: "日间手术麻醉指南",
          organization: "SAMBA",
          year: 2023,
          relevance: "medium" as const,
          summary: "美国基于回合的麻醉协会日间手术麻醉管理指南",
          recommendations: ["快速康复", "术后镇痛", "出院标准", "随访管理"],
          keywords: ["日间手术", "门诊麻醉", "快速康复", "出院"],
          category: "门诊麻醉",
          fullContent: "日间手术麻醉指南详细内容...",
          source: "https://www.sambahq.org/"
        },
        {
          id: "neurosurgical-anesthesia-2023",
          title: "神经外科麻醉指南",
          organization: "SNACC",
          year: 2023,
          relevance: "high" as const,
          summary: "神经麻醉和神经监测协会神经外科麻醉管理指南",
          recommendations: ["脑保护策略", "颅内压监测", "神经功能监测", "苏醒期管理"],
          keywords: ["神经外科", "脑外科", "颅内压", "神经监测"],
          category: "专科麻醉",
          fullContent: "神经外科麻醉指南详细内容...",
          source: "https://www.snacc.org/"
        },
        {
          id: "cardiac-anesthesia-2023",
          title: "心脏麻醉管理指南",
          organization: "SCA",
          year: 2023,
          relevance: "high" as const,
          summary: "心脏麻醉协会心脏手术麻醉管理专家指南",
          recommendations: ["心肌保护", "体外循环管理", "凝血功能监测", "血流动力学优化"],
          keywords: ["心脏麻醉", "体外循环", "心肌保护", "血流动力学"],
          category: "专科麻醉",
          fullContent: "心脏麻醉管理指南详细内容...",
          source: "https://www.scahq.org/"
        },
        {
          id: "transplant-anesthesia-2023",
          title: "器官移植麻醉指南",
          organization: "AST",
          year: 2023,
          relevance: "medium" as const,
          summary: "美国移植学会器官移植手术麻醉管理指南",
          recommendations: ["供体管理", "受体准备", "免疫抑制剂相互作用", "术后监护"],
          keywords: ["器官移植", "肝移植", "肾移植", "心脏移植"],
          category: "专科麻醉",
          fullContent: "器官移植麻醉指南详细内容...",
          source: "https://www.myast.org/"
        },
        {
          id: "trauma-anesthesia-2023",
          title: "创伤急救麻醉指南",
          organization: "ATLS",
          year: 2023,
          relevance: "high" as const,
          summary: "高级创伤生命支持创伤患者麻醉管理指南",
          recommendations: ["快速序贯诱导", "大量输血方案", "损伤控制复苏", "体温管理"],
          keywords: ["创伤麻醉", "急救", "大量输血", "损伤控制"],
          category: "急救麻醉",
          fullContent: "创伤急救麻醉指南详细内容...",
          source: "https://www.facs.org/"
        },
        {
          id: "icu-sedation-2023",
          title: "ICU镇静镇痛指南",
          organization: "SCCM",
          year: 2023,
          relevance: "high" as const,
          summary: "重症医学会重症监护病房镇静镇痛和谵妄管理指南",
          recommendations: ["浅镇静策略", "每日觉醒试验", "谵妄筛查", "早期活动"],
          keywords: ["ICU", "镇静", "镇痛", "谵妄", "机械通气"],
          category: "重症医学",
          fullContent: "ICU镇静镇痛指南详细内容...",
          source: "https://www.sccm.org/"
        },
        {
          id: "sepsis-management-2023",
          title: "脓毒症患者麻醉指南",
          organization: "SSC",
          year: 2023,
          relevance: "high" as const,
          summary: "脓毒症拯救运动脓毒症患者围术期管理指南",
          recommendations: ["早期识别", "液体复苏", "血管加压药使用", "抗感染治疗"],
          keywords: ["脓毒症", "感染", "休克", "液体复苏"],
          category: "急危重症",
          fullContent: "脓毒症患者麻醉指南详细内容...",
          source: "https://www.survivingsepsis.org/"
        },
        {
          id: "malignant-hyperthermia-2023",
          title: "恶性高热管理指南",
          organization: "MHAUS",
          year: 2023,
          relevance: "high" as const,
          summary: "恶性高热协会恶性高热诊断和治疗紧急指南",
          recommendations: ["早期识别", "立即停药", "丹曲林治疗", "支持治疗"],
          keywords: ["恶性高热", "丹曲林", "肌松药", "吸入麻醉药"],
          category: "麻醉并发症",
          fullContent: "恶性高热管理指南详细内容...",
          source: "https://www.mhaus.org/"
        }
      ];

      // Filter based on query parameters
      let filteredGuidelines = guidelines;

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredGuidelines = filteredGuidelines.filter(g => 
          g.title.toLowerCase().includes(searchTerm) ||
          g.summary.toLowerCase().includes(searchTerm) ||
          g.keywords?.some(k => k.toLowerCase().includes(searchTerm))
        );
      }

      if (category) {
        filteredGuidelines = filteredGuidelines.filter(g => 
          g.category?.toLowerCase() === (category as string).toLowerCase()
        );
      }

      if (relevance) {
        filteredGuidelines = filteredGuidelines.filter(g => 
          g.relevance === relevance
        );
      }

      res.json({
        guidelines: filteredGuidelines,
        total: filteredGuidelines.length
      });
    } catch (error) {
      console.error("Clinical guidelines error:", error);
      res.status(500).json({ message: "Failed to fetch clinical guidelines" });
    }
  });

  // Medical Reports API routes
  app.get("/api/medical-reports", async (req, res) => {
    try {
      const { patientId } = req.query;
      
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required" });
      }
      
      const reports = await storage.getMedicalReportsByPatientId(parseInt(patientId as string));
      res.json(reports);
    } catch (error) {
      console.error("获取医疗报告失败:", error);
      res.status(500).json({ message: "Failed to get medical reports" });
    }
  });

  app.post("/api/medical-reports", async (req, res) => {
    try {
      console.log("创建医疗报告请求:", JSON.stringify(req.body, null, 2));
      
      const result = insertMedicalReportSchema.safeParse(req.body);
      if (!result.success) {
        console.error("医疗报告数据验证失败:", result.error.issues);
        return res.status(400).json({ message: "Invalid medical report data", errors: result.error.issues });
      }

      const report = await storage.createMedicalReport(result.data);
      console.log("医疗报告创建成功:", report);
      
      res.status(201).json(report);
    } catch (error) {
      console.error("创建医疗报告失败:", error);
      res.status(500).json({ message: "Failed to create medical report", error: (error as Error).message });
    }
  });

  app.delete("/api/medical-reports/:id", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const success = await storage.deleteMedicalReport(reportId);
      
      if (!success) {
        return res.status(404).json({ message: "Medical report not found" });
      }
      
      res.json({ message: "Medical report deleted successfully" });
    } catch (error) {
      console.error("删除医疗报告失败:", error);
      res.status(500).json({ message: "Failed to delete medical report" });
    }
  });

  // Medical Report Upload endpoint with file handling
  app.post("/api/medical-reports/upload", upload.single('imageFile'), async (req, res) => {
    try {
      console.log("医疗报告上传请求:");
      console.log("- 文件:", req.file ? req.file.originalname : '无');
      console.log("- 表单数据:", req.body);
      
      const { reportType, patientId, uploadMethod, textContent } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ message: "Report type is required" });
      }
      
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required" });
      }
      
      let imageBase64 = null;
      let textInput = null;
      
      if (uploadMethod === 'image' && req.file) {
        imageBase64 = req.file.buffer.toString('base64');
      } else if (uploadMethod === 'text' && textContent) {
        textInput = textContent;
      } else {
        return res.status(400).json({ message: "Either image file or text content is required" });
      }
      
      // 处理医疗报告
      const { extractedText, analysisResult } = await processMedicalReport(
        imageBase64 || undefined,
        textInput || undefined,
        reportType
      );

      // 自动保存报告到数据库
      const reportData = {
        patientId: parseInt(patientId),
        reportType,
        uploadMethod: uploadMethod as 'image' | 'text',
        originalContent: imageBase64 || textInput,
        extractedText,
        analysisResult,
        status: 'analyzed' as const,
      };
      
      const savedReport = await storage.createMedicalReport(reportData);
      console.log("报告上传并分析完成:", savedReport.id);

      res.json({
        extractedText,
        analysisResult,
        savedReport,
        message: "报告上传分析完成并已保存"
      });
    } catch (error) {
      console.error("医疗报告上传失败:", error);
      res.status(500).json({ 
        message: "Medical report upload failed", 
        error: (error as Error).message 
      });
    }
  });

  app.post("/api/medical-reports/analyze", async (req, res) => {
    try {
      console.log("医疗报告分析请求:", JSON.stringify(req.body, null, 2));
      
      const { imageBase64, textInput, reportType, patientId } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ message: "Report type is required" });
      }
      
      if (!imageBase64 && !textInput) {
        return res.status(400).json({ message: "Either image or text input is required" });
      }

      // 处理医疗报告
      const { extractedText, analysisResult } = await processMedicalReport(
        imageBase64,
        textInput,
        reportType
      );

      // 如果提供了患者ID，自动保存报告到数据库
      let savedReport = null;
      if (patientId) {
        try {
          const reportData = {
            patientId: parseInt(patientId),
            reportType,
            uploadMethod: imageBase64 ? 'image' as const : 'text' as const,
            originalContent: imageBase64 || textInput,
            extractedText,
            analysisResult,
            status: 'analyzed' as const,
          };
          
          savedReport = await storage.createMedicalReport(reportData);
          console.log("报告已自动保存到数据库:", savedReport.id);
        } catch (saveError) {
          console.warn("保存报告失败，但分析成功:", saveError);
        }
      }

      res.json({
        extractedText,
        analysisResult,
        savedReport,
        message: savedReport ? "报告分析完成并已保存" : "报告分析完成"
      });
    } catch (error) {
      console.error("医疗报告分析失败:", error);
      res.status(500).json({ 
        message: "Medical report analysis failed", 
        error: (error as Error).message 
      });
    }
  });

  app.post("/api/medical-records/process", upload.single('medicalRecord'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file was uploaded." });
        }
        console.log("Received image for processing:", req.file.originalname);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

        const textPrompt = "你是一名专业的医疗信息录入员。请仔细分析这张病历图片，并以JSON格式返回以下信息：1. 'summary': 对病史的简要总结，包含主要诊断和症状。2. 'medications': 一个包含所有当前用药名称的字符串数组。请确保提取的信息准确无误。";
        
        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [
              { text: textPrompt },
              imagePart
            ]
          }]
        });

        const responseText = result.response.text();
        console.log("AI Raw Response:", responseText);
        
        // Parse JSON response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // Try to extract JSON from markdown if needed
          const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error("Unable to parse AI response as JSON");
          }
        }
        
        res.status(200).json(data);
    } catch (error) {
        console.error("Image processing failed:", error);
        res.status(500).json({ message: "AI image recognition failed." });
    }
  });

  // === Clinical Guidelines Routes ===
  
  // Get all clinical guidelines
  app.get("/api/clinical-guidelines", async (req, res) => {
    try {
      const { category } = req.query;
      let guidelines;
      
      if (category && typeof category === 'string') {
        guidelines = await storage.getClinicalGuidelinesByCategory(category);
      } else {
        guidelines = await storage.getAllClinicalGuidelines();
      }
      
      res.json(guidelines);
    } catch (error) {
      console.error("Failed to fetch clinical guidelines:", error);
      res.status(500).json({ message: "Failed to fetch clinical guidelines" });
    }
  });

  // Get specific clinical guideline
  app.get("/api/clinical-guidelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const guideline = await storage.getClinicalGuideline(id);
      
      if (!guideline) {
        return res.status(404).json({ message: "Clinical guideline not found" });
      }
      
      res.json(guideline);
    } catch (error) {
      console.error("Failed to fetch clinical guideline:", error);
      res.status(500).json({ message: "Failed to fetch clinical guideline" });
    }
  });

  // Upload and create clinical guideline
  app.post("/api/clinical-guidelines", upload.single('file'), async (req, res) => {
    try {
      const { title, organization, year, category, description } = req.body;
      const file = req.file;
      
      // Validate required fields
      if (!title || !organization || !year || !category) {
        return res.status(400).json({ 
          message: "Missing required fields: title, organization, year, category" 
        });
      }

      let extractedText = '';
      let fileType = '';
      let originalFileName = '';

      if (file) {
        originalFileName = file.originalname;
        fileType = file.mimetype.includes('image') ? 'image' : 
                  file.mimetype.includes('pdf') ? 'pdf' : 'text';
        
        // Extract text based on file type
        const { documentParserService } = await import("./services/document-parser");
        
        if (fileType === 'image') {
          const base64Image = file.buffer.toString('base64');
          extractedText = await documentParserService.extractTextFromImage(base64Image);
        } else if (fileType === 'pdf') {
          extractedText = await documentParserService.extractTextFromPDF(file.buffer.toString());
        } else {
          extractedText = file.buffer.toString('utf-8');
        }
      } else if (req.body.content) {
        // Manual text input
        extractedText = req.body.content;
        fileType = 'text';
      } else {
        return res.status(400).json({ message: "Either file upload or content text is required" });
      }

      // AI analysis of the content
      const { documentParserService } = await import("./services/document-parser");
      const aiAnalysis = await documentParserService.analyzeGuidelineContent(extractedText, {
        title,
        organization,
        category
      });

      // Create guideline document
      const guidelineData = {
        title,
        organization,
        year: parseInt(year),
        category,
        description: description || aiAnalysis.summary,
        originalFileName,
        fileType,
        extractedText,
        structuredData: aiAnalysis.structuredData,
        keywords: aiAnalysis.keywords,
        sections: aiAnalysis.sections,
        status: 'active' as const
      };

      const validationResult = insertClinicalGuidelineDocumentSchema.safeParse(guidelineData);
      if (!validationResult.success) {
        console.error("Guideline validation failed:", validationResult.error);
        return res.status(400).json({ 
          message: "Invalid guideline data", 
          errors: validationResult.error.issues 
        });
      }

      const guideline = await storage.createClinicalGuideline(validationResult.data);

      // Create sections in the database
      for (const section of aiAnalysis.sections) {
        await storage.createGuidelineSection({
          guidelineId: guideline.id,
          sectionTitle: section.title,
          content: section.content,
          sectionType: section.type,
          relevanceKeywords: section.keywords || [],
          priority: section.priority || 3
        });
      }

      console.log(`✅ Clinical guideline created: ${title}`);
      res.status(201).json(guideline);
      
    } catch (error) {
      console.error("Failed to create clinical guideline:", error);
      res.status(500).json({ 
        message: "Failed to create clinical guideline", 
        error: (error as Error).message 
      });
    }
  });

  // Search guidelines based on patient context
  app.post("/api/clinical-guidelines/search", async (req, res) => {
    try {
      const { keywords, patientContext } = req.body;
      
      if (!Array.isArray(keywords)) {
        return res.status(400).json({ message: "Keywords must be an array" });
      }

      // Get all guidelines
      const allGuidelines = await storage.getAllClinicalGuidelines();
      
      // Use smart matching if patient context provided
      const { documentParserService } = await import("./services/document-parser");
      
      let matchedGuidelines;
      if (patientContext) {
        matchedGuidelines = await documentParserService.matchGuidelinesForPatient(
          allGuidelines, 
          patientContext
        );
      } else {
        matchedGuidelines = await storage.searchClinicalGuidelines(keywords);
      }

      res.json(matchedGuidelines);
      
    } catch (error) {
      console.error("Failed to search clinical guidelines:", error);
      res.status(500).json({ 
        message: "Failed to search clinical guidelines", 
        error: (error as Error).message 
      });
    }
  });

  // Update clinical guideline
  app.put("/api/clinical-guidelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedGuideline = await storage.updateClinicalGuideline(id, updateData);
      
      if (!updatedGuideline) {
        return res.status(404).json({ message: "Clinical guideline not found" });
      }
      
      res.json(updatedGuideline);
    } catch (error) {
      console.error("Failed to update clinical guideline:", error);
      res.status(500).json({ message: "Failed to update clinical guideline" });
    }
  });

  // Delete clinical guideline
  app.delete("/api/clinical-guidelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClinicalGuideline(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Clinical guideline not found" });
      }
      
      res.json({ message: "Clinical guideline deleted successfully" });
    } catch (error) {
      console.error("Failed to delete clinical guideline:", error);
      res.status(500).json({ message: "Failed to delete clinical guideline" });
    }
  });

  // Get guideline sections
  app.get("/api/clinical-guidelines/:id/sections", async (req, res) => {
    try {
      const guidelineId = parseInt(req.params.id);
      const sections = await storage.getGuidelineSectionsByGuidelineId(guidelineId);
      res.json(sections);
    } catch (error) {
      console.error("Failed to fetch guideline sections:", error);
      res.status(500).json({ message: "Failed to fetch guideline sections" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}