import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Assessment } from "@/../../shared/schema";

export default function Agents() {
  const { data: assessments, isLoading } = useQuery<Assessment[]>({
    queryKey: ['/api/assessments'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'active':
        return '运行中';
      case 'failed':
        return '失败';
      default:
        return '空闲';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI智能体监控</h1>

      {assessments?.length ? (
        <div className="space-y-6">
          {assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardHeader>
                <CardTitle>评估 #{assessment.id} - 患者 #{assessment.patientId}</CardTitle>
                <Badge variant={assessment.status === 'completed' ? 'default' : 'secondary'}>
                  {assessment.status === 'completed' ? '已完成' : '进行中'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(assessment.agentStatus || {}).map(([agentKey, agent]) => (
                    <Card key={agentKey} className="border-l-4" style={{ borderLeftColor: getStatusColor(agent.status) }}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{agent.name}</h3>
                          <Badge variant="outline">{getStatusText(agent.status)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>进度</span>
                            <span>{agent.progress}%</span>
                          </div>
                          <Progress value={agent.progress} className="h-2" />
                          <p className="text-sm text-gray-600">{agent.lastAction}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">暂无运行中的AI智能体</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}