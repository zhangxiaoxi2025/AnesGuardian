import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '工作台', href: '/dashboard', icon: 'fas fa-dashboard' },
  { name: '患者管理', href: '/patients', icon: 'fas fa-users' },
  { name: 'AI智能体', href: '/agents', icon: 'fas fa-brain' },
  { name: 'AI问答', href: '/chat', icon: 'fas fa-comments' },
  { name: '风险评估', href: '/risk', icon: 'fas fa-chart-line' },
  { name: '药物交互', href: '/drugs', icon: 'fas fa-pills' },
  { name: '临床指南', href: '/guidelines', icon: 'fas fa-book-medical' },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <i className="fas fa-shield-alt text-2xl text-blue-600"></i>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">麻醉守护神</h1>
            <p className="text-sm text-gray-500">Anesthesia Guardian</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    'flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer',
                    isActive
                      ? 'text-blue-600 bg-blue-50 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <i className={cn(item.icon, 'mr-3')}></i>
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
