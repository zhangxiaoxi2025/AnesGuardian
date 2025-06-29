import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DrugInteraction } from '@shared/schema';

interface DrugInteractionsProps {
  interactions: DrugInteraction[];
}

export function DrugInteractions({ interactions }: DrugInteractionsProps) {
  const getSeverityColor = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return 'border-red-400 bg-red-50';
      case 'moderate':
        return 'border-yellow-400 bg-yellow-50';
      case 'minor':
        return 'border-blue-400 bg-blue-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return 'fas fa-exclamation-triangle text-red-400';
      case 'moderate':
        return 'fas fa-exclamation-circle text-yellow-400';
      case 'minor':
        return 'fas fa-info-circle text-blue-400';
      default:
        return 'fas fa-info text-gray-400';
    }
  };

  const getSeverityText = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return '严重';
      case 'moderate':
        return '中等';
      case 'minor':
        return '轻微';
      default:
        return '未知';
    }
  };

  const getSeverityTextColor = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return 'text-red-800';
      case 'moderate':
        return 'text-yellow-800';
      case 'minor':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getSeverityBgColor = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'major':
        return 'text-red-700';
      case 'moderate':
        return 'text-yellow-700';
      case 'minor':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">药物相互作用警示</h3>
        
        {interactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">未发现药物相互作用</div>
          </div>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction, index) => (
              <div key={interaction.id || index} className={cn('border-l-4 p-4', getSeverityColor(interaction.severity))}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className={getSeverityIcon(interaction.severity)}></i>
                  </div>
                  <div className="ml-3">
                    <h4 className={cn('text-sm font-medium', getSeverityTextColor(interaction.severity))}>
                      {interaction.drugs.join(' + ')}
                    </h4>
                    <div className={cn('mt-2 text-sm', getSeverityBgColor(interaction.severity))}>
                      <p>{interaction.description}</p>
                    </div>
                    {interaction.recommendations.length > 0 && (
                      <div className={cn('mt-2 text-sm', getSeverityBgColor(interaction.severity))}>
                        <div className="font-medium mb-1">建议:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {interaction.recommendations.map((rec, recIndex) => (
                            <li key={recIndex}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fas fa-info-circle text-blue-400"></i>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    建议监测项目
                  </h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>术中心率、血压持续监测</li>
                      <li>凝血功能检查</li>
                      <li>电解质平衡监测</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
