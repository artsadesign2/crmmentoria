'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  UserRole,
  SystemUser,
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  INITIAL_SYSTEM_USERS,
  canDeleteUser as checkCanDelete,
  canEditUserRole as checkCanEditRole,
} from './permissions';

interface AuthContextType {
  currentUser: SystemUser;
  currentRole: UserRole;
  systemUsers: SystemUser[];
  rolePermissions: Record<UserRole, RolePermissions>;
  isMaster: boolean;
  isAdmin: boolean;
  canAccessModule: (moduleName: keyof RolePermissions) => boolean;
  switchUser: (userId: string) => void;
  switchRoleSimulation: (role: UserRole) => void;
  addUser: (user: Omit<SystemUser, 'id'>) => { success: boolean; error?: string };
  updateUser: (userId: string, updates: Partial<SystemUser>) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  toggleRolePermission: (role: UserRole, permissionKey: keyof RolePermissions) => void;
  resetRolePermissions: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionUserId(initialFallback?: string | null): string {
  if (initialFallback && initialFallback.trim()) return initialFallback.trim();
  if (typeof document !== 'undefined') {
    // 1. Check session cookie first (isolated per tab/window mode)
    const match = document.cookie.match(/(?:^|;\s*)rocket_session=([^;]+)/);
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]).trim();
        if (decoded) return decoded;
      } catch {}
    }
    // 2. Check localStorage
    try {
      const fromLocal = localStorage.getItem('rocket_active_user_id');
      if (fromLocal && fromLocal.trim()) return fromLocal.trim();
    } catch {}
  }
  return 'usr-master-1';
}

