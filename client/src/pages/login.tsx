import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, Activity } from 'lucide-react';
import logoImage from '@assets/图标1_1754023912364.png';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // 检查用户是否已登录
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLocation('/');
      }
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setLocation('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (countdown > 0) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setCountdown(60);
      setMessage({
        type: 'success',
        text: '验证码已发送到您的邮箱，请查收！',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || '发送验证码失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '登录成功！正在跳转...',
      });
      
      setTimeout(() => {
        setLocation('/');
      }, 1000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || '验证码错误或已过期，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative overflow-hidden">
      {/* 背景装饰 - 医疗主题动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
        
        {/* 网格背景 */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <Card className="w-full max-w-md mx-4 shadow-2xl border-0 backdrop-blur-sm bg-white/95 relative z-10">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo 区域 */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {/* Logo 外圈光晕效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-teal-400 rounded-3xl blur-2xl opacity-40 animate-pulse"></div>
              
              {/* Logo 图片 */}
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="AnesGuardian Logo" 
                  className="w-32 h-32 relative z-10 drop-shadow-2xl"
                />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              AnesGuardian
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              麻醉术前评估智能系统
            </p>
          </div>

          {/* 登录表单 */}
          <div className="space-y-6">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    邮箱地址
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || countdown > 0}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      发送中...
                    </>
                  ) : countdown > 0 ? (
                    `${countdown}秒后可重新发送`
                  ) : (
                    '发送验证码'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    验证码
                  </label>
                  <Input
                    type="text"
                    placeholder="请输入6位验证码"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    disabled={loading}
                    className="h-12 text-base text-center tracking-widest font-semibold border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    验证码已发送至 {email}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '验证并登录'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setMessage(null);
                  }}
                  disabled={loading}
                  className="w-full text-gray-600 hover:text-gray-900"
                >
                  返回修改邮箱
                </Button>
              </form>
            )}

            {/* 消息提示 */}
            {message && (
              <Alert
                variant={message.type === 'error' ? 'destructive' : 'default'}
                className={
                  message.type === 'success'
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : ''
                }
              >
                <AlertDescription className="text-sm">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 底部说明 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              使用邮箱验证码登录，首次登录将自动创建账户
              <br />
              <span className="text-blue-600 font-medium">安全 · 便捷 · 无需密码</span>
            </p>
          </div>

          {/* 装饰性医疗图标 */}
          <div className="flex justify-center gap-6 mt-6 opacity-20">
            <Shield className="w-5 h-5 text-blue-500" />
            <Activity className="w-5 h-5 text-teal-500" />
            <Mail className="w-5 h-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* 底部版权信息 */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-500 z-10">
        <p>AnesGuardian © 2025 | 麻醉术前评估智能系统</p>
      </div>
    </div>
  );
}
