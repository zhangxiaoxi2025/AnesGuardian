import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  AlertTriangle, 
  Shield, 
  Clock, 
  TrendingUp, 
  FileText,
  Download,
  Share2,
  Star,
  Activity,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';
import type { Patient, Assessment } from '@shared/schema';

interface EnhancedAssessmentReportProps {
  patient: Patient;
  assessment: Assessment;
  onExportPDF: () => void;
  onShareReport: () => void;
}

// Risk calculation utilities
const calculateGoldmanScore = (patient: Patient, riskFactors: any[]) => {
  let score = 0;
  
  // Age factor
  if (patient.age >= 70) score += 5;
  else if (patient.age >= 60) score += 2;
  
  // Medical history factors
  const history = patient.medicalHistory?.join(' ').toLowerCase() || '';
  if (history.includes('心') || history.includes('冠心病') || history.includes('心梗')) score += 10;
  if (history.includes('高血压')) score += 5;
  if (history.includes('糖尿病')) score += 5;
  if (history.includes('脑梗') || history.includes('脑血管')) score += 5;
  
  return Math.min(score, 25); // Cap at 25
};

const calculateCapriniScore = (patient: Patient) => {
  let score = 0;
  
  // Age factors
  if (patient.age >= 75) score += 4;
  else if (patient.age >= 60) score += 2;
  else if (patient.age >= 40) score += 1;
  
  // Gender and surgery type
  if (patient.gender === 'female') score += 1;
  if (patient.surgeryType?.includes('腹腔镜')) score += 2;
  if (patient.surgeryType?.includes('妇科')) score += 1;
  
  // Medical conditions
  const history = patient.medicalHistory?.join(' ').toLowerCase() || '';
  if (history.includes('血栓')) score += 3;
  if (history.includes('心') || history.includes('心血管')) score += 1;
  
  // Medications
  const medications = patient.medications?.join(' ').toLowerCase() || '';
  if (medications.includes('阿司匹林') || medications.includes('华法林')) score += 1;
  
  return score;
};

const calculateApfelScore = (patient: Patient) => {
  let score = 0;
  
  // Gender
  if (patient.gender === 'female') score += 1;
  
  // Age (younger patients higher risk for PONV)
  if (patient.age < 50) score += 1;
  
  // Surgery type
  if (patient.surgeryType?.includes('腹腔镜') || patient.surgeryType?.includes('妇科')) score += 1;
  
  // History of motion sickness or PONV (assume if not contraindicated)
  score += 1;
  
  return score;
};

const getRiskLevel = (score: number, thresholds: number[]) => {
  if (score >= thresholds[1]) return 'high';
  if (score >= thresholds[0]) return 'medium';
  return 'low';
};

const getRiskColor = (level: string) => {
  switch (level) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'high': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'medium': return <TrendingUp className="h-5 w-5 text-yellow-500" />;
    case 'low': return <Shield className="h-5 w-5 text-green-500" />;
    default: return <Info className="h-5 w-5 text-gray-500" />;
  }
};

