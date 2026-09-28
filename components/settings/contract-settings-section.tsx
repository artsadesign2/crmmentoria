'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck,
  Upload,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Building,
  Lock,
  Copy,
  FileText,
  FileCode,
  Info,
  ExternalLink,
  Tag,
  Check,
} from 'lucide-react';
import {
  ContractTemplateConfig,
  DEFAULT_CONTRACT_TEMPLATE,
  CONTRACT_VARIABLE_TAGS,
  interpolateContractTemplate,
  getStoredContractTemplate,
  saveStoredContractTemplate,
} from '@/lib/contracts/contract-template';
import { toast } from '@/lib/toast-context';
import { useTheme } from '@/lib/theme-context';

export function ContractSettingsSection({ canEdit }: { canEdit: boolean }) {
  const { isLightMode, activePalette } = useTheme();

  const [template, setTemplate] = useState<ContractTemplateConfig>(DEFAULT_CONTRACT_TEMPLATE);
  const [activeMode, setActiveMode] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Carregar template do servidor com fallback para localStorage
  useEffect(() => {
    // 1. Carrega do localStorage imediato para não piscar
    const cached = getStoredContractTemplate();
    if (cached) setTemplate(cached);

    // 2. Carrega da API da organização
    fetch('/api/contracts/template')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.template) {
          setTemplate(data.template);
          saveStoredContractTemplate(data.template);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) {
      toast.error('Permissão negada', 'Apenas Administradores e Masters podem alterar o modelo de contrato.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Salva no banco de dados via API
      const res = await fetch('/api/contracts/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao salvar no servidor.');
      }

      // 2. Persiste localmente
      saveStoredContractTemplate(template);
      toast.success('Modelo de Contrato salvo!', 'As cláusulas homologadas serão aplicadas a todos os novos contratos gerados.');
    } catch (err: any) {
      // Fallback local se estiver offline
      saveStoredContractTemplate(template);
      toast.warning('Salvo localmente', err.message || 'Configuração persistida no navegador.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (confirm('Deseja restaurar as cláusulas para o modelo padrão homologado do Rocket Club?')) {
      setTemplate(DEFAULT_CONTRACT_TEMPLATE);
      saveStoredContractTemplate(DEFAULT_CONTRACT_TEMPLATE);
      toast.info('Modelo restaurado', 'As cláusulas padrão foram recarregadas.');
    }
  };

  // Leitura e extração de arquivo (.txt, .docx, .pdf)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMsg(null);

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const text = await file.text();
        setTemplate((prev) => ({
          ...prev,
          clausesText: text,
          pdfReferenceName: file.name,
        }));
        setUploadSuccessMsg(`Arquivo "${file.name}" importado com sucesso! (${text.length} caracteres)`);
        toast.success('Texto importado com sucesso!');
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        // Leitura básica de DOCX via FileReader (extrai strings textuais)
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const rawContent = decoder.decode(arrayBuffer);
        
        // Extrai texto legível de XMLs internos do docx ou fallback
        const xmlMatches = rawContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        let extractedText = '';
        if (xmlMatches && xmlMatches.length > 0) {
          extractedText = xmlMatches
            .map((tag) => tag.replace(/<[^>]+>/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ');
        } else {
          // Fallback para texto plano do buffer
          extractedText = rawContent.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ');
        }

        if (extractedText.trim().length > 50) {
          setTemplate((prev) => ({
            ...prev,
            clausesText: extractedText.trim(),
            pdfReferenceName: file.name,
          }));
          setUploadSuccessMsg(`Documento Word "${file.name}" extraído com sucesso!`);
          toast.success('Documento Word importado!');
        } else {
          toast.warning('Aviso de leitura', 'Não foi possível extrair o texto completo do DOCX. Você pode copiar e colar o texto no editor abaixo.');
        }
      } else if (fileName.endsWith('.pdf')) {
        // PDF: armazena referência e lê conteúdo textual simples
        const text = await file.text();
        const cleanText = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ');
        if (cleanText.trim().length > 100) {
          setTemplate((prev) => ({
            ...prev,
            clausesText: cleanText.trim(),
            pdfReferenceName: file.name,
          }));
          setUploadSuccessMsg(`PDF "${file.name}" carregado.`);
        } else {
          setTemplate((prev) => ({
            ...prev,
            pdfReferenceName: file.name,
          }));
          setUploadSuccessMsg(`Arquivo PDF "${file.name}" vinculado como referência.`);
          toast.info('PDF vinculado', 'Você pode colar as cláusulas textuais no editor para substituição dinâmica.');
        }
      } else {
        toast.error('Formato não suportado', 'Por favor envie arquivos .docx, .txt ou .pdf.');
      }
    } catch (err: any) {
      console.error('Erro ao ler arquivo:', err);
      toast.error('Erro ao ler arquivo', 'Tente copiar e colar o texto diretamente no editor.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Inserir tag dinâmica na posição do cursor
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplate((prev) => ({ ...prev, clausesText: `${prev.clausesText} ${tag}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = template.clausesText;
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);

    setTemplate((prev) => ({ ...prev, clausesText: newText }));

    // Reposiciona o cursor após a tag inserida
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);

    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Dados fictícios para Pré-visualização ao vivo
  const sampleMenteeData = {
    nomeMentorado: 'Dra. Patricia Medeiros',
    documento: '28.934.812/0001-44',
    email: 'patricia@medeirosclinic.com.br',
    telefone: '(11) 99888-1234',
    endereco: 'Alameda Santos, 1470 - Cerqueira César, São Paulo/SP',
    empresaCliente: 'Medeiros Estética Avançada',
    especialidade: 'Clínica & Gestão em Saúde',
    programaMentoria: 'Mentoria Rocket Scale High-Ticket',
    valorTotal: 18000,
    duracaoMeses: 6,
    formaPagamento: 'Pix Instantâneo (Entrada + 5x)',
    dataInicio: new Date().toLocaleDateString('pt-BR'),
    razaoSocialContratada: template.contractorName,
    cnpjContratada: template.contractorDocument,
    enderecoContratada: template.contractorAddress,
  };

  const previewInterpolatedText = interpolateContractTemplate(template.clausesText, sampleMenteeData);

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação */}
      <div
        className={`p-6 rounded-3xl border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111728] border-[#1F293D]'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              border: `1px solid ${activePalette.tokens.badgeBorder}`,
            }}
          >
            <FileCheck size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight" style={{ color: activePalette.tokens.textPrimary }}>
                Modelo de Contrato Homologado
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: activePalette.tokens.badgeBg,
                  color: activePalette.tokens.primary,
                  border: `1px solid ${activePalette.tokens.badgeBorder}`,
                }}
              >
                Validade Jurídica
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Configure aqui o contrato oficial da sua empresa. Você pode subir o arquivo homologado (Word, PDF ou Texto) ou editar as cláusulas diretamente. O sistema substituirá as tags dinâmicas automaticamente para cada mentorado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={!canEdit}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-400 border-[#1F293D]'
            }`}
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={!canEdit || isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            <Save size={15} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Modelo'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Dados da Empresa Contratada */}
      <div
        className={`p-6 rounded-3xl border space-y-4 ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111728] border-[#1F293D]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: activePalette.tokens.surfaceBorder }}>
          <div className="flex items-center gap-2">
            <Building size={16} style={{ color: activePalette.tokens.primary }} />
            <h3 className="text-sm font-bold text-slate-100">1. Dados da Empresa (CONTRATADA)</h3>
          </div>
          <span className="text-[11px] text-slate-400">Informações que constarão no cabeçalho do contrato</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Razão Social da Empresa *</label>
            <input
              type="text"
              disabled={!canEdit}
              value={template.contractorName}
              onChange={(e) => setTemplate({ ...template, contractorName: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">CNPJ da Empresa *</label>
            <input
              type="text"
              disabled={!canEdit}
              value={template.contractorDocument}
              onChange={(e) => setTemplate({ ...template, contractorDocument: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Responsável Legal / Representante</label>
            <input
              type="text"
              disabled={!canEdit}
              value={template.contractorRepresentative}
              onChange={(e) => setTemplate({ ...template, contractorRepresentative: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">E-mail para Notificações Jurídicas</label>
            <input
              type="email"
              disabled={!canEdit}
              value={template.contractorEmail}
              onChange={(e) => setTemplate({ ...template, contractorEmail: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">WhatsApp / Telefone de Suporte</label>
            <input
              type="text"
              disabled={!canEdit}
              value={template.contractorPhone}
              onChange={(e) => setTemplate({ ...template, contractorPhone: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Endereço Comercial Completo</label>
            <input
              type="text"
              disabled={!canEdit}
              value={template.contractorAddress}
              onChange={(e) => setTemplate({ ...template, contractorAddress: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none ${
                isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Upload de Arquivo Homologado */}
      <div
        className={`p-6 rounded-3xl border space-y-4 ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111728] border-[#1F293D]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: activePalette.tokens.surfaceBorder }}>
          <div className="flex items-center gap-2">
            <Upload size={16} style={{ color: activePalette.tokens.primary }} />
            <h3 className="text-sm font-bold text-slate-100">2. Importar Contrato Homologado da Empresa</h3>
          </div>
          <span className="text-[11px] text-slate-400">Formatos aceitos: Word (.docx), Texto (.txt) ou PDF (.pdf)</span>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isLightMode
              ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
              : 'border-[#1F293D] bg-[#0B0F17]/60 hover:bg-[#0B0F17] hover:border-yellow-500/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,.txt,.md,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
              }}
            >
              <Upload size={22} />
            </div>
            <p className="text-xs font-bold text-slate-200 mt-1">
              Clique para selecionar ou arraste o arquivo do seu contrato homologado aqui
            </p>
            <p className="text-[11px] text-slate-400">
              O sistema fará a leitura automática do texto e preencherá o editor abaixo com as cláusulas
            </p>
          </div>
        </div>

        {uploadSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Editor & Tags Dinâmicas */}
      <div
        className={`p-6 rounded-3xl border space-y-4 ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111728] border-[#1F293D]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: activePalette.tokens.surfaceBorder }}>
          <div className="flex items-center gap-2">
            <Edit3 size={16} style={{ color: activePalette.tokens.primary }} />
            <h3 className="text-sm font-bold text-slate-100">3. Cláusulas e Termos do Contrato</h3>
          </div>

          {/* Alternador de Visualização: Editor vs Preview */}
          <div className="flex items-center p-1 rounded-xl bg-[#0B0F17] border border-[#1F293D]">
            <button
              type="button"
              onClick={() => setActiveMode('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'editor'
                  ? 'bg-slate-800 text-yellow-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 size={13} />
              <span>Editor de Cláusulas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'preview'
                  ? 'bg-slate-800 text-yellow-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye size={13} />
              <span>Pré-visualização Real</span>
            </button>
          </div>
        </div>

        {activeMode === 'editor' ? (
          <div className="space-y-4">
            {/* Barra de Tags Dinâmicas Clicáveis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} style={{ color: activePalette.tokens.primary }} />
                  Tags Dinâmicas (Clique para inserir no texto):
                </span>
                <span className="text-[10px] text-slate-400">Substituição 100% automática por mentorado</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-[#0B0F17]/80 border border-[#1F293D] max-h-36 overflow-y-auto custom-scrollbar">
                {CONTRACT_VARIABLE_TAGS.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertTag(v.tag)}
                    title={`Exemplo: ${v.example}`}
                    className="px-2.5 py-1 rounded-lg bg-[#131926] hover:bg-yellow-500/20 border border-[#1F293D] hover:border-yellow-500/40 text-slate-300 hover:text-yellow-300 font-mono text-[11px] transition-all flex items-center gap-1 group"
                  >
                    <span>{v.tag}</span>
                    <span className="text-[10px] text-slate-400 font-sans group-hover:text-yellow-200/80">({v.label})</span>
                    {copiedTag === v.tag && <Check size={11} className="text-emerald-400 animate-in zoom-in" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Título do Contrato */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">Título do Documento</label>
              <input
                type="text"
                disabled={!canEdit}
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold uppercase focus:outline-none ${
                  isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            {/* Caixa de Texto das Cláusulas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-400 text-xs font-semibold">Corpo do Contrato e Cláusulas *</label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {template.clausesText.length} caracteres • {template.clausesText.split('\n').filter(Boolean).length} parágrafos
                </span>
              </div>
              <textarea
                ref={textareaRef}
                disabled={!canEdit}
                rows={16}
                value={template.clausesText}
                onChange={(e) => setTemplate({ ...template, clausesText: e.target.value })}
                placeholder="Insira as cláusulas do contrato homologado aqui..."
                className={`w-full px-4 py-3 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none custom-scrollbar ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100 focus:border-yellow-500/40'
                }`}
              />
            </div>
          </div>
        ) : (
          /* Pré-visualização Real com Substituição das Variáveis */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-yellow-300 font-bold">
                <Info size={16} />
                <span>Simulação com dados do mentorado: <strong>{sampleMenteeData.nomeMentorado}</strong> ({sampleMenteeData.empresaCliente})</span>
              </div>
              <span className="text-[11px] text-slate-400">Valor de teste: R$ 18.000,00</span>
            </div>

            <div className="p-6 rounded-2xl bg-[#090D16] border border-[#1F293D] space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-200">
              <div className="text-center pb-4 border-b border-slate-800 space-y-1">
                <h4 className="text-sm font-black text-yellow-400 uppercase tracking-wide">{template.title}</h4>
                <p className="text-[11px] text-slate-400">Número do Instrumento: RKT-CTR-2026-EXEMPLO</p>
              </div>

              <div className="whitespace-pre-wrap font-sans text-slate-300 space-y-3">
                {previewInterpolatedText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
