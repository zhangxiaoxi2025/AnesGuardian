import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Camera, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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

interface MedicalReportUploadProps {
  patientId: number;
  onUploadComplete?: () => void;
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export default function MedicalReportUpload({ patientId, onUploadComplete }: MedicalReportUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedReportType, setSelectedReportType] = useState<ReportType | ''>('');
  const [uploadMethod, setUploadMethod] = useState<'image' | 'text'>('image');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 文件上传处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "文件类型错误",
        description: "请选择图片文件（JPG、PNG等格式）",
        variant: "destructive",
      });
      return;
    }

    // 验证文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片文件大小不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 上传报告mutation
  const uploadReportMutation = useMutation({
    mutationFn: async (data: {
      reportType: ReportType;
      uploadMethod: 'image' | 'text';
      imageFile?: File;
      textContent?: string;
    }) => {
      const formData = new FormData();
      formData.append('patientId', patientId.toString());
      formData.append('reportType', data.reportType);
      formData.append('uploadMethod', data.uploadMethod);
      
      if (data.uploadMethod === 'image' && data.imageFile) {
        formData.append('reportImage', data.imageFile);
      } else if (data.uploadMethod === 'text' && data.textContent) {
        formData.append('reportText', data.textContent);
      }

      const response = await fetch('/api/medical-reports/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setUploadStatus({ status: 'success', message: '报告上传并分析成功' });
      
      // 清空表单
      setSelectedReportType('');
      setTextInput('');
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['/api/medical-reports', patientId] });
      
      toast({
        title: "上传成功",
        description: "医疗报告已成功上传并完成AI分析",
      });
      
      onUploadComplete?.();
    },
    onError: (error: any) => {
      setUploadStatus({ 
        status: 'error', 
        message: error.message || '上传失败，请重试' 
      });
      
      toast({
        title: "上传失败",
        description: error.message || "请检查网络连接后重试",
        variant: "destructive",
      });
    },
    onMutate: () => {
      setUploadStatus({ status: 'uploading', progress: 0 });
    }
  });

  // 提交上传
  const handleUpload = () => {
    if (!selectedReportType) {
      toast({
        title: "请选择报告类型",
        description: "请先选择要上传的医疗报告类型",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === 'image' && !selectedFile) {
      toast({
        title: "请选择图片",
        description: "请选择要上传的报告图片",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === 'text' && !textInput.trim()) {
      toast({
        title: "请输入报告内容",
        description: "请输入或粘贴报告文本内容",
        variant: "destructive",
      });
      return;
    }

    uploadReportMutation.mutate({
      reportType: selectedReportType as ReportType,
      uploadMethod,
      imageFile: uploadMethod === 'image' ? selectedFile! : undefined,
      textContent: uploadMethod === 'text' ? textInput : undefined,
    });
  };

  const selectedConfig = reportTypeConfigs.find(config => config.id === selectedReportType);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          上传医疗报告
        </CardTitle>
        <CardDescription>
          支持心电图、彩超、CT、化验单等医疗报告的智能识别和分析
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 报告类型选择 */}
        <div className="space-y-2">
          <Label htmlFor="reportType">报告类型</Label>
          <Select value={selectedReportType} onValueChange={(value) => setSelectedReportType(value as ReportType | '')}>
            <SelectTrigger>
              <SelectValue placeholder="请选择报告类型" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">检查报告</div>
                {reportTypeConfigs
                  .filter(config => config.category === 'examination')
                  .map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex flex-col">
                        <span>{config.name}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
              </div>
              <div className="p-2 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">化验报告</div>
                {reportTypeConfigs
                  .filter(config => config.category === 'laboratory')
                  .map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex flex-col">
                        <span>{config.name}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
              </div>
            </SelectContent>
          </Select>
          
          {selectedConfig && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <div className="text-sm">
                <div className="font-medium mb-1">{selectedConfig.name}</div>
                <div className="text-muted-foreground mb-2">{selectedConfig.description}</div>
                <div className="flex flex-wrap gap-1">
                  {selectedConfig.keyParameters.map(param => (
                    <Badge key={param} variant="secondary" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 上传方式选择 */}
        {selectedReportType && (
          <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'image' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                拍照上传
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                文本输入
              </TabsTrigger>
            </TabsList>

            {/* 图片上传 */}
            <TabsContent value="image" className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={previewUrl} 
                      alt="报告预览" 
                      className="max-w-full max-h-64 mx-auto rounded-md shadow-sm"
                    />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        已选择: {selectedFile?.name}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="mt-2"
                      >
                        重新选择
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">选择报告图片</p>
                      <p className="text-xs text-muted-foreground">
                        支持 JPG、PNG 格式，文件大小不超过 10MB
                      </p>
                      <div className="mt-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                        >
                          选择图片
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 文本输入 */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportText">报告内容</Label>
                <Textarea
                  id="reportText"
                  placeholder={`请输入或粘贴${selectedConfig?.name || '医疗报告'}的文字内容...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  您可以直接复制粘贴报告上的文字内容，系统将自动分析关键指标
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* 上传状态 */}
        {uploadStatus.status !== 'idle' && (
          <div className="space-y-2">
            {uploadStatus.status === 'uploading' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在上传和分析报告...</span>
              </div>
            )}
            
            {uploadStatus.status === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{uploadStatus.message}</span>
              </div>
            )}
            
            {uploadStatus.status === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{uploadStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {/* 上传按钮 */}
        <div className="flex justify-end">
          <Button 
            onClick={handleUpload}
            disabled={uploadReportMutation.isPending || !selectedReportType}
            className="min-w-32"
          >
            {uploadReportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                分析中...
              </>
            ) : (
              '上传并分析'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}