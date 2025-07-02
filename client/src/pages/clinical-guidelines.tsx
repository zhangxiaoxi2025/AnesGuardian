import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, Calendar, Building, Star, ExternalLink } from 'lucide-react';

interface ClinicalGuideline {
  id: string;
  title: string;
  organization: string;
  year: number;
  relevance: 'low' | 'medium' | 'high';
  summary: string;
  recommendations: string[];
  keywords?: string[];
  category?: string;
  fullContent?: string;
  source?: string;
}

interface GuidelinesResponse {
  guidelines: ClinicalGuideline[];
  total: number;
}

const getRelevanceBadge = (relevance: string) => {
  switch (relevance) {
    case 'high':
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">高相关</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">中相关</Badge>;
    case 'low':
      return <Badge variant="secondary">低相关</Badge>;
    default:
      return <Badge variant="outline">未知</Badge>;
  }
};

const getCategoryColor = (category: string) => {
  const colors = {
    '麻醉': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    '围术期': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    '疼痛': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    '重症': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    '急救': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    '其他': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  };
  return colors[category as keyof typeof colors] || colors['其他'];
};

// 默认显示的热门指南
const featuredGuidelines: ClinicalGuideline[] = [
  {
    id: 'asa-perioperative-2023',
    title: 'ASA围术期麻醉管理指南（2023版）',
    organization: 'American Society of Anesthesiologists',
    year: 2023,
    relevance: 'high',
    summary: '美国麻醉医师协会发布的围术期麻醉管理标准化指南，涵盖术前评估、麻醉选择、监测要求等核心内容。',
    recommendations: [
      '术前必须进行系统性风险评估',
      '标准监测包括ECG、血压、血氧饱和度',
      '气道管理应遵循困难气道算法',
      '液体管理需个体化制定方案'
    ],
    keywords: ['围术期', '麻醉管理', '风险评估', '监测'],
    category: '麻醉',
    fullContent: '这是ASA围术期麻醉管理指南的详细内容...',
    source: 'https://www.asahq.org'
  },
  {
    id: 'eras-guidelines-2023',
    title: 'ERAS加速康复外科指南',
    organization: 'Enhanced Recovery After Surgery Society',
    year: 2023,
    relevance: 'high',
    summary: 'ERAS协会制定的加速康复外科指南，强调多学科协作和循证医学实践。',
    recommendations: [
      '术前优化患者营养状态',
      '减少术前禁食时间',
      '优化麻醉和镇痛方案',
      '早期活动和康复训练'
    ],
    keywords: ['ERAS', '加速康复', '围术期', '多学科'],
    category: '围术期',
    fullContent: 'ERAS加速康复外科指南详细内容...',
    source: 'https://erasociety.org'
  },
  {
    id: 'difficult-airway-2022',
    title: '困难气道管理指南（2022更新版）',
    organization: 'Difficult Airway Society',
    year: 2022,
    relevance: 'high',
    summary: '困难气道协会更新的气道管理指南，提供系统性的困难气道识别和处理策略。',
    recommendations: [
      '术前识别困难气道预测因子',
      '准备多种气道管理设备',
      '遵循困难气道算法',
      '建立气道管理团队'
    ],
    keywords: ['困难气道', '气道管理', '插管', '算法'],
    category: '麻醉',
    fullContent: '困难气道管理指南详细内容...',
    source: 'https://das.uk.com'
  },
  {
    id: 'pediatric-anesthesia-2023',
    title: '小儿麻醉安全指南',
    organization: 'Society for Pediatric Anesthesia',
    year: 2023,
    relevance: 'medium',
    summary: '小儿麻醉协会发布的儿童麻醉安全指南，针对不同年龄段儿童的麻醉特点制定。',
    recommendations: [
      '严格按年龄和体重计算药物剂量',
      '密切监测体温变化',
      '预防术后恶心呕吐',
      '重视家属沟通'
    ],
    keywords: ['小儿麻醉', '儿童', '安全', '剂量'],
    category: '麻醉',
    fullContent: '小儿麻醉安全指南详细内容...',
    source: 'https://www.pedsanesthesia.org'
  }
];

export default function ClinicalGuidelines() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuideline, setSelectedGuideline] = useState<ClinicalGuideline | null>(null);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['guidelines', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return { guidelines: featuredGuidelines, total: featuredGuidelines.length };
      }
      
      const response = await fetch(`/api/guidelines/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to search guidelines');
      }
      return response.json() as Promise<GuidelinesResponse>;
    },
    enabled: true
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Query will be triggered automatically by React Query due to queryKey change
  };

  const guidelines = searchResults?.guidelines || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">临床指南库</h1>
        <p className="text-gray-600 dark:text-gray-400">
          搜索和浏览最新的临床指南，获取循证医学建议
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索指南，如：困难气道、围术期管理、疼痛控制..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!searchQuery && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            热门指南推荐
          </h2>
        </div>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              搜索失败，请稍后重试。错误信息：{error.message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guidelines.map((guideline) => (
          <Card key={guideline.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg leading-tight line-clamp-2">
                  {guideline.title}
                </CardTitle>
                {getRelevanceBadge(guideline.relevance)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span className="truncate">{guideline.organization}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{guideline.year}</span>
                </div>
              </div>

              {guideline.category && (
                <Badge className={`w-fit text-xs ${getCategoryColor(guideline.category)}`}>
                  {guideline.category}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {guideline.summary}
              </p>
              
              {guideline.keywords && guideline.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {guideline.keywords.slice(0, 3).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {guideline.keywords.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{guideline.keywords.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setSelectedGuideline(guideline)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    查看详情
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">{guideline.title}</DialogTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{guideline.organization}</span>
                      <span>•</span>
                      <span>{guideline.year}年</span>
                      {guideline.source && (
                        <>
                          <span>•</span>
                          <a 
                            href={guideline.source} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                            原文链接
                          </a>
                        </>
                      )}
                    </div>
                  </DialogHeader>
                  
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-6 pr-4">
                      <div>
                        <h3 className="font-semibold mb-2">指南摘要</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {guideline.summary}
                        </p>
                      </div>
                      
                      {guideline.recommendations.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">核心建议</h3>
                          <ul className="space-y-2">
                            {guideline.recommendations.map((recommendation, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-600 dark:text-gray-400">{recommendation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {guideline.fullContent && (
                        <div>
                          <h3 className="font-semibold mb-2">详细内容</h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {guideline.fullContent}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {guidelines.length === 0 && !isLoading && searchQuery && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              未找到相关指南
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              请尝试使用其他关键词进行搜索
            </p>
          </CardContent>
        </Card>
      )}

      {guidelines.length === 0 && !isLoading && !searchQuery && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              临床指南库
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              使用搜索功能查找相关的临床指南
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}