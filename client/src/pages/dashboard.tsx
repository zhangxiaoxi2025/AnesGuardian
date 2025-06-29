import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PatientOverview } from '@/components/patient-overview';
import { AgentStatusCard } from '@/components/agent-status';
import { RiskAssessment } from '@/components/risk-assessment';
import { DrugInteractions } from '@/components/drug-interactions';
import { ClinicalGuidelines } from '@/components/clinical-guidelines';
import type { Patient, Assessment } from '@shared/schema';

export default function Dashboard() {
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize demo data
  const createDemoDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/demo-data');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentPatientId(data.patient.id);
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assessments'] });
    },
  });

  // Get patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: [`/api/patients/${currentPatientId}`],
    enabled: !!currentPatientId,
  });

  // Get assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: [`/api/patients/${currentPatientId}/assessment`],
    enabled: !!currentPatientId,
  });

  // Start assessment mutation
  const startAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      const response = await apiRequest('POST', `/api/assessments/${assessmentId}/run`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "评估已启动",
        description: "AI智能体正在分析患者数据...",
      });
      // Start polling for updates
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${currentPatientId}/assessment`] });
      }, 2000);
      
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(interval), 30000);
    },
    onError: (error) => {
      toast({
        title: "启动失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize demo data on component mount
  useEffect(() => {
    if (!currentPatientId) {
      createDemoDataMutation.mutate();
    }
  }, []);

  // Auto-refresh assessment data
  useEffect(() => {
    if (assessment && assessment.status === 'in_progress') {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${currentPatientId}/assessment`] });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [assessment, currentPatientId, queryClient]);

  const handleStartAssessment = () => {
    if (assessment) {
      startAssessmentMutation.mutate(assessment.id);
    }
  };

  const handleCreateDemoData = () => {
    createDemoDataMutation.mutate();
  };

  if (patientLoading || assessmentLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">加载中...</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <i className="fas fa-user-plus text-4xl text-gray-400 mb-4"></i>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">暂无患者数据</h2>
            <p className="text-gray-600 mb-4">请先创建演示数据或添加患者</p>
            <Button onClick={handleCreateDemoData} disabled={createDemoDataMutation.isPending}>
              {createDemoDataMutation.isPending ? '创建中...' : '创建演示数据'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">围术期智能决策支持</h2>
            <p className="text-sm text-gray-500">
              当前患者: <span className="font-medium">{patient.name}</span> | 
              手术类型: <span className="font-medium">{patient.surgeryType}</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">AI系统正常</span>
            </div>
            {assessment && (
              <Button 
                onClick={handleStartAssessment}
                disabled={startAssessmentMutation.isPending || assessment.status === 'in_progress'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-play mr-2"></i>
                {assessment.status === 'in_progress' ? '评估进行中...' : '开始评估'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Patient Overview */}
        <PatientOverview patient={patient} />

        {/* Agent Status */}
        {assessment && (
          <AgentStatusCard agentStatus={assessment.agentStatus || {}} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Assessment */}
          <RiskAssessment riskFactors={assessment?.riskFactors || []} />

          {/* Drug Interactions */}
          <DrugInteractions interactions={assessment?.drugInteractions || []} />
        </div>

        {/* Clinical Guidelines */}
        <ClinicalGuidelines guidelines={assessment?.clinicalGuidelines || []} />

        {/* Generated Report */}
        {assessment && assessment.status === 'completed' && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">围术期风险评估报告</h3>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <i className="fas fa-download mr-2"></i>导出PDF
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <i className="fas fa-share mr-2"></i>分享报告
                  </Button>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-clipboard-check text-2xl text-blue-600"></i>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">综合评估结论</h4>
                    <p className="text-sm text-gray-600">基于多智能体协作分析生成</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${
                      assessment.overallRisk === 'high' ? 'text-red-600' :
                      assessment.overallRisk === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {assessment.overallRisk === 'high' ? '高' :
                       assessment.overallRisk === 'medium' ? '中' : '低'}
                    </div>
                    <div className="text-sm text-gray-600">整体风险等级</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {assessment.riskFactors?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">重要关注点</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {assessment.drugInteractions?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">药物警示</div>
                  </div>
                </div>
              </div>

              {assessment.recommendations && assessment.recommendations.length > 0 && (
                <div className="prose max-w-none">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">关键建议</h4>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      {assessment.recommendations.slice(0, 4).map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                      <i className="fas fa-lightbulb text-blue-400 mt-1 mr-3"></i>
                      <div className="text-sm text-blue-700">
                        <p><strong>AI建议：</strong>该患者需要经验丰富的麻醉医生主导，术中密切监测，必要时请相关专科会诊。</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
