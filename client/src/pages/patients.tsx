import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Patient } from "@/../../shared/schema";

export default function Patients() {
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">患者管理</h1>
        <Link href="/patients/new">
          <Button>添加新患者</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {patients?.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{patient.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {patient.age}岁 · {patient.gender} · ASA {patient.asaClass}
                  </p>
                </div>
                <Badge variant="outline">{patient.surgeryType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  创建时间: {new Date(patient.createdAt || '').toLocaleDateString('zh-CN')}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">查看详情</Button>
                  <Button size="sm">开始评估</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!patients?.length && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">暂无患者数据</p>
              <Link href="/patients/new">
                <Button>添加第一个患者</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}