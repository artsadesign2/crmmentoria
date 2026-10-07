'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserRole,
  SystemUser,
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions';

/**
 * Estado de autenticação da interface com Stale-While-Revalidate.
 *
 * Utiliza cache local síncrono para renderização instantânea (0ms de bloqueio visual)
 * e revalidação não-bloqueante em background através do endpoint /api/auth/me.
 */

type ActionResult = { success: boolean; error?: string };

interface AuthContextType {
  currentUser: SystemUser;
  currentRole: UserRole;
  systemUsers: SystemUser[];
  rolePermissions: Record<UserRole, RolePermissions>;
  isMaster: boolean;
  isAdmin: boolean;
  canAccessModule: (moduleName: keyof RolePermissions) => boolean;
  switchUser: (userId: string) => Promise<ActionResult>;
  switchRoleSimulation: (role: UserRole) => Promise<ActionResult>;
  switchMenteeSimulation: (memberId?: string) => Promise<ActionResult>;
  addUser: (user: Omit<SystemUser, 'id'>) => Promise<ActionResult>;
  updateUser: (userId: string, updates: Partial<SystemUser>) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;
  toggleRolePermission: (role: UserRole, permissionKey: keyof RolePermissions) => Promise<void>;
  resetRolePermissions: () => Promise<void>;
  isLoading: boolean;
  simulatedBy: string | null;
  logout: () => Promise<void>;
  exitSimulation: () => Promise<ActionResult>;
  refresh: () => Promise<void>;
  loadUsers: () => Promise<void>;
  loadMatrix: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY_USER = 'rocket_auth_cached_user';
const CACHE_KEY_PERMS = 'rocket_auth_cached_perms';
const CACHE_KEY_MATRIX = 'rocket_auth_cached_matrix';

const DEFAULT_USER: SystemUser = {
  id: 'usr_master_default',
  name: 'Admin Master',
  email: 'admin@rocketclub.com',
  role: 'Master',
  status: 'ATIVO',
};

function getCachedUser(): SystemUser {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.role) return parsed;
      }
    } catch {}
  }
  return DEFAULT_USER;
}

function getCachedPermissions(): RolePermissions | null {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PERMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return DEFAULT_ROLE_PERMISSIONS['Master'];
}

function getCachedMatrix(): Record<UserRole, RolePermissions> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY_MATRIX);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

async function postJson(url: string, body?: unknown, method = 'POST'): Promise<ActionResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      return { success: false, error: data.error ?? 'Não foi possível concluir a operação.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Falha de conexão com o servidor.' };
  }
}

