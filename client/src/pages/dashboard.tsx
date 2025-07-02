import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                margin: 40px;
                line-height: 1.6;
                color: #333;
              }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              .section h3 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
              .risk-high { color: #dc2626; font-weight: bold; }
              .risk-medium { color: #d97706; font-weight: bold; }
              .risk-low { color: #059669; font-weight: bold; }
              .recommendation { background: #f8fafc; padding: 12px; margin: 8px 0; border-left: 4px solid #3b82f6; }
              ul { padding-left: 20px; }
              @media print {
                body { margin: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${reportContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast({
        title: "导出失败",
        description: "无法打开新窗口，请检查浏览器设置",
        variant: "destructive",
      });
    }
  };

  // Share report function
  const handleShareReport = async (patient: Patient, assessment: Assessment) => {
    const reportContent = generateReportHTML(patient, assessment);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `围术期风险评估报告 - ${patient.name}`,
          text: `患者 ${patient.name} 的围术期风险评估报告`,
          url: window.location.href
        });
        
        toast({
          title: "分享成功",
          description: "报告已成功分享",
        });
      } catch (error) {
        console.error('分享失败:', error);
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "链接已复制",
          description: "报告链接已复制到剪贴板",
        });
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "链接已复制",
          description: "报告链接已复制到剪贴板",
        });
      } catch (error) {
        toast({
          title: "分享失败",
          description: "无法复制链接到剪贴板",
          variant: "destructive",
        });
      }
    }
  };

  // Generate HTML report content
  const generateReportHTML = (patient: Patient, assessment: Assessment) => {
    const riskFactors = assessment.riskFactors || [];
    const drugInteractions = assessment.drugInteractions || [];
    const guidelines = assessment.clinicalGuidelines || [];
    const recommendations = assessment.recommendations || [];
    
    return `
      <div class="header">
        <h1>围术期风险评估报告</h1>
        <h2>患者：${patient.name}</h2>
        <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
      </div>
      
      <div class="section">
        <h3>患者基本信息</h3>
        <p><strong>姓名：</strong>${patient.name}</p>
        <p><strong>年龄：</strong>${patient.age}岁</p>
        <p><strong>性别：</strong>${patient.gender}</p>
        <p><strong>手术类型：</strong>${patient.surgeryType}</p>
        <p><strong>ASA分级：</strong>${patient.asaClass}</p>
      </div>
      
      <div class="section">
        <h3>总体风险评估</h3>
        <p class="risk-${assessment.overallRisk}">
          <strong>风险等级：${assessment.overallRisk === 'high' ? '高风险' : assessment.overallRisk === 'medium' ? '中等风险' : '低风险'}</strong>
        </p>
      </div>
      
      ${riskFactors.length > 0 ? `
      <div class="section">
        <h3>风险因素分析</h3>
        <ul>
          ${riskFactors.map(factor => `
            <li class="risk-${factor.level}">
              <strong>${factor.type === 'airway' ? '气道' : factor.type === 'cardiovascular' ? '心血管' : factor.type === 'thrombosis' ? '血栓' : factor.type === 'ponv' ? 'PONV' : '其他'}风险：</strong>
              ${factor.description}
              ${factor.recommendations.length > 0 ? `
              <ul>
                ${factor.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${drugInteractions.length > 0 ? `
      <div class="section">
        <h3>药物相互作用</h3>
        <ul>
          ${drugInteractions.map(interaction => `
            <li class="risk-${interaction.severity === 'major' ? 'high' : interaction.severity === 'moderate' ? 'medium' : 'low'}">
              <strong>${interaction.drugs.join(' + ')}：</strong>
              ${interaction.description}
              ${interaction.recommendations.length > 0 ? `
              <ul>
                ${interaction.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${guidelines.length > 0 ? `
      <div class="section">
        <h3>临床指南</h3>
        <ul>
          ${guidelines.map(guideline => `
            <li>
              <strong>${guideline.title}</strong> (${guideline.organization}, ${guideline.year})
              <p>${guideline.summary}</p>
              ${guideline.recommendations.length > 0 ? `
              <ul>
                ${guideline.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${recommendations.length > 0 ? `
      <div class="section">
        <h3>临床建议</h3>
        <ul>
          ${recommendations.map(rec => `<li class="recommendation">${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    `;
  };

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ['/api/patients', currentPatientId],
    enabled: currentPatientId !== null,
  });

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: ['/api/patients', currentPatientId, 'assessment'],
    enabled: currentPatientId !== null,
  });

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
      setCurrentPatientId(newPatient.id);
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "演示数据已创建",
        description: `患者 ${newPatient.name} 已添加`,
      });
    },
    onError: () => {
      toast({
        title: "创建失败",
        description: "无法创建演示数据",
        variant: "destructive",
      });
    },
  });

  // Handle creating demo data
  const handleCreateDemoData = () => {
    createDemoDataMutation.mutate();
  };

  // Reset assessment mutation
  const resetAssessmentMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest('POST', `/api/patients/${patientId}/reset-assessment`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', currentPatientId, 'assessment'] });
      toast({
        title: "评估已重置",
        description: "可以重新开始评估",
      });
    },
    onError: () => {
      toast({
        title: "重置失败",
        description: "无法重置评估",
        variant: "destructive",
      });
    },
  });

  const handleResetAssessment = () => {
    if (currentPatientId) {
      resetAssessmentMutation.mutate(currentPatientId);
    }
  };

  // Only create demo data if no patients exist at all
  useEffect(() => {
    if (currentPatientId === null) {
      // Don't auto-create demo data, let user decide
      console.log('Dashboard: No patient ID specified in URL');
    }
  }, [currentPatientId]);

  // Auto-refresh assessment data
  useEffect(() => {
    if (currentPatientId && assessment?.status === 'in_progress') {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/patients', currentPatientId, 'assessment'] 
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentPatientId, assessment?.status, queryClient]);

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
            <h1 className="text-2xl font-bold text-gray-900">麻醉守护神</h1>
            <p className="text-sm text-gray-600">智能围术期决策支持系统</p>
          </div>
          <div className="flex items-center space-x-4">
            {assessment && assessment.status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleExportPDF(patient, assessment)}
                  className="text-sm"
                >
                  <i className="fas fa-download mr-2"></i>
                  导出PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShareReport(patient, assessment)}
                  className="text-sm"
                >
                  <i className="fas fa-share mr-2"></i>
                  分享报告
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetAssessment}
                  disabled={resetAssessmentMutation.isPending}
                  className="text-sm"
                >
                  <i className="fas fa-redo mr-2"></i>
                  {resetAssessmentMutation.isPending ? '重置中...' : '重新评估'}
                </Button>
              </>
            )}
            <div className="text-sm text-gray-500">
              患者ID: {currentPatientId}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Patient Overview */}
        <PatientOverview patient={patient} />

        {assessment && (
          <>
            {/* Agent Status */}
            {assessment.agentStatus && Object.keys(assessment.agentStatus).length > 0 && (
              <AgentStatusCard agentStatus={assessment.agentStatus} />
            )}

            {/* Risk Assessment */}
            {assessment.riskFactors && assessment.riskFactors.length > 0 && (
              <RiskAssessment riskFactors={assessment.riskFactors} />
            )}

            {/* Drug Interactions */}
            {assessment.drugInteractions && assessment.drugInteractions.length > 0 && (
              <DrugInteractions interactions={assessment.drugInteractions} />
            )}

            {/* Clinical Guidelines */}
            {assessment.clinicalGuidelines && assessment.clinicalGuidelines.length > 0 && (
              <ClinicalGuidelines guidelines={assessment.clinicalGuidelines} />
            )}

            {/* Overall Assessment Summary */}
            {assessment.status === 'completed' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">评估总结</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assessment.overallRisk === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : assessment.overallRisk === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {assessment.overallRisk === 'high' ? '高风险' : 
                         assessment.overallRisk === 'medium' ? '中等风险' : '低风险'}
                      </div>
                    </div>
                    
                    {assessment.recommendations && assessment.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">临床建议：</h4>
                        <ul className="space-y-1">
                          {assessment.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span className="text-gray-700">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        {!assessment && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-gray-600">
                <i className="fas fa-chart-line text-4xl mb-4"></i>
                <p>该患者尚未进行风险评估</p>
                <p className="text-sm mt-2">请前往患者管理页面开始评估</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}