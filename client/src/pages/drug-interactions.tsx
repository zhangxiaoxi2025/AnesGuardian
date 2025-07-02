import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, X, Search, AlertTriangle, AlertCircle, Info, Check, ChevronsUpDown } from 'lucide-react';

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

const commonDrugs = [
  // 抗凝抗血小板药物
  '阿司匹林', '氯吡格雷', '华法林', '利伐沙班', '达比加群',
  // 心血管药物
  '美托洛尔', '阿托伐他汀', '氨氯地平', '硝苯地平', '厄贝沙坦',
  // 消化系统药物
  '奥美拉唑', '兰索拉唑', '二甲双胍', '格列齐特', '胰岛素',
  // 麻醉诱导药物
  '丙泊酚', '依托咪酯', '咪达唑仑', '右美托咪定',
  // 阿片类镇痛药
  '芬太尼', '瑞芬太尼', '舒芬太尼', '地佐辛', '氯吗啡酮',
  // 肌肉松弛药
  '琥珀酰胆碱', '阿曲库铵', '维库溴铵', '罗库溴铵',
  // 拮抗药物
  '新斯的明', '阿托品',
  // 血管活性药物
  '麻黄碱', '去甲肾上腺素', '去氧肾上腺素',
  // 其他常用药物
  '地塞米松', '甲强龙', '呋塞米', '多巴胺', '肾上腺素',
  '硫酸镁', '氯化钾', '碳酸氢钠', '氯化钙', '胺碘酮'
];

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
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const drugInteractionMutation = useMutation({
    mutationFn: async (drugs: string[]) => {
      const response = await fetch('/api/drug-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugs }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check drug interactions');
      }
      
      return response.json() as Promise<DrugInteractionResponse>;
    },
  });

  const addDrug = (drug: string) => {
    if (!selectedDrugs.includes(drug)) {
      setSelectedDrugs(prev => {
        const updated = [...prev, drug];
        console.log('Selected drugs updated:', updated);
        return updated;
      });
    }
    setOpen(false);
  };

  const removeDrug = (drugToRemove: string) => {
    setSelectedDrugs(prev => {
      const updated = prev.filter(drug => drug !== drugToRemove);
      console.log('Drug removed, updated list:', updated);
      return updated;
    });
  };

  const handleSearch = () => {
    if (selectedDrugs.length >= 2) {
      drugInteractionMutation.mutate(selectedDrugs);
    }
  };

  // 安全检查：确保 interactions 是一个数组
  const interactions = Array.isArray(drugInteractionMutation.data?.interactions)
    ? drugInteractionMutation.data.interactions
    : [];

  const groupedInteractions = interactions.reduce((acc, interaction) => {
    const severity = interaction.severity;
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(interaction);
    return acc;
  }, {} as Record<string, DrugInteraction[]>);

  // 可选择的药物（排除已选择的）
  const availableDrugs = commonDrugs.filter(drug => !selectedDrugs.includes(drug));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          药物相互作用查询
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          选择两种或更多药物，分析它们之间的潜在相互作用
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
                  选择药物...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="搜索药物..." />
                  <CommandEmpty>未找到药物</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {availableDrugs.map((drug) => (
                      <CommandItem
                        key={drug}
                        value={drug}
                        onSelect={() => addDrug(drug)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedDrugs.includes(drug) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {drug}
                      </CommandItem>
                    ))}
                  </CommandGroup>
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
                  <Badge key={drug} variant="default" className="flex items-center gap-1 px-3 py-1">
                    {drug}
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
                      {interactions.map((interaction) => (
                        <Card key={interaction.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {interaction.drugs.join(' 与 ')}
                              </h4>
                              {getSeverityBadge(interaction.severity)}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {interaction.description}
                          </p>
                          
                          {interaction.recommendations.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">建议措施:</p>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {interaction.recommendations.map((recommendation, index) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <span className="text-blue-500">•</span>
                                    {recommendation}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Card>
                      ))}
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
    </div>
  );
}