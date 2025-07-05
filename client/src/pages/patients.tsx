import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Patient, InsertPatient } from "@/../../shared/schema";
import { Camera, Upload, Eye, Edit, Plus } from "lucide-react";

export default function Patients() {
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertPatient>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setEditDialogOpen(false);
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

  // 病历照片上传功能
  const uploadMedicalRecord = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/records/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setUploadDialogOpen(false);
      setReviewDialogOpen(true);
      toast({
        title: "病历识别成功",
        description: "请审核提取的信息",
      });
    },
    onError: () => {
      toast({
        title: "上传失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(true);
      uploadMedicalRecord.mutate(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

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
    setEditDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
    setEditForm({});
    setEditDialogOpen(false);
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingPatient) {
      updatePatientMutation.mutate({
        id: editingPatient.id,
        patient: editForm,
      });
    }
  };

  const startAssessmentMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest('POST', `/api/patients/${patientId}/assess`, {});
      return response.json();
    },
    onSuccess: (data, patientId) => {
      toast({
        title: "评估已开始",
        description: "AI智能体正在分析患者数据",
      });
      // 导航到仪表板查看评估进度
      setLocation(`/?patient=${patientId}`);
    },
    onError: () => {
      toast({
        title: "启动失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleStartAssessment = (patientId: number) => {
    startAssessmentMutation.mutate(patientId);
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            上传病历照片
          </Button>
          <Link href="/patients/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加新患者
            </Button>
          </Link>
        </div>
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
                  <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(patient)}>
                        查看详情
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>患者详细信息</DialogTitle>
                        <DialogDescription>查看患者的完整医疗信息</DialogDescription>
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
                  
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(patient)}>
                        编辑
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>编辑患者信息</DialogTitle>
                        <DialogDescription>修改患者的基本信息和医疗记录</DialogDescription>
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
                          <Button variant="outline" onClick={handleCancelEdit}>
                            取消
                          </Button>
                          <Button onClick={handleSaveEdit} disabled={updatePatientMutation.isPending}>
                            {updatePatientMutation.isPending ? '保存中...' : '保存'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    size="sm" 
                    onClick={() => handleStartAssessment(patient.id)}
                    disabled={startAssessmentMutation.isPending}
                  >
                    {startAssessmentMutation.isPending ? '启动中...' : '开始评估'}
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

      {/* 病历照片上传对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传病历照片</DialogTitle>
            <DialogDescription>
              选择病历照片，系统将自动识别并提取患者信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-gray-300 rounded-lg">
              <Camera className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">点击选择照片或拍摄新照片</p>
                <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={triggerFileUpload}
                disabled={uploadMedicalRecord.isPending}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadMedicalRecord.isPending ? '识别中...' : '选择照片'}
              </Button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </DialogContent>
      </Dialog>

      {/* 审核提取结果对话框 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>审核提取结果</DialogTitle>
            <DialogDescription>
              请检查AI提取的信息，确认正确后可添加到患者档案
            </DialogDescription>
          </DialogHeader>
          
          {extractedData && (
            <div className="space-y-6">
              {/* 诊断信息 */}
              {extractedData.diagnoses && extractedData.diagnoses.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">诊断信息</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.diagnoses.map((diagnosis: string, index: number) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {diagnosis}
                        <button 
                          onClick={() => {
                            const newDiagnoses = extractedData.diagnoses.filter((_: any, i: number) => i !== index);
                            setExtractedData({...extractedData, diagnoses: newDiagnoses});
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 用药信息 */}
              {extractedData.medications && extractedData.medications.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">当前用药</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.medications.map((medication: string, index: number) => (
                      <Badge key={index} variant="outline" className="px-3 py-1">
                        {medication}
                        <button 
                          onClick={() => {
                            const newMedications = extractedData.medications.filter((_: any, i: number) => i !== index);
                            setExtractedData({...extractedData, medications: newMedications});
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 其他信息 */}
              {extractedData.rawText && (
                <div>
                  <h3 className="font-medium mb-3">原始识别文本</h3>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                    {extractedData.rawText}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setReviewDialogOpen(false)}
                >
                  取消
                </Button>
                <Button 
                  onClick={() => {
                    toast({
                      title: "功能开发中",
                      description: "信息提取和保存功能正在开发中",
                    });
                    setReviewDialogOpen(false);
                  }}
                >
                  确认并添加到病史
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}