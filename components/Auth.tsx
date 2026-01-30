
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { User, Lock, LogIn, UserPlus, ShieldCheck, AlertCircle, Play } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
  onDemoStart: (name: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onDemoStart }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Supabase 설정이 완료되지 않았습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    // Create a pseudo-email strictly for Supabase Auth service.
    // This is not stored in our public profiles table.
    const internalEmail = `${username.trim().toLowerCase()}@simple.app`;

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });
        if (loginError) throw loginError;
      } else {
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: internalEmail,
          password,
          options: {
            data: {
              name: username,
            }
          }
        });
        
        if (signupError) throw signupError;

        // Sync name to profiles table without email
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            name: username
          });
          if (profileError) console.warn("Profile sync:", profileError.message);
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError("서버 연결 실패. Supabase URL/Key를 확인하세요.");
      } else if (err.message.includes('Email not confirmed')) {
        setError("이메일 인증 옵션이 켜져 있습니다. Supabase 대시보드 -> Auth -> Settings에서 'Confirm Email'을 꺼주세요.");
      } else {
        setError(err.message === 'Invalid login credentials' ? '아이디 또는 비밀번호가 틀렸습니다.' : err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{isLogin ? '로그인' : '회원가입'}</h1>
          <p className="text-slate-400 mt-2 text-sm">
            아이디와 비밀번호만으로 간편하게 관리하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">아이디</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="아이디를 입력하세요"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <><LogIn className="w-5 h-5" /> 로그인</>
            ) : (
              <><UserPlus className="w-5 h-5" /> 회원가입</>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">OR</span></div>
        </div>

        <button
          onClick={() => onDemoStart(username || 'GUEST')}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" /> 로그인 없이 체험하기
        </button>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있나요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
