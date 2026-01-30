
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { ViewState, UserProfile } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Game from './components/Game';
import Ledger from './components/Ledger';
import Header from './components/Header';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession) {
          await fetchProfile(currentSession.user.id);
          setView(ViewState.DASHBOARD);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        await fetchProfile(session.user.id);
        setView(ViewState.DASHBOARD);
        setLoading(false);
      } else if (!isDemo) {
        setProfile(null);
        setView(ViewState.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else if (error) {
        console.error("Profile fetch error:", error.message);
      }
    } catch (err) {
      console.error("Profile sync error:", err);
    }
  };

  const handleDemoStart = (name: string) => {
    setIsDemo(true);
    const demoProfile = { id: 'demo-user', name: name || 'GUEST' };
    setProfile(demoProfile);
    setSession({ user: { id: 'demo-user' } });
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    if (isDemo) {
      setIsDemo(false);
      setProfile(null);
      setSession(null);
      setView(ViewState.AUTH);
    } else {
      await supabase.auth.signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Final safety: if logged in but no profile yet, keep showing loader
  if ((session || isDemo) && !profile && view !== ViewState.AUTH) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {(session || isDemo) && profile && (
        <Header 
          profile={profile} 
          currentView={view} 
          onNavigate={setView} 
          onLogout={handleLogout}
          isDemo={isDemo}
        />
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        {(!session && !isDemo) ? (
          <Auth onAuthSuccess={() => setView(ViewState.DASHBOARD)} onDemoStart={handleDemoStart} />
        ) : (
          profile && (
            <>
              {view === ViewState.DASHBOARD && (
                <Dashboard profile={profile} onNavigate={setView} isDemo={isDemo} />
              )}
              {view === ViewState.GAME && (
                <Game userId={profile.id} onBack={() => setView(ViewState.DASHBOARD)} isDemo={isDemo} />
              )}
              {view === ViewState.LEDGER && (
                <Ledger userId={profile.id} isDemo={isDemo} />
              )}
            </>
          )
        )}
      </main>

      <footer className="py-6 border-t border-slate-800 text-center text-slate-500 text-sm">
        &copy; 2024 ExplodeMiner & Ledger. All rights reserved. {isDemo && "(Demo Mode)"}
      </footer>
    </div>
  );
};

export default App;
