import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthUser, Scope } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  scope: Scope;
  setAuth: (token: string, user: AuthUser) => void;
  setScope: (scope: Scope) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      scope: 'personal',
      setAuth: (token, user) => set({ token, user }),
      setScope: (scope) => set({ scope }),
      logout: () => set({ token: null, user: null, scope: 'personal' })
    }),
    {
      name: 'family-budget-cats-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        scope: state.scope
      })
    }
  )
);
