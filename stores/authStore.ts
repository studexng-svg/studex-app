import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, saveTokens, clearTokens, getAccessToken } from "@/lib/api";

export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  user_type: string;
  matric_number?: string | null;
  hostel?: string | null;
  business_name?: string | null;
  is_verified_vendor: boolean;
  wallet_balance: string;
  profile_image?: string | null;
  school?: string;
  profile?: {
    vendor_badge?: string;
    rating?: string;
    total_reviews?: number;
    [key: string]: unknown;
  };
}

interface LoginResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface RegisterPayload {
  username: string;
  email: string;
  phone: string;
  password: string;
  password2: string;
  user_type: string;
  hostel: string;
  school: string;
  campus: string;
  matric_number?: string;
  nin?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const token = await getAccessToken();
          if (!token) {
            set({ user: null, isAuthenticated: false, accessToken: null, isLoading: false });
            return;
          }
          set({ accessToken: token });
          try {
            const user = await api.get<User>("/api/auth/profile/");
            set({ user, isAuthenticated: true, isLoading: false });
          } catch (profileErr: any) {
            const msg: string = profileErr?.message ?? "";
            const isAuthFailure =
              msg.includes("Session expired") ||
              msg.includes("401") ||
              msg.includes("credentials");
            if (isAuthFailure) {
              await clearTokens();
              set({ user: null, isAuthenticated: false, accessToken: null, isLoading: false });
            } else {
              // Network error or timeout — keep the user logged in with persisted data
              set({ isAuthenticated: true, isLoading: false });
            }
          }
        } catch {
          await clearTokens();
          set({ user: null, isAuthenticated: false, accessToken: null, isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        try {
          const data = await api.post<LoginResponse>("/api/auth/login/", { email, password });
          await saveTokens(data.tokens.access, data.tokens.refresh);
          set({
            user: data.user,
            accessToken: data.tokens.access,
            isAuthenticated: true,
          });
        } catch (err) {
          throw err;
        }
      },

      register: async (payload: RegisterPayload) => {
        try {
          const data = await api.post<LoginResponse>("/api/auth/register/", payload);
          await saveTokens(data.tokens.access, data.tokens.refresh);
          set({
            user: data.user,
            accessToken: data.tokens.access,
            isAuthenticated: true,
          });
        } catch (err) {
          throw err;
        }
      },

      logout: async () => {
        await clearTokens();
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      },

      updateUser: (partial: Partial<User>) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...partial } });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user
          ? (({ wallet_balance, ...rest }) => rest)(state.user as User & { wallet_balance: string })
          : null,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
