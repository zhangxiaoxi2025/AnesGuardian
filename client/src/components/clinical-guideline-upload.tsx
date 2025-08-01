import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Image, FileCheck, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const guidelineSchema = z.object({
  title: z.string().min(1, "标题是必填项"),
  organization: z.string().min(1, "发布机构是必填项"),
  year: z.number().min(1900).max(new Date().getFullYear() + 5),
  category: z.string().min(1, "分类是必填项"),
  description: z.string().optional(),
  content: z.string().optional(),
});

type GuidelineFormData = z.infer<typeof guidelineSchema>;

export default function ClinicalGuidelineUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GuidelineFormData>({
    resolver: zodResolver(guidelineSchema),
    defaultValues: {
      title: "",
      organization: "",
      year: new Date().getFullYear(),
      category: "anesthesia",
      description: "",
      content: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: GuidelineFormData & { file?: File }) => {
      const formData = new FormData();
      
      // Add form fields
      formData.append('title', data.title);
      formData.append('organization', data.organization);
      formData.append('year', data.year.toString());
      formData.append('category', data.category);
      if (data.description) formData.append('description', data.description);
      if (data.content) formData.append('content', data.content);
      
      // Add file if present
      if (data.file) {
        formData.append('file', data.file);
      }

      const response = await fetch('/api/clinical-guidelines', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "指南上传成功",
        description: `${result.title} 已成功添加到系统中`,
      });
      
      // Reset form and file
      form.reset();
      setSelectedFile(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-guidelines'] });
    },
    onError: (error) => {
      console.error("Guideline upload failed:", error);
      toast({
        title: "上传失败",
        description: error.message || "指南上传失败，请重试",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "文件过大",
        description: "文件大小不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "文件格式不支持",
        description: "支持的格式: JPG, PNG, PDF, DOC, DOCX, TXT",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title if not set
    if (!form.getValues('title')) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      form.setValue('title', fileName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const onSubmit = (data: GuidelineFormData) => {
    if (uploadMode === 'file' && !selectedFile) {
      toast({
        title: "请选择文件",
        description: "文件上传模式下需要选择一个文件",
        variant: "destructive",
      });
      return;
    }

    if (uploadMode === 'text' && !data.content?.trim()) {
      toast({
        title: "请输入内容",
        description: "文本输入模式下需要输入指南内容",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      ...data,
      file: uploadMode === 'file' ? selectedFile || undefined : undefined,
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (file.type.includes('pdf')) return <FileText className="w-6 h-6" />;
    return <FileCheck className="w-6 h-6" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          上传临床指南
        </CardTitle>
        <CardDescription>
          上传临床指南文档，系统将自动解析并结构化存储，用于智能匹配患者情况
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Mode Selection */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant={uploadMode === 'file' ? 'default' : 'outline'}
            onClick={() => setUploadMode('file')}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            文件上传
          </Button>
          <Button
            type="button"
            variant={uploadMode === 'text' ? 'default' : 'outline'}
            onClick={() => setUploadMode('text')}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            文本输入
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload Section */}
            {uploadMode === 'file' && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(selectedFile)}
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        移除
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium">拖拽文件到此处或点击选择</p>
                      <p className="text-sm text-gray-500 mt-2">
                        支持 PDF, DOC, DOCX, TXT, JPG, PNG (最大10MB)
                      </p>
                      <input
                        type="file"
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                      <label htmlFor="file-upload">
                        <Button type="button" className="mt-4" asChild>
                          <span>选择文件</span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Input Section */}
            {uploadMode === 'text' && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>指南内容</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="请粘贴或输入临床指南的完整内容..."
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>指南标题 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="例如: ASA 体格状态分级指南" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>发布机构 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="例如: 美国麻醉学会" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>发布年份 *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 5}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分类 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择指南分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="anesthesia">麻醉学</SelectItem>
                        <SelectItem value="surgery">外科学</SelectItem>
                        <SelectItem value="cardiology">心脏病学</SelectItem>
                        <SelectItem value="emergency">急诊医学</SelectItem>
                        <SelectItem value="perioperative">围术期管理</SelectItem>
                        <SelectItem value="general">综合医学</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>简要描述</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="描述指南的主要内容和适用范围（可选，AI将自动生成）"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  正在处理...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  上传指南
                </div>
              )}
            </Button>
          </form>
        </Form>

        {/* AI Processing Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">AI智能处理</p>
              <p className="text-blue-700">
                上传后，系统将使用AI自动解析指南内容，提取关键信息、生成关键词，并将内容结构化存储。
                这将用于后续的智能匹配和检索功能。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}