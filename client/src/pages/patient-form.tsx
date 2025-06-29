import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertPatientSchema } from '@shared/schema';
import type { InsertPatient } from '@shared/schema';

const extendedPatientSchema = insertPatientSchema.extend({
  medicalHistoryText: insertPatientSchema.shape.medicalHistory.optional(),
  medicationsText: insertPatientSchema.shape.medications.optional(),
  allergiesText: insertPatientSchema.shape.allergies.optional(),
});

export default function PatientForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertPatient & { medicalHistoryText?: string; medicationsText?: string; allergiesText?: string }>({
    resolver: zodResolver(extendedPatientSchema),
    defaultValues: {
      name: '',
      age: 0,
      gender: '',
      surgeryType: '',
      asaClass: '',
      medicalHistory: [],
      medications: [],
      allergies: [],
      vitalSigns: {},
      labResults: {},
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const response = await apiRequest('POST', '/api/patients', data);
      return response.json();
    },
    onSuccess: (patient) => {
      toast({
        title: "患者创建成功",
        description: `患者 ${patient.name} 信息已保存`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPatient & { medicalHistoryText?: string; medicationsText?: string; allergiesText?: string }) => {
    // Convert text fields to arrays
    const processedData: InsertPatient = {
      ...data,
      medicalHistory: data.medicalHistoryText ? data.medicalHistoryText.split(',').map(s => s.trim()) : [],
      medications: data.medicationsText ? data.medicationsText.split(',').map(s => s.trim()) : [],
      allergies: data.allergiesText ? data.allergiesText.split(',').map(s => s.trim()) : [],
    };

    createPatientMutation.mutate(processedData);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-user-plus text-blue-600"></i>
            <span>添加新患者</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          <SelectItem value="男">男</SelectItem>
                          <SelectItem value="女">女</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="ASA I">ASA I</SelectItem>
                          <SelectItem value="ASA II">ASA II</SelectItem>
                          <SelectItem value="ASA III">ASA III</SelectItem>
                          <SelectItem value="ASA IV">ASA IV</SelectItem>
                          <SelectItem value="ASA V">ASA V</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                name="medicalHistoryText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>既往病史</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请输入既往病史，多个条目用逗号分隔"
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
                    <FormLabel>长期用药</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请输入长期用药，多个药物用逗号分隔"
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
                        placeholder="请输入过敏史，多个过敏原用逗号分隔"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
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
        </CardContent>
      </Card>
    </div>
  );
}
