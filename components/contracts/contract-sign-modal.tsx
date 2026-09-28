'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileCheck,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  PenTool,
  RotateCcw,
  Sparkles,
  Building,
  User,
  DollarSign,
  Calendar,
  Lock,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ContractDetails, SignedContractMetadata, generateContractModel } from '@/lib/contracts/contract-generator';
import {
  ContractTemplateConfig,
  DEFAULT_CONTRACT_TEMPLATE,
  getStoredContractTemplate,
} from '@/lib/contracts/contract-template';
import { maskCpf, maskCnpj, maskPhone } from '@/lib/masks';
import { toast } from '@/lib/toast-context';
import { useTheme } from '@/lib/theme-context';

interface ContractSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: {
    dealId?: string;
    memberId?: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientDoc?: string;
    clientAddress?: string;
    companyName?: string;
    specialty?: string;
    programName?: string;
    durationMonths?: number;
    value?: number;
    paymentMethod?: string;
  };
  onContractSigned?: (metadata: SignedContractMetadata) => void;
}

export function ContractSignModal({
  isOpen,
  onClose,
  clientData,
  onContractSigned,
}: ContractSignModalProps) {
  const { activePalette } = useTheme();
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [template, setTemplate] = useState<ContractTemplateConfig>(DEFAULT_CONTRACT_TEMPLATE);
  const [isFullTextExpanded, setIsFullTextExpanded] = useState(false);
  const [signerName, setSignerName] = useState(clientData.clientName || '');
  const [signerDocument, setSignerDocument] = useState(clientData.clientDoc || '');
  const [signerEmail, setSignerEmail] = useState(clientData.clientEmail || '');
  const [signerPhone, setSignerPhone] = useState(clientData.clientPhone || '');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedResult, setSignedResult] = useState<SignedContractMetadata | null>(null);

  // Canvas Ref para Assinatura Manuscrita
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Carregar modelo homologado e gerar minuta ao abrir
  useEffect(() => {
    if (isOpen) {
      // 1. Pega do localStorage imediato
      const cached = getStoredContractTemplate();
      const initialTemplate = cached || DEFAULT_CONTRACT_TEMPLATE;
      setTemplate(initialTemplate);

      const generated = generateContractModel(
        {
          clientName: clientData.clientName || 'Cliente Rocket Club',
          clientDoc: clientData.clientDoc || '',
          clientEmail: clientData.clientEmail || '',
          clientPhone: clientData.clientPhone || '',
          clientAddress: clientData.clientAddress || '',
          companyName: clientData.companyName || '',
          specialty: clientData.specialty || '',
          programName: clientData.programName || 'Mentoria Rocket Scale High-Ticket',
          durationMonths: clientData.durationMonths || 6,
          value: clientData.value || 12000,
          paymentMethod: clientData.paymentMethod || 'Pix / Cartão de Crédito',
        },
        initialTemplate
      );
      setContract(generated);
      setSignerName(clientData.clientName || '');
      setSignerDocument(clientData.clientDoc || '');
      setSignerEmail(clientData.clientEmail || '');
      setSignerPhone(clientData.clientPhone || '');
      setSignedResult(null);
      setHasSignature(false);
      setAgreedTerms(false);
      setIsFullTextExpanded(false);

      // 2. Busca da API da organização
      fetch('/api/contracts/template')
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.template) {
            setTemplate(data.template);
            const freshContract = generateContractModel(
              {
                clientName: clientData.clientName || 'Cliente Rocket Club',
                clientDoc: clientData.clientDoc || '',
                clientEmail: clientData.clientEmail || '',
                clientPhone: clientData.clientPhone || '',
                clientAddress: clientData.clientAddress || '',
                companyName: clientData.companyName || '',
                specialty: clientData.specialty || '',
                programName: clientData.programName || 'Mentoria Rocket Scale High-Ticket',
                durationMonths: clientData.durationMonths || 6,
                value: clientData.value || 12000,
                paymentMethod: clientData.paymentMethod || 'Pix / Cartão de Crédito',
              },
              data.template
            );
            setContract(freshContract);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, clientData]);


  // Inicializar Canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#EAB308'; // Dourado Rocket Club
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, signedResult]);

  if (!isOpen) return null;

  // Handlers para Desenho no Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSignContract = async () => {
    if (!signerName.trim()) {
      toast.error('Informe o nome completo do signatário.');
      return;
    }
    if (!signerDocument.trim()) {
      toast.error('Informe o CPF ou CNPJ do signatário.');
      return;
    }
    if (!signerEmail.trim()) {
      toast.error('Informe o e-mail do signatário.');
      return;
    }
    if (!agreedTerms) {
      toast.error('Você deve concordar com os termos e cláusulas contratuais.');
      return;
    }

    let signatureBase64 = '';
    if (canvasRef.current && hasSignature) {
      signatureBase64 = canvasRef.current.toDataURL('image/png');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: contract?.contractNumber,
          clientName: clientData.clientName,
          signerName,
          signerDocument,
          signerEmail,
          signerPhone,
          signatureImageBase64: signatureBase64 || undefined,
          programName: contract?.mentorProgram,
          totalValue: contract?.totalValue,
          dealId: clientData.dealId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Falha ao assinar contrato');
      }

      setSignedResult(data.signedMetadata);
      toast.success('Contrato assinado eletronicamente e registrado com hash SHA-256!');
      if (onContractSigned) {
        onContractSigned(data.signedMetadata);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro de comunicação ao assinar contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAuditHash = () => {
    if (signedResult?.hashAuditSha256) {
      navigator.clipboard.writeText(signedResult.hashAuditSha256);
      toast.success('Hash criptográfico de auditoria copiado!');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0f172a] border border-yellow-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                Assinatura Digital de Contrato
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  Validade Jurídica
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {contract?.contractNumber || 'Gerando número...'} • Termo de Adesão e Mentoria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {signedResult ? (
            /* Tela de Sucesso com Selo de Integridade */
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                <ShieldCheck size={44} />
              </div>

              <div>
                <h3 className="text-xl font-black text-emerald-400">
                  Contrato Assinado & Registrado!
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  A integridade deste documento foi chancelada com carimbo temporal e hash criptográfico imutável SHA-256.
                </p>
              </div>

              {/* Card de Auditoria */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Documento:</span>
                  <span className="font-bold text-slate-200">{signedResult.contractId}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Signatário:</span>
                  <span className="font-bold text-slate-200">{signedResult.signerName} ({signedResult.signerDocument})</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Data/Hora:</span>
                  <span className="font-bold text-slate-200">{new Date(signedResult.signedAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">IP de Registro:</span>
                  <span className="font-mono text-slate-200">{signedResult.ipAddress}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Hash de Auditoria SHA-256:</span>
                    <button
                      type="button"
                      onClick={copyAuditHash}
                      className="text-[11px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-bold"
                    >
                      <Copy size={12} /> Copiar Hash
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-yellow-300/90 break-all select-all">
                    {signedResult.hashAuditSha256}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-yellow-500/20"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          ) : (
            /* Fluxo de Assinatura e Pré-visualização do Contrato */
            <div className="space-y-6">
              {/* Resumo dos Valores e Partes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Building size={12} className="text-yellow-400" /> CONTRATADA (Oficial)
                  </span>
                  <p className="text-xs font-bold text-slate-200 mt-1 truncate" title={contract?.contractor.name}>
                    {contract?.contractor.name || template.contractorName}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {contract?.contractor.document || template.contractorDocument}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <User size={12} className="text-yellow-400" /> CONTRATANTE (Mentorado)
                  </span>
                  <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {clientData.clientName || 'Mentorado'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{clientData.clientEmail || 'email@exemplo.com'}</p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <DollarSign size={12} className="text-emerald-400" /> INVESTIMENTO TOTAL
                  </span>
                  <p className="text-sm font-black text-emerald-400 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract?.totalValue || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">{contract?.durationMonths || 6} Meses de Mentoria</p>
                </div>
              </div>

              {/* Cláusulas Contratuais Homologadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Lock size={13} className="text-yellow-400" />
                    <span>Termos e Cláusulas Contratuais Homologadas</span>
                    {template.pdfReferenceName && (
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Doc: {template.pdfReferenceName}
                      </span>
                    )}
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (contract?.clausesText) {
                          navigator.clipboard.writeText(contract.clausesText);
                          toast.success('Minuta completa do contrato copiada!');
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Copy size={12} /> Copiar Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFullTextExpanded(!isFullTextExpanded)}
                      className="text-[11px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-bold transition-colors"
                    >
                      {isFullTextExpanded ? (
                        <>
                          <Minimize2 size={12} /> Recolher
                        </>
                      ) : (
                        <>
                          <Maximize2 size={12} /> Expandir Minuta
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className={`p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed custom-scrollbar transition-all ${
                    isFullTextExpanded ? 'max-h-[360px] overflow-y-auto' : 'max-h-44 overflow-y-auto'
                  }`}
                >
                  <p className="font-extrabold text-yellow-400/90 tracking-wide pb-1 border-b border-slate-800">
                    {contract?.title}
                  </p>
                  {contract?.clauses?.map((clause, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-slate-200 font-sans whitespace-pre-line">{clause}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dados do Signatário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nome Completo do Signatário *
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nome completo conforme documento"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    CPF ou CNPJ do Signatário *
                  </label>
                  <input
                    type="text"
                    value={signerDocument}
                    onChange={(e) => setSignerDocument(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    E-mail para Notificação Jurídica *
                  </label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    WhatsApp para Recebimento de Cópia
                  </label>
                  <input
                    type="text"
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Canvas para Assinatura Manuscrita */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <PenTool size={13} className="text-yellow-400" />
                    Assinatura Manuscrita (Desenhe abaixo com Mouse ou Toque)
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 font-bold transition-colors"
                  >
                    <RotateCcw size={12} /> Limpar
                  </button>
                </div>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-yellow-500/50 rounded-xl bg-slate-950 overflow-hidden touch-none transition-colors">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair block"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 text-xs font-medium">
                      Rubrique ou assine com o dedo ou mouse aqui...
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox de Aceite */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-yellow-500 focus:ring-yellow-400"
                />
                <span className="text-xs text-slate-300 leading-tight">
                  Declaro que li, compreendi e concordo integralmente com todas as cláusulas do contrato acima, reconhecendo a validade jurídica plena desta assinatura eletrônica.
                </span>
              </label>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSignContract}
                  disabled={isSubmitting || !agreedTerms}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                    isSubmitting || !agreedTerms
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20 hover:scale-[1.02]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Registrando Assinatura...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      Assinar Eletronicamente & Registrar Hash
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
