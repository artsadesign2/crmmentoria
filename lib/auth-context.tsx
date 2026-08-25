'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);
  const [activeUserId, setActiveUserId] = useState<string>('usr-master-1');
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // Load persistent state from localStorage on mount
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('rocket_system_users');
      const savedActiveUser = localStorage.getItem('rocket_active_user_id');
      const savedPermissions = localStorage.getItem('rocket_role_permissions');

      if (savedUsers) {
        setSystemUsers(JSON.parse(savedUsers));
      }
      if (savedActiveUser) {
        setActiveUserId(savedActiveUser);
      }
      if (savedPermissions) {
        setRolePermissions(JSON.parse(savedPermissions));
      }
    } catch (e) {}
  }, []);

  const currentUser =
    systemUsers.find((u) => u.id === activeUserId) ||
    systemUsers.find((u) => u.role === 'Master') ||
    systemUsers[0] ||
    INITIAL_SYSTEM_USERS[0];

  const currentRole = currentUser.role;
  const isMaster = currentRole === 'Master';
  const isAdmin = currentRole === 'Administrador' || isMaster;

  const canAccessModule = (permissionKey: keyof RolePermissions): boolean => {
    if (isMaster) return true; // Master always has full access
    const permissionsForRole = rolePermissions[currentRole];
    if (!permissionsForRole) return false;
    return Boolean(permissionsForRole[permissionKey]);
  };

  const switchUser = (userId: string) => {
    const found = systemUsers.find((u) => u.id === userId);
    if (found) {
      setActiveUserId(found.id);
      try {
        localStorage.setItem('rocket_active_user_id', found.id);
      } catch (e) {}
    }
  };

  const switchRoleSimulation = (role: UserRole) => {
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
      try {
        localStorage.setItem('rocket_system_users', JSON.stringify(updated));
        localStorage.setItem('rocket_active_user_id', simUser.id);
      } catch (e) {}
    }
  };

  const addUser = (newUser: Omit<SystemUser, 'id'>) => {
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
  };

  const updateUser = (userId: string, updates: Partial<SystemUser>) => {
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
  };

  const deleteUser = (userId: string) => {
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
        try {
          localStorage.setItem('rocket_active_user_id', nextUser.id);
        } catch (e) {}
      }
    }

    try {
      localStorage.setItem('rocket_system_users', JSON.stringify(updated));
    } catch (e) {}

    return { success: true };
  };

  const toggleRolePermission = (role: UserRole, permissionKey: keyof RolePermissions) => {
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
  };

  const resetRolePermissions = () => {
    if (!isMaster) return;
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    try {
      localStorage.setItem('rocket_role_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
    } catch (e) {}
  };

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
