export type UserRole = 'Master' | 'Administrador' | 'Editor' | 'Cliente' | 'Usuário';

export interface RoleHierarchy {
  role: UserRole;
  rank: number; // 5: Master (highest), 4: Admin, 3: Editor, 2: Cliente, 1: Usuário
  badge: string;
  description: string;
  color: string;
}

export const ROLE_HIERARCHIES: Record<UserRole, RoleHierarchy> = {
  Master: {
    role: 'Master',
    rank: 5,
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    description: 'Acesso total irrestrito a todos os módulos, financeiro, banco de dados e gestão de permissões.',
    color: '#EAB308',
  },
  Administrador: {
    role: 'Administrador',
    rank: 4,
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Acesso administrativo completo aos módulos operacionais. Não pode excluir nem alterar contas Master.',
    color: '#3B82F6',
  },
  Editor: {
    role: 'Editor',
    rank: 3,
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Gestão de conteúdos, cursos da Academy, Wiki e acompanhamento operacional do CRM e mentorados.',
    color: '#A855F7',
  },
  Cliente: {
    role: 'Cliente',
    rank: 2,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Acesso do mentorado/aluno aos conteúdos exclusivos da Academy, eventos, comunidade e materiais.',
    color: '#10B981',
  },
  Usuário: {
    role: 'Usuário',
    rank: 1,
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    description: 'Membro básico ou visitante com visualização restrita de conteúdos públicos e introduções.',
    color: '#64748B',
  },
};

export interface ModulePermission {
  id: string;
  name: string;
  description: string;
  section: 'Geral' | 'Comercial' | 'Conteúdo' | 'Gestão' | 'Sistema';
}

export interface RolePermissions {
  // Dashboard
  viewDashboard: boolean;
  exportDashboardReports: boolean;

  // CRM
  viewCRM: boolean;
  createLeads: boolean;
  editLeads: boolean;
  deleteLeads: boolean;
  exportCRM: boolean;

  // Mentorados
  viewMembers: boolean;
  createMembers: boolean;
  editMembers: boolean;
  deleteMembers: boolean;
  exportMembersPDF: boolean;

  // Kanban
  viewKanban: boolean;
  moveKanbanCards: boolean;

  // Academy
  viewAcademy: boolean;
  createCourses: boolean;
  editCourses: boolean;
  deleteCourses: boolean;
  commentLessons: boolean;

  // Wiki
  viewWiki: boolean;
  createArticles: boolean;
  editArticles: boolean;
  deleteArticles: boolean;
  manageDepartments: boolean;

  // Financial
  viewFinancial: boolean;
  createTransactions: boolean;
  editTransactions: boolean;
  deleteTransactions: boolean;
  exportFinancial: boolean;

  // Events
  viewEvents: boolean;
  rsvpEvents: boolean;
  createEvents: boolean;
  manageAttendees: boolean;
  deleteEvents: boolean;

  // Settings & System
  viewSettings: boolean;
  manageWhitelabel: boolean;
  managePermissionsMatrix: boolean;
  manageDesignSystem: boolean;
  manageUsers: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  Master: {
    viewDashboard: true,
    exportDashboardReports: true,
    viewCRM: true,
    createLeads: true,
    editLeads: true,
    deleteLeads: true,
    exportCRM: true,
    viewMembers: true,
    createMembers: true,
    editMembers: true,
    deleteMembers: true,
    exportMembersPDF: true,
    viewKanban: true,
    moveKanbanCards: true,
    viewAcademy: true,
    createCourses: true,
    editCourses: true,
    deleteCourses: true,
    commentLessons: true,
    viewWiki: true,
    createArticles: true,
    editArticles: true,
    deleteArticles: true,
    manageDepartments: true,
    viewFinancial: true,
    createTransactions: true,
    editTransactions: true,
    deleteTransactions: true,
    exportFinancial: true,
    viewEvents: true,
    rsvpEvents: true,
    createEvents: true,
    manageAttendees: true,
    deleteEvents: true,
    viewSettings: true,
    manageWhitelabel: true,
    managePermissionsMatrix: true,
    manageDesignSystem: true,
    manageUsers: true,
  },

