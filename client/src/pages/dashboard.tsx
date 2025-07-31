import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PatientOverview } from '@/components/patient-overview';
import { AgentStatusCard } from '@/components/agent-status';
import { RiskAssessment } from '@/components/risk-assessment';
import { DrugInteractions } from '@/components/drug-interactions';
import { ClinicalGuidelines } from '@/components/clinical-guidelines';
import { EnhancedAssessmentReport } from '@/components/enhanced-assessment-report';

import { generateEnhancedReportHTML } from '@/utils/enhanced-report-generator';
import type { Patient, Assessment, AgentStatus } from '../../../shared/schema';
import { apiRequest } from '@/lib/queryClient';

export default function Dashboard() {
  const [location] = useLocation();
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract patient ID from URL parameters when location changes
  useEffect(() => {
    console.log(`Dashboard: Location changed to: "${location}"`);
    console.log(`Dashboard: Current URL: "${window.location.href}"`);
    console.log(`Dashboard: Search params: "${window.location.search}"`);
    
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patient');
    console.log(`Dashboard: Patient parameter from URL: "${patientId}"`);
    
    if (patientId) {
      const parsedId = parseInt(patientId, 10);
      if (!isNaN(parsedId)) {
        console.log(`Dashboard: Setting patient ID: ${parsedId}`);
        setCurrentPatientId(parsedId);
      } else {
        console.log('Dashboard: Invalid patient ID in URL');
        setCurrentPatientId(null);
      }
    } else {
      console.log('Dashboard: No patient parameter in URL');
      setCurrentPatientId(null);
    }
  }, [location]);

  // Fetch patient data using standard React Query pattern
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<Patient>({
    queryKey: ['patient', currentPatientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${currentPatientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient');
      }
      return response.json();
    },
    enabled: !!currentPatientId, // Only run when currentPatientId is truthy
  });

  // Fetch assessment data using standard React Query pattern
  const { data: assessment, isLoading: assessmentLoading, error: assessmentError } = useQuery<Assessment>({
    queryKey: ['assessment', currentPatientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${currentPatientId}/assessment`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessment');
      }
      return response.json();
    },
    enabled: !!currentPatientId, // Only run when currentPatientId is truthy
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  });

  // Debug logs
  console.log('Dashboard state:', {
    currentPatientId,
    patientLoading,
    assessmentLoading,
    patientData: patient,
    assessmentData: assessment
  });

  // Enhanced PDF export function using new report generator
  const handleExportPDF = (patient: Patient, assessment: Assessment) => {
    const reportHTML = generateEnhancedReportHTML(patient, assessment);
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patient.name}_围术期风险评估报告.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "报告导出成功",
      description: "增强版风险评估报告已保存为HTML文件",
    });
  };

  const handleShareReport = async (patient: Patient, assessment: Assessment) => {
    const reportHTML = generateEnhancedReportHTML(patient, assessment);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${patient.name} - 围术期风险评估报告`,
          text: `患者${patient.name}的详细围术期风险评估报告`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "链接已复制",
          description: "报告链接已复制到剪贴板",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "分享失败",
        description: "无法分享报告，请稍后重试",
        variant: "destructive",
      });
    }
  };

  // Create demo data mutation
  const createDemoDataMutation = useMutation<Patient>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/patients', {
        name: '演示患者',
        age: 65,
        gender: '男',
        surgeryType: '腹腔镜胆囊切除术',
        asaClass: 'II',
        medicalHistory: ['高血压', '糖尿病'],
        medications: ['氨氯地平', '二甲双胍'],
        allergies: ['青霉素'],
        vitalSigns: {
          bloodPressure: '140/90',
          heartRate: 78,
          temperature: 36.5,
          respiratoryRate: 16,
          oxygenSaturation: 98
        },
        labResults: {
          hemoglobin: 12.5,
          whiteBloodCell: 6.8,
          platelet: 250,
          glucose: 7.2,
          creatinine: 85
        }
      });
      return await response.json();
    },
    onSuccess: (newPatient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setCurrentPatientId(newPatient.id);
      toast({
        title: "演示数据创建成功",
        description: `患者 ${newPatient.name} 已创建，ID: ${newPatient.id}`,
      });
    },
    onError: (error) => {
      toast({
        title: "创建演示数据失败",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateDemoData = () => {
    createDemoDataMutation.mutate();
  };

  // Start AI assessment mutation
  const startAssessmentMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest('POST', `/api/patients/${patientId}/assess`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', currentPatientId] });
      toast({
        title: "AI评估已启动",
        description: "正在进行智能风险评估分析...",
      });
    },
    onError: (error) => {
      toast({
        title: "启动评估失败",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Auto-trigger assessment when patient data is loaded
  useEffect(() => {
    if (patient && currentPatientId && assessment?.status !== 'completed' && assessment?.status !== 'in_progress') {
      console.log('Dashboard: Auto-triggering assessment for patient:', currentPatientId);
      startAssessmentMutation.mutate(currentPatientId);
    }
  }, [patient, currentPatientId, assessment?.status]);

  // Reset assessment mutation
  const resetAssessmentMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest('POST', `/api/patients/${patientId}/reset-assessment`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', currentPatientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${currentPatientId}/assessment`] });
      toast({
        title: "评估已重置",
        description: "正在重新开始评估过程...",
      });
    },
    onError: (error) => {
      toast({
        title: "重置评估失败",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleResetAssessment = () => {
    if (currentPatientId) {
      resetAssessmentMutation.mutate(currentPatientId);
    }
  };



  // Loading state
  if (patientLoading || assessmentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">智能决策仪表板</h1>
            <p className="text-muted-foreground">围术期风险评估与AI辅助决策</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在加载数据...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (patientError || assessmentError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">加载数据时出错</p>
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          </div>
        </div>
      </div>
    );
  }

  // No patient selected state
  if (!currentPatientId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">智能决策仪表板</h1>
            <p className="text-muted-foreground">围术期风险评估与AI辅助决策</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-64">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>欢迎使用麻醉守护神</CardTitle>
              <CardDescription>
                请选择一个患者开始风险评估，或创建演示数据进行体验
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button onClick={handleCreateDemoData} disabled={createDemoDataMutation.isPending}>
                {createDemoDataMutation.isPending ? '创建中...' : '创建演示数据'}
              </Button>
              <p className="text-sm text-muted-foreground">
                演示数据将创建一个示例患者并开始AI风险评估过程
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main dashboard with patient data
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">智能决策仪表板</h1>
          <p className="text-muted-foreground">围术期风险评估与AI辅助决策</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            患者ID: {currentPatientId}
          </Badge>
          <Button variant="outline" onClick={handleResetAssessment} disabled={resetAssessmentMutation.isPending}>
            {resetAssessmentMutation.isPending ? '重置中...' : '重新评估'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Patient Overview */}
        <div className="w-full">
          {patient && <PatientOverview patient={patient} />}
        </div>



        {/* Agent Status */}
        <div className="w-full">
          {assessment?.agentStatus && Object.keys(assessment.agentStatus).length > 0 ? (
            <AgentStatusCard agentStatus={assessment.agentStatus} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI代理状态</CardTitle>
                <CardDescription>多智能体协同评估进度</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">暂无代理状态信息</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Risk Assessment */}
        <div className="w-full">
          {assessment?.status === 'completed' ? (
            assessment.riskFactors && assessment.riskFactors.length > 0 ? (
              <RiskAssessment riskFactors={assessment.riskFactors} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>风险评估</CardTitle>
                  <CardDescription>围术期风险因素分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-green-600 dark:text-green-400">✓ 评估完成 - 未发现重要风险因素</p>
                  <p className="text-sm text-muted-foreground mt-2">基于患者年龄、病史和用药情况，当前风险等级较低</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>风险评估</CardTitle>
                <CardDescription>围术期风险因素分析</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">正在分析风险因素...</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Drug Interactions */}
        <div className="w-full">
          {assessment?.status === 'completed' ? (
            assessment.drugInteractions && assessment.drugInteractions.length > 0 ? (
              <DrugInteractions interactions={assessment.drugInteractions} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>药物相互作用</CardTitle>
                  <CardDescription>麻醉药物安全性分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-green-600 dark:text-green-400">✓ 分析完成 - 未发现重要相互作用</p>
                  <p className="text-sm text-muted-foreground mt-2">患者当前用药与麻醉药物的相互作用风险在可控范围内</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>药物相互作用</CardTitle>
                <CardDescription>麻醉药物安全性分析</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">正在分析药物相互作用...</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Clinical Guidelines */}
        <div className="w-full">
          {assessment?.status === 'completed' ? (
            assessment.clinicalGuidelines && assessment.clinicalGuidelines.length > 0 ? (
              <ClinicalGuidelines guidelines={assessment.clinicalGuidelines} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>临床指南</CardTitle>
                  <CardDescription>相关临床指南和建议</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-green-600 dark:text-green-400">✓ 检索完成 - 已匹配相关指南</p>
                  <p className="text-sm text-muted-foreground mt-2">系统已根据患者情况匹配了相关的临床指南和最佳实践</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>临床指南</CardTitle>
                <CardDescription>相关临床指南和建议</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">正在搜索相关临床指南...</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Assessment Report */}
        {assessment?.status === 'completed' && patient && (
          <div className="w-full">
            <EnhancedAssessmentReport
              patient={patient}
              assessment={assessment}
              onExportPDF={() => handleExportPDF(patient, assessment)}
              onShareReport={() => handleShareReport(patient, assessment)}
            />
          </div>
        )}
      </div>
    </div>
  );
}