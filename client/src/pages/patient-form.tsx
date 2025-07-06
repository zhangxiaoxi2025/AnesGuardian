import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, CheckCircle, AlertCircle, Plus, X, Loader2 } from 'lucide-react';
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

// 表单数据类型保持不变
interface FormData {
  name: string;
  age: number;
  gender: string;
  surgeryType: string;
  asaClass: string;
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

  const form = useForm<FormData>({
    resolver: zodResolver(insertPatientSchema.omit({id: true, medicalHistory: true, medications: true, allergies: true, vitalSigns: true, labResults: true})), // 使用zod进行部分验证
    defaultValues: {
      name: '',
      age: 0,
      gender: 'male',
      surgeryType: '',
      asaClass: 'ASA I',
      medicalHistoryText: '',
      medicationsText: '',
      allergiesText: '',
      weight: 0,
      height: 0,
    },
  });

  // --- 这是需要被修复的 useMutation ---
  const processRecordMutation = useMutation({
    mutationFn: async (file: File) => {
        const formData = new FormData();
        // 这里的 'medicalRecord' 必须和后端 routes.ts 里的 upload.single('medicalRecord') 名字完全一致
        formData.append('medicalRecord', file);

        // 使用浏览器原生的、最可靠的 fetch 函数
        const response = await fetch('/api/medical-records/process', {
            method: 'POST',
            body: formData, // 直接发送FormData，不要画蛇添足地设置Content-Type
        });

        // 对返回结果进行健壮的错误处理
        if (!response.ok) {
            // 尝试解析错误信息，如果解析失败则提供一个通用错误
            const errorData = await response.json().catch(() => ({ 
                message: `服务器返回了错误状态: ${response.status}` 
            }));
            throw new Error(errorData.message || '处理病历失败');
        }

        // 如果成功，返回解析后的JSON数据
        return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "识别成功！",
        description: "请核实下方由AI提取的信息。",
        variant: "default",
      });
      // 将AI识别的信息填入表单
      if (data.summary) {
        form.setValue('medicalHistoryText', data.summary);
      }
      if (data.medications && Array.isArray(data.medications)) {
        form.setValue('medicationsText', data.medications.join(', '));
      }
    },
    onError: (error: Error) => {
      toast({
        title: "识别失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 保存患者信息的mutation保持不变
  const createPatientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const patientData: InsertPatient = {
        name: data.name,
        age: Number(data.age),
        gender: data.gender,
        surgeryType: data.surgeryType,
        asaClass: data.asaClass,
        medicalHistory: data.medicalHistoryText ? data.medicalHistoryText.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean) : [],
        medications: data.medicationsText ? data.medicationsText.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean) : [],
        allergies: data.allergiesText ? data.allergiesText.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean) : [],
        vitalSigns: {
          weight: Number(data.weight),
          height: Number(data.height),
          bmi: data.weight && data.height ? (Number(data.weight) / Math.pow(Number(data.height) / 100, 2)).toFixed(1) : null,
        },
        labResults: {},
      };
      // 使用通用的apiRequest来提交JSON数据
      await apiRequest('/api/patients', { method: 'POST', data: patientData });
    },
    onSuccess: () => {
      toast({ title: '成功', description: '患者信息已保存' });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (error: Error) => {
      toast({ title: '错误', description: error.message || '保存失败', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    createPatientMutation.mutate(data);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRecognizeClick = () => {
    if (selectedFile) {
      processRecordMutation.mutate(selectedFile);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">添加新患者</h1>
        <p className="text-gray-600">请填写患者基本信息，或使用病历照片智能识别</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>患者基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 表单字段保持不变... */}
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>姓名</FormLabel><FormControl><Input placeholder="请输入姓名" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>年龄</FormLabel><FormControl><Input type="number" placeholder="请输入年龄" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>性别</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="请选择性别" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">男</SelectItem><SelectItem value="female">女</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>体重 (kg)</FormLabel><FormControl><Input type="number" placeholder="请输入体重" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>身高 (cm)</FormLabel><FormControl><Input type="number" placeholder="请输入身高" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="surgeryType" render={({ field }) => (<FormItem><FormLabel>手术类型</FormLabel><FormControl><Input placeholder="请输入手术类型" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="asaClass" render={({ field }) => (<FormItem><FormLabel>ASA分级</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="请选择ASA分级" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ASA I">ASA I</SelectItem><SelectItem value="ASA II">ASA II</SelectItem><SelectItem value="ASA III">ASA III</SelectItem><SelectItem value="ASA IV">ASA IV</SelectItem><SelectItem value="ASA V">ASA V</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>病历信息 (可使用AI识别)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-2 border-dashed rounded-md text-center">
                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> 选择病历图片
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {selectedFile && <p className="text-sm mt-2 text-gray-600">已选择: {selectedFile.name}</p>}
              </div>

              {selectedFile && (
                <div className="text-center">
                  <Button type="button" onClick={handleRecognizeClick} disabled={processRecordMutation.isPending}>
                    {processRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {processRecordMutation.isPending ? '正在识别...' : '立即识别'}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="medicalHistoryText" render={({ field }) => (<FormItem><FormLabel>病史摘要</FormLabel><FormControl><Textarea placeholder="AI识别的病史将显示在此" {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="medicationsText" render={({ field }) => (<FormItem><FormLabel>当前用药</FormLabel><FormControl><Textarea placeholder="AI识别的用药将显示在此" {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
              </div>
               <FormField control={form.control} name="allergiesText" render={({ field }) => (<FormItem><FormLabel>过敏史</FormLabel><FormControl><Textarea placeholder="过敏信息（如有）" {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/patients')}>取消</Button>
            <Button type="submit" disabled={createPatientMutation.isPending}>
              {createPatientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createPatientMutation.isPending ? '保存中...' : '保存患者'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}