  Administrador: {
    viewDashboard: true,
    exportDashboardReports: true,
    viewCRM: true,
    createLeads: true,
    editLeads: true,
    deleteLeads: true,
    exportCRM: true,
    viewMembers: true,
    createMembers: true,
    editMembers: true,
    deleteMembers: true,
    exportMembersPDF: true,
    viewKanban: true,
    moveKanbanCards: true,
    viewAcademy: true,
    createCourses: true,
    editCourses: true,
    deleteCourses: true,
    commentLessons: true,
    viewWiki: true,
    createArticles: true,
    editArticles: true,
    deleteArticles: true,
    manageDepartments: true,
    viewFinancial: true,
    createTransactions: true,
    editTransactions: true,
    deleteTransactions: false,
    exportFinancial: true,
    viewEvents: true,
    rsvpEvents: true,
    createEvents: true,
    manageAttendees: true,
    deleteEvents: true,
    viewSettings: true,
    manageWhitelabel: true,
    managePermissionsMatrix: false, // Only Master can change the matrix
    manageDesignSystem: true,
    manageUsers: true, // Cannot delete Master users (enforced by hierarchy check)
  },

  Editor: {
    viewDashboard: true,
    exportDashboardReports: false,
    viewCRM: true,
    createLeads: true,
    editLeads: true,
    deleteLeads: false,
    exportCRM: false,
    viewMembers: true,
    createMembers: false,
    editMembers: true,
    deleteMembers: false,
    exportMembersPDF: true,
    viewKanban: true,
    moveKanbanCards: true,
    viewAcademy: true,
    createCourses: true,
    editCourses: true,
    deleteCourses: false,
    commentLessons: true,
    viewWiki: true,
    createArticles: true,
    editArticles: true,
    deleteArticles: false,
    manageDepartments: false,
    viewFinancial: false,
    createTransactions: false,
    editTransactions: false,
    deleteTransactions: false,
    exportFinancial: false,
    viewEvents: true,
    rsvpEvents: true,
    createEvents: false,
    manageAttendees: true,
    deleteEvents: false,
    viewSettings: false,
    manageWhitelabel: false,
    managePermissionsMatrix: false,
    manageDesignSystem: false,
    manageUsers: false,
  },

  Cliente: {
    viewDashboard: true,
    exportDashboardReports: false,
    viewCRM: false,
    createLeads: false,
    editLeads: false,
    deleteLeads: false,
    exportCRM: false,
    viewMembers: true, // Can view fellow mentees / networking
    createMembers: false,
    editMembers: false,
    deleteMembers: false,
    exportMembersPDF: false,
    viewKanban: false,
    moveKanbanCards: false,
    viewAcademy: true,
    createCourses: false,
    editCourses: false,
    deleteCourses: false,
    commentLessons: true,
    viewWiki: true,
    createArticles: false,
    editArticles: false,
    deleteArticles: false,
    manageDepartments: false,
    viewFinancial: false,
    createTransactions: false,
    editTransactions: false,
    deleteTransactions: false,
    exportFinancial: false,
    viewEvents: true,
    rsvpEvents: true,
    createEvents: false,
    manageAttendees: false,
    deleteEvents: false,
    viewSettings: false,
    manageWhitelabel: false,
    managePermissionsMatrix: false,
    manageDesignSystem: false,
    manageUsers: false,
  },

  Usuário: {
    viewDashboard: true,
    exportDashboardReports: false,
    viewCRM: false,
    createLeads: false,
    editLeads: false,
    deleteLeads: false,
    exportCRM: false,
    viewMembers: false,
    createMembers: false,
    editMembers: false,
    deleteMembers: false,
    exportMembersPDF: false,
    viewKanban: false,
    moveKanbanCards: false,
    viewAcademy: true, // Free modules only
    createCourses: false,
    editCourses: false,
    deleteCourses: false,
    commentLessons: true,
    viewWiki: true,
    createArticles: false,
    editArticles: false,
    deleteArticles: false,
    manageDepartments: false,
    viewFinancial: false,
    createTransactions: false,
    editTransactions: false,
    deleteTransactions: false,
    exportFinancial: false,
    viewEvents: true,
    rsvpEvents: false,
    createEvents: false,
    manageAttendees: false,
    deleteEvents: false,
    viewSettings: false,
    manageWhitelabel: false,
    managePermissionsMatrix: false,
    manageDesignSystem: false,
    manageUsers: false,
  },
};

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  lastActive?: string;
  department?: string;
  isPrimaryMaster?: boolean;
}

