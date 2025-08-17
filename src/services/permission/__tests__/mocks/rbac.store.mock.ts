import { create } from 'zustand';
import { vi } from 'vitest';

interface RBACStoreMockState {
  roles: any[];
  userRoles: any[];
  isLoading: boolean;
  error: any;
  fetchRoles: () => Promise<void>;
  fetchUserRoles: (userId: string) => Promise<void>;
  assignRole: (userId: string, roleId: string) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;
  hasPermission: (permission: any) => boolean;
  hasRole: (role: any) => boolean;
  clearError: () => void;
  [key: string]: any;
}

export function createRBACStoreMock(overrides = {}) {
  // Use Zustand to create a real store instance
  const useRBACStore = create<RBACStoreMockState>((set) => ({
    roles: [],
    userRoles: [],
    isLoading: false,
    error: null,
    fetchRoles: vi.fn(async () => {}),
    fetchUserRoles: vi.fn(async () => {}),
    assignRole: vi.fn(async () => {}),
    removeRole: vi.fn(async () => {}),
    hasPermission: vi.fn(() => false),
    hasRole: vi.fn(() => false),
    clearError: vi.fn(() => { set({ error: null }); }),
    ...overrides,
  }));
  return useRBACStore;
} 