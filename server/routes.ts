import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertPatientSchema, insertAssessmentSchema } from "@shared/schema";
import { AgentOrchestrator } from "./services/agents";
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
      const result = insertPatientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid patient data", errors: result.error.issues });
      }

      const patient = await storage.createPatient(result.data);
      res.status(201).json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to create patient" });
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
      const orchestrator = new AgentOrchestrator(assessment.id);
      orchestrator.runAssessment(patientId).catch(console.error);

      res.json({ message: "Assessment started successfully", assessmentId: assessment.id });
    } catch (error) {
      console.error("Assessment error:", error);
      res.status(500).json({ message: "Failed to start assessment" });
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
        model: "gemini-1.5-flash",
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

      // Mock guidelines data for now
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

  const httpServer = createServer(app);
  return httpServer;
}