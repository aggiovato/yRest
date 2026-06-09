import React, { createContext, useContext, useReducer, type ReactNode } from "react";

/** Snapshot of a single API call made by any component, forwarded to the log panel. */
export interface ApiCallLog {
  method: string;
  url: string;
  status: number;
  data: unknown;
  total?: string | null;
  ts: number;
}

/** Authenticated user stored client-side after a successful login. */
export interface SessionUser {
  userId: number;
  name: string;
  avatar: string;
  email: string;
  role: string;
}

interface AppState {
  connected: boolean;
  /** Last API call logged by TodoApp; read by CrudPanel to stay in sync. */
  crudLog: ApiCallLog | null;
  /** Incremented by ApiExplorer mutations to tell TodoApp to re-fetch. */
  refreshTrigger: number;
  /** Authenticated user, or null when logged out. Lives only in client state. */
  session: SessionUser | null;
}

type AppAction =
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "LOG_CRUD"; payload: ApiCallLog }
  | { type: "REFRESH_TODOS" }
  | { type: "LOGIN"; payload: SessionUser }
  | { type: "LOGOUT" };

const initial: AppState = {
  connected: false,
  crudLog: null,
  refreshTrigger: 0,
  session: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, connected: action.payload };
    case "LOG_CRUD":
      return { ...state, crudLog: action.payload };
    case "REFRESH_TODOS":
      return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    case "LOGIN":
      return { ...state, session: action.payload };
    case "LOGOUT":
      return { ...state, session: null };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

/**
 * Root provider for the demo app. Wraps the entire React island so TodoApp
 * and ApiExplorer can share connection state, the last API call log, and the
 * refresh trigger without prop drilling.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

/**
 * Consumes the shared app context.
 *
 * @throws {Error} When called outside `AppProvider`.
 */
export function useAppContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppContext outside AppProvider");
  return ctx;
}
