'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Download,
  Share2,
  Printer,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { DEFAULT_TENANT } from '@/lib/tenant';

export default function CertificatesPage() {
  const { isLightMode, activePalette } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [certificateType, setCertificateType] = useState<string>('CICLO_ACELERACAO');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedName) setBrandName(savedName);
    } catch {}

    async function load() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members && data.members.length > 0) {
          setMembers(data.members);
          setSelectedMemberId(data.members[0].id);
        } else {
          setMembers(INITIAL_MEMBERS);
          setSelectedMemberId(INITIAL_MEMBERS[0].id);
        }
      } catch {
        setMembers(INITIAL_MEMBERS);
        setSelectedMemberId(INITIAL_MEMBERS[0].id);
      }
    }
    load();
  }, []);

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0] || INITIAL_MEMBERS[0];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyValidationLink = () => {
    const link = `${window.location.origin}/certificates/verify?id=${currentMember?.id || 'demo'}&code=CERT-${Date.now().toString(36).toUpperCase()}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-2xl"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: activePalette.tokens.primary }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <Badge variant="default" className="py-1">
              <Award size={14} className="mr-1.5" /> Chancelas & Reconhecimento Oficial
            </Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
              Emissor de <span className="theme-gradient-text">Certificados Digitais</span> 📜
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Gere certificados oficiais de conclusão de ciclo, selos de faturamento e reconhecimentos com QR Code de autenticação criptográfica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1F293D] text-xs font-bold text-slate-200 flex items-center gap-2 transition-all shadow"
            >
              <Printer size={15} />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={handleCopyValidationLink}
              className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg hover:scale-105"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
                boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
              }}
            >
              {copiedLink ? <Check size={15} /> : <Share2 size={15} />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Validador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Configuration Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#111728] border border-[#1F293D]">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
            Selecione o Mentorado / Aluno:
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-theme-primary"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#111728]">
                {m.name} ({m.companyName || 'Empresa'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
            Tipo de Certificado / Distinção:
          </label>
          <select
            value={certificateType}
            onChange={(e) => setCertificateType(e.target.value)}
            className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-theme-primary"
          >
            <option value="CICLO_ACELERACAO" className="bg-[#111728]">
              Conclusão de Ciclo do Programa de Mentoria
            </option>
            <option value="SELO_100K" className="bg-[#111728]">
              Selo de Excelência Empresarial (Primeiro 100k+)
            </option>
            <option value="MASTERY_ACADEMY" className="bg-[#111728]">
              Certificado de Formação Academy Master
            </option>
            <option value="LIDER_ALTA_PERFORMANCE" className="bg-[#111728]">
              Distinção de Liderança & Gestão de Escala
            </option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
            Data de Emissão:
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-theme-primary"
          />
        </div>
      </div>

      {/* LUXURY CERTIFICATE PREVIEW CONTAINER */}
      <div className="flex justify-center p-2 sm:p-6 bg-[#080B12] rounded-3xl border border-[#1F293D]">
        <div
          ref={certificateRef}
          className="w-full max-w-4xl bg-gradient-to-b from-[#0F1422] via-[#0B0F19] to-[#0A0D16] p-8 sm:p-14 rounded-3xl border-4 relative shadow-2xl overflow-hidden text-center space-y-8"
          style={{ borderColor: activePalette.tokens.primary + '60' }}
        >
          {/* Ornamental Inner Border */}
          <div
            className="absolute inset-3 border rounded-2xl pointer-events-none"
            style={{ borderColor: activePalette.tokens.primary + '30' }}
          />
          <div
            className="absolute inset-4 border rounded-xl pointer-events-none"
            style={{ borderColor: activePalette.tokens.primary + '15' }}
          />

          {/* Top Logo & Header */}
          <div className="space-y-3 relative z-10">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl font-black shadow-lg border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
                boxShadow: `0 8px 25px ${activePalette.tokens.glow}`,
              }}
            >
              🚀
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-widest theme-gradient-text uppercase">
              {brandName} • Programa de Mentoria
            </h2>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-bold">
              Certificado Oficial de Mérito & Excelência
            </div>
          </div>

          {/* Main Body Statement */}
          <div className="space-y-4 max-w-2xl mx-auto relative z-10">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-serif italic">
              Certificamos que, após rigorosa validação e aplicação prática da metodologia de aceleração, o(a) empresário(a):
            </p>

            <div
              className="py-2 border-b-2 inline-block px-8"
              style={{ borderColor: activePalette.tokens.primary }}
            >
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-wide font-sans">
                {currentMember?.name}
              </h3>
            </div>

            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: activePalette.tokens.primary }}
            >
              {currentMember?.companyName || currentMember?.tradeName}
            </p>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-2">
              {certificateType === 'CICLO_ACELERACAO' &&
                'Concluiu com êxito o Ciclo Estratégico de Mentoria Executiva, demonstrando maturidade operacional, processos de vendas validados e governança para escala.'}
              {certificateType === 'SELO_100K' &&
                'Atingiu a marca de 6 dígitos de faturamento mensal recorrente com oferta de alto valor validada, conquistando o Selo de Excelência Empresarial 100k+.'}
              {certificateType === 'MASTERY_ACADEMY' &&
                'Concluiu com distinção todas as trilhas de especialização executiva da Academy em Tráfego, Comercial High Ticket e Gestão Estratégica.'}
              {certificateType === 'LIDER_ALTA_PERFORMANCE' &&
                'Destacou-se como Liderança de Alto Impacto no programa de mentoria, promovendo inovação contínua, geração de empregos e escala consistente.'}
            </p>
          </div>

          {/* Seal & Signatures Footer */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 items-center gap-6 relative z-10 border-t border-[#1F293D]">
            {/* Authenticity QR Code */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
              <div className="p-2 rounded-xl bg-white text-slate-950 inline-block shadow">
                <QrCode size={36} />
              </div>
              <span className="text-[9px] font-mono text-slate-400">
                Código: CERT-{(currentMember?.id || 'M1').toUpperCase()}-2026
              </span>
              <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck size={10} /> Autenticidade Registrada
              </span>
            </div>

            {/* Central Luxury Badge */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shadow-xl border-2"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  borderColor: activePalette.tokens.primary,
                  boxShadow: `0 4px 20px ${activePalette.tokens.glow}`,
                }}
              >
                ⭐
              </div>
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider mt-1.5"
                style={{ color: activePalette.tokens.primary }}
              >
                Chancela Oficial
              </span>
            </div>

            {/* Mentor Signature */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right space-y-1">
              <div
                className="text-sm font-serif italic font-bold"
                style={{ color: activePalette.tokens.primary }}
              >
                Conselho de Mentoria
              </div>
              <div
                className="w-36 h-0.5 my-0.5"
                style={{ backgroundColor: activePalette.tokens.primary }}
              />
              <span className="text-[11px] font-bold text-slate-200">Mentor & Diretoria Executiva</span>
              <span className="text-[9px] text-slate-500">
                Emitido em {new Date(issueDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
