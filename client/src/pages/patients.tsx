import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Patient, InsertPatient } from "@/../../shared/schema";

export default function Patients() {
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertPatient>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  // 更新患者信息
  const updatePatientMutation = useMutation({
    mutationFn: async (data: { id: number; patient: Partial<InsertPatient> }) => {
      const response = await apiRequest('PATCH', `/api/patients/${data.id}`, data.patient);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setEditingPatient(null);
      setEditForm({});
      toast({
        title: "更新成功",
        description: "患者信息已更新",
      });
    },
    onError: () => {
      toast({
        title: "更新失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      surgeryType: patient.surgeryType,
      asaClass: patient.asaClass,
      medicalHistory: patient.medicalHistory,
      medications: patient.medications,
      allergies: patient.allergies,
    });
  };

  const handleSaveEdit = () => {
    if (editingPatient) {
      updatePatientMutation.mutate({
        id: editingPatient.id,
        patient: editForm,
      });
    }
  };

  const handleStartAssessment = (patientId: number) => {
    setLocation(`/?patient=${patientId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">患者管理</h1>
        <Link href="/patients/new">
          <Button>添加新患者</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {patients?.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{patient.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {patient.age}岁 · {patient.gender} · ASA {patient.asaClass}
                  </p>
                </div>
                <Badge variant="outline">{patient.surgeryType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  创建时间: {new Date(patient.createdAt || '').toLocaleDateString('zh-CN')}
                </div>
                <div className="space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                        查看详情
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>患者详细信息</DialogTitle>
                      </DialogHeader>
                      {selectedPatient && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">姓名</Label>
                              <p className="text-gray-900">{selectedPatient.name}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">年龄</Label>
                              <p className="text-gray-900">{selectedPatient.age}岁</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">性别</Label>
                              <p className="text-gray-900">{selectedPatient.gender}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">ASA分级</Label>
                              <p className="text-gray-900">ASA {selectedPatient.asaClass}</p>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-sm font-medium text-gray-700">手术类型</Label>
                              <p className="text-gray-900">{selectedPatient.surgeryType}</p>
                            </div>
                          </div>
                          
                          {selectedPatient.medicalHistory.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">既往病史</Label>
                              <ul className="mt-1 space-y-1">
                                {selectedPatient.medicalHistory.map((history, index) => (
                                  <li key={index} className="text-gray-900 text-sm">• {history}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedPatient.medications.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">当前用药</Label>
                              <ul className="mt-1 space-y-1">
                                {selectedPatient.medications.map((medication, index) => (
                                  <li key={index} className="text-gray-900 text-sm">• {medication}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedPatient.allergies.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">过敏史</Label>
                              <ul className="mt-1 space-y-1">
                                {selectedPatient.allergies.map((allergy, index) => (
                                  <li key={index} className="text-red-600 text-sm">• {allergy}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(patient)}>
                        编辑
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>编辑患者信息</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">姓名</Label>
                            <Input
                              id="name"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="age">年龄</Label>
                            <Input
                              id="age"
                              type="number"
                              value={editForm.age || ''}
                              onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="gender">性别</Label>
                            <Select value={editForm.gender || ''} onValueChange={(value) => setEditForm({ ...editForm, gender: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="选择性别" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="男">男</SelectItem>
                                <SelectItem value="女">女</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="asaClass">ASA分级</Label>
                            <Select value={editForm.asaClass || ''} onValueChange={(value) => setEditForm({ ...editForm, asaClass: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="选择ASA分级" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="I">ASA I</SelectItem>
                                <SelectItem value="II">ASA II</SelectItem>
                                <SelectItem value="III">ASA III</SelectItem>
                                <SelectItem value="IV">ASA IV</SelectItem>
                                <SelectItem value="V">ASA V</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="surgeryType">手术类型</Label>
                            <Input
                              id="surgeryType"
                              value={editForm.surgeryType || ''}
                              onChange={(e) => setEditForm({ ...editForm, surgeryType: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="medicalHistory">既往病史 (每行一项)</Label>
                          <Textarea
                            id="medicalHistory"
                            rows={3}
                            value={editForm.medicalHistory?.join('\n') || ''}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              medicalHistory: e.target.value.split('\n').filter(item => item.trim()) 
                            })}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="medications">当前用药 (每行一项)</Label>
                          <Textarea
                            id="medications"
                            rows={3}
                            value={editForm.medications?.join('\n') || ''}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              medications: e.target.value.split('\n').filter(item => item.trim()) 
                            })}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="allergies">过敏史 (每行一项)</Label>
                          <Textarea
                            id="allergies"
                            rows={2}
                            value={editForm.allergies?.join('\n') || ''}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              allergies: e.target.value.split('\n').filter(item => item.trim()) 
                            })}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline" onClick={() => setEditingPatient(null)}>
                            取消
                          </Button>
                          <Button onClick={handleSaveEdit} disabled={updatePatientMutation.isPending}>
                            {updatePatientMutation.isPending ? '保存中...' : '保存'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button size="sm" onClick={() => handleStartAssessment(patient.id)}>
                    开始评估
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!patients?.length && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">暂无患者数据</p>
              <Link href="/patients/new">
                <Button>添加第一个患者</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}