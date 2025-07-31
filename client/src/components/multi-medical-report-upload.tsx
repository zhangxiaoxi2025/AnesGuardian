import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Camera, Loader2, CheckCircle, AlertTriangle, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ReportType, ReportTypeConfig } from '@shared/schema';

// 报告类型配置
const reportTypeConfigs: ReportTypeConfig[] = [
  {
    id: 'ecg',
    name: '心电图',
    category: 'examination',
    description: '12导联心电图检查报告',
    keyParameters: ['心律', 'P-R间期', 'QRS时限', 'QT间期', 'ST段']
  },
  {
    id: 'echo',
    name: '心脏彩超',
    category: 'examination', 
    description: '心脏超声检查报告',
    keyParameters: ['左心功能', '射血分数', '瓣膜功能', '室壁运动']
  },
  {
    id: 'ct',
    name: '胸部CT',
    category: 'examination',
    description: '胸部CT平扫或增强检查',
    keyParameters: ['肺部病变', '心脏结构', '血管情况']
  },
  {
    id: 'xray',
    name: '胸片',
    category: 'examination', 
    description: '胸部X光检查报告',
    keyParameters: ['心影大小', '肺纹理', '胸腔积液']
  },
  {
    id: 'blood_routine',
    name: '血常规',
    category: 'laboratory',
    description: '全血细胞分析',
    keyParameters: ['血红蛋白', '血小板', '白细胞计数']
  },
  {
    id: 'biochemistry', 
    name: '生化全套',
    category: 'laboratory',
    description: '肝肾功能、电解质等生化检查',
    keyParameters: ['肝功能', '肾功能', '血糖', '电解质']
  },
  {
    id: 'coagulation',
    name: '凝血功能',
    category: 'laboratory',
    description: '凝血酶原时间等凝血指标',
    keyParameters: ['PT', 'APTT', 'INR', '纤维蛋白原']
  },
  {
    id: 'blood_gas',
    name: '血气分析',
    category: 'laboratory',
    description: '动脉血气分析报告',
    keyParameters: ['pH值', 'PO2', 'PCO2', '碱剩余']
  }
];

interface UploadItem {
  id: string;
  file?: File;
  textContent?: string;
  reportType: ReportType;
  uploadMethod: 'image' | 'text';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

interface MultiMedicalReportUploadProps {
  patientId?: number;
  onUploadComplete?: (results: any[]) => void;
}

export default function MultiMedicalReportUpload({ patientId, onUploadComplete }: MultiMedicalReportUploadProps) {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 添加新的上传项
  const addUploadItem = (reportType: ReportType, uploadMethod: 'image' | 'text', file?: File, textContent?: string) => {
    const newItem: UploadItem = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      textContent,
      reportType,
      uploadMethod,
      status: 'pending',
      progress: 0,
    };
    setUploadItems(prev => [...prev, newItem]);
  };

  // 移除上传项
  const removeUploadItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  // 文件选择处理
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      // 自动为每个文件创建上传项
      Array.from(files).forEach(file => {
        addUploadItem('blood_routine', 'image', file); // 默认类型，用户可以后续修改
      });
    }
  }, []);

  // 单个文件上传处理
  const uploadSingleReport = useMutation({
    mutationFn: async (item: UploadItem) => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      const formData = new FormData();
      formData.append('reportType', item.reportType);
      formData.append('patientId', patientId.toString());
      formData.append('uploadMethod', item.uploadMethod);

      if (item.uploadMethod === 'image' && item.file) {
        formData.append('imageFile', item.file);
      } else if (item.uploadMethod === 'text' && item.textContent) {
        formData.append('textContent', item.textContent);
      }

      const response = await fetch('/api/medical-reports/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onMutate: (item) => {
      // 更新上传状态
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading' as const, progress: 50 } : i
      ));
    },
    onSuccess: (result, item) => {
      // 更新成功状态
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'success' as const, progress: 100, result } : i
      ));
      
      toast({
        title: "上传成功",
        description: `${reportTypeConfigs.find(r => r.id === item.reportType)?.name} 分析完成`,
      });

      // 刷新医疗报告列表
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['medical-reports', patientId] });
      }
    },
    onError: (error, item) => {
      // 更新错误状态
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { 
          ...i, 
          status: 'error' as const, 
          progress: 0, 
          error: (error as Error).message 
        } : i
      ));
      
      toast({
        title: "上传失败",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // 批量上传处理
  const handleBatchUpload = () => {
    const pendingItems = uploadItems.filter(item => item.status === 'pending');
    pendingItems.forEach(item => {
      uploadSingleReport.mutate(item);
    });
  };

  // 更新报告类型
  const updateReportType = (itemId: string, reportType: ReportType) => {
    setUploadItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, reportType } : item
    ));
  };

  // 更新文本内容
  const updateTextContent = (itemId: string, textContent: string) => {
    setUploadItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, textContent } : item
    ));
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UploadItem['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5 text-purple-600" />
          <span>医疗报告上传分析</span>
        </CardTitle>
        <CardDescription>
          支持批量上传多种医疗报告，AI将自动进行OCR识别和专业分析
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 文件选择区域 */}
        <div className="border-2 border-dashed border-purple-200 rounded-lg p-6">
          <div className="text-center space-y-4">
            <Upload className="w-12 h-12 text-purple-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">批量上传医疗报告</h3>
              <p className="text-sm text-gray-600 mb-4">
                支持心电图、血常规、生化全套、凝血功能等8种报告类型
              </p>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('multi-file-input')?.click()}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>选择文件</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 上传项列表 */}
        {uploadItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium">待上传报告 ({uploadItems.length})</h4>
              <Button
                onClick={handleBatchUpload}
                disabled={uploadItems.every(item => item.status !== 'pending') || !patientId}
                size="sm"
              >
                批量上传分析
              </Button>
            </div>

            {uploadItems.map((item) => (
              <Card key={item.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(item.status)}
                        <span className="font-medium">
                          {item.file?.name || `文本输入报告`}
                        </span>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === 'pending' ? '待上传' : 
                           item.status === 'uploading' ? '上传中' :
                           item.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>报告类型</Label>
                          <Select
                            value={item.reportType}
                            onValueChange={(value) => updateReportType(item.id, value as ReportType)}
                            disabled={item.status === 'uploading' || item.status === 'success'}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {reportTypeConfigs.map((config) => (
                                <SelectItem key={config.id} value={config.id}>
                                  {config.name} - {config.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {item.uploadMethod === 'text' && (
                          <div>
                            <Label>报告内容</Label>
                            <Textarea
                              value={item.textContent || ''}
                              onChange={(e) => updateTextContent(item.id, e.target.value)}
                              placeholder="请输入报告内容..."
                              disabled={item.status === 'uploading' || item.status === 'success'}
                            />
                          </div>
                        )}
                      </div>

                      {item.status === 'error' && item.error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          错误: {item.error}
                        </div>
                      )}

                      {item.status === 'success' && item.result && (
                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                          ✓ {item.result.message}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadItem(item.id)}
                      disabled={item.status === 'uploading'}
                      className="ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 添加文本报告按钮 */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => addUploadItem('blood_routine', 'text', undefined, '')}
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>添加文本报告</span>
          </Button>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          id="multi-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}