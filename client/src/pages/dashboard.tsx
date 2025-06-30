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

  // PDF export function
  const handleExportPDF = (patient: Patient, assessment: Assessment) => {
    const reportContent = generateReportHTML(patient, assessment);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>围术期风险评估报告 - ${patient.name}</title>
            <style>
              body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
              .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .risk-high { color: #dc2626; font-weight: bold; }
              .risk-medium { color: #d97706; font-weight: bold; }
              .risk-low { color: #059669; font-weight: bold; }
              .section { margin-bottom: 25px; }
              .section-title { color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-left: 4px solid #3b82f6; padding-left: 10px; }
              .risk-item { background: #fef3c7; padding: 10px; margin: 5px 0; border-radius: 4px; }
              .drug-warning { background: #fee2e2; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #dc2626; }
              .recommendation { padding: 8px; margin: 3px 0; background: #f0f9ff; border-radius: 4px; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${reportContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
    
    toast({
      title: "导出成功",
      description: "PDF报告已生成，请查看打印预览"
    });
  };

  // Share report function
  const handleShareReport = async (patient: Patient, assessment: Assessment) => {
    const reportText = `围术期风险评估报告\n患者：${patient.name}\n整体风险：${assessment.overallRisk === 'high' ? '高风险' : assessment.overallRisk === 'medium' ? '中风险' : '低风险'}\n风险因素：${assessment.riskFactors?.length || 0}项\n药物警示：${assessment.drugInteractions?.length || 0}项`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `围术期风险评估报告 - ${patient.name}`,
          text: reportText,
          url: window.location.href
        });
        toast({
          title: "分享成功",
          description: "报告已通过系统分享功能发送"
        });
      } catch (error) {
        // User cancelled sharing
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(reportText);
        toast({
          title: "已复制到剪贴板",
          description: "报告摘要已复制，可手动分享"
        });
      } catch (error) {
        toast({
          title: "分享失败",
          description: "请手动复制报告内容进行分享",
          variant: "destructive"
        });
      }
    }
  };

  // Generate HTML report content
  const generateReportHTML = (patient: Patient, assessment: Assessment) => {
    const riskLevelText = assessment.overallRisk === 'high' ? '高风险' : assessment.overallRisk === 'medium' ? '中风险' : '低风险';
    const riskClass = assessment.overallRisk === 'high' ? 'risk-high' : assessment.overallRisk === 'medium' ? 'risk-medium' : 'risk-low';
    
    return `
      <div class="header">
        <h1>围术期风险评估报告</h1>
        <p>基于多智能体AI协作分析生成</p>
        <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
      </div>

      <div class="patient-info">
        <h2>患者信息</h2>
        <p><strong>姓名：</strong>${patient.name}</p>
        <p><strong>年龄：</strong>${patient.age}岁</p>
        <p><strong>性别：</strong>${patient.gender}</p>
        <p><strong>手术类型：</strong>${patient.surgeryType}</p>
        <p><strong>ASA分级：</strong>${patient.asaClass}</p>
        <p><strong>既往史：</strong>${patient.medicalHistory?.join('、') || '无'}</p>
        <p><strong>用药史：</strong>${patient.medications?.join('、') || '无'}</p>
        <p><strong>过敏史：</strong>${patient.allergies?.join('、') || '无'}</p>
      </div>

      <div class="section">
        <h2 class="section-title">风险评估结论</h2>
        <p>整体风险等级：<span class="${riskClass}">${riskLevelText}</span></p>
        <p>识别风险因素：${assessment.riskFactors?.length || 0}项</p>
        <p>药物相互作用警示：${assessment.drugInteractions?.length || 0}项</p>
      </div>

      ${assessment.riskFactors && assessment.riskFactors.length > 0 ? `
        <div class="section">
          <h2 class="section-title">主要风险因素</h2>
          ${assessment.riskFactors.map(risk => `
            <div class="risk-item">
              <strong>${risk.type === 'cardiovascular' ? '心血管' : risk.type === 'airway' ? '气道' : risk.type === 'thrombosis' ? '血栓' : risk.type === 'ponv' ? 'PONV' : '其他'}风险</strong> - ${risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}等级
              <br>${risk.description}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${assessment.drugInteractions && assessment.drugInteractions.length > 0 ? `
        <div class="section">
          <h2 class="section-title">药物相互作用警示</h2>
          ${assessment.drugInteractions.map(drug => `
            <div class="drug-warning">
              <strong>${drug.severity === 'major' ? '重要' : drug.severity === 'moderate' ? '中等' : '轻微'}警示：</strong>${drug.drugs.join('、')}
              <br>${drug.description}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${assessment.recommendations && assessment.recommendations.length > 0 ? `
        <div class="section">
          <h2 class="section-title">临床建议</h2>
          ${assessment.recommendations.map((rec, index) => `
            <div class="recommendation">${index + 1}. ${rec}</div>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        <p>本报告由麻醉守护神AI系统生成，仅供临床参考，最终决策应结合临床医生专业判断</p>
        <p>报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
      </div>
    `;
  };

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

  // Reset assessment mutation
  const resetAssessmentMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest(`/api/patients/${patientId}/assessment/reset`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${currentPatientId}/assessment`] });
      toast({
        title: "评估已重启",
        description: "AI智能体正在重新分析患者数据"
      });
    },
    onError: () => {
      toast({
        title: "重启评估失败",
        description: "请稍后重试",
        variant: "destructive"
      });
    }
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
          <div className="flex items-center space-x-3">
            {assessment?.status === 'in_progress' && (
              <Button
                variant="outline"
                onClick={() => currentPatientId && resetAssessmentMutation.mutate(currentPatientId)}
                disabled={resetAssessmentMutation.isPending}
                className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <i className="fas fa-redo mr-2"></i>
                {resetAssessmentMutation.isPending ? '重启中...' : '重启评估'}
              </Button>
            )}
            {assessment?.status === 'failed' && (
              <Button
                onClick={() => currentPatientId && resetAssessmentMutation.mutate(currentPatientId)}
                disabled={resetAssessmentMutation.isPending}
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {resetAssessmentMutation.isPending ? '重试中...' : '重试评估'}
              </Button>
            )}
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
                  <Button 
                    variant="outline"
                    onClick={() => patient && assessment && handleExportPDF(patient, assessment)}
                  >
                    <i className="fas fa-download mr-2"></i>导出PDF
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => patient && assessment && handleShareReport(patient, assessment)}
                  >
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
