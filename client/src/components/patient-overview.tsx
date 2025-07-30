import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Patient } from '@shared/schema';

interface PatientOverviewProps {
  patient: Patient;
}

export function PatientOverview({ patient }: PatientOverviewProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">患者概览</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">患者姓名</div>
            <div className="font-semibold text-gray-900">{patient.name}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">年龄/性别</div>
            <div className="font-semibold text-gray-900">{patient.age}岁/{patient.gender}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">手术类型</div>
            <div className="font-semibold text-gray-900">{patient.surgeryType}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">ASA分级</div>
            <div className="font-semibold text-yellow-600">{patient.asaClass}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Mallampati分级</div>
            <div className="font-semibold text-blue-600">{patient.mallampatiGrade || '未评估'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">心功能分级</div>
            <div className="font-semibold text-red-600">{patient.cardiacFunction || '未评估'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
