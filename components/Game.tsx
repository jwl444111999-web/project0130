
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { GameLevel } from '../types';
import { ChevronLeft, Bomb, Trophy, RotateCcw, Zap, Target } from 'lucide-react';

interface GameProps {
  userId: string;
  onBack: () => void;
  isDemo?: boolean;
}

const LEVELS: GameLevel[] = [
  { id: 1, size: 8, mines: 5 },
  { id: 2, size: 10, mines: 7 },
  { id: 3, size: 12, mines: 8 },
];

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-emerald-400',
  3: 'text-rose-400',
  4: 'text-violet-400',
  5: 'text-amber-400',
  6: 'text-cyan-400',
  7: 'text-fuchsia-400',
  8: 'text-slate-100',
};

const Game: React.FC<GameProps> = ({ userId, onBack, isDemo }) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [neighborCounts, setNeighborCounts] = useState<number[][]>([]);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [explodedMines, setExplodedMines] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'level_complete' | 'all_complete'>('playing');

  const level = LEVELS[currentLevelIdx];

  const initGrid = useCallback((lvl: GameLevel) => {
    const newGrid = Array(lvl.size).fill(null).map(() => Array(lvl.size).fill(false));
    const newRevealed = Array(lvl.size).fill(null).map(() => Array(lvl.size).fill(false));
    const newCounts = Array(lvl.size).fill(null).map(() => Array(lvl.size).fill(0));
    
    // Place mines
    let placed = 0;
    while (placed < lvl.mines) {
      const r = Math.floor(Math.random() * lvl.size);
      const c = Math.floor(Math.random() * lvl.size);
      if (!newGrid[r][c]) {
        newGrid[r][c] = true;
        placed++;
      }
    }

    // Calculate neighbor counts
    for (let r = 0; r < lvl.size; r++) {
      for (let c = 0; c < lvl.size; c++) {
        if (newGrid[r][c]) continue;
        let count = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < lvl.size && nc >= 0 && nc < lvl.size && newGrid[nr][nc]) {
              count++;
            }
          }
        }
        newCounts[r][c] = count;
      }
    }

    setGrid(newGrid);
    setNeighborCounts(newCounts);
    setRevealed(newRevealed);
    setExplodedMines(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    initGrid(level);
  }, [currentLevelIdx, initGrid]);

  const revealEmptyCells = (r: number, c: number, currentRevealed: boolean[][]) => {
    const size = level.size;
    const stack = [[r, c]];
    
    while (stack.length > 0) {
      const [currR, currC] = stack.pop()!;
      
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const nr = currR + i;
          const nc = currC + j;
          
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && !currentRevealed[nr][nc] && !grid[nr][nc]) {
            currentRevealed[nr][nc] = true;
            if (neighborCounts[nr][nc] === 0) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || revealed[r][c]) return;

    setTotalClicks(prev => prev + 1);
    const newRevealed = [...revealed.map(row => [...row])];
    newRevealed[r][c] = true;

    if (grid[r][c]) {
      // Hit a mine (The goal in this reverse version)
      const newExploded = explodedMines + 1;
      setExplodedMines(newExploded);
      setRevealed(newRevealed);
      
      if (newExploded === level.mines) {
        if (currentLevelIdx < LEVELS.length - 1) setGameState('level_complete');
        else {
          setGameState('all_complete');
          saveRecord();
        }
      }
    } else {
      // Hit a safe cell - show numbers and potentially expand
      if (neighborCounts[r][c] === 0) {
        revealEmptyCells(r, c, newRevealed);
      }
      setRevealed(newRevealed);
    }
  };

  const saveRecord = async () => {
    const finalClicks = totalClicks + 1;
    if (isDemo) {
      const records = JSON.parse(localStorage.getItem('demo_game_records') || '[]');
      records.push({
        id: Date.now(),
        user_name: 'GUEST',
        total_clicks: finalClicks,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('demo_game_records', JSON.stringify(records));
    } else {
      await supabase.from('game_records').insert([{ user_id: userId, total_clicks: finalClicks }]);
    }
  };

  const nextLevel = () => setCurrentLevelIdx(prev => prev + 1);
  const resetGame = () => { setCurrentLevelIdx(0); setTotalClicks(0); initGrid(LEVELS[0]); };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> 뒤로가기</button>
        <h2 className="text-2xl font-bold text-white text-center">지뢰 폭발 챌린지</h2>
        <button onClick={resetGame} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><RotateCcw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <Target className="w-6 h-6 text-indigo-400 mb-1" />
          <span className="text-[10px] text-slate-500 uppercase">Stage</span>
          <span className="text-xl font-bold">{currentLevelIdx + 1}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-rose-400">
          <Bomb className="w-6 h-6 mb-1" />
          <span className="text-[10px] text-slate-500 uppercase">Remain</span>
          <span className="text-xl font-bold">{level.mines - explodedMines}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-amber-400">
          <Zap className="w-6 h-6 mb-1" />
          <span className="text-[10px] text-slate-500 uppercase">Clicks</span>
          <span className="text-xl font-bold">{totalClicks}</span>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-2xl inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${level.size}, minmax(30px, 1fr))` }}>
          {grid.map((row, r) => row.map((isMine, c) => {
            const isRevealed = revealed[r][c];
            const count = neighborCounts[r][c];
            
            return (
              <button 
                key={`${r}-${c}`} 
                onClick={() => handleCellClick(r, c)} 
                disabled={isRevealed || gameState !== 'playing'}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center transition-all text-sm font-bold shadow-sm ${
                  isRevealed 
                    ? (isMine ? 'bg-rose-500 border-rose-600 scale-105' : 'bg-slate-800/40 opacity-80') 
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:scale-105 active:scale-95'
                }`}
              >
                {isRevealed && (
                  isMine ? (
                    <Bomb className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    count > 0 ? <span className={NUMBER_COLORS[count]}>{count}</span> : null
                  )
                )}
              </button>
            );
          }))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center max-w-lg mx-auto">
        <p className="text-xs text-slate-400">
          <span className="text-indigo-400 font-bold">Tip:</span> 숫자는 주변 8칸 내에 숨겨진 지뢰의 개수입니다. <br/>
          이 게임의 목표는 일반 지뢰찾기와 반대로 <span className="text-rose-400 font-bold">모든 지뢰를 찾아 클릭하는 것</span>입니다!
        </p>
      </div>

      {(gameState === 'level_complete' || gameState === 'all_complete') && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${gameState === 'level_complete' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
              {gameState === 'level_complete' ? <Zap className="w-10 h-10 text-white" /> : <Trophy className="w-10 h-10 text-amber-950" />}
            </div>
            <h3 className="text-2xl font-bold mb-4">{gameState === 'level_complete' ? '스테이지 클리어!' : '최종 클리어!'}</h3>
            <div className="bg-slate-950 rounded-2xl p-4 mb-8">
              <span className="text-slate-500 text-xs block mb-1">총 클릭 횟수</span>
              <span className="text-4xl font-black text-indigo-400 font-mono">{totalClicks}</span>
            </div>
            <button onClick={gameState === 'level_complete' ? nextLevel : resetGame} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
              {gameState === 'level_complete' ? '다음 스테이지' : '다시 도전하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
