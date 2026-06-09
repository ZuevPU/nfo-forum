import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthStatus, UserDto, VkUserInfo } from '../types/auth';
import type { Track } from '../constants/tracks';

interface AuthContextValue {
  status: AuthStatus;
  user: UserDto | null;
  vkUserInfo: VkUserInfo | null;
  error: string | null;
  registerUser: (track: Track) => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