export function AuthProvider({
  children,
  initialUserId,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  const [currentUser, setCurrentUser] = useState<SystemUser>(getCachedUser);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [rolePermissions, setRolePermissions] =
    useState<Record<UserRole, RolePermissions>>(getCachedMatrix);
  const [permissions, setPermissions] = useState<RolePermissions | null>(getCachedPermissions);
  const [simulatedBy, setSimulatedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok && Array.isArray(data.users)) setSystemUsers(data.users);
    } catch {
      // Silencioso: a lista de usuários só aparece na tela de configurações.
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    try {
      const response = await fetch('/api/role-permissions');
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok && data.rolePermissions) {
        setRolePermissions(data.rolePermissions);
        try {
          localStorage.setItem(CACHE_KEY_MATRIX, JSON.stringify(data.rolePermissions));
        } catch {}
      }
    } catch {
      // Mantém DEFAULT_ROLE_PERMISSIONS.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      if (data.ok && data.user) {
        setCurrentUser(data.user);
        setPermissions(data.permissions);
        setSimulatedBy(data.simulatedBy || null);
        try {
          localStorage.setItem(CACHE_KEY_USER, JSON.stringify(data.user));
          if (data.permissions) {
            localStorage.setItem(CACHE_KEY_PERMS, JSON.stringify(data.permissions));
          }
        } catch {}
      }
    } catch {
      // Sem sessão utilizável
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // SWR não-bloqueante: sincroniza usuário em background sem travar UI
    void refresh();
  }, [refresh, initialUserId]);

  const currentRole = currentUser.role || 'Master';
  const isMaster = currentRole === 'Master';
  const isAdmin = currentRole === 'Administrador' || isMaster;

  const canAccessModule = useCallback(
    (permissionKey: keyof RolePermissions): boolean => {
      if (isMaster) return true;
      const effective = permissions ?? rolePermissions[currentRole] ?? DEFAULT_ROLE_PERMISSIONS[currentRole];
      return Boolean(effective?.[permissionKey] ?? true);
    },
    [isMaster, permissions, rolePermissions, currentRole]
  );

  const switchUser = useCallback(
    async (userId: string) => {
      try {
        localStorage.removeItem(CACHE_KEY_USER);
        localStorage.removeItem(CACHE_KEY_PERMS);
      } catch {}
      const result = await postJson('/api/auth/simulate', { userId });
      if (result.success) window.location.reload();
      return result;
    },
    []
  );

  const switchRoleSimulation = useCallback(async (role: UserRole) => {
    try {
      localStorage.removeItem(CACHE_KEY_USER);
      localStorage.removeItem(CACHE_KEY_PERMS);
    } catch {}
    const result = await postJson('/api/auth/simulate', { role });
    if (result.success) window.location.reload();
    return result;
  }, []);

  const switchMenteeSimulation = useCallback(async (memberId?: string) => {
    try {
      localStorage.removeItem(CACHE_KEY_USER);
      localStorage.removeItem(CACHE_KEY_PERMS);
    } catch {}
    const payload = memberId ? { memberId } : { role: 'Cliente' as UserRole };
    const result = await postJson('/api/auth/simulate', payload);
    if (result.success) {
      window.location.href = '/portal';
    }
    return result;
  }, []);

  const exitSimulation = useCallback(async () => {
    try {
      localStorage.removeItem(CACHE_KEY_USER);
      localStorage.removeItem(CACHE_KEY_PERMS);
    } catch {}
    const result = await postJson('/api/auth/simulate', undefined, 'DELETE');
    if (result.success) window.location.reload();
    return result;
  }, []);

  const addUser = useCallback(
    async (newUser: Omit<SystemUser, 'id'>) => {
      const result = await postJson('/api/users', {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone,
      });
      if (result.success) await loadUsers();
      return result;
    },
    [loadUsers]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<SystemUser>) => {
      const result = await postJson(`/api/users/${userId}`, updates, 'PATCH');
      if (result.success) {
        await loadUsers();
        if (userId === currentUser.id) await refresh();
      }
      return result;
    },
    [loadUsers, refresh, currentUser.id]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      const result = await postJson(`/api/users/${userId}`, undefined, 'DELETE');
      if (result.success) await loadUsers();
      return result;
    },
    [loadUsers]
  );

  const toggleRolePermission = useCallback(
    async (role: UserRole, permissionKey: keyof RolePermissions) => {
      if (!isMaster) return;

      const next = {
        ...rolePermissions,
        [role]: {
          ...rolePermissions[role],
          [permissionKey]: !rolePermissions[role][permissionKey],
        },
      };

      setRolePermissions(next);
      try {
        localStorage.setItem(CACHE_KEY_MATRIX, JSON.stringify(next));
      } catch {}

      const result = await postJson(
        '/api/role-permissions',
        { role, permissions: next[role] },
        'PATCH'
      );
      if (!result.success) {
        setRolePermissions(rolePermissions);
        return;
      }
      if (role === currentRole) await refresh();
    },
    [isMaster, rolePermissions, currentRole, refresh]
  );

  const resetRolePermissions = useCallback(async () => {
    if (!isMaster) return;
    const result = await postJson('/api/role-permissions', undefined, 'DELETE');
    if (result.success) {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      try {
        localStorage.setItem(CACHE_KEY_MATRIX, JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
      } catch {}
      await refresh();
    }
  }, [isMaster, refresh]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(CACHE_KEY_USER);
      localStorage.removeItem(CACHE_KEY_PERMS);
      localStorage.removeItem(CACHE_KEY_MATRIX);
    } catch {}
    await postJson('/api/auth/logout');
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        systemUsers,
        rolePermissions,
        isMaster,
        isAdmin,
        canAccessModule,
        switchUser,
        switchRoleSimulation,
        switchMenteeSimulation,
        addUser,
        updateUser,
        deleteUser,
        toggleRolePermission,
        resetRolePermissions,
        isLoading,
        simulatedBy,
        logout,
        exitSimulation,
        refresh,
        loadUsers,
        loadMatrix,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

