
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ViewState, UserProfile, GameRecord } from '../types';
import { Trophy, Gamepad2, ReceiptText, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  onNavigate: (view: ViewState) => void;
  isDemo?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, onNavigate, isDemo }) => {
  const [topRecords, setTopRecords] = useState<GameRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [isDemo]);

  const fetchRanking = async () => {
    setLoadingRecords(true);
    if (isDemo) {
      const demoRecords = JSON.parse(localStorage.getItem('demo_game_records') || '[]');
      const sorted = demoRecords
        .sort((a: any, b: any) => a.total_clicks - b.total_clicks)
        .slice(0, 3)
        .map((r: any) => ({ ...r, profiles: { name: r.user_name } }));
      setTopRecords(sorted);
    } else {
      const { data } = await supabase
        .from('game_records')
        .select(`id, total_clicks, created_at, profiles ( name )`)
        .order('total_clicks', { ascending: true })
        .limit(3);
      if (data) setTopRecords(data as any);
    }
    setLoadingRecords(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 sm:p-12">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
            안녕하세요, <span className="text-white">{profile.name}</span>님!
          </h1>
          <p className="text-indigo-100 text-lg max-w-lg mb-8">
            지뢰를 터뜨려 스트레스를 날리고, 스마트하게 소비를 관리하는 공간입니다. {isDemo ? "데모 모드 체험 중입니다." : "오늘 하루도 파이팅하세요!"}
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => onNavigate(ViewState.GAME)}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-lg"
            >
              <Gamepad2 className="w-5 h-5" /> 게임 시작하기
            </button>
            <button 
              onClick={() => onNavigate(ViewState.LEDGER)}
              className="bg-indigo-500/30 text-white backdrop-blur-sm border border-indigo-400/30 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500/40 transition-colors"
            >
              <ReceiptText className="w-5 h-5" /> 가계부 확인
            </button>
          </div>
        </div>
        <Sparkles className="absolute right-8 bottom-8 w-32 h-32 text-white/10 -rotate-12" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> 게임 명예의 전당 {isDemo && "(Demo)"}
            </h2>
            <button onClick={fetchRanking} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">새로고침</button>
          </div>
          <div className="space-y-4">
            {loadingRecords ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-xl" />)
            ) : topRecords.length > 0 ? (
              topRecords.map((record, index) => (
                <div key={record.id} className={`flex items-center gap-4 p-4 rounded-xl border ${index === 0 ? 'bg-amber-400/5 border-amber-400/20' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700 text-amber-50'}`}>{index + 1}</div>
                  <div className="flex-grow"><p className="font-semibold">{record.profiles?.name}</p><p className="text-xs text-slate-500">{new Date(record.created_at).toLocaleDateString()}</p></div>
                  <div className="text-right"><span className="text-lg font-mono font-bold text-indigo-400">{record.total_clicks}</span><span className="text-xs text-slate-500 block">클릭</span></div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">기록이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <TrendingUp className="w-12 h-12 text-emerald-400/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">금융 요약</h2>
            <p className="text-slate-400 mb-6">가계부 내역을 입력하고 분석 리포트를 확인하세요.</p>
            <button onClick={() => onNavigate(ViewState.LEDGER)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center gap-2">가계부 바로가기 <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
