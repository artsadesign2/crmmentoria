'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Palette,
  Sliders,
  CreditCard,
  Building,
  CheckCircle2,
  Lock,
  Sparkles,
  Save,
  Check,
  Users,
  Building2,
  FileSpreadsheet,
  Upload,
  Target,
  Plus,
  Trash2,
  Layers,
  Key,
  Globe,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Image as ImageIcon,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Edit2,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  MessageCircle,
  Send,
  QrCode,
  Copy,
  ExternalLink,
  Power,
  Wifi,
  WifiOff,
  Trash,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { toast } from '@/lib/toast-context';
import {
  DEFAULT_TENANT,
  DEFAULT_ACCESS_LEVELS,
  AccessLevel,
  CompanyData,
  FeatureFlags,
} from '@/lib/tenant';
import { maskCnpj, maskPhone } from '@/lib/masks';
import { useTheme, COLOR_PALETTES, PaletteId, DEFAULT_PALETTE_ID } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import {
  UserRole,
  SystemUser,
  RolePermissions,
  ROLE_HIERARCHIES,
  canDeleteUser,
} from '@/lib/permissions';
import {
  getEvolutionConfig,
  saveEvolutionConfig,
  checkEvolutionConnection,
  fetchEvolutionQRCode,
  sendEvolutionWhatsAppMessage,
  logoutEvolutionInstance,
  EvolutionApiConfig,
  EvolutionConnectionState,
  EvolutionQRCodeResponse,
} from '@/lib/evolution-api';
import {
  getAllWhatsAppTemplates,
  saveWhatsAppTemplate,
  deleteWhatsAppTemplate,
  resetWhatsAppTemplatesToDefault,
  WhatsAppCustomTemplate,
  INITIAL_DEFAULT_TEMPLATES,
  interpolateWhatsAppTemplate,
} from '@/lib/whatsapp-automations';

