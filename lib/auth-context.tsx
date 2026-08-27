'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserRole,
  SystemUser,
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions';

/**
 * Estado de autenticação da interface.
 *
 * Antes da F0 isto vivia inteiramente no localStorage: usuários, papéis e
 * sessão eram gravados pelo navegador e o cookie `rocket_session` guardava um
 * id em texto claro, que qualquer pessoa podia forjar no DevTools.
 *
 * Agora tudo vem do servidor. O cookie é httpOnly e assinado, e este provider
 * é apenas um espelho de leitura do que /api/auth/me responde. O contrato
 * público foi preservado para que sidebar, topbar e settings não mudassem.
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
  addUser: (user: Omit<SystemUser, 'id'>) => Promise<ActionResult>;
  updateUser: (userId: string, updates: Partial<SystemUser>) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;
  toggleRolePermission: (role: UserRole, permissionKey: keyof RolePermissions) => Promise<void>;
  resetRolePermissions: () => Promise<void>;
  /** Novos na F0 — não quebram consumidores existentes. */
  isLoading: boolean;
  simulatedBy: string | null;
  logout: () => Promise<void>;
  exitSimulation: () => Promise<ActionResult>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Usuário exibido enquanto /api/auth/me não respondeu. Sem permissão alguma:
 * é melhor a interface aparecer vazia por um instante do que piscar conteúdo
 * que o usuário talvez não possa ver.
 */
const LOADING_USER: SystemUser = {
  id: '',
  name: 'Carregando...',
  email: '',
  role: 'Usuário',
  status: 'ATIVO',
};

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
  const [currentUser, setCurrentUser] = useState<SystemUser>(LOADING_USER);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [rolePermissions, setRolePermissions] =
    useState<Record<UserRole, RolePermissions>>(DEFAULT_ROLE_PERMISSIONS);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [simulatedBy, setSimulatedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok) setSystemUsers(data.users);
    } catch {
      // Silencioso: a lista de usuários só aparece na tela de configurações.
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    try {
      const response = await fetch('/api/role-permissions');
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok) setRolePermissions(data.rolePermissions);
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
      if (data.ok) {
        setCurrentUser(data.user);
        setPermissions(data.permissions);
        setSimulatedBy(data.simulatedBy);
      }
    } catch {
      // Sem sessão utilizável; o middleware já redireciona para /login.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      await Promise.all([loadUsers(), loadMatrix()]);
    })();
  }, [refresh, loadUsers, loadMatrix, initialUserId]);

  const currentRole = currentUser.role;
  const isMaster = currentRole === 'Master';
  const isAdmin = currentRole === 'Administrador' || isMaster;

  const canAccessModule = useCallback(
    (permissionKey: keyof RolePermissions): boolean => {
      if (isLoading) return false;
      if (isMaster) return true;
      // As permissões efetivas vêm do servidor; a matriz local é só para a
      // tela de configurações, e não deve decidir acesso.
      const effective = permissions ?? rolePermissions[currentRole];
      return Boolean(effective?.[permissionKey]);
    },
    [isLoading, isMaster, permissions, rolePermissions, currentRole]
  );

  const switchUser = useCallback(
    async (userId: string) => {
      const result = await postJson('/api/auth/simulate', { userId });
      if (result.success) window.location.reload();
      return result;
    },
    []
  );

  const switchRoleSimulation = useCallback(async (role: UserRole) => {
    const result = await postJson('/api/auth/simulate', { role });
    if (result.success) window.location.reload();
    return result;
  }, []);

  const exitSimulation = useCallback(async () => {
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

      setRolePermissions(next); // otimista: a matriz responde na hora
      const result = await postJson(
        '/api/role-permissions',
        { role, permissions: next[role] },
        'PATCH'
      );
      if (!result.success) {
        setRolePermissions(rolePermissions); // desfaz se o servidor recusou
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
      await refresh();
    }
  }, [isMaster, refresh]);

  const logout = useCallback(async () => {
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
