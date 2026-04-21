import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clearAuthTokens } from "@/lib/authStorage";

const ZUSTAND_AUTH_KEY = "staymap-auth-user";

if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem(ZUSTAND_AUTH_KEY) && sessionStorage.getItem(ZUSTAND_AUTH_KEY)) {
      localStorage.setItem(ZUSTAND_AUTH_KEY, sessionStorage.getItem(ZUSTAND_AUTH_KEY)!);
      sessionStorage.removeItem(ZUSTAND_AUTH_KEY);
    }
  } catch {
    /* ignore */
  }
}

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_host?: boolean;
  is_admin?: boolean;
  roles?: string[];
};

type AuthState = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => {
        clearAuthTokens();
        set({ user: null });
      },
    }),
    {
      name: ZUSTAND_AUTH_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
    }
  )
);