export function EnhancedAssessmentReport({ 
  patient, 
  assessment, 
  onExportPDF, 
  onShareReport 
}: EnhancedAssessmentReportProps) {
  // Calculate risk scores
  const goldmanScore = calculateGoldmanScore(patient, assessment.riskFactors || []);
  const capriniScore = calculateCapriniScore(patient);
  const apfelScore = calculateApfelScore(patient);
  
  const cardiovascularRisk = getRiskLevel(goldmanScore, [10, 20]);
  const thrombosisRisk = getRiskLevel(capriniScore, [3, 6]);
  const ponvRisk = getRiskLevel(apfelScore, [2, 3]);

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-blue-900">围术期风险评估报告</CardTitle>
                <p className="text-blue-700 text-sm">基于多智能体AI协作分析 • 生成时间: {new Date().toLocaleString('zh-CN')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExportPDF} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                导出PDF
              </Button>
              <Button onClick={onShareReport} className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                分享报告
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Patient Information - Enhanced */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            患者基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">姓名:</span>
                <span className="font-medium">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">年龄:</span>
                <span className="font-medium">{patient.age}岁</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">性别:</span>
                <span className="font-medium">{patient.gender === 'female' ? '女性' : '男性'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">手术类型:</span>
                <span className="font-medium text-right">{patient.surgeryType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ASA分级:</span>
                <Badge variant="outline">{patient.asaClass}</Badge>
              </div>
              {patient.vitalSigns && (
                <div className="flex justify-between">
                  <span className="text-gray-600">BMI:</span>
                  <span className="font-medium">{patient.vitalSigns.bmi}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {patient.medicalHistory && patient.medicalHistory.length > 0 && (
                <div>
                  <span className="text-gray-600 text-sm">既往病史:</span>
                  <div className="mt-1">
                    {patient.medicalHistory.map((history, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1 text-xs">
                        {history}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            详细风险评估
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Goldman Cardiac Risk */}
            <Card className={`border ${getRiskColor(cardiovascularRisk)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="font-medium">心血管风险</span>
                  </div>
                  {getRiskIcon(cardiovascularRisk)}
                </div>
                <div className="text-2xl font-bold mb-1">{goldmanScore}/25</div>
                <div className="text-sm opacity-80">Goldman评分</div>
                <Progress value={(goldmanScore / 25) * 100} className="mt-2" />
              </CardContent>
            </Card>

            {/* Caprini Thrombosis Risk */}
            <Card className={`border ${getRiskColor(thrombosisRisk)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">血栓风险</span>
                  </div>
                  {getRiskIcon(thrombosisRisk)}
                </div>
                <div className="text-2xl font-bold mb-1">{capriniScore}</div>
                <div className="text-sm opacity-80">Caprini评分</div>
                <Progress value={Math.min((capriniScore / 10) * 100, 100)} className="mt-2" />
              </CardContent>
            </Card>

            {/* Apfel PONV Risk */}
            <Card className={`border ${getRiskColor(ponvRisk)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">PONV风险</span>
                  </div>
                  {getRiskIcon(ponvRisk)}
                </div>
                <div className="text-2xl font-bold mb-1">{apfelScore}/4</div>
                <div className="text-sm opacity-80">Apfel评分</div>
                <Progress value={(apfelScore / 4) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Overall Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            综合风险评估结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${assessment.overallRisk === 'high' ? 'bg-red-100' : assessment.overallRisk === 'medium' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                {assessment.overallRisk === 'high' ? 
                  <AlertTriangle className="h-6 w-6 text-red-600" /> :
                  assessment.overallRisk === 'medium' ?
                  <TrendingUp className="h-6 w-6 text-yellow-600" /> :
                  <Shield className="h-6 w-6 text-green-600" />
                }
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {assessment.overallRisk === 'high' ? '高风险' : 
                   assessment.overallRisk === 'medium' ? '中等风险' : '低风险'}
                </h3>
                <p className="text-sm text-gray-600">基于多维度评估的综合结果</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">风险因素</div>
              <div className="text-2xl font-bold text-purple-600">{assessment.riskFactors?.length || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors Detail */}
      {assessment.riskFactors && assessment.riskFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              风险因素详情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessment.riskFactors.map((factor, index) => (
                <Card key={index} className={`border-l-4 ${factor.level === 'high' ? 'border-l-red-500 bg-red-50' : factor.level === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-green-500 bg-green-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={factor.level === 'high' ? 'destructive' : factor.level === 'medium' ? 'secondary' : 'default'}>
                            {factor.type} - {factor.level === 'high' ? '高风险' : factor.level === 'medium' ? '中风险' : '低风险'}
                          </Badge>
                          <span className="text-sm font-medium">评分: {factor.score}</span>
                        </div>
                        <p className="text-gray-700 mb-2">{factor.description}</p>
                        {factor.recommendations && factor.recommendations.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-600">管理建议:</span>
                            <ul className="mt-1 space-y-1">
                              {factor.recommendations.map((rec, recIndex) => (
                                <li key={recIndex} className="flex items-start gap-2 text-sm">
                                  <ChevronRight className="h-3 w-3 mt-0.5 text-gray-400 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drug Interactions - Enhanced */}
      {assessment.drugInteractions && assessment.drugInteractions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              药物相互作用警示
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessment.drugInteractions.map((interaction, index) => (
                <Card key={index} className={`border-l-4 ${interaction.severity === 'major' ? 'border-l-red-500 bg-red-50' : interaction.severity === 'moderate' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-blue-500 bg-blue-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={interaction.severity === 'major' ? 'destructive' : interaction.severity === 'moderate' ? 'secondary' : 'outline'}>
                          {interaction.severity === 'major' ? '严重' : interaction.severity === 'moderate' ? '中等' : '轻微'}警示
                        </Badge>
                        <span className="font-medium">{interaction.drugs?.join(' + ')}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{interaction.description}</p>
                    {interaction.recommendations && interaction.recommendations.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">处理建议:</span>
                        <ul className="mt-1 space-y-1">
                          {interaction.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="flex items-start gap-2 text-sm">
                              <Star className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Guidelines */}
      {assessment.clinicalGuidelines && assessment.clinicalGuidelines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              匹配的临床指南
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.clinicalGuidelines.map((guideline, index) => (
                <Card key={index} className="border border-blue-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-blue-900 line-clamp-2">{guideline.title}</h4>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {guideline.relevance === 'high' ? '高相关' : guideline.relevance === 'medium' ? '中相关' : '低相关'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{guideline.organization} • {guideline.year}年</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{guideline.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Recommendations */}
      {assessment.recommendations && assessment.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              临床管理建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  术前准备
                </h4>
                <ul className="space-y-1 text-sm">
                  {assessment.recommendations.filter(rec => 
                    rec.includes('术前') || rec.includes('停药') || rec.includes('评估')
                  ).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  术中监护
                </h4>
                <ul className="space-y-1 text-sm">
                  {assessment.recommendations.filter(rec => 
                    rec.includes('术中') || rec.includes('监测') || rec.includes('监护')
                  ).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-700 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  术后管理
                </h4>
                <ul className="space-y-1 text-sm">
                  {assessment.recommendations.filter(rec => 
                    rec.includes('术后') || rec.includes('准备') || rec.includes('止血')
                  ).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 text-purple-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Footer */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-1">本报告由麻醉守护神AI系统生成，仅供临床参考</p>
            <p>最终决策应结合临床医生专业判断 • 报告生成时间: {new Date().toLocaleString('zh-CN')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}