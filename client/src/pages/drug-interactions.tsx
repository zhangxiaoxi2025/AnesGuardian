import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X, Search, AlertTriangle, AlertCircle, Info } from 'lucide-react';

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
  '阿司匹林', '氯吡格雷', '华法林', '利伐沙班', '达比加群',
  '美托洛尔', '阿托伐他汀', '氨氯地平', '硝苯地平', '厄贝沙坦',
  '奥美拉唑', '兰索拉唑', '二甲双胍', '格列齐特', '胰岛素',
  '丙泊酚', '咪达唑仑', '芬太尼', '瑞芬太尼', '右美托咪定',
  '舒芬太尼', '依托咪酯', '琥珀酰胆碱', '阿曲库铵', '维库溴铵',
  '罗库溴铵', '新斯的明', '阿托品', '麻黄碱', '去甲肾上腺素'
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
  const [inputValue, setInputValue] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.trim()) {
      const filtered = commonDrugs.filter(drug => 
        drug.toLowerCase().includes(value.toLowerCase()) &&
        !selectedDrugs.includes(drug)
      ).slice(0, 10);
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addDrug = (drug: string) => {
    if (!selectedDrugs.includes(drug)) {
      setSelectedDrugs(prev => {
        const updated = [...prev, drug];
        console.log('Selected drugs updated:', updated);
        return updated;
      });
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeDrug = (drugToRemove: string) => {
    setSelectedDrugs(prev => {
      const updated = prev.filter(drug => drug !== drugToRemove);
      console.log('Drug removed, updated list:', updated);
      return updated;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addDrug(filteredSuggestions[0]);
      } else if (!selectedDrugs.includes(inputValue.trim())) {
        addDrug(inputValue.trim());
      }
    }
  };

  const handleSearch = () => {
    if (selectedDrugs.length >= 2) {
      drugInteractionMutation.mutate(selectedDrugs);
    }
  };

  const groupedInteractions = drugInteractionMutation.data?.interactions.reduce((acc, interaction) => {
    const severity = interaction.severity;
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(interaction);
    return acc;
  }, {} as Record<string, DrugInteraction[]>) || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">药物交互速查</h1>
        <p className="text-gray-600 dark:text-gray-400">
          检查多种药物之间的相互作用，评估用药安全性
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
          <div className="relative">
            <Input
              placeholder="请输入药物名称..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
            
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredSuggestions.map((drug, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                    onClick={() => addDrug(drug)}
                  >
                    {drug}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDrugs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                已选择的药物: ({selectedDrugs.length}种)
                {selectedDrugs.length >= 2 && (
                  <span className="text-green-600 dark:text-green-400 ml-2">✓ 已满足查询条件</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDrugs.map((drug, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 px-2"
                  >
                    {drug}
                    <button
                      onClick={() => removeDrug(drug)}
                      className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={selectedDrugs.length < 2 || drugInteractionMutation.isPending}
              className={`flex items-center gap-2 ${
                selectedDrugs.length >= 2 && !drugInteractionMutation.isPending 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : ''
              }`}
            >
              {drugInteractionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              查询交互 ({selectedDrugs.length}/2+)
            </Button>
            
            {selectedDrugs.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setSelectedDrugs([])}
              >
                清空选择
              </Button>
            )}
          </div>

          {selectedDrugs.length < 2 && selectedDrugs.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                请至少选择2种药物进行交互查询
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {drugInteractionMutation.data && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            查询结果 ({drugInteractionMutation.data.interactions.length}个交互)
          </h2>
          
          {drugInteractionMutation.data.interactions.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                恭喜！所选药物之间未发现已知的相互作用。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {['major', 'moderate', 'minor'].map(severity => {
                const interactions = groupedInteractions[severity] || [];
                if (interactions.length === 0) return null;
                
                const severityLabels = {
                  major: '严重交互',
                  moderate: '中等交互',
                  minor: '轻微交互'
                };

                return (
                  <div key={severity} className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {getSeverityIcon(severity)}
                      {severityLabels[severity as keyof typeof severityLabels]} ({interactions.length})
                    </h3>
                    
                    <div className="grid gap-3">
                      {interactions.map((interaction) => (
                        <Card key={interaction.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {interaction.drugs.join(' + ')}
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