export const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: 'usr-master-1',
    name: 'Comandante Master',
    email: 'master@rocketclub.com.br',
    phone: '(11) 98888-9999',
    role: 'Master',
    status: 'ATIVO',
    lastActive: 'Agora mesmo',
    department: 'Diretoria Executiva',
    isPrimaryMaster: true,
  },
  {
    id: 'usr-admin-1',
    name: 'Henrique Faria (Admin)',
    email: 'henrique.admin@rocketclub.com.br',
    phone: '(11) 97777-6655',
    role: 'Administrador',
    status: 'ATIVO',
    lastActive: 'Há 12 minutos',
    department: 'Operações & Gestão',
  },
  {
    id: 'usr-editor-1',
    name: 'Fernanda Lima (Editora)',
    email: 'fernanda.conteudo@rocketclub.com.br',
    phone: '(21) 99665-4433',
    role: 'Editor',
    status: 'ATIVO',
    lastActive: 'Há 1 hora',
    department: 'Academy & Wiki',
  },
  {
    id: 'usr-cliente-1',
    name: 'Carlos Eduardo Silva (Mentorado VIP)',
    email: 'carlos@silvagroup.com.br',
    phone: '(11) 98765-4321',
    role: 'Cliente',
    status: 'ATIVO',
    lastActive: 'Há 2 dias',
    department: 'Membros Rocket Club',
  },
  {
    id: 'usr-user-1',
    name: 'Rodrigo Alcantara (Visitante)',
    email: 'rodrigo.trial@gmail.com',
    phone: '(31) 98444-3322',
    role: 'Usuário',
    status: 'ATIVO',
    lastActive: 'Há 5 dias',
    department: 'Membro Gratuito',
  },
];

/**
 * Hierarchy & Deletion Rule Checker:
 * - Master can delete any user except cannot delete the primary/last Master.
 * - Administrador can only delete equal or lower ranks (Administrador, Editor, Cliente, Usuário).
 * - Administrador CANNOT delete or modify Master users.
 * - Lower roles (Editor, Cliente, Usuário) cannot delete any users.
 */
export function canDeleteUser(
  currentUserRole: UserRole,
  targetUser: SystemUser
): { allowed: boolean; reason?: string } {
  const currentRank = ROLE_HIERARCHIES[currentUserRole]?.rank ?? 1;
  const targetRank = ROLE_HIERARCHIES[targetUser.role]?.rank ?? 1;

  if (targetUser.isPrimaryMaster) {
    return {
      allowed: false,
      reason: 'O Comandante Master Primário do sistema não pode ser excluído.',
    };
  }

  if (currentUserRole === 'Master') {
    return { allowed: true };
  }

  if (currentUserRole === 'Administrador') {
    if (targetUser.role === 'Master') {
      return {
        allowed: false,
        reason: 'Usuários Administradores não possuem permissão hierárquica para excluir contas de nível Master.',
      };
    }
    if (currentRank >= targetRank) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Usuários com cargo ${currentUserRole} não possuem permissão para gerenciar ou excluir outros usuários.`,
  };
}

/**
 * Check if the active role can edit another user's role:
 */
export function canEditUserRole(
  currentUserRole: UserRole,
  targetUser: SystemUser,
  newRole: UserRole
): { allowed: boolean; reason?: string } {
  if (targetUser.isPrimaryMaster && targetUser.role === 'Master' && newRole !== 'Master') {
    return {
      allowed: false,
      reason: 'Não é permitido rebaixar o cargo do Comandante Master Primário.',
    };
  }

  if (currentUserRole === 'Master') {
    return { allowed: true };
  }

  if (currentUserRole === 'Administrador') {
    if (targetUser.role === 'Master' || newRole === 'Master') {
      return {
        allowed: false,
        reason: 'Somente o Comandante Master pode atribuir ou alterar cargos de nível Master.',
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Você não possui privilégios para alterar cargos de usuários.',
  };
}