export function AuthProvider({
  children,
  initialUserId,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  const pathname = usePathname();

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rocket_system_users');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_SYSTEM_USERS;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() =>
    getSessionUserId(initialUserId)
  );

  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissions>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rocket_role_permissions');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_ROLE_PERMISSIONS;
  });

  // Sync state from cookies and storage on mount, pathname changes & storage events
  useEffect(() => {
    const syncUserSession = () => {
      try {
        const savedUsers = localStorage.getItem('rocket_system_users');
        const savedPermissions = localStorage.getItem('rocket_role_permissions');

        let currentUsers = INITIAL_SYSTEM_USERS;
        if (savedUsers) {
          currentUsers = JSON.parse(savedUsers);
          setSystemUsers(currentUsers);
        }

        const sessionUser = getSessionUserId(initialUserId);
        const matched = currentUsers.find(
          (u) =>
            u.id === sessionUser ||
            u.email.toLowerCase() === sessionUser.toLowerCase()
        );

        if (matched) {
          setActiveUserId(matched.id);
          localStorage.setItem('rocket_active_user_id', matched.id);
        } else if (sessionUser) {
          setActiveUserId(sessionUser);
        }

        if (savedPermissions) {
          setRolePermissions(JSON.parse(savedPermissions));
        }
      } catch (e) {}
    };

    syncUserSession();

    // Listen for storage events across tabs
    window.addEventListener('storage', syncUserSession);
    return () => window.removeEventListener('storage', syncUserSession);
  }, [pathname, initialUserId]);

  // Resolve current active user dynamically
  const currentUser: SystemUser = React.useMemo(() => {
    const cleanActiveId = (activeUserId || '').trim().toLowerCase();
    const byId = systemUsers.find(
      (u) =>
        u.id.toLowerCase() === cleanActiveId ||
        u.email.toLowerCase() === cleanActiveId
    );
    if (byId) return byId;

    const initialMatch = INITIAL_SYSTEM_USERS.find(
      (u) =>
        u.id.toLowerCase() === cleanActiveId ||
        u.email.toLowerCase() === cleanActiveId
    );
    if (initialMatch) return initialMatch;

    return (
      systemUsers.find((u) => u.role === 'Master') ||
      systemUsers[0] ||
      INITIAL_SYSTEM_USERS[0]
    );
  }, [systemUsers, activeUserId]);

  const currentRole = currentUser.role;
  const isMaster = currentRole === 'Master';
  const isAdmin = currentRole === 'Administrador' || isMaster;

  const canAccessModule = useCallback(
    (permissionKey: keyof RolePermissions): boolean => {
      if (isMaster) return true; // Master always has full access
      const permissionsForRole = rolePermissions[currentRole];
      if (!permissionsForRole) return false;
      return Boolean(permissionsForRole[permissionKey]);
    },
    [isMaster, rolePermissions, currentRole]
  );

  const switchUser = useCallback(
    (userId: string) => {
      const found = systemUsers.find(
        (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
      );
      if (found) {
        setActiveUserId(found.id);
        document.cookie = `rocket_session=${encodeURIComponent(
          found.id
        )}; path=/; max-age=86400; SameSite=Lax`;
        try {
          localStorage.setItem('rocket_active_user_id', found.id);
        } catch (e) {}
      }
    },
    [systemUsers]
  );

  const switchRoleSimulation = useCallback(
    (role: UserRole) => {
      // Finds existing user with this role or creates temporary simulated user
      const existing = systemUsers.find((u) => u.role === role);
      if (existing) {
        switchUser(existing.id);
      } else {
        const simUser: SystemUser = {
          id: `sim-${role.toLowerCase()}`,
          name: `Usuário ${role} (Simulação)`,
          email: `${role.toLowerCase()}@rocketclub.com.br`,
          role,
          status: 'ATIVO',
          department: 'Simulação de Acesso',
        };
        const updated = [...systemUsers, simUser];
        setSystemUsers(updated);
        setActiveUserId(simUser.id);
        document.cookie = `rocket_session=${encodeURIComponent(
          simUser.id
        )}; path=/; max-age=86400; SameSite=Lax`;
        try {
          localStorage.setItem('rocket_system_users', JSON.stringify(updated));
          localStorage.setItem('rocket_active_user_id', simUser.id);
        } catch (e) {}
      }
    },
    [systemUsers, switchUser]
  );

  const addUser = useCallback(
    (newUser: Omit<SystemUser, 'id'>) => {
      if (!isMaster && currentRole !== 'Administrador') {
        return {
          success: false,
          error: 'Você não tem permissão para cadastrar novos usuários.',
        };
      }

      if (newUser.role === 'Master' && !isMaster) {
        return {
          success: false,
          error: 'Apenas o Comandante Master pode criar outros usuários de nível Master.',
        };
      }

      const created: SystemUser = {
        ...newUser,
        id: `usr-${Date.now()}`,
      };

      const updated = [...systemUsers, created];
      setSystemUsers(updated);
      try {
        localStorage.setItem('rocket_system_users', JSON.stringify(updated));
      } catch (e) {}

      return { success: true };
    },
    [isMaster, currentRole, systemUsers]
  );

  const updateUser = useCallback(
    (userId: string, updates: Partial<SystemUser>) => {
      const target = systemUsers.find((u) => u.id === userId);
      if (!target) return { success: false, error: 'Usuário não encontrado.' };

      if (updates.role && updates.role !== target.role) {
        const check = checkCanEditRole(currentRole, target, updates.role);
        if (!check.allowed) {
          return { success: false, error: check.reason };
        }
      }

      const updated = systemUsers.map((u) => (u.id === userId ? { ...u, ...updates } : u));
      setSystemUsers(updated);
      try {
        localStorage.setItem('rocket_system_users', JSON.stringify(updated));
      } catch (e) {}

      return { success: true };
    },
    [systemUsers, currentRole]
  );

  const deleteUser = useCallback(
    (userId: string) => {
      const target = systemUsers.find((u) => u.id === userId);
      if (!target) return { success: false, error: 'Usuário não encontrado.' };

      const check = checkCanDelete(currentRole, target);
      if (!check.allowed) {
        return { success: false, error: check.reason };
      }

      const updated = systemUsers.filter((u) => u.id !== userId);
      setSystemUsers(updated);

      if (activeUserId === userId) {
        const nextUser = updated.find((u) => u.role === 'Master') || updated[0];
        if (nextUser) {
          setActiveUserId(nextUser.id);
          document.cookie = `rocket_session=${encodeURIComponent(
            nextUser.id
          )}; path=/; max-age=86400; SameSite=Lax`;
          try {
            localStorage.setItem('rocket_active_user_id', nextUser.id);
          } catch (e) {}
        }
      }

      try {
        localStorage.setItem('rocket_system_users', JSON.stringify(updated));
      } catch (e) {}

      return { success: true };
    },
    [systemUsers, currentRole, activeUserId]
  );

  const toggleRolePermission = useCallback(
    (role: UserRole, permissionKey: keyof RolePermissions) => {
      if (!isMaster) {
        return; // Only Master can alter the RBAC permission matrix
      }

      const updated = {
        ...rolePermissions,
        [role]: {
          ...rolePermissions[role],
          [permissionKey]: !rolePermissions[role][permissionKey],
        },
      };

      setRolePermissions(updated);
      try {
        localStorage.setItem('rocket_role_permissions', JSON.stringify(updated));
      } catch (e) {}
    },
    [isMaster, rolePermissions]
  );

  const resetRolePermissions = useCallback(() => {
    if (!isMaster) return;
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    try {
      localStorage.setItem('rocket_role_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
    } catch (e) {}
  }, [isMaster]);

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
