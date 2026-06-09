import { createContext, useContext, useReducer, type ReactNode } from 'react';

export interface ApiCallLog {
  method: string;
  url: string;
  status: number;
  data: unknown;
  total?: string | null;
  ts: number;
}

interface AppState {
  connected: boolean;
  crudLog: ApiCallLog | null;
  refreshTrigger: number;
}

type AppAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'LOG_CRUD'; payload: ApiCallLog }
  | { type: 'REFRESH_TODOS' };

const initial: AppState = { connected: false, crudLog: null, refreshTrigger: 0 };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CONNECTED':  return { ...state, connected: action.payload };
    case 'LOG_CRUD':       return { ...state, crudLog: action.payload };
    case 'REFRESH_TODOS':  return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    default:               return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useAppContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppContext outside AppProvider');
  return ctx;
}
