import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  FileText, 
  Calendar, 
  Building, 
  Tag, 
  Trash2, 
  Eye,
  Download,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ClinicalGuideline {
  id: number;
  title: string;
  organization: string;
  year: number;
  category: string;
  description?: string;
  keywords: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  fileType?: string;
  originalFileName?: string;
}

export default function ClinicalGuidelineList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch guidelines
  const { data: guidelines = [], isLoading, error } = useQuery({
    queryKey: ['/api/clinical-guidelines', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' 
        ? '/api/clinical-guidelines' 
        : `/api/clinical-guidelines?category=${selectedCategory}`;
      const response = await apiRequest(url);
      // Ensure we return an array
      return Array.isArray(response) ? response : [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/clinical-guidelines/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "指南已成功删除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-guidelines'] });
    },
    onError: (error: any) => {
      toast({
        title: "删除失败",
        description: error.message || "删除指南时发生错误",
        variant: "destructive",
      });
    },
  });

  // Filter guidelines
  const filteredGuidelines = guidelines.filter((guideline: ClinicalGuideline) => {
    const matchesSearch = searchTerm === "" || 
      guideline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guideline.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guideline.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesSearch;
  });

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      anesthesia: "麻醉学",
      surgery: "外科学", 
      cardiology: "心脏病学",
      emergency: "急诊医学",
      perioperative: "围术期管理",
      general: "综合医学"
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      anesthesia: "bg-blue-100 text-blue-800",
      surgery: "bg-red-100 text-red-800",
      cardiology: "bg-pink-100 text-pink-800", 
      emergency: "bg-orange-100 text-orange-800",
      perioperative: "bg-green-100 text-green-800",
      general: "bg-gray-100 text-gray-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleViewDetails = (guideline: ClinicalGuideline) => {
    // Open guideline details in a modal or navigate to detail page
    console.log("View guideline details:", guideline);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>加载指南列表时发生错误</p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/clinical-guidelines'] })}
              className="mt-2"
            >
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索指南标题、机构或关键词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="anesthesia">麻醉学</SelectItem>
                  <SelectItem value="surgery">外科学</SelectItem>
                  <SelectItem value="cardiology">心脏病学</SelectItem>
                  <SelectItem value="emergency">急诊医学</SelectItem>
                  <SelectItem value="perioperative">围术期管理</SelectItem>
                  <SelectItem value="general">综合医学</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredGuidelines.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无指南</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? "没有找到符合条件的指南" 
                : "还没有上传任何临床指南"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuidelines.map((guideline: ClinicalGuideline) => (
            <Card key={guideline.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {guideline.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Building className="w-3 h-3" />
                        {guideline.organization}
                      </div>
                    </CardDescription>
                  </div>
                  <Badge className={getCategoryColor(guideline.category)}>
                    {getCategoryLabel(guideline.category)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {guideline.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {guideline.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {guideline.year}
                    </div>
                    {guideline.fileType && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {guideline.fileType.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {guideline.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {guideline.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="w-2 h-2 mr-1" />
                          {keyword}
                        </Badge>
                      ))}
                      {guideline.keywords.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{guideline.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(guideline)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      查看
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除指南 "{guideline.title}" 吗？此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(guideline.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredGuidelines.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>显示 {filteredGuidelines.length} 个指南</span>
              <span>
                最新更新: {
                  new Date(
                    Math.max(...filteredGuidelines.map((g: ClinicalGuideline) => 
                      new Date(g.updatedAt).getTime()
                    ))
                  ).toLocaleDateString('zh-CN')
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}