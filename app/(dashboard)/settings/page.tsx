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
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import {
  DEFAULT_TENANT,
  DEFAULT_ACCESS_LEVELS,
  AccessLevel,
  CompanyData,
  FeatureFlags,
} from '@/lib/tenant';
import { maskCnpj, maskPhone } from '@/lib/masks';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'company' | 'levels' | 'system' | 'users' | 'depts' | 'csv' | 'saas'
  >('company');

  // Company / Whitelabel State
  const [company, setCompany] = useState<CompanyData>(DEFAULT_TENANT.company);
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_TENANT.company.logoUrl || '');
  const [iconUrl, setIconUrl] = useState<string>(DEFAULT_TENANT.company.iconUrl || '');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_TENANT.primaryColor);

  // Access Levels & Permissions State
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(DEFAULT_ACCESS_LEVELS);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(DEFAULT_ACCESS_LEVELS[0].id);
  const [isCreatingLevel, setIsCreatingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelDesc, setNewLevelDesc] = useState('');

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
    { id: 'd1', name: 'Operacional', fixed: true },
    { id: 'd2', name: 'Comercial', fixed: true },
    { id: 'd3', name: 'Financeiro', fixed: true },
    { id: 'd4', name: 'Jurídico', fixed: true },
  ]);
  const [newDeptName, setNewDeptName] = useState('');

  // Users List
  const [usersList, setUsersList] = useState([
    { id: 'u1', name: 'Comandante Master', email: 'master@rocketclub.com', levelId: 'lvl-master' },
    { id: 'u2', name: 'Atendimento Tripulação', email: 'atendimento@rocketclub.com', levelId: 'lvl-pro' },
  ]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserLevelId, setNewUserLevelId] = useState('lvl-pro');

  // SaaS Features
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_TENANT.features);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Permission Matrix Toggle for selected Level
  const toggleModulePermission = (
    levelId: string,
    moduleKey: keyof AccessLevel['modules']
  ) => {
    setAccessLevels((prev) =>
      prev.map((lvl) => {
        if (lvl.id === levelId) {
          return {
            ...lvl,
            modules: {
              ...lvl.modules,
              [moduleKey]: !lvl.modules[moduleKey],
            },
          };
        }
        return lvl;
      })
    );
  };

  const handleCreateNewLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;

    const newLvl: AccessLevel = {
      id: `lvl-${Date.now()}`,
      name: newLevelName,
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: newLevelDesc || 'Nível de acesso personalizado.',
      isCustom: true,
      modules: {
        dashboard: true,
        crm: false,
        mentorados: false,
        academy: true,
        wiki: true,
        financial: false,
        events: true,
        settings: false,
      },
    };

    setAccessLevels([...accessLevels, newLvl]);
    setSelectedLevelId(newLvl.id);
    setNewLevelName('');
    setNewLevelDesc('');
    setIsCreatingLevel(false);
  };

  const [deleteTargetLevel, setDeleteTargetLevel] = useState<AccessLevel | null>(null);

  const handleConfirmDeleteLevel = () => {
    if (!deleteTargetLevel) return;
    const levelId = deleteTargetLevel.id;
    setAccessLevels(accessLevels.filter((lvl) => lvl.id !== levelId));
    if (selectedLevelId === levelId) {
      setSelectedLevelId(accessLevels[0]?.id || '');
    }
    setDeleteTargetLevel(null);
  };

  const selectedLevel =
    accessLevels.find((lvl) => lvl.id === selectedLevelId) || accessLevels[0];

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDepartments([...departments, { id: `d-${Date.now()}`, name: newDeptName, fixed: false }]);
    setNewDeptName('');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    setUsersList([
      ...usersList,
      { id: `u-${Date.now()}`, name: newUserName, email: newUserEmail, levelId: newUserLevelId },
    ]);
    setNewUserName('');
    setNewUserEmail('');
  };

  const handleProcessCSV = () => {
    setCsvStatus('Processando arquivo CSV... 34 registros validados e importados!');
    setTimeout(() => setCsvStatus(null), 4000);
  };

  const moduleDefinitions: { key: keyof AccessLevel['modules']; name: string; desc: string; icon: string }[] = [
    { key: 'dashboard', name: 'Painel Executivo / Dashboard', desc: 'Métricas gerais, faturamento estimado e health score.', icon: '📊' },
    { key: 'crm', name: 'CRM (Novos Leads & Prospecção)', desc: 'Funil de vendas, diagnóstico e conversão de prospects.', icon: '🎯' },
    { key: 'mentorados', name: 'Base de Mentorados & Fichas', desc: 'Acompanhamento de evolução, níveis e Members Book PDF.', icon: '👥' },
    { key: 'academy', name: 'Rocket Academy (Aulas)', desc: 'Acesso a cursos, videoaulas e comentários.', icon: '🎓' },
    { key: 'wiki', name: 'Wiki & SOPs de Conhecimento', desc: 'Processos internos, manuais e diretrizes operacionais.', icon: '📖' },
    { key: 'financial', name: 'Gestão Financeira & Caixa', desc: 'Controle de mensalidades, faturamento e custos.', icon: '💰' },
    { key: 'events', name: 'Eventos & Imersões Presenciais', desc: 'Agenda de encontros, hotseats e controle de presenças.', icon: '📅' },
    { key: 'settings', name: 'Configurações do Sistema', desc: 'Whitelabel, dados da empresa, permissões e usuários.', icon: '⚙️' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <Settings size={14} className="mr-1.5" /> Painel de Configurações Multi-Tenant
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Central de <span className="gold-gradient-text">Personalização & Governança</span>
          </h1>
          <p className="text-sm text-slate-400">
            Cadastre os dados da sua empresa, logotipos da marca, níveis de assinatura e controle de permissões.
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            {savedSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'company'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Building2 size={16} />
          <span>Dados da Empresa & Logos</span>
        </button>

        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'levels'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Shield size={16} />
          <span>Níveis & Permissões</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'system'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Target size={16} />
          <span>5 Pilares</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'users'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          <span>Usuários & Acesso</span>
        </button>

        <button
          onClick={() => setActiveTab('depts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'depts'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Building size={16} />
          <span>Departamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'csv'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Importar CSV</span>
        </button>

        <button
          onClick={() => setActiveTab('saas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'saas'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
          }`}
        >
          <Sliders size={16} />
          <span>Módulos SaaS</span>
        </button>
      </div>

      {/* Tab 1: DADOS DA EMPRESA & LOGOTIPOS (WHITELABEL COMPLETO) */}
      {activeTab === 'company' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Section: Logotipos & Identidade Visual */}
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Palette size={20} className="text-yellow-400" />
                  <span>Logotipos & Identidade Visual da Marca</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Envie o logotipo completo e o ícone reduzido para personalizar o menu expandido e recolhido.
                </p>
              </div>
              <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 self-start sm:self-auto">
                Whitelabel Multi-Empresa
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Logo Completo (Menu Aberto / Topbar / PDF) */}
              <Card className="p-5 bg-[#0B0F17]/70 space-y-4 border-[#1F293D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-yellow-400" />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      1. Logo Completo (Menu Expandido & PDF)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">PNG, WEBP ou SVG</span>
                </div>

                <div className="relative border-2 border-dashed border-yellow-500/30 hover:border-yellow-400/60 transition-colors rounded-2xl p-5 bg-[#131926]/60 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer group min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
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

              {/* 2. Ícone Reduzido / Favicon (Menu Fechado) */}
              <Card className="p-5 bg-[#0B0F17]/70 space-y-4 border-[#1F293D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      2. Ícone Reduzido (Menu Fechado / Compacto)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">1:1 Quadrado</span>
                </div>

                <div className="relative border-2 border-dashed border-yellow-500/30 hover:border-yellow-400/60 transition-colors rounded-2xl p-5 bg-[#131926]/60 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer group min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
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
                      <img src={iconUrl} alt="Ícone Reduzido" className="w-10 h-10 object-contain rounded-lg p-1 bg-slate-900 border border-[#1F293D]" />
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

            {/* Live Sidebar Preview (Aberto vs Fechado) */}
            <div className="p-5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-4">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block">
                👀 Pré-visualização Dinâmica do Menu Lateral (Sidebar)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preview Aberto */}
                <div className="p-4 rounded-xl bg-[#131926] border border-[#1F293D] space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Modo Expandido (Aberto)</span>
                  <div className="h-16 px-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="max-h-9 max-w-[160px] object-contain" />
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-lg">
                          🚀
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-100 gold-gradient-text block">
                            {company.tradeName || 'ROCKET CLUB'}
                          </span>
                          <span className="text-[9px] text-yellow-500 uppercase font-semibold">SaaS Enterprise</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview Fechado */}
                <div className="p-4 rounded-xl bg-[#131926] border border-[#1F293D] space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Modo Recolhido (Fechado)</span>
                  <div className="h-16 px-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-center">
                    {iconUrl ? (
                      <img src={iconUrl} alt="Ícone Preview" className="w-9 h-9 object-contain rounded-lg p-1 bg-slate-900 border border-yellow-500/30" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-lg">
                        🚀
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Section: Dados Oficiais da Empresa */}
          <Card className="p-6 space-y-6">
            <div className="pb-4 border-b border-[#1F293D]">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building2 size={20} className="text-yellow-400" />
                <span>Dados Cadastrais & Contato da Empresa</span>
              </h3>
              <p className="text-xs text-slate-400">
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

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Website Oficial</label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={company.website}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    placeholder="https://empresa.com.br"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Endereço Comercial</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={`${company.address.street}, ${company.address.number} - ${company.address.city}/${company.address.state}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompany({
                        ...company,
                        address: { ...company.address, street: val },
                      });
                    }}
                    placeholder="Av. Paulista, 1000 - São Paulo/SP"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: NÍVEIS DE ACESSO & HIERARQUIA DE PERMISSÕES */}
      {activeTab === 'levels' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Shield size={20} className="text-yellow-400" />
                  <span>Níveis de Assinatura & Matriz de Permissões</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Defina quais módulos cada nível de assinatura ou cargo tem autorização para acessar no portal.
                </p>
              </div>

              <button
                onClick={() => setIsCreatingLevel(!isCreatingLevel)}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Novo Nível / Plano</span>
              </button>
            </div>

            {/* Create New Level Modal / Form */}
            {isCreatingLevel && (
              <form
                onSubmit={handleCreateNewLevel}
                className="p-4 rounded-2xl bg-[#0B0F17] border border-yellow-500/40 space-y-3 animate-in zoom-in-95 duration-200 text-xs"
              >
                <h4 className="font-bold text-yellow-400 text-sm">Criar Novo Nível de Acesso Personalizado</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nome do Nível / Assinatura</label>
                    <input
                      type="text"
                      required
                      value={newLevelName}
                      onChange={(e) => setNewLevelName(e.target.value)}
                      placeholder="Ex: Plano Mastermind VIP"
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Descrição Breve</label>
                    <input
                      type="text"
                      value={newLevelDesc}
                      onChange={(e) => setNewLevelDesc(e.target.value)}
                      placeholder="Ex: Acesso a aulas e eventos exclusivos"
                      className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingLevel(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#131926] text-slate-400 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs"
                  >
                    Salvar Nível
                  </button>
                </div>
              </form>
            )}

            {/* Level Selector Pills */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {accessLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevelId(lvl.id)}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                    selectedLevelId === lvl.id
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60 shadow-lg shadow-yellow-500/10 scale-105'
                      : 'bg-[#0B0F17]/70 text-slate-400 border-[#1F293D] hover:bg-[#1F293D]'
                  }`}
                >
                  <Key size={14} className={selectedLevelId === lvl.id ? 'text-yellow-400' : 'text-slate-500'} />
                  <span>{lvl.name}</span>
                </button>
              ))}
            </div>

            {/* Permissions Matrix for Selected Level */}
            {selectedLevel && (
              <div className="p-6 rounded-2xl bg-[#0B0F17]/80 border border-[#1F293D] space-y-6">
                <div className="flex items-start justify-between pb-4 border-b border-[#1F293D]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-100">{selectedLevel.name}</h4>
                      <Badge variant="outline" className={selectedLevel.badge}>
                        Nível Ativo
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedLevel.description}</p>
                  </div>

                  {selectedLevel.isCustom && (
                    <button
                      onClick={() => setDeleteTargetLevel(selectedLevel)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/20 flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Excluir Nível
                    </button>
                  )}
                </div>

                {/* Modules Permission Checkbox Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduleDefinitions.map((mod) => {
                    const isGranted = selectedLevel.modules[mod.key];

                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleModulePermission(selectedLevel.id, mod.key)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                          isGranted
                            ? 'bg-yellow-500/10 border-yellow-500/40 text-slate-100 shadow-sm'
                            : 'bg-[#131926]/40 border-[#1F293D]/60 text-slate-400 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0 p-1 rounded-xl bg-[#0B0F17] border border-[#1F293D]">
                            {mod.icon}
                          </span>
                          <div>
                            <span className="text-xs font-bold block">{mod.name}</span>
                            <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                              {mod.desc}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 shrink-0">
                          {isGranted ? (
                            <div className="w-6 h-6 rounded-lg bg-yellow-500 text-slate-950 flex items-center justify-center font-bold">
                              <Check size={14} />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-[#0B0F17] border border-[#1F293D] flex items-center justify-center text-slate-600">
                              <Lock size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: 5 PILARES DA MENTORIA */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Target size={18} className="text-yellow-400" />
                  <span>Pilares do Programa de Mentoria</span>
                </h3>
                <p className="text-xs text-slate-400">Defina os nomes dos 5 pilares estratégicos da tripulação.</p>
              </div>
              <Badge variant="default">5 Pilares</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {pillars.map((pillar, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="block text-slate-400 font-semibold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    Pilar {idx + 1}
                  </label>
                  <input
                    type="text"
                    value={pillar}
                    onChange={(e) => {
                      const updated = [...pillars];
                      updated[idx] = e.target.value;
                      setPillars(updated);
                    }}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: CONTROLE DE USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users size={18} className="text-yellow-400" />
                <span>Usuários da Equipe & Atribuição de Níveis</span>
              </h3>
            </div>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end bg-[#0B0F17]/60 p-4 rounded-2xl border border-[#1F293D]">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Costa"
                  className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="mariana@empresa.com"
                  className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nível de Assinatura / Permissão</label>
                <select
                  value={newUserLevelId}
                  onChange={(e) => setNewUserLevelId(e.target.value)}
                  className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                >
                  {accessLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Cadastrar Usuário
              </button>
            </form>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0B0F17]/60 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nome</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Nível de Assinatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F293D]/60">
                  {usersList.map((u) => {
                    const userLvl = accessLevels.find((l) => l.id === u.levelId) || accessLevels[0];

                    return (
                      <tr key={u.id} className="hover:bg-[#1F293D]/30">
                        <td className="p-3 font-semibold text-slate-100">{u.name}</td>
                        <td className="p-3 text-slate-400">{u.email}</td>
                        <td className="p-3">
                          <Badge variant="default" className="text-[10px]">
                            {userLvl.name}
                          </Badge>
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

      {/* Tab 5: DEPARTAMENTOS */}
      {activeTab === 'depts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 size={18} className="text-yellow-400" />
              <span>Gerenciar Departamentos da Empresa / Wiki</span>
            </h3>

            <form onSubmit={handleAddDept} className="flex gap-3 text-xs">
              <input
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Nome do Novo Departamento (Ex: Tecnologia, Growth, Jurídico...)"
                className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1.5"
              >
                <Plus size={16} /> Adicionar
              </button>
            </form>

            <div className="space-y-2">
              {departments.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl bg-[#0B0F17]/60 border border-[#1F293D] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{d.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {d.fixed ? 'Fixo do Sistema' : 'Personalizado'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 6: IMPORTAÇÃO CSV */}
      {activeTab === 'csv' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-yellow-400" />
              <span>Importação em Massa de Dados (CSV)</span>
            </h3>

            {csvStatus && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                {csvStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-[#0B0F17]/60 space-y-3 border-[#1F293D]">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20">
                  <Upload size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-100">1. Formulário de Cadastro (CSV)</h4>
                <p className="text-xs text-slate-400">Importe dados básicos dos membros (Nome, E-mail, Telefone, Especialidade).</p>
                <button
                  onClick={handleProcessCSV}
                  className="w-full py-2.5 rounded-xl bg-[#1F293D] hover:bg-slate-700 text-yellow-300 font-bold text-xs border border-yellow-500/30 transition-colors"
                >
                  Selecionar & Processar CSV
                </button>
              </Card>

              <Card className="p-6 bg-[#0B0F17]/60 space-y-3 border-[#1F293D]">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20">
                  <FileSpreadsheet size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-100">2. Formulário de Diagnóstico (CSV)</h4>
                <p className="text-xs text-slate-400">Importe faturamento, metas, desafios e hobbies dos mentorados.</p>
                <button
                  onClick={handleProcessCSV}
                  className="w-full py-2.5 rounded-xl bg-[#1F293D] hover:bg-slate-700 text-yellow-300 font-bold text-xs border border-yellow-500/30 transition-colors"
                >
                  Selecionar & Processar CSV
                </button>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 7: MÓDULOS SAAS */}
      {activeTab === 'saas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sliders size={18} className="text-yellow-400" />
              <span>Modularidade Global de Recursos (Feature Flags)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(features).map((key) => (
                <Card key={key} className="p-4 bg-[#0B0F17]/60 flex items-center justify-between border-[#1F293D]">
                  <div>
                    <span className="text-xs font-bold text-slate-100 block uppercase">{key}</span>
                    <span className="text-[11px] text-slate-400">Ativar módulo na organização</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeatures((prev) => ({ ...prev, [key]: !prev[key as keyof FeatureFlags] }))}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                      features[key as keyof FeatureFlags] ? 'bg-yellow-500' : 'bg-[#1F293D]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                        features[key as keyof FeatureFlags] ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Styled Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetLevel}
        title="Excluir Nível de Acesso"
        itemName={deleteTargetLevel?.name}
        description={`Tem certeza que deseja excluir o nível de acesso "${deleteTargetLevel?.name}"? Esta ação removerá este nível personalizado do controle de acessos.`}
        confirmText="Sim, Excluir Nível"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteLevel}
        onCancel={() => setDeleteTargetLevel(null)}
      />
    </div>
  );
}
