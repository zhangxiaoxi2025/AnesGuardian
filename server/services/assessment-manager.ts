import { storage } from '../storage';
import { SimpleAgentOrchestrator } from './simple-agents';
import type { Assessment } from '@shared/schema';

export class AssessmentManager {
  private static instance: AssessmentManager;
  private runningAssessments = new Map<number, { orchestrator: SimpleAgentOrchestrator; timeout: NodeJS.Timeout }>();

  static getInstance(): AssessmentManager {
    if (!AssessmentManager.instance) {
      AssessmentManager.instance = new AssessmentManager();
    }
    return AssessmentManager.instance;
  }

  async startAssessment(patientId: number, assessmentId: number): Promise<void> {
    // Cancel existing assessment for this patient if any
    this.cancelAssessment(assessmentId);

    const orchestrator = new SimpleAgentOrchestrator(assessmentId);
    
    // Set timeout for 2 minutes
    const timeout = setTimeout(() => {
      console.log(`Assessment ${assessmentId} timed out, marking as failed`);
      this.handleTimeout(assessmentId);
    }, 120000); // 2 minutes timeout

    this.runningAssessments.set(assessmentId, { orchestrator, timeout });

    try {
      await orchestrator.runAssessment(patientId);
      this.cleanupAssessment(assessmentId);
    } catch (error) {
      console.error(`Assessment ${assessmentId} failed:`, error);
      this.cleanupAssessment(assessmentId);
      
      // Mark assessment as failed
      await storage.updateAssessment(assessmentId, {
        status: 'failed'
      });
    }
  }

  async resetAssessment(patientId: number, assessmentId: number): Promise<Assessment | undefined> {
    // Cancel existing assessment
    this.cancelAssessment(assessmentId);

    // Reset assessment data
    const assessment = await storage.updateAssessment(assessmentId, {
      status: 'in_progress',
      overallRisk: null,
      riskFactors: [],
      drugInteractions: [],
      clinicalGuidelines: [],
      recommendations: [],
      agentStatus: {}
    });

    if (assessment) {
      // Start new assessment in background
      this.startAssessment(patientId, assessmentId).catch(error => {
        console.error('Background assessment failed:', error);
      });
    }

    return assessment;
  }

  private cancelAssessment(assessmentId: number): void {
    const running = this.runningAssessments.get(assessmentId);
    if (running) {
      clearTimeout(running.timeout);
      this.runningAssessments.delete(assessmentId);
    }
  }

  private cleanupAssessment(assessmentId: number): void {
    this.cancelAssessment(assessmentId);
  }

  private async handleTimeout(assessmentId: number): Promise<void> {
    this.cleanupAssessment(assessmentId);
    
    try {
      await storage.updateAssessment(assessmentId, {
        status: 'failed'
      });
    } catch (error) {
      console.error(`Failed to update timed out assessment ${assessmentId}:`, error);
    }
  }

  // Check for stuck assessments and reset them
  async checkStuckAssessments(): Promise<void> {
    try {
      const assessments = await storage.getAllAssessments();
      const now = new Date();
      
      for (const assessment of assessments) {
        if (assessment.status === 'in_progress' && assessment.createdAt) {
          const timeDiff = now.getTime() - new Date(assessment.createdAt).getTime();
          // If assessment has been running for more than 5 minutes, consider it stuck
          if (timeDiff > 300000) {
            console.log(`Found stuck assessment ${assessment.id}, resetting...`);
            await this.resetAssessment(assessment.patientId, assessment.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking stuck assessments:', error);
    }
  }
}

// Start periodic check for stuck assessments every 2 minutes
setInterval(() => {
  AssessmentManager.getInstance().checkStuckAssessments();
}, 120000);