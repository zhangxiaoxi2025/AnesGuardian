import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAssessmentSchema } from "@shared/schema";
import { AgentOrchestrator } from "./services/agents";

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
      
      if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
        return res.status(400).json({ message: "至少需要2种药物进行交互分析" });
      }

      const { analyzeDrugInteractions } = await import('./services/gemini');
      const result = await analyzeDrugInteractions(drugs);

      // 确保返回正确的数据结构
      res.json(result);
    } catch (error) {
      console.error('Drug interaction analysis error:', error);
      res.status(500).json({ message: "药物交互分析服务暂时不可用" });
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

  const httpServer = createServer(app);
  return httpServer;
}
