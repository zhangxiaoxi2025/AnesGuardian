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
      res.status(400).json({ message: error.message });
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
      
      // Check if patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Create new assessment
      const assessment = await storage.createAssessment({
        patientId,
        status: "in_progress"
      });

      // Start the agent orchestration
      const orchestrator = new AgentOrchestrator(assessment.id);
      
      // Run assessment in background
      orchestrator.runAssessment(patientId)
        .catch(error => {
          console.error('Background assessment failed:', error);
        });

      res.json({ message: "Assessment started", assessmentId: assessment.id });
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

      // Start the agent orchestration
      const orchestrator = new AgentOrchestrator(assessmentId);
      
      // Run assessment in background
      orchestrator.runAssessment(assessment.patientId)
        .catch(error => {
          console.error('Background assessment failed:', error);
        });

      res.json({ message: "Assessment started", assessmentId });
    } catch (error) {
      res.status(500).json({ message: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
