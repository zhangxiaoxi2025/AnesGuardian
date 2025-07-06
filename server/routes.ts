import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertPatientSchema, insertAssessmentSchema } from "@shared/schema";
import { AgentOrchestrator } from "./services/agents";
import { processMedicalRecord, processImageWithAI } from "./services/medical-record-processor";

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(id, validatedData);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(id, validatedData);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Assessment routes
  app.get("/api/assessments", async (req, res) => {
    try {
      const assessments = await storage.getAllAssessments();
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assessments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients/:patientId/assess", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      // Use the new reliable assessment service
      const { ReliableAssessmentService } = await import('./services/reliable-assessment');
      const service = ReliableAssessmentService.getInstance();
      
      const result = await service.startAssessment(patientId);
      
      if (result.success) {
        res.json({ 
          message: result.message, 
          assessmentId: result.assessmentId 
        });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get("/api/patients/:patientId/assessment", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const assessment = await storage.getAssessmentByPatientId(patientId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found for this patient" });
      }
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Reset assessment endpoint
  app.post("/api/patients/:patientId/assessment/reset", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      // Get existing assessment
      let assessment = await storage.getAssessmentByPatientId(patientId);
      
      if (!assessment) {
        // Create new assessment
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
      }

      // Use AssessmentManager for robust handling
      const { AssessmentManager } = await import('./services/assessment-manager');
      const manager = AssessmentManager.getInstance();
      
      const resetAssessment = await manager.resetAssessment(patientId, assessment.id);

      res.json({ 
        message: "Assessment reset and restarted", 
        assessment: resetAssessment || assessment 
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post("/api/assessments", async (req, res) => {
    try {
      const validatedData = insertAssessmentSchema.parse(req.body);
      const assessment = await storage.createAssessment(validatedData);
      res.status(201).json(assessment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/assessments/:id/run", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await storage.getAssessment(assessmentId);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Use AssessmentManager for robust timeout protection
      const { AssessmentManager } = await import('./services/assessment-manager');
      const manager = AssessmentManager.getInstance();
      
      // Start assessment with timeout protection
      manager.startAssessment(assessment.patientId, assessmentId)
        .catch(error => {
          console.error('Background assessment failed:', error);
        });

      res.json({ message: "Assessment started", assessmentId });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get("/api/assessments/:id/logs", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const logs = await storage.getAgentLogsByAssessment(assessmentId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Demo data endpoint for testing
  app.post("/api/demo-data", async (req, res) => {
    try {
      // Create demo patient
      const demoPatient = await storage.createPatient({
        name: "张三",
        age: 65,
        gender: "男",
        surgeryType: "腹腔镜胆囊切除术",
        asaClass: "ASA III",
        medicalHistory: ["高血压", "糖尿病", "睡眠呼吸暂停综合征"],
        medications: ["阿司匹林", "美托洛尔", "二甲双胍"],
        allergies: ["青霉素"],
        vitalSigns: {
          bloodPressure: "150/90",
          heartRate: 78,
          temperature: 36.5,
          respiratoryRate: 18,
          oxygenSaturation: 95
        },
        labResults: {
          hemoglobin: 12.5,
          hematocrit: 38,
          platelets: 250000,
          creatinine: 1.2,
          glucose: 8.5
        }
      });

      // Create demo assessment
      const demoAssessment = await storage.createAssessment({
        patientId: demoPatient.id,
        status: "in_progress"
      });

      res.json({ patient: demoPatient, assessment: demoAssessment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const { getChatResponse } = await import('./services/chat');
      const aiResponse = await getChatResponse(message);

      res.json({ response: aiResponse });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "AI服务暂时不可用" });
    }
  });

  // Drug Interactions endpoint
  app.post("/api/drug-interactions", async (req, res) => {
    try {
      const { drugs } = req.body;
      
      // 日志1：打印从前端接收到的原始药物列表
      console.log('🔍 [DEBUG] 日志1 - 从前端接收到的原始药物列表:', JSON.stringify(drugs, null, 2));
      
      if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
        return res.status(400).json({ message: "至少需要2种药物进行交互分析" });
      }

      // 日志2：从数据库查询药物对象
      const { DrugService } = await import('./services/drug-service');
      const drugObjects = [];
      for (const drugName of drugs) {
        const drugObj = await DrugService.getDrugByName(drugName);
        drugObjects.push(drugObj);
      }
      console.log('🔍 [DEBUG] 日志2 - 从数据库查询到的完整药物对象:', JSON.stringify(drugObjects, null, 2));

      const { analyzeDrugInteractions } = await import('./services/gemini');
      const result = await analyzeDrugInteractions(drugs, drugObjects);

      // 日志5：打印最终准备返回给前端的JSON数据
      console.log('🔍 [DEBUG] 日志5 - 最终返回给前端的JSON数据:', JSON.stringify(result, null, 2));

      // 确保返回正确的数据结构
      res.json(result);
    } catch (error) {
      console.error('Drug interaction analysis error:', error);
      res.status(500).json({ message: "药物交互分析服务暂时不可用" });
    }
  });

  // Drug search endpoint
  app.get("/api/drugs/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const { DrugService } = await import('./services/drug-service');
      const drugs = await DrugService.searchDrugs(query);

      res.json({ drugs });
    } catch (error) {
      console.error('Drug search error:', error);
      res.status(500).json({ message: "药物搜索服务暂时不可用" });
    }
  });

  // Drug Interaction Deep Analysis endpoint
  app.post("/api/interactions/explain", async (req, res) => {
      const { drugA, drugB } = req.body;

      if (!drugA || !drugB || typeof drugA !== 'string' || typeof drugB !== 'string') {
          return res.status(400).json({ message: "drugA和drugB参数都是必需的" });
      }

      try {
          // 统一调用我们唯一的分析函数
          const { analyzeDrugInteractions } = await import('./services/gemini');
          // 注意这里的参数格式：一个字符串数组和一个空数组
          const result = await analyzeDrugInteractions([drugA, drugB], []); 

          // 从返回结果中提取第一个（也是唯一一个）交互对象
          // 如果AI返回错误，则interactions可能不存在
          if (result && result.interactions && result.interactions.length > 0) {
              res.json(result.interactions[0]);
          } else if (result && result.error) {
              // 如果AI分析返回了错误信息，也将其传递给前端
              res.status(500).json({ message: result.message });
          }
          else {
              // 如果没有找到交互信息，返回一个通用错误
              throw new Error('No interaction data returned from analysis service.');
          }
      } catch (error) {
          console.error('Deep drug interaction analysis error:', error);
          res.status(500).json({ message: '深度分析服务暂时不可用' });
      }
  });

  // Initialize drug database endpoint
  app.post("/api/drugs/init", async (req, res) => {
    try {
      const { DrugService } = await import('./services/drug-service');
      await DrugService.initializeDrugDatabase();
      res.json({ message: "药物数据库初始化成功" });
    } catch (error) {
      console.error('Drug database init error:', error);
      res.status(500).json({ message: "药物数据库初始化失败" });
    }
  });

  // Clinical Guidelines search endpoint
  app.get("/api/guidelines/search", async (req, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "搜索查询参数是必需的" });
      }

      const { searchClinicalGuidelines } = await import('./services/gemini');
      const guidelines = await searchClinicalGuidelines(query, []);

      res.json({ 
        guidelines: guidelines || [],
        total: guidelines ? guidelines.length : 0
      });
    } catch (error) {
      console.error('Clinical guidelines search error:', error);
      res.status(500).json({ message: "临床指南搜索服务暂时不可用" });
    }
  });

  // Medical Record Upload and Processing endpoint (legacy)
  app.post("/api/records/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "请选择一个图片文件" });
      }

      console.log('📸 收到病历照片上传请求，文件大小:', req.file.size);
      
      const result = await processMedicalRecord(req.file.buffer);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.error || "处理失败",
          success: false 
        });
      }

      res.json(result);
    } catch (error) {
      console.error('❌ 病历处理失败:', error);
      res.status(500).json({ 
        message: "病历处理服务暂时不可用",
        success: false 
      });
    }
  });

  // Medical Record Processing endpoint - AI-powered image analysis
  app.post("/api/medical-records/process", upload.single('medicalRecord'), async (req, res) => {
    try {
      console.log('🏥 医疗记录处理端点被调用');
      
      if (!req.file) {
        console.log('❌ 未收到文件');
        return res.status(400).json({ 
          message: "请选择一个图片文件",
          success: false 
        });
      }

      console.log('📸 收到病历照片上传请求');
      console.log('📄 文件大小:', req.file.size, '字节');
      console.log('📄 文件类型:', req.file.mimetype);
      
      // 验证文件类型
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          message: "只支持图片文件格式",
          success: false
        });
      }
      
      // 使用AI进行多模态图像分析
      console.log('🤖 开始AI图像分析...');
      const result = await processImageWithAI(req.file.buffer);
      
      if (!result.success) {
        return res.status(400).json({
          message: result.error || "图像分析失败",
          success: false
        });
      }

      console.log('✅ AI分析完成，返回结果');
      
      // 返回与前端期望格式匹配的数据
      const responseData = {
        summary: result.summary,
        medications: result.medications,
        success: true
      };
      
      res.json(responseData);
      
    } catch (error) {
      console.error('❌ 病历处理失败:', error);
      
      // 如果AI处理失败，返回友好的错误信息
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        res.status(429).json({
          message: "AI服务暂时繁忙，请稍后重试",
          success: false
        });
      } else {
        res.status(500).json({ 
          message: "图像分析服务暂时不可用，请重试",
          success: false 
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
