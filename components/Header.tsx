
import React from 'react';
import { LogOut, LayoutDashboard, Gamepad2, ReceiptText, User, Info } from 'lucide-react';
import { ViewState, UserProfile } from '../types';

interface HeaderProps {
  profile: UserProfile;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isDemo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ profile, currentView, onNavigate, onLogout, isDemo }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: '홈', icon: LayoutDashboard },
    { id: ViewState.GAME, label: '게임', icon: Gamepad2 },
    { id: ViewState.LEDGER, label: '가계부', icon: ReceiptText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(ViewState.DASHBOARD)}>
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">
            EXL<span className="text-indigo-500">LEDGER</span>
          </span>
          {isDemo && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[10px] font-bold">
              DEMO
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1 sm:gap-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentView === item.id 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 border-l border-slate-800 pl-4 ml-4">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs text-slate-500">반갑습니다!</span>
            <span className="text-sm font-semibold">{profile.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
      {isDemo && (
        <div className="bg-amber-500/10 text-amber-500 text-[10px] py-1 text-center border-b border-amber-500/20 flex items-center justify-center gap-1">
          <Info className="w-3 h-3" /> 실시간 데이터가 로컬에만 저장됩니다. 앱을 새로고침하면 초기화될 수 있습니다.
        </div>
      )}
    </header>
  );
};

export default Header;
