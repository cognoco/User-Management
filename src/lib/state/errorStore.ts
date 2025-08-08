import { create } from 'zustand';
// Client should not import server-side loggers; no-op sync on client

export interface ErrorEntry {
  id: string;
  message: string;
  type?: string;
  section?: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  dismissAfter?: number;
  onRetry?: () => Promise<void> | void;
  sync?: boolean;
}

interface ErrorState {
  globalQueue: ErrorEntry[];
  sectionQueues: Record<string, ErrorEntry[]>;
  history: ErrorEntry[];
  addError: (entry: Omit<ErrorEntry, 'id' | 'timestamp'>) => string;
  removeError: (id: string, section?: string) => void;
  clearErrors: (section?: string) => void;
}

export const useErrorStore = create<ErrorState>((set, get) => ({
  globalQueue: [],
  sectionQueues: {},
  history: [],

  addError: (entry) => {
    const id = `${Date.now()}-${Math.random()}`;
    const error: ErrorEntry = {
      severity: 'medium',
      ...entry,
      id,
      timestamp: Date.now(),
    };
    set(state => {
      if (error.section) {
        const list = state.sectionQueues[error.section] || [];
        return {
          sectionQueues: { ...state.sectionQueues, [error.section]: [...list, error] },
          history: [...state.history, error],
        };
      }
      return { globalQueue: [...state.globalQueue, error], history: [...state.history, error] };
    });

    if (entry.dismissAfter) {
      setTimeout(() => get().removeError(id, entry.section), entry.dismissAfter);
    }

    // optional server sync removed from client to avoid pulling audit/database

    return id;
  },

  removeError: (id, section) => {
    set(state => {
      if (section) {
        const list = state.sectionQueues[section] || [];
        return {
          sectionQueues: { ...state.sectionQueues, [section]: list.filter(e => e.id !== id) },
        };
      }
      return { globalQueue: state.globalQueue.filter(e => e.id !== id) };
    });
  },

  clearErrors: (section) => {
    set(state => {
      if (section) {
        return { sectionQueues: { ...state.sectionQueues, [section]: [] } };
      }
      return { globalQueue: [], sectionQueues: {} };
    });
  },
}));

export const useGlobalError = () =>
  useErrorStore(state => state.globalQueue[0] || null);

export const useSectionErrors = (section: string) =>
  useErrorStore(state => state.sectionQueues[section] || []);

export const useHasErrorType = (type: string) =>
  useErrorStore(state =>
    state.globalQueue.concat(...Object.values(state.sectionQueues)).some(e => e.type === type),
  );
