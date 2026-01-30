
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LedgerEntry } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip 
} from 'recharts';
import { Plus, Trash2, Wallet, PieChart as ChartIcon, List, AlertCircle } from 'lucide-react';

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

  // 타입(수입/지출)이 변경될 때 카테고리 초기값 설정
  useEffect(() => {
    if (type === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory(INCOME_CATEGORIES[0]);
    }
  }, [type]);

  const fetchEntries = async () => {
    setLoading(true);
    if (isDemo) {
      setEntries(JSON.parse(localStorage.getItem('demo_ledger') || '[]'));
    } else {
      const { data } = await supabase.from('ledger').select('*').eq('user_id', userId).order('date', { ascending: false });
      if (data) setEntries(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsSubmitting(true);
    const newEntry = { user_id: userId, amount: parseFloat(amount), type, category, description, date };
    
    if (isDemo) {
      const current = JSON.parse(localStorage.getItem('demo_ledger') || '[]');
      const saved = [{ ...newEntry, id: Date.now() }, ...current];
      localStorage.setItem('demo_ledger', JSON.stringify(saved));
      setEntries(saved);
    } else {
      await supabase.from('ledger').insert([newEntry]);
      fetchEntries();
    }
    setAmount(''); setDescription(''); setIsSubmitting(false);
  };

  const deleteEntry = async (id: number) => {
    if (isDemo) {
      const saved = entries.filter(e => e.id !== id);
      localStorage.setItem('demo_ledger', JSON.stringify(saved));
      setEntries(saved);
    } else {
      await supabase.from('ledger').delete().eq('id', id);
      fetchEntries();
    }
  };

  const statsData = (type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => ({
    name: cat,
    value: entries.filter(e => e.category === cat && e.type === type).reduce((sum, curr) => sum + curr.amount, 0)
  })).filter(item => item.value > 0);

  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">가계부 {isDemo && "(Demo)"}</h2>
          <p className="text-slate-500 text-sm">소비와 수입을 한눈에 관리하세요.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('list')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ChartIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit space-y-4 shadow-xl">
          <h3 className="font-bold flex items-center gap-2 text-slate-200"><Plus className="w-4 h-4 text-indigo-400" /> 기록 추가</h3>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
              type="button" 
              onClick={() => setType('expense')} 
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
            >
              지출
            </button>
            <button 
              type="button" 
              onClick={() => setType('income')} 
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
            >
              수입
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">금액</label>
            <input 
              type="number" 
              required 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white font-mono" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">카테고리</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
            >
              {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">메모</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="내용을 입력하세요" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">날짜</label>
            <input 
              type="date" 
              required 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}
          >
            {isSubmitting ? '저장 중...' : '기록 완료'}
          </button>
        </form>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">총 수입</span>
                <span className="text-2xl font-black text-emerald-400">₩{totalIncome.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">총 지출</span>
                <span className="text-2xl font-black text-rose-400">₩{totalExpense.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">이번 달 잔액</span>
                <span className={`text-2xl font-black ${totalIncome - totalExpense >= 0 ? 'text-indigo-400' : 'text-rose-500'}`}>
                  ₩{(totalIncome - totalExpense).toLocaleString()}
                </span>
            </div>
          </div>

          {activeTab === 'list' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">날짜</th>
                          <th className="px-6 py-4">분류</th>
                          <th className="px-6 py-4">메모</th>
                          <th className="px-6 py-4 text-right">금액</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {entries.length > 0 ? entries.map(e => (
                              <tr key={e.id} className="group hover:bg-slate-800/30 transition-colors">
                                  <td className="px-6 py-4 text-slate-300 font-medium">{e.date}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${e.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {e.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-400 max-w-[150px] truncate">{e.description || '-'}</td>
                                  <td className={`px-6 py-4 text-right font-bold ${e.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {e.type === 'income' ? '+' : '-'} ₩{e.amount.toLocaleString()}
                                  </td>
                                  <td className="px-2 text-center">
                                    <button 
                                      onClick={() => deleteEntry(e.id)} 
                                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                              </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">내역이 없습니다. 새로운 기록을 추가해보세요.</td>
                            </tr>
                          )}
                      </tbody>
                  </table>
                </div>
            </div>
          ) : (
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 h-96 shadow-xl flex flex-col items-center justify-center">
                <h4 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2">
                  <ChartIcon className="w-4 h-4" /> {type === 'expense' ? '지출' : '수입'} 카테고리별 분석
                </h4>
                {statsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie 
                            data={statsData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={8} 
                            dataKey="value"
                            stroke="none"
                          >
                              {statsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none" />)}
                          </Pie>
                          <ReTooltip 
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', color: '#fff' }} 
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`₩${value.toLocaleString()}`, '금액']}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-sm">분석할 데이터가 부족합니다.</p>
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
