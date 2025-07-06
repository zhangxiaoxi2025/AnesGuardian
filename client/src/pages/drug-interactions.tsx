import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, X, Search, AlertTriangle, AlertCircle, Info, Check, ChevronsUpDown, Clock, Eye, CheckCircle } from 'lucide-react';

interface DrugInteraction {
  id: string;
  drugs: string[];
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendations: string[];
}

interface DrugInteractionResponse {
  interactions: DrugInteraction[];
}

interface InteractionAnalysis {
  mechanism?: string;
  consequences?: string;
  recommendations?: {
    monitoring?: string;
    dose_adjustment?: string;
    alternatives?: string;
    emergencyPlan?: string;
  };
  fullAnalysis?: string;
}

interface Drug {
  id: number;
  name: string;
  aliases: string[];
  category: string;
  stopGuideline: string | null;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'major':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'moderate':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'minor':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'major':
      return <Badge variant="destructive" className="text-xs">严重</Badge>;
    case 'moderate':
      return <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">中等</Badge>;
    case 'minor':
      return <Badge variant="secondary" className="text-xs">轻微</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">未知</Badge>;
  }
};

export default function DrugInteractions() {
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<DrugInteraction | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<InteractionAnalysis | null>(null);

  const drugInteractionMutation = useMutation({
    mutationFn: async (drugNames: string[]) => {
      console.log('🔍 前端: 开始药物相互作用分析...', drugNames);
      
      // 构造drugs数组，包含name字段
      const drugs = drugNames.map(name => ({ name }));
      
      const response = await fetch('/api/interactions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugs }),
      });
      
      console.log('📡 前端: 相互作用分析API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to check drug interactions');
      }
      
      const data = await response.json();
      console.log('📊 前端: 相互作用分析结果:', data);
      
      return data as DrugInteractionResponse;
    },
  });

  // 深度分析mutation
  const analysisDeepDiveMutation = useMutation({
    mutationFn: async ({ drugA, drugB }: { drugA: string; drugB: string }) => {
      console.log('🔍 前端: 开始深度相互作用分析...', { drugA, drugB });
      
      const response = await fetch('/api/interactions/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          drugs: [drugA, drugB],
          interaction: {
            drugs: [drugA, drugB]
          }
        }),
      });
      
      console.log('📡 前端: 深度分析API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to get interaction analysis');
      }
      
      const data = await response.json();
      console.log('📊 前端: 深度分析结果:', data);
      
      return data as InteractionAnalysis;
    },
    onSuccess: (data) => {
      setAnalysisData(data);
    },
  });

  // 动态搜索药物
  const { data: drugSearchResults = [] } = useQuery({
    queryKey: ['/api/drugs/search', searchQuery],
    queryFn: async (): Promise<Drug[]> => {
      if (!searchQuery.trim()) {
        console.log('🔍 前端: 搜索查询为空，跳过API调用');
        return [];
      }
      
      const url = `/api/drugs/search?q=${encodeURIComponent(searchQuery)}`;
      console.log(`🔍 前端: 调用药物搜索API: ${url}`);
      
      const response = await fetch(url);
      console.log(`📡 前端: API响应状态: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ 前端: API请求失败，状态码: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('📊 前端: 收到API响应数据:', data);
      
      const drugs = data.drugs || [];
      console.log(`✅ 前端: 解析出 ${drugs.length} 个药物`);
      
      return drugs;
    },
    enabled: !!searchQuery.trim(),
  });

  const addDrug = (drug: Drug) => {
    if (!selectedDrugs.find(d => d.id === drug.id)) {
      setSelectedDrugs(prev => {
        const updated = [...prev, drug];
        console.log('Selected drugs updated:', updated);
        return updated;
      });
    }
    setOpen(false);
    setSearchQuery('');
  };

  const removeDrug = (drugToRemove: Drug) => {
    setSelectedDrugs(prev => {
      const updated = prev.filter(drug => drug.id !== drugToRemove.id);
      console.log('Drug removed, updated list:', updated);
      return updated;
    });
  };

  // 处理点击交互卡片的深度分析
  const handleInteractionClick = (interaction: DrugInteraction) => {
    setSelectedInteraction(interaction);
    setAnalysisData(null); // 清除之前的数据
    setAnalysisModalOpen(true);
    
    // 调用AI分析
    if (interaction.drugs && interaction.drugs.length >= 2) {
      analysisDeepDiveMutation.mutate({
        drugA: interaction.drugs[0],
        drugB: interaction.drugs[1]
      });
    }
  };

  const handleSearch = () => {
    if (selectedDrugs.length >= 2) {
      const drugNames = selectedDrugs.map(drug => drug.name);
      drugInteractionMutation.mutate(drugNames);
    }
  };

  // 防崩溃处理数据
  const responseData = drugInteractionMutation.data as DrugInteractionResponse | undefined;
  const interactions = Array.isArray(responseData?.interactions) ? responseData.interactions : [];

  const groupedInteractions = interactions.reduce((acc: Record<string, DrugInteraction[]>, interaction: DrugInteraction) => {
    const severity = interaction.severity || 'minor';
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(interaction);
    return acc;
  }, {});

  // 过滤出需要停药的药物
  const drugsRequiringStop = selectedDrugs.filter(drug => 
    drug.stopGuideline && 
    drug.stopGuideline !== '术前无需停药' && 
    drug.stopGuideline !== '术前不建议停药' &&
    drug.stopGuideline !== '术前可继续使用'
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          药物相互作用查询
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          选择两种或更多药物，分析它们之间的潜在相互作用和术前停药建议
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            药物选择
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 多选组合框 */}
          <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {searchQuery || "搜索并选择药物..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="搜索药物..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>未找到药物</CommandEmpty>
                  <CommandList>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {drugSearchResults.map((drug: Drug) => (
                        <CommandItem
                          key={drug.id}
                          value={drug.name}
                          onSelect={() => addDrug(drug)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedDrugs.find(d => d.id === drug.id) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span>{drug.name}</span>
                            <span className="text-xs text-gray-500">{drug.category}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 已选择的药物徽章 */}
          {selectedDrugs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                已选择的药物 ({selectedDrugs.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDrugs.map((drug) => (
                  <Badge key={drug.id} variant="default" className="flex items-center gap-1 px-3 py-1">
                    {drug.name}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500"
                      onClick={() => removeDrug(drug)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 状态显示 */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedDrugs.length === 0 && "请选择至少2种药物进行交互分析"}
            {selectedDrugs.length === 1 && "请再选择至少1种药物"}
            {selectedDrugs.length >= 2 && `可以分析 ${selectedDrugs.length} 种药物的相互作用`}
          </div>

          {/* 查询按钮 */}
          <Button
            onClick={handleSearch}
            disabled={selectedDrugs.length < 2 || drugInteractionMutation.isPending}
            className={`w-full ${selectedDrugs.length >= 2 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            {drugInteractionMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            查询交互
          </Button>
        </CardContent>
      </Card>

      {/* 术前停药建议卡片 */}
      {drugsRequiringStop.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Clock className="h-5 w-5" />
              术前停药建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drugsRequiringStop.map((drug) => (
                <div key={drug.id} className="flex justify-between items-start p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{drug.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({drug.category})</span>
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 text-right">
                    {drug.stopGuideline}
                  </div>
                </div>
              ))}
            </div>
            <Alert className="mt-4 border-orange-300 bg-orange-100 dark:bg-orange-900">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                请根据具体手术类型和患者情况，与主管医师确认最终停药时间。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 查询结果 */}
      {drugInteractionMutation.data && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            相互作用分析结果
          </h2>
          
          {Object.keys(groupedInteractions).length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                未发现明显的药物相互作用，但仍建议在用药前咨询医师。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedInteractions).map(([severity, interactions]) => {
                const severityConfig = {
                  'major': { title: '严重相互作用', color: 'border-red-500', bgColor: 'bg-red-50 dark:bg-red-950' },
                  'moderate': { title: '中等相互作用', color: 'border-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
                  'minor': { title: '轻微相互作用', color: 'border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' }
                };
                
                return (
                  <div key={severity} className={`border-l-4 ${severityConfig[severity as keyof typeof severityConfig]?.color} ${severityConfig[severity as keyof typeof severityConfig]?.bgColor} p-4 rounded-r-lg`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      {getSeverityIcon(severity)}
                      {severityConfig[severity as keyof typeof severityConfig]?.title}
                    </h3>
                    
                    <div className="grid gap-3">
                      {(interactions as DrugInteraction[]).length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            未查询到已知的相互作用
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            根据当前药物组合，未发现有临床意义的药物相互作用。但请仍需谨慎用药，密切观察患者状态。
                          </p>
                        </div>
                      ) : (
                        (interactions as DrugInteraction[]).map((interaction: DrugInteraction) => (
                          <Card 
                            key={interaction.id} 
                            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border hover:border-blue-400 hover:shadow-md group"
                            onClick={() => handleInteractionClick(interaction)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  {(interaction.drugs || []).join(' 与 ')}
                                </h4>
                                {getSeverityBadge(interaction.severity)}
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-blue-500 font-medium">查看详情</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {interaction.description}
                            </p>
                            
                            {Array.isArray(interaction.recommendations) && interaction.recommendations.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">建议措施:</p>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  {interaction.recommendations.map((recommendation: string, index: number) => (
                                    <li key={index} className="flex items-start gap-1">
                                      <span className="text-blue-500">•</span>
                                      {recommendation}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {drugInteractionMutation.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            查询失败，请稍后重试。错误信息：{drugInteractionMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 深度分析模态框 */}
      <Dialog open={analysisModalOpen} onOpenChange={setAnalysisModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              药物相互作用深度分析
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedInteraction && (
                <span className="font-medium">
                  {(selectedInteraction.drugs || []).join(' 与 ')} - 深度临床分析
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {analysisDeepDiveMutation.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-gray-600 dark:text-gray-400">AI正在进行深度分析，请稍候...</p>
                </div>
              </div>
            )}

            {analysisDeepDiveMutation.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  分析失败，请重试。错误信息：{analysisDeepDiveMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {analysisData && (
              <div className="space-y-6">
                {/* 药理学机制 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    药理学相互作用机制
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysisData?.mechanism}
                  </p>
                </Card>

                {/* 临床后果 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    可能的临床后果与风险
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysisData?.consequences}
                  </p>
                </Card>

                {/* 临床建议 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    专业临床建议
                  </h3>
                  
                  <div className="space-y-4">
                    {/* 监测建议 */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">生命体征监测</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {analysisData?.recommendations?.monitoring}
                      </p>
                    </div>

                    {/* 剂量调整 */}
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">剂量调整方案</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {analysisData?.recommendations?.dose_adjustment}
                      </p>
                    </div>

                    {/* 替代方案 */}
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">替代药物方案</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {analysisData?.recommendations?.alternatives}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* 免责声明 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>重要提示：</strong>以上分析仅供临床参考，具体用药决策请结合患者个体情况和临床实际，必要时咨询专科医师或临床药师。
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}