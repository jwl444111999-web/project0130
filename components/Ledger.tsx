
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { LedgerEntry } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend, 
} from 'recharts';
import { Plus, Trash2, PieChart as ChartIcon, List, AlertCircle, Loader2 } from 'lucide-react';

interface LedgerProps {
  userId: string;
  isDemo?: boolean;
}

const EXPENSE_CATEGORIES = ['식비', '교통', '쇼핑', '여가', '주거', '교육', '의료', '통신', '기타'];
const INCOME_CATEGORIES = ['월급', '보너스', '용돈', '이자/배당', '기타'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#71717a'];

const Ledger: React.FC<LedgerProps> = ({ userId, isDemo }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchEntries(); }, [isDemo]);

  useEffect(() => {
    setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  }, [type]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setEntries(JSON.parse(localStorage.getItem('demo_ledger') || '[]'));
      } else {
        const { data, error } = await supabase
          .from('ledger')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        if (data) setEntries(data);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsSubmitting(true);
    const numAmount = parseFloat(amount);
    
    // 1. Create optimistic entry
    const optimisticId = Date.now();
    const newEntry: LedgerEntry = { 
      id: optimisticId, 
      user_id: userId, 
      amount: numAmount, 
      type, 
      category, 
      description, 
      date 
    };
    
    // 2. Update state optimistically (Immediate feedback)
    setEntries(prev => [newEntry, ...prev]);
    setAmount('');
    setDescription('');

    try {
      if (isDemo) {
        const current = JSON.parse(localStorage.getItem('demo_ledger') || '[]');
        localStorage.setItem('demo_ledger', JSON.stringify([newEntry, ...current]));
      } else {
        const { data, error } = await supabase
          .from('ledger')
          .insert([{ user_id: userId, amount: numAmount, type, category, description, date }])
          .select()
          .single();
        
        if (error) throw error;
        // Replace optimistic entry with the real one from server
        if (data) {
          setEntries(prev => prev.map(item => item.id === optimisticId ? data : item));
        }
      }
    } catch (err) {
      console.error("Save failed, rolling back:", err);
      // Rollback on error
      setEntries(prev => prev.filter(item => item.id !== optimisticId));
      alert("기록 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (id: number) => {
    // 1. Optimistic delete
    const previousEntries = [...entries];
    setEntries(prev => prev.filter(e => e.id !== id));

    try {
      if (isDemo) {
        localStorage.setItem('demo_ledger', JSON.stringify(entries.filter(e => e.id !== id)));
      } else {
        const { error } = await supabase.from('ledger').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Delete failed, rolling back:", err);
      setEntries(previousEntries);
      alert("삭제에 실패했습니다.");
    }
  };

  const totalIncome = useMemo(() => entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0), [entries]);
  const totalExpense = useMemo(() => entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0), [entries]);

  const statsData = useMemo(() => {
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    return categories.map(cat => ({
      name: cat,
      value: entries.filter(e => e.category === cat && e.type === type).reduce((sum, curr) => sum + curr.amount, 0)
    })).filter(item => item.value > 0);
  }, [entries, type]);

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">가계부</h2>
          <p className="text-slate-500 text-sm mt-1">소비와 수입을 즉각적으로 기록하고 분석합니다.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setActiveTab('list')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <List className="w-4 h-4" /> 목록
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ChartIcon className="w-4 h-4" /> 통계
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit space-y-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-500/20 p-1.5 rounded-md">
              <Plus className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-bold text-slate-200">기록 추가</h3>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              type="button" 
              onClick={() => setType('expense')} 
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}
            >
              지출
            </button>
            <button 
              type="button" 
              onClick={() => setType('income')} 
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}
            >
              수입
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">금액 (KRW)</label>
            <input 
              type="number" 
              required 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white font-mono text-lg" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">카테고리</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white appearance-none"
            >
              {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">메모</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="내용 입력..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">날짜</label>
            <input 
              type="date" 
              required 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '기록 완료'}
          </button>
        </form>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg group hover:border-emerald-500/30 transition-all">
                <span className="text-[10px] text-slate-500 uppercase font-black block mb-1 tracking-wider">총 수입</span>
                <span className="text-2xl font-black text-emerald-400">₩{totalIncome.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg group hover:border-rose-500/30 transition-all">
                <span className="text-[10px] text-slate-500 uppercase font-black block mb-1 tracking-wider">총 지출</span>
                <span className="text-2xl font-black text-rose-400">₩{totalExpense.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg group hover:border-indigo-500/30 transition-all">
                <span className="text-[10px] text-slate-500 uppercase font-black block mb-1 tracking-wider">이번 달 잔액</span>
                <span className={`text-2xl font-black ${totalIncome - totalExpense >= 0 ? 'text-indigo-400' : 'text-rose-500'}`}>
                  ₩{(totalIncome - totalExpense).toLocaleString()}
                </span>
            </div>
          </div>

          {activeTab === 'list' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-5">날짜</th>
                          <th className="px-6 py-5">분류</th>
                          <th className="px-6 py-5">메모</th>
                          <th className="px-6 py-5 text-right">금액</th>
                          <th className="w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {loading && entries.length === 0 ? (
                            [...Array(5)].map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                <td colSpan={5} className="px-6 py-6 h-12 bg-slate-800/10"></td>
                              </tr>
                            ))
                          ) : entries.length > 0 ? entries.map(e => (
                              <tr key={e.id} className="group hover:bg-slate-800/40 transition-all">
                                  <td className="px-6 py-5 text-slate-400 font-medium tabular-nums">{e.date}</td>
                                  <td className="px-6 py-5">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${e.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                      {e.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 text-slate-300 max-w-[200px] truncate font-medium">{e.description || '-'}</td>
                                  <td className={`px-6 py-5 text-right font-black tabular-nums text-base ${e.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {e.type === 'income' ? '+' : '-'} ₩{e.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 text-center">
                                    <button 
                                      onClick={() => deleteEntry(e.id)} 
                                      className="opacity-0 group-hover:opacity-100 p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90"
                                      title="삭제"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                              </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic flex flex-col items-center gap-3">
                                <AlertCircle className="w-8 h-8 opacity-20" />
                                <span>기록된 내역이 없습니다.</span>
                              </td>
                            </tr>
                          )}
                      </tbody>
                  </table>
                </div>
            </div>
          ) : (
            <div className="bg-slate-900 p-10 rounded-2xl border border-slate-800 h-[450px] shadow-2xl flex flex-col items-center justify-center relative">
                <div className="absolute top-6 left-6 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                   <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                     {type === 'expense' ? '지출' : '수입'} 카테고리 분석
                   </h4>
                </div>
                {statsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie 
                            data={statsData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={80} 
                            outerRadius={120} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                            animationBegin={0}
                            animationDuration={800}
                          >
                              {statsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none transition-all hover:opacity-80" />)}
                          </Pie>
                          <ReTooltip 
                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} 
                            itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                            formatter={(value: number) => [`₩${value.toLocaleString()}`, '금액']}
                          />
                          <Legend verticalAlign="bottom" height={40} iconType="circle" />
                      </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-700">
                    <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest">No Data Available</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ledger;
