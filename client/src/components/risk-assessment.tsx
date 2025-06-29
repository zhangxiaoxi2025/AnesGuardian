import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RiskFactor } from '@shared/schema';

interface RiskAssessmentProps {
  riskFactors: RiskFactor[];
}

export function RiskAssessment({ riskFactors }: RiskAssessmentProps) {
  const getRiskColor = (level: RiskFactor['level']) => {
    switch (level) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getRiskBadgeColor = (level: RiskFactor['level']) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (type: RiskFactor['type']) => {
    switch (type) {
      case 'airway':
        return 'fas fa-lungs';
      case 'cardiovascular':
        return 'fas fa-heart';
      case 'thrombosis':
        return 'fas fa-tint';
      case 'ponv':
        return 'fas fa-dizzy';
      default:
        return 'fas fa-exclamation-circle';
    }
  };

  const getRiskIconColor = (level: RiskFactor['level']) => {
    switch (level) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRiskLevelText = (level: RiskFactor['level']) => {
    switch (level) {
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      case 'low':
        return '低风险';
      default:
        return '未知';
    }
  };

  const getRiskTypeText = (type: RiskFactor['type']) => {
    switch (type) {
      case 'airway':
        return '困难气道风险';
      case 'cardiovascular':
        return '心血管风险';
      case 'thrombosis':
        return '血栓风险';
      case 'ponv':
        return 'PONV风险';
      default:
        return '其他风险';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">风险评估结果</h3>
        
        {riskFactors.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">暂无风险评估数据</div>
          </div>
        ) : (
          <div className="space-y-4">
            {riskFactors.map((risk, index) => (
              <div key={index} className={cn('border rounded-lg p-4', getRiskColor(risk.level))}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <i className={cn(getRiskIcon(risk.type), getRiskIconColor(risk.level))}></i>
                    <span className="font-medium">{getRiskTypeText(risk.type)}</span>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getRiskBadgeColor(risk.level)
                  )}>
                    {getRiskLevelText(risk.level)}
                  </span>
                </div>
                <div className="text-sm mb-2">
                  {risk.description}
                </div>
                {risk.score && (
                  <div className="text-xs text-gray-600 mb-2">
                    评分: {risk.score}
                  </div>
                )}
                {risk.recommendations.length > 0 && (
                  <div className="text-xs">
                    <div className="font-medium mb-1">建议:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {risk.recommendations.map((rec, recIndex) => (
                        <li key={recIndex}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