export default function SettingsPage() {
  const { activePaletteId, activePalette, isLightMode, setPalette, resetToDefault: resetTheme } =
    useTheme();
  const {
    currentUser,
    currentRole,
    systemUsers,
    rolePermissions,
    isMaster,
    isAdmin,
    switchUser,
    switchRoleSimulation,
    addUser,
    updateUser,
    deleteUser,
    toggleRolePermission,
    resetRolePermissions,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'design' | 'permissions' | 'users' | 'whatsapp' | 'company' | 'levels' | 'system' | 'depts' | 'csv' | 'saas'
  >('design');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Company / Whitelabel State
  const [company, setCompany] = useState<CompanyData>(DEFAULT_TENANT.company);
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_TENANT.company.logoUrl || '');
  const [iconUrl, setIconUrl] = useState<string>(DEFAULT_TENANT.company.iconUrl || '');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_TENANT.primaryColor);

  // Access Levels State
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(DEFAULT_ACCESS_LEVELS);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(DEFAULT_ACCESS_LEVELS[0].id);
  const [isCreatingLevel, setIsCreatingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelDesc, setNewLevelDesc] = useState('');

  // Selected Role for Permission Matrix Tab
  const [matrixRole, setMatrixRole] = useState<UserRole>('Master');

  // User Management Modals State
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUserTarget, setDeletingUserTarget] = useState<SystemUser | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<UserRole>('Administrador');
  const [newUserDept, setNewUserDept] = useState('Operacional');
  const [userActionError, setUserActionError] = useState<string | null>(null);

  // Edit User Form State
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [showEditingUserPassword, setShowEditingUserPassword] = useState(false);

  // 5 Pillars
  const [pillars, setPillars] = useState([
    'Saúde & Vitalidade',
    'Negócios & Escala',
    'Família & Relacionamentos',
    'Finanças & Patrimônio',
    'Espiritualidade & Propósito',
  ]);

  // Departments List
  const [departments, setDepartments] = useState([
    { id: 'd1', name: 'Diretoria Executiva', fixed: true },
    { id: 'd2', name: 'Operações & Gestão', fixed: true },
    { id: 'd3', name: 'Comercial & Vendas', fixed: true },
    { id: 'd4', name: 'Academy & Wiki', fixed: true },
    { id: 'd5', name: 'Financeiro', fixed: true },
  ]);
  const [newDeptName, setNewDeptName] = useState('');

  // SaaS Features
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_TENANT.features);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetPermissionsModalOpen, setIsResetPermissionsModalOpen] = useState(false);

  // Evolution API / WhatsApp State
  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionApiConfig>({
    serverUrl: '',
    apiKey: '',
    instanceName: 'rocket-club-crm',
  });
  const [evolutionState, setEvolutionState] = useState<EvolutionConnectionState>({ state: 'unknown' });
  const [evolutionQr, setEvolutionQr] = useState<EvolutionQRCodeResponse | null>(null);
  const [isCheckingEvolution, setIsCheckingEvolution] = useState(false);
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [evolutionShowKey, setEvolutionShowKey] = useState(false);
  const [evolutionTestPhone, setEvolutionTestPhone] = useState('');
  const [evolutionTestMsg, setEvolutionTestMsg] = useState('Olá! Mensagem de teste do CRM Rocket Club via Evolution API.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [evolutionSavedSuccess, setEvolutionSavedSuccess] = useState(false);

  // Dynamic WhatsApp Custom Templates Studio
  const [templateList, setTemplateList] = useState<WhatsAppCustomTemplate[]>(INITIAL_DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome');
  const [templateSavedFeedback, setTemplateSavedFeedback] = useState(false);
  const [isCreatingNewTemplate, setIsCreatingNewTemplate] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState<Partial<WhatsAppCustomTemplate>>({
    title: '',
    description: '',
    icon: '💬',
    category: 'custom',
    content: 'Olá {nome}! Tudo bem?\n\n',
  });

  // Load Evolution config and templates on mount
  useEffect(() => {
    const cfg = getEvolutionConfig();
    setEvolutionConfig(cfg);
    setTemplateList(getAllWhatsAppTemplates());
    if (cfg.serverUrl && cfg.apiKey && cfg.instanceName) {
      checkEvolutionConnection(cfg).then((res) => {
        if (res.success) {
          setEvolutionState(res.state);
        }
      });
    }
  }, []);

  const handleUpdateCurrentTemplateContent = (newContent: string) => {
    setTemplateList((prev) =>
      prev.map((t) => (t.id === selectedTemplateId ? { ...t, content: newContent } : t))
    );
  };

  const handleSaveCurrentTemplate = () => {
    const current = templateList.find((t) => t.id === selectedTemplateId);
    if (current) {
      const updated = saveWhatsAppTemplate(current);
      setTemplateList(updated);
      setTemplateSavedFeedback(true);
      toast.success('Template salvo com sucesso!', `O modelo "${current.title}" foi atualizado.`);
      setTimeout(() => setTemplateSavedFeedback(false), 3000);
    }
  };

  const handleCreateNewTemplate = () => {
    if (!newTemplateForm.title?.trim() || !newTemplateForm.content?.trim()) {
      toast.warning('Campos incompletos', 'Informe o título e o conteúdo da mensagem.');
      return;
    }
    const newTemplate: WhatsAppCustomTemplate = {
      id: `custom_${Date.now()}`,
      title: newTemplateForm.title.trim(),
      description: newTemplateForm.description?.trim() || 'Template personalizado',
      icon: newTemplateForm.icon || '💬',
      category: newTemplateForm.category || 'custom',
      content: newTemplateForm.content,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    const updated = saveWhatsAppTemplate(newTemplate);
    setTemplateList(updated);
    setSelectedTemplateId(newTemplate.id);
    setIsCreatingNewTemplate(false);
    setNewTemplateForm({
      title: '',
      description: '',
      icon: '💬',
      category: 'custom',
      content: 'Olá {nome}! Tudo bem?\n\n',
    });
    setTemplateSavedFeedback(true);
    toast.success('Novo template criado!', `O modelo "${newTemplate.title}" está pronto para uso.`);
    setTimeout(() => setTemplateSavedFeedback(false), 3000);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = deleteWhatsAppTemplate(templateId);
    setTemplateList(updated);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(updated[0]?.id || 'welcome');
    }
    toast.info('Template removido', 'O modelo de mensagem foi excluído.');
  };

  const handleResetAllTemplates = () => {
    const defaults = resetWhatsAppTemplatesToDefault();
    setTemplateList(defaults);
    setSelectedTemplateId('welcome');
    setTemplateSavedFeedback(true);
    toast.info('Templates restaurados', 'Os modelos padrão do sistema foram restaurados.');
    setTimeout(() => setTemplateSavedFeedback(false), 3000);
  };

  const handleInsertTag = (tag: string) => {
    const current = templateList.find((t) => t.id === selectedTemplateId);
    if (!current) return;
    handleUpdateCurrentTemplateContent(`${current.content} ${tag}`);
  };

  const handleSaveEvolutionConfig = () => {
    saveEvolutionConfig(evolutionConfig);
    setEvolutionSavedSuccess(true);
    toast.success('Configurações salvas!', 'As credenciais da Evolution API foram atualizadas.');
    setTimeout(() => setEvolutionSavedSuccess(false), 3000);
    handleCheckEvolutionStatus();
  };

  const handleCheckEvolutionStatus = async () => {
    setIsCheckingEvolution(true);
    setTestFeedback(null);
    try {
      const res = await checkEvolutionConnection(evolutionConfig);
      setEvolutionState(res.state);
      if (!res.success && res.error) {
        setTestFeedback({ success: false, message: res.error });
      }
    } catch (e: any) {
      setTestFeedback({ success: false, message: e.message || 'Erro ao checar status.' });
    } finally {
      setIsCheckingEvolution(false);
    }
  };

  const handleGenerateQrCode = async () => {
    setIsFetchingQr(true);
    setEvolutionQr(null);
    setTestFeedback(null);
    try {
      saveEvolutionConfig(evolutionConfig);
      const res = await fetchEvolutionQRCode(evolutionConfig);
      if (res.success && res.qrcode) {
        setEvolutionQr(res.qrcode);
        setEvolutionState({ state: 'connecting' });
      } else {
        setTestFeedback({ success: false, message: res.error || 'Não foi possível obter o QR Code.' });
      }
    } catch (e: any) {
      setTestFeedback({ success: false, message: e.message || 'Erro ao solicitar QR Code.' });
    } finally {
      setIsFetchingQr(false);
    }
  };

  const handleLogoutEvolution = async () => {
    if (!confirm('Deseja realmente desconectar esta instância do WhatsApp?')) return;
    setIsLoggingOut(true);
    try {
      const res = await logoutEvolutionInstance(evolutionConfig);
      if (res.success) {
        setEvolutionState({ state: 'close' });
        setEvolutionQr(null);
        setTestFeedback({ success: true, message: 'Instância desconectada com sucesso!' });
      } else {
        setTestFeedback({ success: false, message: res.error || 'Erro ao desconectar.' });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSendEvolutionTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolutionTestPhone.trim() || !evolutionTestMsg.trim()) {
      setTestFeedback({ success: false, message: 'Informe o telefone e o texto da mensagem.' });
      return;
    }
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await sendEvolutionWhatsAppMessage(evolutionTestPhone, evolutionTestMsg, evolutionConfig);
      if (res.success) {
        setTestFeedback({
          success: true,
          message: `Mensagem enviada com sucesso no WhatsApp! (ID: ${res.messageId})`,
        });
      } else {
        setTestFeedback({ success: false, message: res.error || 'Falha no envio da mensagem.' });
      }
    } catch (e: any) {
      setTestFeedback({ success: false, message: e.message || 'Erro inesperado no envio.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Load from localStorage if present
  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem('rocket_club_company_logo');
      const savedIcon = localStorage.getItem('rocket_club_company_icon');
      const savedCompany = localStorage.getItem('rocket_club_company_data');
      const savedLevels = localStorage.getItem('rocket_club_access_levels');
      if (savedLogo) setLogoUrl(savedLogo);
      if (savedIcon) setIconUrl(savedIcon);
      if (savedCompany) setCompany(JSON.parse(savedCompany));
      if (savedLevels) setAccessLevels(JSON.parse(savedLevels));
    } catch (e) {}
  }, []);

  // Handle Full Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoUrl(dataUrl);
      setCompany((prev) => ({ ...prev, logoUrl: dataUrl }));
      DEFAULT_TENANT.logoUrl = dataUrl;
      DEFAULT_TENANT.company.logoUrl = dataUrl;
      try {
        localStorage.setItem('rocket_club_company_logo', dataUrl);
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  // Handle Collapsed Icon Upload
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setIconUrl(dataUrl);
      setCompany((prev) => ({ ...prev, iconUrl: dataUrl }));
      DEFAULT_TENANT.iconUrl = dataUrl;
      DEFAULT_TENANT.company.iconUrl = dataUrl;
      try {
        localStorage.setItem('rocket_club_company_icon', dataUrl);
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  // Save Settings
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    DEFAULT_TENANT.company = company;
    DEFAULT_TENANT.name = company.tradeName || DEFAULT_TENANT.name;
    DEFAULT_TENANT.primaryColor = primaryColor;
    DEFAULT_TENANT.features = features;
    DEFAULT_TENANT.accessLevels = accessLevels;

    try {
      localStorage.setItem('rocket_club_company_data', JSON.stringify(company));
      localStorage.setItem('rocket_club_company_tradename', company.tradeName);
      localStorage.setItem('rocket_club_access_levels', JSON.stringify(accessLevels));
      if (logoUrl) localStorage.setItem('rocket_club_company_logo', logoUrl);
      if (iconUrl) localStorage.setItem('rocket_club_company_icon', iconUrl);
    } catch (err) {}

    setSavedSuccess(true);
    toast.success('Configurações salvas!', 'Os dados institucionais e permissões foram atualizados com sucesso.');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Handle Create New User
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);

    const result = addUser({
      name: newUserName,
      email: newUserEmail,
      phone: newUserPhone,
      password: newUserPassword || undefined,
      role: newUserRole,
      department: newUserDept,
      status: 'ATIVO',
      lastActive: 'Cadastrado agora',
    });

    if (result.success) {
      toast.success('Usuário cadastrado com sucesso!', `A conta de "${newUserName}" foi criada no sistema.`);
      setIsNewUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setShowNewUserPassword(false);
      setNewUserRole('Administrador');
    } else {
      setUserActionError(result.error || 'Erro ao criar usuário.');
      toast.error('Erro ao cadastrar usuário', result.error || 'Não foi possível cadastrar o usuário.');
    }
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserActionError(null);

    const updates: Partial<SystemUser> = {
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      status: editingUser.status,
    };

    if (editingUserPassword.trim()) {
      updates.password = editingUserPassword.trim();
    }

    const result = updateUser(editingUser.id, updates);
    if (result.success) {
      toast.success('Usuário atualizado!', `Os dados e permissões de "${editingUser.name}" foram salvos.`);
      setEditingUser(null);
      setEditingUserPassword('');
      setShowEditingUserPassword(false);
    } else {
      setUserActionError(result.error || 'Erro ao editar usuário.');
      toast.error('Erro ao salvar usuário', result.error || 'Não foi possível atualizar o usuário.');
    }
  };

  // Handle Delete User Click (with Hierarchy Verification)
  const handleInitiateDeleteUser = (user: SystemUser) => {
    const check = canDeleteUser(currentRole, user);
    if (!check.allowed) {
      setDeleteBlockedReason(check.reason || 'Exclusão não autorizada.');
      setDeletingUserTarget(user);
    } else {
      setDeleteBlockedReason(null);
      setDeletingUserTarget(user);
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!deletingUserTarget) return;
    const res = deleteUser(deletingUserTarget.id);
    if (res.success) {
      toast.info('Usuário excluído', `A conta de "${deletingUserTarget.name}" foi removida.`);
      setDeletingUserTarget(null);
      setDeleteBlockedReason(null);
    } else {
      setDeleteBlockedReason(res.error || 'Não foi possível excluir.');
      toast.error('Erro ao excluir usuário', res.error || 'Não foi possível concluir a exclusão.');
    }
  };

  const permissionSections: {
    title: string;
    description: string;
    icon: string;
    items: { key: keyof RolePermissions; label: string; desc: string }[];
  }[] = [
    {
      title: '📊 Dashboard & Métricas Executivas',
      description: 'Acesso às métricas de desempenho, faturamento e saúde da operação.',
      icon: '📊',
      items: [
        { key: 'viewDashboard', label: 'Visualizar Dashboard', desc: 'Permite abrir o painel executivo principal' },
        { key: 'exportDashboardReports', label: 'Exportar Relatórios Executivos', desc: 'Download de relatórios consolidados em PDF' },
      ],
    },
    {
      title: '🎯 CRM & Gestão de Novos Leads',
      description: 'Controle de funil de vendas, captação, diagnóstico e movimentação de pipeline.',
      icon: '🎯',
      items: [
        { key: 'viewCRM', label: 'Visualizar CRM', desc: 'Acesso à lista e colunas do pipeline' },
        { key: 'createLeads', label: 'Cadastrar Novos Leads', desc: 'Adicionar novas oportunidades no CRM' },
        { key: 'editLeads', label: 'Editar & Diagnosticar Leads', desc: 'Alterar status, notas e campos executivos' },
        { key: 'deleteLeads', label: 'Excluir Leads', desc: 'Remover oportunidades de negócio' },
        { key: 'exportCRM', label: 'Exportar Base de Leads', desc: 'Extrair relatórios de conversão' },
      ],
    },
    {
      title: '👥 Base de Mentorados & Fichas',
      description: 'Gestão completa dos membros acelerados, níveis, pilares e Members Book.',
      icon: '👥',
      items: [
        { key: 'viewMembers', label: 'Visualizar Mentorados', desc: 'Consultar listagem e perfis de membros' },
        { key: 'createMembers', label: 'Cadastrar Novo Mentorado', desc: 'Adicionar mentorado à base do ecossistema' },
        { key: 'editMembers', label: 'Editar Fichas & Diagnóstico', desc: 'Atualizar informações cadastrais e pilares' },
        { key: 'deleteMembers', label: 'Excluir Mentorado', desc: 'Remover cadastro de mentorado' },
        { key: 'exportMembersPDF', label: 'Gerar Ficha & Members Book PDF', desc: 'Download do book de apresentação profissional' },
      ],
    },
    {
      title: '📋 Kanban de Acompanhamento',
      description: 'Quadro visual de status de evolução (Cinza, Azul, Verde, Amarelo, Vermelha, Ouro, Diamante).',
      icon: '📋',
      items: [
        { key: 'viewKanban', label: 'Visualizar Kanban', desc: 'Acessar as raias de acompanhamento' },
        { key: 'moveKanbanCards', label: 'Mover Cards no Quadro', desc: 'Arrastar e soltar membros entre as etapas' },
      ],
    },
    {
      title: '🎓 Rocket Academy (Salas de Aula & Cursos)',
      description: 'Acesso a videoaulas, módulos, comentários e gestão de conteúdo educacional.',
      icon: '🎓',
      items: [
        { key: 'viewAcademy', label: 'Assistir Aulas & Cursos', desc: 'Acesso às salas de aula da Academy' },
        { key: 'createCourses', label: 'Criar Novos Cursos', desc: 'Publicar cursos e trilhas de mentoria' },
        { key: 'editCourses', label: 'Editar Aulas & Módulos', desc: 'Alterar vídeos, materiais e descrições' },
        { key: 'deleteCourses', label: 'Excluir Cursos', desc: 'Remover módulos de treinamento' },
        { key: 'commentLessons', label: 'Publicar Comentários & Dúvidas', desc: 'Interagir na área de discussão de cada aula' },
      ],
    },
    {
      title: '📖 Wiki & SOPs de Conhecimento',
      description: 'Manuais operacionais, diretrizes, processos e documentações estratégicas.',
      icon: '📖',
      items: [
        { key: 'viewWiki', label: 'Ler Artigos da Wiki', desc: 'Consultar processos e manuais internos' },
        { key: 'createArticles', label: 'Criar Artigos', desc: 'Escrever novos documentos e tutoriais' },
        { key: 'editArticles', label: 'Editar Conteúdo', desc: 'Atualizar artigos existentes' },
        { key: 'deleteArticles', label: 'Excluir Artigos', desc: 'Remover documentos da base de conhecimento' },
        { key: 'manageDepartments', label: 'Gerenciar Departamentos', desc: 'Criar e renomear categorias da Wiki' },
      ],
    },
    {
      title: '💰 Gestão Financeira & Caixa',
      description: 'Controle de mensalidades, fluxo de caixa, custos e faturamento da operação.',
      icon: '💰',
      items: [
        { key: 'viewFinancial', label: 'Visualizar Financeiro', desc: 'Ver saldo geral, extratos e gráficos' },
        { key: 'createTransactions', label: 'Lançar Receitas / Despesas', desc: 'Cadastrar novas entradas e saídas' },
        { key: 'editTransactions', label: 'Editar Lançamentos', desc: 'Modificar valores e status de pagamentos' },
        { key: 'deleteTransactions', label: 'Excluir Lançamentos', desc: 'Remover transações financeiras' },
        { key: 'exportFinancial', label: 'Exportar Relatório Financeiro', desc: 'Baixar DRE e demonstrativos em PDF/CSV' },
      ],
    },
    {
      title: '📅 Eventos, Imersões & Hotseats',
      description: 'Calendário de encontros presenciais, controle de presenças e confirmações (RSVP).',
      icon: '📅',
      items: [
        { key: 'viewEvents', label: 'Visualizar Agenda de Eventos', desc: 'Consultar calendário de imersões' },
        { key: 'rsvpEvents', label: 'Confirmar Presença (RSVP)', desc: 'Garantir vaga em eventos e encontros' },
        { key: 'createEvents', label: 'Criar Novos Eventos', desc: 'Agendar imersões, hotseats e workshops' },
        { key: 'manageAttendees', label: 'Gerenciar Participantes & Check-in', desc: 'Confirmar lista de presença presencial' },
        { key: 'deleteEvents', label: 'Excluir Eventos', desc: 'Remover eventos agendados' },
      ],
    },
    {
      title: '⚙️ Configurações, Whitelabel & Governança',
      description: 'Personalização da marca, paletas de cores, matriz de permissões e controle de contas.',
      icon: '⚙️',
      items: [
        { key: 'viewSettings', label: 'Acessar Central de Configurações', desc: 'Abrir a área de ajustes do sistema' },
        { key: 'manageWhitelabel', label: 'Personalizar Whitelabel & Logos', desc: 'Alterar razão social, logos e dados corporativos' },
        { key: 'manageDesignSystem', label: 'Alterar Design System & Paleta de Cores', desc: 'Mudar tema visual entre as 4 paletas' },
        { key: 'managePermissionsMatrix', label: 'Controlar Matriz de Permissões RBAC', desc: 'Ligar e desligar acessos dos cargos (Exclusivo Master)' },
        { key: 'manageUsers', label: 'Gerenciar Usuários & Contas', desc: 'Criar, editar e excluir contas (respeitando hierarquia)' },
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <Settings size={14} className="mr-1.5" /> Central de Governança & Design System
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Configurações, <span className="theme-gradient-text">Permissões & Design</span>
          </h1>
          <p className={`text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Gerencie os níveis de acesso (Master, Admin, Editor, Cliente, Usuário), paletas visuais e identidade corporativa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto flex-wrap">
          <a
            href="/api/export-system-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-300 font-bold text-xs hover:bg-blue-600/30 transition-all flex items-center gap-2"
            title="Visualizar e Baixar o Guia Executivo Oficial em PDF"
          >
            <FileText size={15} className="text-blue-400" />
            <span>Manual do Sistema (PDF)</span>
          </a>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            {savedSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Simulator Quick Role Switcher Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-[#131926]/90 border-[#1F293D]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md font-bold"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              border: `1px solid ${activePalette.tokens.badgeBorder}`,
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                Simulador de Acesso Rápido (Role Testing)
              </span>
              <Badge variant="outline" className={ROLE_HIERARCHIES[currentRole]?.badge}>
                Você está logado como: {currentUser.name} ({currentRole})
              </Badge>
            </div>
            <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Alterne instantaneamente para testar a experiência e restrições de cada nível hierárquico em tempo real:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['Master', 'Administrador', 'Editor', 'Cliente', 'Usuário'] as UserRole[]).map((role) => {
            const isCurrent = currentRole === role;
            return (
              <button
                key={role}
                onClick={() => switchRoleSimulation(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isCurrent
                    ? 'shadow-md scale-105'
                    : isLightMode
                    ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    : 'bg-[#0B0F17] text-slate-400 border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                        borderColor: activePalette.tokens.primary,
                      }
                    : {}
                }
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'design'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'design'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Palette size={16} />
          <span>Design System & Cores (4 Paletas)</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'permissions'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'permissions'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Shield size={16} />
          <span>Matriz de Permissões RBAC</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'users'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'users'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Users size={16} />
          <span>Usuários & Hierarquia</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'whatsapp'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'whatsapp'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <MessageCircle size={16} />
          <span>WhatsApp (Evolution API)</span>
          {evolutionState.state === 'open' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'company'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'company'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Building2 size={16} />
          <span>Dados da Empresa & Logos</span>
        </button>

        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'levels'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'levels'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Key size={16} />
          <span>Planos & Assinaturas</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'system'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'system'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Target size={16} />
          <span>5 Pilares</span>
        </button>

        <button
          onClick={() => setActiveTab('depts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'depts'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'depts'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Building size={16} />
          <span>Departamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'csv'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'csv'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <FileSpreadsheet size={16} />
          <span>Importar CSV</span>
        </button>

        <button
          onClick={() => setActiveTab('saas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'saas'
              ? 'shadow-md font-extrabold'
              : isLightMode
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
          style={
            activeTab === 'saas'
              ? {
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }
              : {}
          }
        >
          <Sliders size={16} />
          <span>Módulos SaaS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB: DESIGN SYSTEM & 4 PALETAS DE CORES VIBRANTES                         */}
      {/* ========================================================================= */}
      {activeTab === 'design' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                  <Palette size={20} style={{ color: activePalette.tokens.primary }} />
                  <span>Personalização do Design System & Paleta de Cores</span>
                </h3>
                <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Selecione entre 4 paletas visuais com contraste inteligente adaptativo. Quando uma paleta exige fundo claro para contraste ideal, o tema adapta automaticamente.
                </p>
              </div>

              <button
                onClick={resetTheme}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
                  isLightMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                }`}
              >
                <RefreshCw size={14} />
                <span>Restaurar Padrão (Rocket Gold)</span>
              </button>
            </div>

            {/* 4 Color Palette Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" suppressHydrationWarning>
              {(Object.keys(COLOR_PALETTES) as PaletteId[]).map((paletteKey) => {
                const pal = COLOR_PALETTES[paletteKey];
                const isSelected = (mounted ? activePaletteId : DEFAULT_PALETTE_ID) === paletteKey;

                return (
                  <div
                    key={paletteKey}
                    onClick={() => setPalette(paletteKey)}
                    suppressHydrationWarning
                    className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'ring-2 scale-[1.02] shadow-2xl'
                        : isLightMode
                        ? 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#0B0F17]/80 hover:bg-[#131926] border-[#1F293D] hover:border-slate-600'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: pal.rawTokens.primary,
                            boxShadow: `0 10px 30px -10px ${pal.rawTokens.glow}`,
                          }
                        : {}
                    }
                  >
                    {/* Ambient Glow */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity"
                      style={{ background: pal.rawTokens.primary }}
                    />

                    <div className="flex items-start justify-between gap-3 relative z-10" suppressHydrationWarning>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-base font-extrabold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                            {pal.name}
                          </h4>
                          {isSelected && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0.5 px-2 font-black uppercase"
                              style={{
                                backgroundColor: pal.rawTokens.badgeBg,
                                color: pal.rawTokens.primary,
                                borderColor: pal.rawTokens.badgeBorder,
                              }}
                            >
                              ✓ Ativa
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {pal.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pal.mode === 'light' ? (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                            <Sun size={11} /> Light Luxe
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-extrabold flex items-center gap-1">
                            <Moon size={11} /> Dark Theme
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Color Swatch Preview */}
                    <div className="mt-4 pt-4 border-t border-slate-800/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">Paleta de Tons:</span>
                        <div className="flex items-center -space-x-1.5">
                          {pal.previewColors.map((hex, idx) => (
                            <div
                              key={idx}
                              className="w-6 h-6 rounded-full border-2 border-slate-900 shadow"
                              style={{ backgroundColor: hex }}
                              title={`Cor: ${hex}`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'text-white'
                            : isLightMode
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-[#1F293D] text-slate-300 hover:bg-slate-700'
                        }`}
                        style={isSelected ? { backgroundColor: pal.rawTokens.primary } : {}}
                      >
                        {isSelected ? 'Em Uso' : 'Aplicar Paleta'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Visual Token Preview Box */}
            <div
              className={`p-6 rounded-3xl border space-y-4 ${
                isLightMode ? 'bg-white border-slate-200 shadow-lg' : 'bg-[#0B0F17] border-[#1F293D]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    👀 Demonstração ao Vivo dos Tokens do Tema Selecionado
                  </h4>
                  <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Todos os botões, badges, gráficos e modais do ecossistema herdam automaticamente estas propriedades:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {/* Button Token */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#131926] border-[#1F293D]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Botão Principal</span>
                  <button
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-transform hover:scale-105"
                    style={{
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    }}
                  >
                    🚀 Ação Primária
                  </button>
                </div>

                {/* Badge Token */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#131926] border-[#1F293D]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Badge & Destaque</span>
                  <div
                    className="p-2.5 rounded-xl border text-center font-bold text-xs"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    ★ Mentorado Ouro
                  </div>
                </div>

                {/* Card Token */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#131926] border-[#1F293D]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Card com Glow</span>
                  <div
                    className={`p-2.5 rounded-xl border font-semibold text-[11px] ${
                      isLightMode ? 'bg-white border-slate-200' : 'bg-[#0B0F17] border-slate-700'
                    }`}
                  >
                    Faturamento: <strong style={{ color: activePalette.tokens.primary }}>R$ 250k/mês</strong>
                  </div>
                </div>

                {/* Gradient Text Token */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#131926] border-[#1F293D]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Gradiente de Texto</span>
                  <div className="font-extrabold text-base theme-gradient-text text-center pt-1">
                    ROCKET CLUB VIP
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MATRIZ DE PERMISSÕES RBAC                                             */}
      {/* ========================================================================= */}
      {activeTab === 'permissions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    <Shield size={20} style={{ color: activePalette.tokens.primary }} />
                    <span>Matriz de Permissões RBAC dos Níveis de Usuário</span>
                  </h3>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/40">
                    Controle de Acesso
                  </Badge>
                </div>
                <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  O Comandante Master pode ligar e desligar permissões granulares de cada um dos 5 níveis: <strong>Master, Administrador, Editor, Cliente, Usuário</strong>.
                </p>
              </div>

              {isMaster ? (
                <button
                  onClick={() => setIsResetPermissionsModalOpen(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
                    isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                  }`}
                >
                  <RefreshCw size={14} />
                  <span>Restaurar Matriz Padrão</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>Modo Somente Leitura (Logado como {currentRole})</span>
                </div>
              )}
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {(['Master', 'Administrador', 'Editor', 'Cliente', 'Usuário'] as UserRole[]).map((role) => {
                const info = ROLE_HIERARCHIES[role];
                const isSelected = matrixRole === role;

                return (
                  <button
                    key={role}
                    onClick={() => setMatrixRole(role)}
                    className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                      isSelected
                        ? 'scale-105 shadow-lg'
                        : isLightMode
                        ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#0B0F17]/70 text-slate-400 border-[#1F293D] hover:bg-[#1F293D]'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: activePalette.tokens.badgeBg,
                            color: activePalette.tokens.primary,
                            borderColor: activePalette.tokens.primary,
                          }
                        : {}
                    }
                  >
                    <Key size={14} style={isSelected ? { color: activePalette.tokens.primary } : {}} />
                    <span>{role}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                      style={{
                        backgroundColor: info.color + '25',
                        color: info.color,
                      }}
                    >
                      Nível {info.rank}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Role Header Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/90 border-[#1F293D]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-base font-extrabold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    Permissões para o cargo: <span style={{ color: activePalette.tokens.primary }}>{matrixRole}</span>
                  </h4>
                  <Badge variant="outline" className={ROLE_HIERARCHIES[matrixRole]?.badge}>
                    Nível de Hierarquia {ROLE_HIERARCHIES[matrixRole]?.rank} de 5
                  </Badge>
                </div>
                <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {ROLE_HIERARCHIES[matrixRole]?.description}
                </p>
              </div>

              {matrixRole === 'Master' && (
                <span className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px] font-extrabold shrink-0 hidden sm:inline">
                  👑 Acesso Total & Irrestrito
                </span>
              )}
            </div>

            {/* Granular Permission Grid by Section */}
            <div className="space-y-6">
              {permissionSections.map((sec, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-3xl border space-y-4 ${
                    isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0B0F17]/60 border-[#1F293D]'
                  }`}
                >
                  <div className="pb-3 border-b border-slate-800/40 flex items-center justify-between">
                    <div>
                      <h4 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                        {sec.title}
                      </h4>
                      <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {sec.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {sec.items.map((perm) => {
                      const isEnabled = rolePermissions[matrixRole]?.[perm.key] ?? false;
                      const isLocked = matrixRole === 'Master'; // Master is permanently unrestricted

                      return (
                        <div
                          key={perm.key}
                          onClick={() => {
                            if (!isMaster || isLocked) return;
                            toggleRolePermission(matrixRole, perm.key);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isLocked || !isMaster ? 'cursor-default' : 'cursor-pointer hover:border-slate-600'
                          } ${
                            isEnabled
                              ? isLightMode
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-[#131926] border-slate-800'
                              : isLightMode
                              ? 'bg-white/50 border-slate-200 opacity-60'
                              : 'bg-[#0B0F17]/40 border-slate-800/60 opacity-60'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isEnabled
                                  ? isLightMode
                                    ? 'text-slate-900'
                                    : 'text-slate-100'
                                  : 'text-slate-400'
                              }`}
                            >
                              {perm.label}
                            </span>
                            <span className={`text-[11px] leading-tight block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {perm.desc}
                            </span>
                          </div>

                          {/* Toggle Switch */}
                          <div className="shrink-0">
                            {isLocked ? (
                              <span className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold text-xs border border-yellow-500/40">
                                ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!isMaster}
                                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                                  isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: USUÁRIOS & HIERARQUIA                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    <Users size={20} style={{ color: activePalette.tokens.primary }} />
                    <span>Gestão de Usuários & Regras de Hierarquia</span>
                  </h3>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-300">
                    {systemUsers.length} Usuários Cadastrados
                  </Badge>
                </div>
                <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Hierarquia protegida: Usuários Administradores têm acesso total operacional, mas <strong>não podem excluir contas de nível Master</strong>.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setUserActionError(null);
                    setNewUserPassword('');
                    setShowNewUserPassword(false);
                    setIsNewUserModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                  style={{
                    backgroundColor: activePalette.tokens.primary,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  }}
                >
                  <Plus size={16} />
                  <span>Cadastrar Novo Usuário</span>
                </button>
              )}
            </div>

            {/* User List Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#1F293D]">
              <table className="w-full text-left text-xs">
                <thead
                  className={`border-b ${
                    isLightMode ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#0B0F17] text-slate-400 border-[#1F293D]'
                  }`}
                >
                  <tr>
                    <th className="p-4 font-bold">Usuário / Nome</th>
                    <th className="p-4 font-bold">Cargo & Nível</th>
                    <th className="p-4 font-bold">Departamento</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Último Acesso</th>
                    <th className="p-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F293D]/60">
                  {systemUsers.map((usr) => {
                    const isLogged = currentUser.id === usr.id;
                    const roleInfo = ROLE_HIERARCHIES[usr.role] || ROLE_HIERARCHIES['Usuário'];

                    return (
                      <tr
                        key={usr.id}
                        className={`transition-colors ${
                          isLogged
                            ? isLightMode
                              ? 'bg-amber-500/10'
                              : 'bg-yellow-500/10 font-bold'
                            : isLightMode
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-[#131926]/50'
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow"
                              style={{
                                backgroundColor: roleInfo.color + '20',
                                color: roleInfo.color,
                                border: `1px solid ${roleInfo.color}50`,
                              }}
                            >
                              {usr.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {usr.name}
                                </span>
                                {isLogged && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-yellow-500 text-slate-950 font-black">
                                    VOCÊ
                                  </span>
                                )}
                                {usr.isPrimaryMaster && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                    MASTER PRIMÁRIO
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {usr.email} • {usr.phone || 'Sem telefone'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <Badge variant="outline" className={roleInfo.badge}>
                            {usr.role} (Nível {roleInfo.rank})
                          </Badge>
                        </td>

                        <td className="p-4 text-slate-300 font-medium">
                          {usr.department || 'Geral'}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {usr.status}
                          </span>
                        </td>

                        <td className="p-4 text-slate-400 text-[11px]">
                          {usr.lastActive || 'Recente'}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Switch to this user button */}
                            {!isLogged && (
                              <button
                                onClick={() => switchUser(usr.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                  isLightMode
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                                }`}
                                title="Fazer login como este usuário para teste"
                              >
                                Logar
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setUserActionError(null);
                                  setEditingUserPassword('');
                                  setShowEditingUserPassword(false);
                                  setEditingUser(usr);
                                }}
                                className="p-2 rounded-lg bg-[#0B0F17] hover:bg-[#1F293D] text-slate-400 hover:text-slate-200 border border-[#1F293D] transition-colors"
                                title="Editar dados do usuário"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => handleInitiateDeleteUser(usr)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: WHATSAPP EVOLUTION API (INTEGRAÇÃO COMPLETA & DISPARADOR)             */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    <MessageCircle size={22} className="text-emerald-400" />
                    <span>Integração WhatsApp CRM (Evolution API v2)</span>
                  </h3>
                  {evolutionState.state === 'open' ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-black">
                      🟢 Instância Conectada & Ativa
                    </Badge>
                  ) : evolutionState.state === 'connecting' ? (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs font-bold">
                      🟡 Aguardando Leitura do QR Code
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-xs font-bold">
                      🔴 Desconectado
                    </Badge>
                  )}
                </div>
                <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Conecte sua instância da Evolution API (hospedada em VPS/Docker/Railway) para controlar e disparar atendimentos de leads diretamente pelo Rocket Club.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckEvolutionStatus}
                  disabled={isCheckingEvolution}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                  }`}
                >
                  <RefreshCw size={13} className={isCheckingEvolution ? 'animate-spin' : ''} />
                  <span>{isCheckingEvolution ? 'Checando...' : 'Verificar Status'}</span>
                </button>
              </div>
            </div>

            {/* Architecture Banner / Info Alert */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isLightMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                <Zap size={16} />
              </div>
              <div className="text-xs space-y-1">
                <p className={`font-bold ${isLightMode ? 'text-emerald-950' : 'text-emerald-300'}`}>
                  Arquitetura de Alta Disponibilidade (Rocket Club + Evolution API)
                </p>
                <p className={isLightMode ? 'text-emerald-800' : 'text-slate-300'}>
                  O Rocket Club roda no Vercel (Front/APIs com CDN global) e conecta-se via HTTPS REST à sua <strong>Evolution API</strong> rodando em VPS/Docker (que mantém o WebSocket 24/7 com o WhatsApp). O atendimento e histórico ocorrem 100% dentro do CRM.
                </p>
              </div>
            </div>

            {/* Credentials Form & Live Connection Box */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form */}
              <div className="lg:col-span-2 space-y-5">
                <div className={`p-5 rounded-3xl border space-y-4 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/80 border-[#1F293D]'
                }`}>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    1. Credenciais da Evolution API
                  </h4>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className={`block font-bold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                        URL do Servidor Evolution API (com https://)
                      </label>
                      <input
                        type="url"
                        value={evolutionConfig.serverUrl}
                        onChange={(e) => setEvolutionConfig((prev) => ({ ...prev, serverUrl: e.target.value }))}
                        placeholder="https://api.evolution.suaempresa.com.br"
                        className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Exemplo: https://whatsapp-api.dominio.com ou URL pública do Railway/Render
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block font-bold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                          API Key Global / Token de Autenticação
                        </label>
                        <div className="relative">
                          <input
                            type={evolutionShowKey ? 'text' : 'password'}
                            value={evolutionConfig.apiKey}
                            onChange={(e) => setEvolutionConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Sua AUTHENTICATION_API_KEY"
                            className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setEvolutionShowKey(!evolutionShowKey)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                          >
                            {evolutionShowKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={`block font-bold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                          Nome da Instância (Instance Name)
                        </label>
                        <input
                          type="text"
                          value={evolutionConfig.instanceName}
                          onChange={(e) => setEvolutionConfig((prev) => ({ ...prev, instanceName: e.target.value }))}
                          placeholder="rocket-club-crm"
                          className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#1F293D] flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEvolutionConfig}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Save size={14} />
                          <span>Salvar Credenciais</span>
                        </button>
                        {evolutionSavedSuccess && (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <Check size={14} /> Salvo!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateQrCode}
                          disabled={isFetchingQr || !evolutionConfig.serverUrl}
                          className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                        >
                          <QrCode size={14} />
                          <span>{isFetchingQr ? 'Gerando QR...' : 'Conectar / Gerar QR Code'}</span>
                        </button>

                        {evolutionState.state === 'open' && (
                          <button
                            type="button"
                            onClick={handleLogoutEvolution}
                            disabled={isLoggingOut}
                            className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                            title="Desconectar WhatsApp"
                          >
                            <Power size={13} />
                            <span>{isLoggingOut ? 'Desconectando...' : 'Desconectar'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Webhook Endpoint Box for Evolution Manager */}
                <div className={`p-5 rounded-3xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/80 border-[#1F293D]'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                      2. Configuração do Webhook no Servidor
                    </h4>
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                      Recepção Automática
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400">
                    Cadastre a URL abaixo na sua Evolution API para que todas as mensagens recebidas caiam automaticamente na timeline dos Leads no CRM:
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/whatsapp` : 'https://seu-dominio.com/api/webhook/whatsapp'}
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3.5 py-2 text-xs text-yellow-400 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/whatsapp` : '';
                        navigator.clipboard.writeText(url);
                        setCopiedWebhookUrl(true);
                        setTimeout(() => setCopiedWebhookUrl(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-200 text-xs font-bold border border-[#1F293D] shrink-0 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedWebhookUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedWebhookUrl ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <span className="font-bold text-slate-300">Eventos recomendados para ativar:</span>
                    <div className="flex gap-2 flex-wrap text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#131926] border border-[#1F293D] text-emerald-400">MESSAGES_UPSERT</span>
                      <span className="px-2 py-0.5 rounded bg-[#131926] border border-[#1F293D] text-blue-400">MESSAGES_UPDATE</span>
                      <span className="px-2 py-0.5 rounded bg-[#131926] border border-[#1F293D] text-amber-400">CONNECTION_UPDATE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Live QR Code & Status Box */}
              <div className="space-y-5">
                <div className={`p-5 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 min-h-[320px] ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/90 border-[#1F293D]'
                }`}>
                  <div className="flex items-center justify-between w-full pb-2 border-b border-[#1F293D]/60">
                    <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                      Painel de Conexão
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {evolutionConfig.instanceName}
                    </span>
                  </div>

                  {evolutionQr?.base64 ? (
                    // Live QR Code Render
                    <div className="space-y-3 flex flex-col items-center animate-in zoom-in-95 duration-200">
                      <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-yellow-500/50">
                        <img
                          src={evolutionQr.base64.startsWith('data:') ? evolutionQr.base64 : `data:image/png;base64,${evolutionQr.base64}`}
                          alt="QR Code WhatsApp"
                          className="w-48 h-48 object-contain"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-yellow-400 block">
                          Abra o WhatsApp no celular
                        </span>
                        <p className="text-[11px] text-slate-400 max-w-[200px] leading-tight">
                          Configurações &gt; Aparelhos Conectados &gt; Conectar Aparelho
                        </p>
                      </div>

                      {evolutionQr.pairingCode && (
                        <div className="p-2 rounded-xl bg-[#131926] border border-[#1F293D] text-[11px]">
                          Código de pareamento: <strong className="text-yellow-400 font-mono">{evolutionQr.pairingCode}</strong>
                        </div>
                      )}
                    </div>
                  ) : evolutionState.state === 'open' ? (
                    // Connected State Visualizer
                    <div className="space-y-3 flex flex-col items-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/10">
                        <Wifi size={28} />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-100">WhatsApp Conectado!</h4>
                        {evolutionState.profileName && (
                          <p className="text-xs text-emerald-400 font-bold mt-0.5">{evolutionState.profileName}</p>
                        )}
                        {evolutionState.ownerJid && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {evolutionState.ownerJid.split('@')[0]}
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-[200px] leading-tight pt-1">
                        Pronto para disparar e receber mensagens no CRM em tempo real.
                      </p>
                    </div>
                  ) : (
                    // Offline state prompt
                    <div className="space-y-3 flex flex-col items-center py-6 text-slate-500">
                      <div className="w-14 h-14 rounded-2xl bg-[#131926] text-slate-500 flex items-center justify-center border border-[#1F293D]">
                        <QrCode size={26} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Nenhum QR Code ativo</span>
                        <p className="text-[11px] text-slate-500 max-w-[220px] leading-tight mt-1">
                          Preencha as credenciais ao lado e clique em &quot;Conectar / Gerar QR Code&quot; para parear seu WhatsApp.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Test Dispatcher */}
                <div className={`p-5 rounded-3xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/80 border-[#1F293D]'
                }`}>
                  <span className="text-xs font-black uppercase text-slate-300 tracking-wider block">
                    3. Teste Rápido de Envio
                  </span>

                  <form onSubmit={handleSendEvolutionTest} className="space-y-2.5 text-xs">
                    <div>
                      <input
                        type="text"
                        value={evolutionTestPhone}
                        onChange={(e) => setEvolutionTestPhone(e.target.value)}
                        placeholder="Telefone (ex: 11 99999-8888)"
                        className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={evolutionTestMsg}
                        onChange={(e) => setEvolutionTestMsg(e.target.value)}
                        placeholder="Texto da mensagem de teste..."
                        className="w-full bg-[#131926] border border-[#1F293D] rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingTest || !evolutionConfig.serverUrl}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Send size={13} />
                      <span>{isSendingTest ? 'Enviando...' : 'Disparar Teste'}</span>
                    </button>

                    {testFeedback && (
                      <div className={`p-2.5 rounded-xl border text-[11px] leading-tight ${
                        testFeedback.success
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}>
                        {testFeedback.message}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </Card>

          {/* WhatsApp Custom Templates & Automations Studio */}
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                  <MessageCircle size={20} className="text-emerald-400" />
                  <span>4. Templates & Automações do WhatsApp</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Crie, edite e personalize templates ilimitados de WhatsApp com tags dinâmicas para seus mentorados e clientes.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetAllTemplates}
                  className="px-3 py-1.5 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 text-xs font-semibold border border-[#1F293D] transition-colors"
                >
                  Restaurar Padrões
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewTemplate(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>+ Novo Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentTemplate}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>

            {templateSavedFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <Check size={16} />
                <span>Templates atualizados com sucesso!</span>
              </div>
            )}

            {/* Modal / Inline Creator for New Template */}
            {isCreatingNewTemplate && (
              <div className="p-5 rounded-2xl bg-[#070A12] border border-yellow-500/30 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-400" />
                    <h4 className="text-sm font-extrabold text-slate-100">Criar Novo Template de WhatsApp</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewTemplate(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Título do Template</label>
                    <input
                      type="text"
                      placeholder="Ex: Cobrança de Mensalidade"
                      value={newTemplateForm.title || ''}
                      onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Emoji / Ícone</label>
                    <input
                      type="text"
                      placeholder="Ex: 💰, 🚀, ⭐, 📋"
                      value={newTemplateForm.icon || ''}
                      onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, icon: e.target.value }))}
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Breve Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: Lembrete de pagamento"
                      value={newTemplateForm.description || ''}
                      onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Texto da Mensagem (com tags)</label>
                  <textarea
                    rows={4}
                    value={newTemplateForm.content || ''}
                    onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Olá {nome}! Tudo bem? Passando para avisar que..."
                    className="w-full bg-[#131926] border border-[#1F293D] rounded-xl p-3 text-xs text-slate-100 font-sans focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewTemplate(false)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewTemplate}
                    disabled={!newTemplateForm.title?.trim() || !newTemplateForm.content?.trim()}
                    className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-extrabold text-xs shadow-md disabled:opacity-50"
                  >
                    Salvar e Criar Template
                  </button>
                </div>
              </div>
            )}

            {/* Template Selector Cards / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {templateList.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all relative group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                        : 'bg-[#131926]/60 border-[#1F293D] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tmpl.icon || '💬'}</span>
                        <span className={`text-xs font-extrabold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {tmpl.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {tmpl.isDefault ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1A2338] text-slate-400 font-mono">
                            Padrão
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja excluir o template "${tmpl.title}"?`)) {
                                handleDeleteTemplate(tmpl.id);
                              }
                            }}
                            className="p-1 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Excluir Template"
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {tmpl.description || tmpl.content.slice(0, 50)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Active Template Editor & Live Interactive Tags */}
            {(() => {
              const currentTmpl = templateList.find((t) => t.id === selectedTemplateId) || templateList[0];
              if (!currentTmpl) return null;

              const sampleVars = {
                nome: 'Rodrigo Silva',
                empresa: 'Alpha Tech',
                especialidade: 'Mentoria Scale',
                data: '28/08 (Quinta)',
                horario: '15:00',
                link: 'https://meet.google.com/rocket-club',
                dataRenovacao: '30/09/2026',
                diasRestantes: 15,
                tarefa: 'Estruturação do Funil High-Ticket',
                status: 'Concluído 🚀',
                valor: 'R$ 15.000,00',
                linkPagamento: 'https://pagamento.rocketclub.com',
              };

              const previewText = interpolateWhatsAppTemplate(currentTmpl.content, sampleVars);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-[#1F293D]/60">
                  {/* Left Column: Textarea & Tag Inserters */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span>Editando Template:</span>
                        <strong className="text-yellow-400">{currentTmpl.title}</strong>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">Clique nas tags abaixo para inserir</span>
                    </div>

                    <textarea
                      rows={9}
                      value={currentTmpl.content}
                      onChange={(e) => handleUpdateCurrentTemplateContent(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-2xl p-4 text-xs text-slate-100 font-sans focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 leading-relaxed shadow-inner"
                    />

                    {/* Quick Tag Inserter Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Inserir Tags com 1 Clique:
                      </span>
                      <div className="flex gap-1.5 flex-wrap text-xs">
                        {[
                          { tag: '{nome}', label: 'Nome' },
                          { tag: '{empresa}', label: 'Empresa' },
                          { tag: '{data}', label: 'Data' },
                          { tag: '{horario}', label: 'Horário' },
                          { tag: '{link}', label: 'Link Reunião' },
                          { tag: '{dataRenovacao}', label: 'Data Renovação' },
                          { tag: '{diasRestantes}', label: 'Dias Restantes' },
                          { tag: '{tarefa}', label: 'Tarefa' },
                          { tag: '{status}', label: 'Status' },
                          { tag: '{valor}', label: 'Valor' },
                        ].map((t) => (
                          <button
                            key={t.tag}
                            type="button"
                            onClick={() => handleInsertTag(t.tag)}
                            className="px-2.5 py-1 rounded-lg bg-[#131926] hover:bg-theme-primary/10 text-theme-primary hover:text-theme-primary border border-[#1F293D] hover:border-theme-primary/40 text-[11px] font-mono font-semibold transition-all hover:scale-105"
                          >
                            + {t.tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Real-Time WhatsApp Balloon Preview */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Prévia ao Vivo no WhatsApp
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        Visualização Real
                      </span>
                    </div>

                    <div className="p-4 bg-[#070A12] border border-emerald-500/20 rounded-2xl relative min-h-[220px] flex flex-col justify-end shadow-xl">
                      <div className="bg-[#1F2C34] text-slate-100 p-3.5 rounded-2xl rounded-tl-none text-xs font-sans whitespace-pre-line leading-relaxed shadow-lg border-l-4 border-emerald-500">
                        {previewText}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1F293D]/40 text-[10px] text-slate-500">
                        <span>Destinatário: Rodrigo Silva (+55 11 99999-8888)</span>
                        <span>Agora ✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DADOS DA EMPRESA & LOGOTIPOS (WHITELABEL COMPLETO)                    */}
      {/* ========================================================================= */}
      {activeTab === 'company' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                  <Palette size={20} style={{ color: activePalette.tokens.primary }} />
                  <span>Logotipos & Identidade Visual da Marca</span>
                </h3>
                <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Envie o logotipo completo e o ícone reduzido para personalizar o menu expandido e recolhido.
                </p>
              </div>
              <Badge variant="outline" className="border-theme-primary/40 text-theme-primary self-start sm:self-auto">
                Whitelabel Multi-Empresa
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Logo Completo */}
              <Card className="p-5 bg-[#0B0F17]/70 space-y-4 border-[#1F293D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} style={{ color: activePalette.tokens.primary }} />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      1. Logo Completo (Menu Expandido & PDF)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">PNG, WEBP ou SVG</span>
                </div>

                <div className="relative border-2 border-dashed border-theme-primary/30 hover:border-theme-primary/60 transition-colors rounded-2xl p-5 bg-[#131926]/60 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer group min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    <Upload size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Clique ou arraste o Logo Completo
                    </span>
                    <span className="text-[10px] text-slate-400">Dimensão recomendada: 400x120px ou horizontal</span>
                  </div>
                </div>

                {/* Preview Box */}
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Completo" className="max-h-10 max-w-[150px] object-contain rounded p-1 bg-slate-900 border border-[#1F293D]" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">Logo padrão ativo (Texto + 🚀)</span>
                    )}
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl('');
                        setCompany((prev) => ({ ...prev, logoUrl: '' }));
                        DEFAULT_TENANT.logoUrl = '';
                        DEFAULT_TENANT.company.logoUrl = '';
                        if (typeof window !== 'undefined') localStorage.removeItem('rocket_club_company_logo');
                      }}
                      className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  )}
                </div>
              </Card>

              {/* 2. Ícone Reduzido */}
              <Card className="p-5 bg-[#0B0F17]/70 space-y-4 border-[#1F293D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} style={{ color: activePalette.tokens.primary }} />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      2. Ícone Reduzido (Menu Fechado / Compacto)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">1:1 Quadrado</span>
                </div>

                <div className="relative border-2 border-dashed border-theme-primary/30 hover:border-theme-primary/60 transition-colors rounded-2xl p-5 bg-[#131926]/60 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer group min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    <Upload size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Clique ou arraste o Ícone Reduzido
                    </span>
                    <span className="text-[10px] text-slate-400">Dimensão recomendada: 120x120px (Quadrado)</span>
                  </div>
                </div>

                {/* Preview Box */}
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {iconUrl ? (
                      <img src={iconUrl} alt="Ícone Reduzido" className="w-10 h-10 object-contain rounded-lg p-1 bg-slate-900 border border-yellow-500/30" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">Ícone padrão ativo (🚀)</span>
                    )}
                  </div>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIconUrl('');
                        setCompany((prev) => ({ ...prev, iconUrl: '' }));
                        DEFAULT_TENANT.iconUrl = '';
                        DEFAULT_TENANT.company.iconUrl = '';
                        if (typeof window !== 'undefined') localStorage.removeItem('rocket_club_company_icon');
                      }}
                      className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  )}
                </div>
              </Card>
            </div>
          </Card>

          {/* Dados Oficiais da Empresa */}
          <Card className="p-6 space-y-6">
            <div className="pb-4 border-b border-[#1F293D]">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                <Building2 size={20} style={{ color: activePalette.tokens.primary }} />
                <span>Dados Cadastrais & Contato da Empresa</span>
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Informações corporativas utilizadas na emissão de fichas, contratos, cabeçalhos e relatórios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Razão Social Oficial</label>
                <input
                  type="text"
                  value={company.companyName}
                  onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                  placeholder="Ex: Rocket Club Mentoria Empresarial LTDA"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome Fantasia / Marca</label>
                <input
                  type="text"
                  value={company.tradeName}
                  onChange={(e) => setCompany({ ...company, tradeName: e.target.value })}
                  placeholder="Ex: Rocket Club Ecossistema"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={company.cnpj}
                  onChange={(e) => setCompany({ ...company, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Segmento / Ramo de Atuação</label>
                <input
                  type="text"
                  value={company.segment}
                  onChange={(e) => setCompany({ ...company, segment: e.target.value })}
                  placeholder="Ex: Mentoria Executiva & Aceleração de Empresas"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">E-mail Corporativo de Suporte</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={company.email}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Telefone / WhatsApp Comercial</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: maskPhone(e.target.value) })}
                    placeholder="(11) 99999-8888"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PLANOS & ASSINATURAS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'levels' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                  <Key size={20} style={{ color: activePalette.tokens.primary }} />
                  <span>Níveis de Assinatura & Planos de Membros</span>
                </h3>
                <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Categorize os planos de aceleração e mentorias do ecossistema.
                </p>
              </div>

              <button
                onClick={() => setIsCreatingLevel(!isCreatingLevel)}
                className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                <Plus size={16} />
                <span>Novo Plano / Nível</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {accessLevels.map((lvl) => (
                <div
                  key={lvl.id}
                  className={`p-5 rounded-3xl border space-y-3 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={lvl.badge}>
                      {lvl.name}
                    </Badge>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    {lvl.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 5 PILARES                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="pb-4 border-b border-[#1F293D]">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                <Target size={20} style={{ color: activePalette.tokens.primary }} />
                <span>5 Pilares da Metodologia Rocket Club</span>
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Pilares estruturais avaliados no diagnóstico de evolução de cada mentorado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {pillar}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DEPARTAMENTOS                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'depts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="pb-4 border-b border-[#1F293D]">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                <Building size={20} style={{ color: activePalette.tokens.primary }} />
                <span>Departamentos & Setores da Operação</span>
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Organize os artigos da Wiki e responsabilidades dos membros da equipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                  }`}
                >
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {dept.name}
                  </span>
                  {dept.fixed && (
                    <Badge variant="outline" className="text-[10px]">
                      Padrão
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: IMPORTAR CSV                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'csv' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg" style={{ backgroundColor: activePalette.tokens.badgeBg, color: activePalette.tokens.primary }}>
              <FileSpreadsheet size={32} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                Importação em Massa via CSV / Planilha
              </h3>
              <p className={`text-xs max-w-md mx-auto mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Importe listas de mentorados, leads do CRM ou transações financeiras de forma automatizada.
              </p>
            </div>

            {csvStatus ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold max-w-md mx-auto">
                {csvStatus}
              </div>
            ) : (
              <button
                onClick={() => {
                  setCsvStatus('Validando colunas do arquivo... 34 registros importados com sucesso!');
                  setTimeout(() => setCsvStatus(null), 4000);
                }}
                className="px-6 py-3 rounded-2xl font-bold text-xs shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                <Upload size={16} />
                <span>Simular Upload de CSV</span>
              </button>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MÓDULOS SAAS                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'saas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="pb-4 border-b border-[#1F293D]">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                <Sliders size={20} style={{ color: activePalette.tokens.primary }} />
                <span>Ativação de Módulos & Feature Flags</span>
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Ative ou desative módulos inteiros do ecossistema SaaS para este tenant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'crm', label: 'CRM & Funil de Vendas' },
                { key: 'mentorados', label: 'Gestão de Mentorados' },
                { key: 'academy', label: 'Rocket Academy' },
                { key: 'wiki', label: 'Wiki & SOPs' },
                { key: 'financial', label: 'Módulo Financeiro' },
                { key: 'events', label: 'Eventos Presenciais' },
                { key: 'whatsapp_automation', label: 'Automação de WhatsApp' },
                { key: 'ai_copilot', label: 'IA Copilot Executivo' },
              ].map((mod) => (
                <div
                  key={mod.key}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                  }`}
                >
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {mod.label}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ATIVO
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO USUÁRIO                                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        title="Cadastrar Novo Usuário"
        subtitle="Defina o cargo de acesso (Master, Administrador, Editor, Cliente, Usuário) e departamento"
        icon={<Users size={20} />}
        size="md"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
          {userActionError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{userActionError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">E-mail Corporativo</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="usuario@empresa.com.br"
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-8888"
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Cargo & Nível de Acesso</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
              >
                {isMaster && <option value="Master">👑 Master (Acesso Total)</option>}
                <option value="Administrador">🛡️ Administrador (Operacional Total)</option>
                <option value="Editor">✏️ Editor (Conteúdo & CRM)</option>
                <option value="Cliente">🎓 Cliente (Mentorado VIP)</option>
                <option value="Usuário">👤 Usuário (Visitante / Básico)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Departamento</label>
              <select
                value={newUserDept}
                onChange={(e) => setNewUserDept(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Senha Inicial de Acesso */}
          <div className="pt-3 border-t border-[#1F293D]/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                <Lock size={14} style={{ color: activePalette.tokens.primary }} />
                <span>Senha de Acesso</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                (Opcional - padrão: 123456)
              </span>
            </div>

            <div className="relative">
              <input
                type={showNewUserPassword ? 'text' : 'password'}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Crie uma senha de acesso..."
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-3.5 pr-10 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              />
              <button
                type="button"
                onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                title={showNewUserPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Medidor de Força de Senha */}
            {newUserPassword && (
              <PasswordStrengthMeter
                password={newUserPassword}
                isLightMode={isLightMode}
                showSuggestions={true}
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F293D]">
            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-400 hover:text-slate-200 border border-[#1F293D] font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold shadow-md hover:scale-105 transition-all"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Salvar Usuário
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR USUÁRIO                                                     */}
      {/* ========================================================================= */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Editar Usuário: ${editingUser.name}`}
          subtitle="Atualize os dados, perfil de acesso e senha deste membro da equipe"
          icon={<Edit2 size={20} />}
          size="md"
        >
          <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
            {userActionError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{userActionError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Telefone</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: maskPhone(e.target.value) })}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Cargo / Nível</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                >
                  {isMaster && <option value="Master">👑 Master (Acesso Total)</option>}
                  <option value="Administrador">🛡️ Administrador</option>
                  <option value="Editor">✏️ Editor</option>
                  <option value="Cliente">🎓 Cliente</option>
                  <option value="Usuário">👤 Usuário</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
              </div>
            </div>

            {/* Seção de Troca de Senha */}
            <div className="pt-3 border-t border-[#1F293D]/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Lock size={14} style={{ color: activePalette.tokens.primary }} />
                  <span>Trocar Senha de Acesso</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  (Deixe em branco para manter a atual)
                </span>
              </div>

              <div className="relative">
                <input
                  type={showEditingUserPassword ? 'text' : 'password'}
                  value={editingUserPassword}
                  onChange={(e) => setEditingUserPassword(e.target.value)}
                  placeholder="Digite uma nova senha para atualizar..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-3.5 pr-10 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowEditingUserPassword(!showEditingUserPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showEditingUserPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showEditingUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Medidor de Força de Senha */}
              {editingUserPassword && (
                <PasswordStrengthMeter
                  password={editingUserPassword}
                  isLightMode={isLightMode}
                  showSuggestions={true}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-400 hover:text-slate-200 border border-[#1F293D] font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold shadow-md hover:scale-105 transition-all"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                Atualizar Usuário
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE USUÁRIO COM VERIFICAÇÃO HIERÁRQUICA                     */}
      {/* ========================================================================= */}
      {deletingUserTarget && (
        <Modal
          isOpen={Boolean(deletingUserTarget)}
          onClose={() => {
            setDeletingUserTarget(null);
            setDeleteBlockedReason(null);
          }}
          size="sm"
          hideHeader
        >
          <div className="text-center space-y-4 pt-2">
            {deleteBlockedReason ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                  <Shield size={32} className="text-amber-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-100">
                    Ação Bloqueada por Regra Hierárquica
                  </h3>
                  <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-left">
                    🛡️ <strong>Regra do Sistema:</strong> {deleteBlockedReason}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingUserTarget(null);
                      setDeleteBlockedReason(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-200 text-xs font-bold border border-[#1F293D]"
                  >
                    Entendido
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                  <Trash2 size={28} className="animate-pulse text-red-500" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-100">Confirmar Exclusão</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tem certeza que deseja excluir o usuário{' '}
                    <strong className="text-slate-100">"{deletingUserTarget.name}"</strong> (Cargo:{' '}
                    {deletingUserTarget.role})? Esta ação é irreversível.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setDeletingUserTarget(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 text-xs font-bold border border-[#1F293D]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteUser}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white text-xs font-black shadow-lg shadow-red-500/25"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAÇÃO PARA RESTAURAR PERMISSÕES PADRÃO                       */}
      {/* ========================================================================= */}
      {isResetPermissionsModalOpen && (
        <Modal
          isOpen={isResetPermissionsModalOpen}
          onClose={() => setIsResetPermissionsModalOpen(false)}
          size="sm"
          hideHeader
        >
          <div className="text-center space-y-4 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center mx-auto">
              <RefreshCw size={28} className="text-yellow-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-100">Restaurar Matriz Recomendada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deseja restaurar as permissões recomendadas de fábrica para todos os 5 cargos (Master, Admin, Editor, Cliente, Usuário)?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsResetPermissionsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-bold border border-[#1F293D]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRolePermissions();
                  setIsResetPermissionsModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl font-black text-xs shadow-md"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                Restaurar Padrão
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
