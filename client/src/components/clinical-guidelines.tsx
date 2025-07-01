import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ClinicalGuideline } from '@shared/schema';

interface ClinicalGuidelinesProps {
  guidelines: ClinicalGuideline[];
}

export function ClinicalGuidelines({ guidelines }: ClinicalGuidelinesProps) {
  const [selectedGuideline, setSelectedGuideline] = useState<ClinicalGuideline | null>(null);

  const getRelevanceColor = (relevance: ClinicalGuideline['relevance']) => {
    switch (relevance) {
      case 'high':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-green-100 text-green-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelevanceText = (relevance: ClinicalGuideline['relevance']) => {
    switch (relevance) {
      case 'high':
        return '高度相关';
      case 'medium':
        return '相关';
      case 'low':
        return '低相关';
      default:
        return '未知';
    }
  };

  const getGuidelineIcon = (title: string) => {
    if (title.includes('气道')) return 'fas fa-lungs';
    if (title.includes('心血管')) return 'fas fa-heart';
    if (title.includes('血栓')) return 'fas fa-tint';
    if (title.includes('疼痛')) return 'fas fa-hand-holding-heart';
    return 'fas fa-book';
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">相关临床指南</h3>
        
        {guidelines.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">暂无相关临床指南</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidelines.map((guideline, index) => (
              <div key={guideline.id || index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <i className={cn(getGuidelineIcon(guideline.title), 'text-blue-600 mt-1')}></i>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{guideline.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {guideline.organization} {guideline.year}版
                    </p>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getRelevanceColor(guideline.relevance)
                      )}>
                        {getRelevanceText(guideline.relevance)}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
                            onClick={() => setSelectedGuideline(guideline)}
                          >
                            查看详情
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                              {guideline.title}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">发布机构：</span>
                                <span className="text-gray-900">{guideline.organization}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">发布年份：</span>
                                <span className="text-gray-900">{guideline.year}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">相关性：</span>
                                <span className={cn(
                                  'text-xs px-2 py-1 rounded ml-2',
                                  getRelevanceColor(guideline.relevance)
                                )}>
                                  {getRelevanceText(guideline.relevance)}
                                </span>
                              </div>
                            </div>
                            
                            {guideline.summary && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">指南概要</h4>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                  {guideline.summary}
                                </p>
                              </div>
                            )}
                            
                            {guideline.recommendations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  关键建议 ({guideline.recommendations.length}项)
                                </h4>
                                <ul className="space-y-2">
                                  {guideline.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex} className="flex items-start">
                                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center font-medium mr-3 mt-0.5">
                                        {recIndex + 1}
                                      </span>
                                      <span className="text-gray-700 text-sm leading-relaxed">
                                        {rec}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {guideline.summary && (
                      <p className="text-xs text-gray-600 mb-2">{guideline.summary}</p>
                    )}
                    {guideline.recommendations.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <div className="font-medium mb-1">关键建议:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {guideline.recommendations.slice(0, 2).map((rec, recIndex) => (
                            <li key={recIndex}>{rec}</li>
                          ))}
                          {guideline.recommendations.length > 2 && (
                            <li className="text-blue-600">...查看更多</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
