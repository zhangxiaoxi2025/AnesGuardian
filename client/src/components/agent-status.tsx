import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@shared/schema';

interface AgentStatusProps {
  agentStatus: Record<string, AgentStatus>;
}

export function AgentStatusCard({ agentStatus }: AgentStatusProps) {
  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-yellow-500 animate-pulse';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: AgentStatus['status']) => {
    switch (status) {
      case 'completed':
        return { text: '完成', color: 'text-green-600' };
      case 'active':
        return { text: '分析中', color: 'text-yellow-600' };
      case 'failed':
        return { text: '失败', color: 'text-red-600' };
      default:
        return { text: '待启动', color: 'text-gray-500' };
    }
  };

  const getAgentIcon = (name: string) => {
    if (name.includes('总指挥')) return 'fas fa-robot';
    if (name.includes('病历')) return 'fas fa-file-medical';
    if (name.includes('风险')) return 'fas fa-exclamation-triangle';
    if (name.includes('药物')) return 'fas fa-pills';
    if (name.includes('指南')) return 'fas fa-book-medical';
    if (name.includes('核查')) return 'fas fa-check-circle';
    return 'fas fa-cog';
  };

  const getActionBadge = (agent: AgentStatus) => {
    if (agent.status === 'completed') {
      return <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded">{agent.lastAction}</div>;
    }
    if (agent.status === 'active') {
      return <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">{agent.lastAction}</div>;
    }
    if (agent.status === 'failed') {
      return <div className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded">{agent.lastAction}</div>;
    }
    return <div className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded">{agent.lastAction}</div>;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI智能体协作状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(agentStatus).map(([key, agent]) => {
            const statusInfo = getStatusText(agent.status);
            return (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <i className={cn(getAgentIcon(agent.name), 'text-blue-600')}></i>
                    <span className="font-medium text-gray-900">{agent.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={cn('w-2 h-2 rounded-full', getStatusColor(agent.status))}></div>
                    <span className={cn('text-xs', statusInfo.color)}>{statusInfo.text}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {agent.name.includes('总指挥') && '协调整体工作流程'}
                  {agent.name.includes('病历') && '提取结构化病历信息'}
                  {agent.name.includes('风险') && '系统性风险评估'}
                  {agent.name.includes('药物') && '药物相互作用分析'}
                  {agent.name.includes('指南') && '临床指南查询'}
                  {agent.name.includes('核查') && '质量核查与验证'}
                </div>
                {getActionBadge(agent)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
