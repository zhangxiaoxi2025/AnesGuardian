import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Activity, 
  Heart, 
  TestTube2, 
  Stethoscope,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { MedicalReport, ReportType } from '@shared/schema';

interface MedicalReportsListProps {
  patientId: number;
}

// 报告类型图标映射
const getReportIcon = (reportType: ReportType) => {
  const iconMap = {
    ecg: Activity,
    echo: Heart,
    ct: Stethoscope,
    xray: Stethoscope,
    blood_routine: TestTube2,
    biochemistry: TestTube2,
    coagulation: TestTube2,
    blood_gas: TestTube2,
  };
  return iconMap[reportType] || FileText;
};

// 报告类型名称映射
const getReportTypeName = (reportType: ReportType): string => {
  const nameMap = {
    ecg: '心电图',
    echo: '心脏彩超',
    ct: '胸部CT',
    xray: '胸片',
    blood_routine: '血常规',
    biochemistry: '生化全套',
    coagulation: '凝血功能',
    blood_gas: '血气分析',
  };
  return nameMap[reportType] || reportType;
};

// 风险等级颜色
const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'default';
    default: return 'outline';
  }
};

// 风险等级文本
const getRiskLevelText = (level: string) => {
  switch (level) {
    case 'high': return '高风险';
    case 'medium': return '中等风险';
    case 'low': return '低风险';
    default: return '未知';
  }
};

export default function MedicalReportsList({ patientId }: MedicalReportsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取医疗报告列表
  const { data: reports = [], isLoading, error } = useQuery<MedicalReport[]>({
    queryKey: ['/api/medical-reports', patientId],
    enabled: !!patientId,
  });

  // 删除报告mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await fetch(`/api/medical-reports/${reportId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`删除失败: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-reports', patientId] });
      toast({
        title: "删除成功",
        description: "医疗报告已成功删除",
      });
    },
    onError: (error: any) => {
      toast({
        title: "删除失败",
        description: error.message || "删除报告时出现错误",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReport = (reportId: number) => {
    if (confirm('确定要删除这个医疗报告吗？此操作不可撤销。')) {
      deleteReportMutation.mutate(reportId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>医疗报告</CardTitle>
          <CardDescription>患者的检查和化验报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">正在加载报告...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>医疗报告</CardTitle>
          <CardDescription>患者的检查和化验报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">加载报告时出错</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>医疗报告</CardTitle>
          <CardDescription>患者的检查和化验报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">暂无医疗报告</p>
              <p className="text-xs text-muted-foreground mt-1">
                请使用上方的上传功能添加报告
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          医疗报告 ({reports.length})
        </CardTitle>
        <CardDescription>患者的检查和化验报告</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => {
            const IconComponent = getReportIcon(report.reportType as ReportType);
            const analyzedData = typeof report.analyzedData === 'string' 
              ? JSON.parse(report.analyzedData) 
              : report.analyzedData;
            
            return (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                {/* 报告头部信息 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {getReportTypeName(report.reportType as ReportType)}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {report.uploadMethod === 'image' ? '图片识别' : '文本输入'}
                        </Badge>
                        {analyzedData?.riskLevel && (
                          <Badge variant={getRiskLevelColor(analyzedData.riskLevel) as any}>
                            {getRiskLevelText(analyzedData.riskLevel)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { 
                          addSuffix: true, 
                          locale: zhCN 
                        }) : '未知时间'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* 查看详情按钮 */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          查看详情
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5" />
                            {getReportTypeName(report.reportType as ReportType)} 详细分析
                          </DialogTitle>
                          <DialogDescription>
                            AI分析结果和临床意义解读
                          </DialogDescription>
                        </DialogHeader>
                        
                        <ScrollArea className="max-h-[60vh]">
                          <div className="space-y-4">
                            {/* 基本信息 */}
                            <div>
                              <h4 className="font-medium mb-2">基本信息</h4>
                              <div className="space-y-1 text-sm">
                                <div>上传方式: {report.uploadMethod === 'image' ? '图片识别' : '文本输入'}</div>
                                <div>上传时间: {report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : '未知时间'}</div>
                              </div>
                            </div>

                            {/* 原始内容 */}
                            {(report.extractedText || report.manualText) && (
                              <div>
                                <h4 className="font-medium mb-2">报告内容</h4>
                                <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                                  {report.extractedText || report.manualText}
                                </div>
                              </div>
                            )}

                            <Separator />

                            {/* AI分析结果 */}
                            {analyzedData && (
                              <div className="space-y-4">
                                <h4 className="font-medium">AI分析结果</h4>
                                
                                {/* 关键发现 */}
                                {analyzedData.keyFindings && analyzedData.keyFindings.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium mb-2">关键发现</h5>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                      {analyzedData.keyFindings.map((finding: string, index: number) => (
                                        <li key={index}>{finding}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* 异常值 */}
                                {analyzedData.abnormalValues && analyzedData.abnormalValues.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium mb-2">异常指标</h5>
                                    <div className="space-y-2">
                                      {analyzedData.abnormalValues.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                                          <div>
                                            <div className="font-medium text-sm">{item.parameter}</div>
                                            <div className="text-xs text-muted-foreground">
                                              当前值: {item.value} | 正常范围: {item.normalRange}
                                            </div>
                                          </div>
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 临床意义 */}
                                {analyzedData.clinicalSignificance && (
                                  <div>
                                    <h5 className="text-sm font-medium mb-2">临床意义</h5>
                                    <p className="text-sm text-muted-foreground">
                                      {analyzedData.clinicalSignificance}
                                    </p>
                                  </div>
                                )}

                                {/* 麻醉影响 */}
                                {analyzedData.anesthesiaImplications && analyzedData.anesthesiaImplications.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium mb-2">麻醉相关影响</h5>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                      {analyzedData.anesthesiaImplications.map((implication: string, index: number) => (
                                        <li key={index}>{implication}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 围术期建议 */}
                            {report.recommendations && report.recommendations.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">围术期建议</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {report.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>

                    {/* 删除按钮 */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
                      disabled={deleteReportMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 简要分析结果 */}
                {analyzedData && (
                  <div className="space-y-2">
                    {/* 关键发现摘要 */}
                    {analyzedData.keyFindings && analyzedData.keyFindings.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium">关键发现: </span>
                          {analyzedData.keyFindings.slice(0, 2).join('；')}
                          {analyzedData.keyFindings.length > 2 && '...'}
                        </div>
                      </div>
                    )}

                    {/* 异常指标数量 */}
                    {analyzedData.abnormalValues && analyzedData.abnormalValues.length > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          发现 {analyzedData.abnormalValues.length} 项异常指标
                        </span>
                      </div>
                    )}

                    {/* 正常结果 */}
                    {(!analyzedData.abnormalValues || analyzedData.abnormalValues.length === 0) && 
                     analyzedData.riskLevel === 'low' && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">
                          检查结果基本正常
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}