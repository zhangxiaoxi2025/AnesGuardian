import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Upload, List, Brain, TrendingUp } from "lucide-react";
import ClinicalGuidelineUpload from "@/components/clinical-guideline-upload";
import ClinicalGuidelineList from "@/components/clinical-guideline-list";

export default function GuidelineManagement() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              临床指南管理
            </h1>
            <p className="text-gray-600">
              上传、管理和智能应用临床指南，提升诊疗决策的循证支持
            </p>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">智能上传</h3>
                  <p className="text-sm text-blue-700">
                    支持多种格式，AI自动解析结构化
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">AI分析</h3>
                  <p className="text-sm text-green-700">
                    提取关键信息，生成匹配关键词
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-medium text-purple-900">智能匹配</h3>
                  <p className="text-sm text-purple-700">
                    根据患者情况推荐相关指南
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            指南列表
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传指南
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-0">
          <ClinicalGuidelineList />
        </TabsContent>

        <TabsContent value="upload" className="space-y-0">
          <div className="flex justify-center">
            <ClinicalGuidelineUpload />
          </div>
        </TabsContent>
      </Tabs>

      {/* Usage Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">使用说明</CardTitle>
          <CardDescription>
            了解如何使用临床指南管理系统提升诊疗质量
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">上传指南</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 支持PDF、Word、图片和文本格式</li>
                <li>• AI自动提取和结构化指南内容</li>
                <li>• 智能生成关键词和标签</li>
                <li>• 按分类组织便于管理</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">智能应用</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 根据患者情况智能匹配相关指南</li>
                <li>• 在评估报告中自动引用适用指南</li>
                <li>• 支持关键词搜索和分类筛选</li>
                <li>• 提供循证决策支持建议</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}