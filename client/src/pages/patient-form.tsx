import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { insertPatientSchema, type InsertPatient } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface FormData {
  name: string;
  age: number;
  gender: string;
  surgeryType: string;
  asaClass: string;
  mallampatiGrade?: string;
  cardiacFunction: string;
  medicalHistoryText: string;
  medicationsText: string;
  allergiesText: string;
  weight: number;
  height: number;
}

export default function PatientForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      age: 0,
      gender: 'male',
      surgeryType: '',
      asaClass: 'ASA I',
      mallampatiGrade: '',
      cardiacFunction: '',
      medicalHistoryText: '',
      medicationsText: '',
      allergiesText: '',
      weight: 0,
      height: 0,
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // 转换数据格式以匹配数据库schema
      const patientData: InsertPatient = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        surgeryType: data.surgeryType,
        asaClass: data.asaClass,
        mallampatiGrade: data.mallampatiGrade || undefined,
        cardiacFunction: data.cardiacFunction || undefined,
        medicalHistory: data.medicalHistoryText ? data.medicalHistoryText.split(',').map(s => s.trim()) : [],
        medications: data.medicationsText ? data.medicationsText.split(',').map(s => s.trim()) : [],
        allergies: data.allergiesText ? data.allergiesText.split(',').map(s => s.trim()) : [],
        vitalSigns: {
          weight: data.weight,
          height: data.height,
          bmi: data.weight && data.height ? (data.weight / Math.pow(data.height / 100, 2)).toFixed(1) : null,
        },
        labResults: {},
      };

      const response = await apiRequest('POST', '/api/patients', patientData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '成功',
        description: '患者信息已保存',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      navigate('/patients');
    },
    onError: (error: Error) => {
      toast({
        title: '错误',
        description: error.message || '保存失败',
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('medicalRecord', file);

      const response = await fetch('/api/medical-records/process', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `上传失败 (${response.status})`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setRecognitionStatus('success');
      
      // 将AI识别的信息填入表单
      if (data.summary && data.summary.trim()) {
        form.setValue('medicalHistoryText', data.summary);
      } else if (data.diagnoses && data.diagnoses.length > 0) {
        // 兼容旧格式
        form.setValue('medicalHistoryText', data.diagnoses.join(', '));
      }
      
      if (data.medications && data.medications.length > 0) {
        form.setValue('medicationsText', data.medications.join(', '));
      }
      
      toast({
        title: '识别成功',
        description: '病历信息已自动提取，请核实并编辑',
      });
    },
    onError: (error: any) => {
      setRecognitionStatus('error');
      console.error('📷 [前端] 病历识别失败:', error);
      
      let errorMessage = '请重试或手动输入信息';
      if (error.message?.includes('繁忙')) {
        errorMessage = 'AI服务繁忙，请稍后重试';
      } else if (error.message?.includes('过载')) {
        errorMessage = 'AI服务暂时过载，请稍后重试';
      }
      
      toast({
        title: '识别失败',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createPatientMutation.mutate(data);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecognitionStatus('idle');
    }
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleRecognize = () => {
    if (!selectedFile) return;
    
    setRecognitionStatus('processing');
    uploadMutation.mutate(selectedFile);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">添加新患者</h1>
        <p className="text-gray-600">请填写患者基本信息，或使用病历照片智能识别</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 上半部分：基本信息手动输入区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-user text-blue-600"></i>
                <span>患者基本信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>患者姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入患者姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年龄</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="请输入年龄" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性别</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择性别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">男</SelectItem>
                          <SelectItem value="female">女</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>体重 (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="请输入体重" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>身高 (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="请输入身高" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="surgeryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手术类型</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入手术类型" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="asaClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ASA分级</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择ASA分级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ASA I">ASA I (健康患者)</SelectItem>
                          <SelectItem value="ASA II">ASA II (轻度系统性疾病)</SelectItem>
                          <SelectItem value="ASA III">ASA III (严重系统性疾病)</SelectItem>
                          <SelectItem value="ASA IV">ASA IV (严重系统性疾病，生命危险)</SelectItem>
                          <SelectItem value="ASA V">ASA V (危重患者)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mallampatiGrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mallampati气道评估分级</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择Mallampati分级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="I级">I级 (软腭、咽峡弓、悬雍垂清晰可见)</SelectItem>
                          <SelectItem value="II级">II级 (软腭、咽峡弓可见，悬雍垂被舌根遮挡)</SelectItem>
                          <SelectItem value="III级">III级 (软腭、悬雍垂底部可见)</SelectItem>
                          <SelectItem value="IV级">IV级 (仅可见硬腭)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cardiacFunction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>心功能分级</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择心功能分级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NYHA I级">NYHA I级 (无症状)</SelectItem>
                          <SelectItem value="NYHA II级">NYHA II级 (轻度活动受限)</SelectItem>
                          <SelectItem value="NYHA III级">NYHA III级 (明显活动受限)</SelectItem>
                          <SelectItem value="NYHA IV级">NYHA IV级 (休息时有症状)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 下半部分：病历智能识别区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-green-600" />
                <span>病历智能识别</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 照片上传区域 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">上传病历照片</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      支持拍照或从相册选择，AI将自动识别病历信息
                    </p>
                    
                    <div className="flex justify-center space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePhotoCapture}
                        className="flex items-center space-x-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>拍照识别</span>
                      </Button>
                    </div>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        已选择文件: {selectedFile.name}
                      </p>
                      <Button
                        type="button"
                        onClick={handleRecognize}
                        disabled={uploadMutation.isPending}
                        className="mt-2"
                      >
                        {uploadMutation.isPending ? '识别中...' : '立即识别'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 识别状态指示器 */}
              <div className="flex justify-center">
                {recognitionStatus === 'processing' && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    正在识别病历信息...
                  </div>
                )}
                
                {recognitionStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    识别成功！请核实下方信息
                  </div>
                )}
                
                {recognitionStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    识别失败，请重试或手动输入
                  </div>
                )}
              </div>

              {/* 识别结果文本区域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="medicalHistoryText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>病史摘要</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="AI识别的病史信息将显示在这里，您可以手动编辑..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="medicationsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>当前用药</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="AI识别的用药信息将显示在这里，您可以手动编辑..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allergiesText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>过敏史</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="过敏信息（如有）"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 表单提交按钮 */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/patients')}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createPatientMutation.isPending}
            >
              {createPatientMutation.isPending ? '保存中...' : '保存患者'}
            </Button>
          </div>
        </form>
      </Form>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}