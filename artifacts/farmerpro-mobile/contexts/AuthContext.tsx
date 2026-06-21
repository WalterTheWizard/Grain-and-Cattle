import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setAuthTokenGetter,
  loginEmployee as apiLoginEmployee,
  logout as apiLogout,
  getMe,
} from "@workspace/api-client-react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const TOKEN_KEY = "farmerpro_session_token";

export interface AuthUser {
  farmId: number;
  farmName: string;
  email: string;
  role: "owner" | "employer" | "employee";
  employeeId: number | null;
  employeeName: string | null;
  farmType: "cattle" | "grain" | "both" | null;
  authMode: "employee" | "clerk";
}

interface AuthContextValue {
  me: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsEmployee: (farmEmail: string, username: string, password: string) => Promise<void>;
  loginAsOwnerWithClerk: (clerkGetToken: () => Promise<string | null>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let _employeeToken: string | null = null;
let _authMode: "employee" | "clerk" | null = null;

// Stable indirection so _clerkGetTokenRef.current is always up-to-date.
const _clerkGetTokenRef: { current: (() => Promise<string | null>) | null } = { current: null };

setAuthTokenGetter(async () => {
  if (_employeeToken) return _employeeToken;
  if (_clerkGetTokenRef.current) return _clerkGetTokenRef.current();
  return null;
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isSignedIn, isLoaded: clerkIsLoaded, getToken: clerkGetToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  // Keep the ref always pointing at the latest getToken from Clerk.
  // This means _clerkGetTokenRef.current stays fresh even after token refresh.
  const clerkGetTokenStable = useRef(clerkGetToken);
  useEffect(() => {
    clerkGetTokenStable.current = clerkGetToken;
  }, [clerkGetToken]);

  // On mount (once Clerk has initialised), restore auth state.
  useEffect(() => {
    if (!clerkIsLoaded) return; // wait for Clerk to finish hydrating

    let cancelled = false;
    async function restore() {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          // Employee token present – use it.
          _employeeToken = stored;
          _clerkGetTokenRef.current = null;
          _authMode = "employee";
          const data = await getMe();
          if (!cancelled) {
            setMe({
              farmId: data.farmId,
              farmName: data.farmName,
              email: data.email,
              role: data.role as AuthUser["role"],
              employeeId: data.employeeId ?? null,
              employeeName: data.employeeName ?? null,
              farmType: (data.farmType as AuthUser["farmType"]) ?? null,
              authMode: "employee",
            });
          }
        } else if (isSignedIn) {
          // Clerk owner session already active – restore it.
          _employeeToken = null;
          _clerkGetTokenRef.current = () => clerkGetTokenStable.current();
          _authMode = "clerk";
          const data = await getMe();
          if (!cancelled) {
            setMe({
              farmId: data.farmId,
              farmName: data.farmName,
              email: data.email,
              role: data.role as AuthUser["role"],
              employeeId: data.employeeId ?? null,
              employeeName: data.employeeName ?? null,
              farmType: (data.farmType as AuthUser["farmType"]) ?? null,
              authMode: "clerk",
            });
          }
        }
      } catch {
        if (!cancelled) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          _employeeToken = null;
          _clerkGetTokenRef.current = null;
          _authMode = null;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkIsLoaded]); // Only run once when Clerk finishes loading

  const loginAsEmployee = useCallback(
    async (farmEmail: string, username: string, password: string) => {
      const data = await apiLoginEmployee({ farmEmail, username, password });
      const token = (data as typeof data & { token?: string | null }).token ?? null;
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        _employeeToken = token;
        _clerkGetTokenRef.current = null;
        _authMode = "employee";
      }
      setMe({
        farmId: data.farmId,
        farmName: data.farmName,
        email: data.email,
        role: data.role as AuthUser["role"],
        employeeId: data.employeeId ?? null,
        employeeName: data.employeeName ?? null,
        farmType: (data.farmType as AuthUser["farmType"]) ?? null,
        authMode: "employee",
      });
    },
    []
  );

  const loginAsOwnerWithClerk = useCallback(
    async (clerkGetTokenParam: () => Promise<string | null>) => {
      _employeeToken = null;
      _clerkGetTokenRef.current = clerkGetTokenParam;
      _authMode = "clerk";
      await AsyncStorage.removeItem(TOKEN_KEY);
      // Also update stable ref so the indirection stays fresh.
      clerkGetTokenStable.current = clerkGetToken;
      const data = await getMe();
      setMe({
        farmId: data.farmId,
        farmName: data.farmName,
        email: data.email,
        role: data.role as AuthUser["role"],
        employeeId: data.employeeId ?? null,
        employeeName: data.employeeName ?? null,
        farmType: (data.farmType as AuthUser["farmType"]) ?? null,
        authMode: "clerk",
      });
    },
    [clerkGetToken]
  );

  const logout = useCallback(async () => {
    try {
      if (_authMode === "employee") {
        await apiLogout();
      } else if (_authMode === "clerk") {
        await clerkSignOut();
      }
    } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
    _employeeToken = null;
    _clerkGetTokenRef.current = null;
    _authMode = null;
    setMe(null);
  }, [clerkSignOut]);

  const value = useMemo(
    () => ({
      me,
      isAuthenticated: !!me,
      isLoading,
      loginAsEmployee,
      loginAsOwnerWithClerk,
      logout,
    }),
    [me, isLoading, loginAsEmployee, loginAsOwnerWithClerk, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
