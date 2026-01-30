
export type UserProfile = {
  id: string;
  name: string;
};

export type GameRecord = {
  id: number;
  user_id: string;
  total_clicks: number;
  created_at: string;
  profiles?: {
    name: string;
  };
};

export type LedgerEntry = {
  id: number;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
};

export enum ViewState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  GAME = 'GAME',
  LEDGER = 'LEDGER',
}

export type GameLevel = {
  id: number;
  size: number;
  mines: number;
};
