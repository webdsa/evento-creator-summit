'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { AdminRole } from './admin-roles';

export type { AdminRole };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** true = must change password before using app; false = ok; null = not loaded yet */
  mustChangePassword: boolean | null;
  /** 'admin' | 'checkin' | 'secretaria' | null (null = not loaded or not staff) */
  role: AdminRole | null;
  /** Instituição vinculada (perfil secretaria). */
  institutionId: string | null;
  quotaExceeded: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error?: string }>;
  refreshAdminStatus: () => Promise<{
    mustChangePassword: boolean;
    role: AdminRole;
    institutionId: string | null;
  } | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAdminMe(
  token: string
): Promise<{
  ok: boolean;
  quotaExceeded?: boolean;
  mustChangePassword?: boolean;
  role?: AdminRole;
  institution_id?: string | null;
}> {
  const res = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 503) return { ok: false, quotaExceeded: true };
  if (!res.ok) return { ok: false };
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const router = useRouter();

  const refreshAdminStatus = async () => {
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminMe(token);
      if (data.quotaExceeded) {
        return null;
      }
      if (!data.ok) {
        setMustChangePassword(false);
        setRole(null);
        setInstitutionId(null);
        return null;
      }
      const m = data.mustChangePassword ?? false;
      const r = data.role ?? 'admin';
      const inst = data.institution_id ?? null;
      setMustChangePassword(m);
      setRole(r);
      setInstitutionId(inst);
      return { mustChangePassword: m, role: r, institutionId: inst };
    } catch {
      setMustChangePassword(false);
      setRole(null);
      setInstitutionId(null);
      return null;
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      setMustChangePassword(u ? null : null);
      setRole(u ? null : null);
      setInstitutionId(u ? null : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let quotaRetries = 0;
    const load = async (forceRefresh = false) => {
      try {
        const token = await user.getIdToken(forceRefresh);
        if (cancelled) return;
        const data = await fetchAdminMe(token);
        if (cancelled || !data) return;
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
          if (quotaRetries < 2) {
            quotaRetries += 1;
            window.setTimeout(() => {
              if (!cancelled) void load(true);
            }, 4000);
          }
          return;
        }
        setQuotaExceeded(false);
        if (!data.ok) {
          setMustChangePassword(false);
          setRole(null);
          setInstitutionId(null);
          return;
        }
        setMustChangePassword(data.mustChangePassword ?? false);
        setRole(data.role ?? 'admin');
        setInstitutionId(data.institution_id ?? null);
        if (!forceRefresh) {
          void user.getIdToken(true);
        }
      } catch {
        if (!cancelled) {
          setMustChangePassword(false);
          setRole(null);
          setInstitutionId(null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const auth = getFirebaseAuth();
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 503) {
        setQuotaExceeded(true);
        return { error: 'quota_exceeded' };
      }
      if (!res.ok) {
        await firebaseSignOut(auth);
        return { error: 'Unauthorized' };
      }
      setUser(firebaseUser);
      // Não navegar aqui: a página de login redireciona quando user estiver no estado (evita race)
      return {};
    } catch (error) {
      return { error: (error as Error).message };
    }
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    setUser(null);
    router.push('/admin/login');
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ error?: string }> => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      return { error: 'auth/user-not-found' };
    }
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      return {};
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      return { error: code || (err as Error).message };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    mustChangePassword,
    role,
    institutionId,
    quotaExceeded,
    signIn,
    signOut,
    getIdToken,
    changePassword,
    refreshAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
