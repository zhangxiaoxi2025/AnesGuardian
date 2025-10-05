import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import logoImage from '@assets/图标1_1754023912364.png';

const navigation = [
  { name: '工作台', href: '/dashboard', icon: 'fas fa-dashboard' },
  { name: '患者管理', href: '/patients', icon: 'fas fa-users' },
  { name: 'AI问答', href: '/chat', icon: 'fas fa-comments' },
  { name: '药物交互', href: '/drugs', icon: 'fas fa-pills' },
  { name: '临床指南', href: '/guidelines', icon: 'fas fa-book-medical' },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img 
            src={logoImage} 
            alt="AnesGuardian Logo" 
            className="w-8 h-8"
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AnesGuardian</h1>
            <p className="text-sm text-gray-500">麻醉守护神</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6 flex-1">
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

      {/* 用户信息和退出 */}
      {user && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full text-gray-600 hover:text-red-600 hover:border-red-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      )}
    </div>
  );
}
