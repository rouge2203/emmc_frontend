import { createContext, useState } from "react";
import type { ReactNode } from "react";

// User interface matching backend response
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  phone: string | null;
  cedula: string | null;
  role: string | null;
  groups: any[];
  user_permissions: any[];
}

// Auth state structure
export interface AuthState {
  access: string;
  user: User;
}

// Context type definition
interface AuthContextType {
  auth: AuthState | null;
  setAuth: (
    auth: AuthState | null | ((prev: AuthState | null) => AuthState | null)
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [auth, setAuth] = useState<AuthState | null>(null);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
