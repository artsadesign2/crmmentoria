import { NextResponse } from 'next/server';
import { DEFAULT_TENANT } from '@/lib/tenant';

export async function GET(request: Request) {
  const currentDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const fileName = `Guia_Executivo_Rocket_Club_${new Date().getFullYear()}.pdf`;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guia Executivo da Plataforma — Rocket Club</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

  <style>
    @page {
      size: A4 portrait;
      margin: 0mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #050B14;
      color: #F1F5F9;
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── STICKY TOP TOOLBAR ── */
    .top-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: rgba(11, 20, 36, 0.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #1E2D4A;
      padding: 12px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
    }

    .toolbar-container {
      width: 100%;
      max-width: 210mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .toolbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toolbar-brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 0.5px;
    }

    .toolbar-badge {
      background: rgba(223, 178, 108, 0.15);
      border: 1px solid #DFB26C;
      color: #F6D69A;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-download {
      background: linear-gradient(135deg, #DFB26C 0%, #C4974E 100%);
      color: #071220;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 10px rgba(223, 178, 108, 0.35);
      transition: all 0.2s ease;
    }

    .btn-download:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(223, 178, 108, 0.5);
    }

    .btn-print {
      background: #101C30;
      color: #94A3B8;
      border: 1px solid #1E2D4A;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .btn-print:hover {
      background: #1A2844;
      color: #F1F5F9;
      border-color: #334B75;
    }

    /* ── A4 PAGE ENGINE ── */
    .pages-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 0 60px 0;
      gap: 24px;
    }

    .a4-page {
      width: 210mm;
      height: 297mm;
      min-width: 210mm;
      min-height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      background: #07192B;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(223, 178, 108, 0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16mm 18mm 14mm 18mm;
      page-break-after: always;
      page-break-inside: avoid;
    }

    /* ── PAGE HEADER & FOOTER ── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(223, 178, 108, 0.25);
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .header-logo-text {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      background: linear-gradient(135deg, #FFFFFF 0%, #DFB26C 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-tag {
      font-size: 9px;
      font-weight: 700;
      color: #DFB26C;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      border: 1px solid rgba(223, 178, 108, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(223, 178, 108, 0.08);
    }

    .doc-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(30, 45, 74, 0.8);
      padding-top: 8px;
      font-size: 9px;
      color: #64748B;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #94A3B8;
    }

    .footer-page-badge {
      color: #DFB26C;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
    }

    /* ── HERO COVER STYLING ── */
    .cover-page {
      background: radial-gradient(circle at 50% 25%, #10233D 0%, #07192B 65%, #040F1D 100%);
      justify-content: space-between;
      text-align: center;
      padding: 25mm 20mm 20mm 20mm;
    }

    .cover-badge-top {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(223, 178, 108, 0.12);
      border: 1px solid rgba(223, 178, 108, 0.4);
      color: #F6D69A;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 18px;
      border-radius: 30px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      font-weight: 900;
      line-height: 1.15;
      color: #FFFFFF;
      margin: 20px 0 12px 0;
      letter-spacing: -0.5px;
    }

    .cover-title span {
      background: linear-gradient(135deg, #DFB26C 0%, #F5DEB3 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: block;
    }

    .cover-subtitle {
      font-size: 13px;
      line-height: 1.6;
      color: #94A3B8;
      max-width: 145mm;
      margin: 0 auto 30px auto;
    }

    .cover-pillars-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      max-width: 165mm;
      margin: 0 auto;
      text-align: left;
    }

    .pillar-card {
      background: rgba(11, 25, 44, 0.7);
      border: 1px solid rgba(223, 178, 108, 0.25);
      border-radius: 12px;
      padding: 14px;
    }

    .pillar-icon {
      font-size: 18px;
      margin-bottom: 6px;
    }

    .pillar-title {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 800;
      color: #DFB26C;
      margin-bottom: 4px;
    }

    .pillar-desc {
      font-size: 9.5px;
      color: #94A3B8;
      line-height: 1.4;
    }

    .cover-meta {
      border-top: 1px solid rgba(223, 178, 108, 0.2);
      padding-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: #64748B;
      text-align: left;
    }

    /* ── MODULE PAGE CONTENT ── */
    .module-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    .module-title-box {
      flex: 1;
    }

    .module-tag {
      display: inline-block;
      font-family: 'Outfit', sans-serif;
      font-size: 9px;
      font-weight: 800;
      color: #DFB26C;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: rgba(223, 178, 108, 0.1);
      border: 1px solid rgba(223, 178, 108, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 6px;
    }

    .module-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0 0 4px 0;
      line-height: 1.2;
    }

    .module-route-badge {
      font-family: monospace;
      font-size: 10px;
      color: #60A5FA;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
    }

    /* ── UI MOCKUP RENDER CONTAINER ── */
    .ui-mockup-frame {
      background: #0B1424;
      border: 1px solid #1E2D4A;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 14px;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4);
      position: relative;
    }

    .ui-mockup-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(30, 45, 74, 0.6);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #EAB308; }
    .dot-green { background: #10B981; }

    .ui-mockup-title {
      font-size: 9px;
      font-weight: 600;
      color: #64748B;
      margin-left: 6px;
      font-family: monospace;
    }

    /* ── EXPLANATION GRID ── */
    .explanation-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 14px;
      margin-top: 10px;
    }

    .info-card {
      background: rgba(11, 20, 36, 0.6);
      border: 1px solid #1A2844;
      border-radius: 10px;
      padding: 12px;
    }

    .info-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      font-weight: 800;
      color: #DFB26C;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-card-text {
      font-size: 10px;
      color: #CBD5E1;
      line-height: 1.5;
      margin: 0 0 8px 0;
    }

    .feature-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 9.5px;
      color: #94A3B8;
      margin-bottom: 5px;
      line-height: 1.35;
    }

    .feature-bullet {
      color: #DFB26C;
      font-size: 11px;
      line-height: 1;
      margin-top: 2px;
    }

    .feature-item strong {
      color: #E2E8F0;
    }

    .kpi-badge-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .kpi-mini-box {
      background: rgba(7, 25, 43, 0.8);
      border: 1px solid #1E2D4A;
      border-radius: 8px;
      padding: 8px;
    }

    .kpi-mini-label {
      font-size: 8px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
    }

    .kpi-mini-val {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #F1F5F9;
      margin-top: 2px;
    }

    /* ── PRINT RULES ── */
    @media print {
      body {
        background-color: #07192B !important;
      }
      .top-toolbar {
        display: none !important;
      }
      .pages-wrapper {
        padding: 0 !important;
        gap: 0 !important;
      }
      .a4-page {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always !important;
      }
    }
  </style>
</head>
<body>

  <!-- STICKY TOP CONTROLS -->
  <div class="top-toolbar">
    <div class="toolbar-container">
      <div class="toolbar-brand">
        <span style="font-size: 20px;">🚀</span>
        <span class="toolbar-brand-title">ROCKET CLUB</span>
        <span class="toolbar-badge">Guia Oficial da Plataforma</span>
      </div>
      <div class="btn-group">
        <button class="btn-print" onclick="window.print()">
          <span>🖨️</span> Imprimir / Salvar Navegador
        </button>
        <button class="btn-download" id="download-pdf-btn" onclick="generateExecutiveGuidePdf()">
          <span>⬇️</span> Baixar Guia em PDF
        </button>
      </div>
    </div>
  </div>

  <div class="pages-wrapper" id="pdf-content">

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 1: CAPA EXECUTIVA DE LUXO -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page cover-page" id="page-cover">
      <div style="padding-top: 10mm;">
        <div class="cover-badge-top">
          <span>✨</span> MANUAL EXECUTIVO & ARQUITETURA FUNCIONAL
        </div>
        <h1 class="cover-title">
          ROCKET CLUB
          <span>COCKPIT & ECOSSISTEMA</span>
        </h1>
        <p class="cover-subtitle">
          Documento técnico e gerencial apresentando a estrutura, fluxo de dados e propósito estratégico de cada módulo da plataforma de aceleração e gestão de mentorados.
        </p>
      </div>

      <div class="cover-pillars-grid">
        <div class="pillar-card">
          <div class="pillar-icon">🎯</div>
          <div class="pillar-title">1. Aceleração & CRM</div>
          <div class="pillar-desc">Funil de atração, qualificação e conversão de novos empresários com gestão de pipeline em tempo real.</div>
        </div>
        <div class="pillar-card">
          <div class="pillar-icon">📊</div>
          <div class="pillar-title">2. Gestão 360° da Base</div>
          <div class="pillar-desc">Fichas individuais, diagnóstico do mentor, mural de aniversariantes e acompanhamento por estágios.</div>
        </div>
        <div class="pillar-card">
          <div class="pillar-icon">🎓</div>
          <div class="pillar-title">3. Academy & Sabedoria</div>
          <div class="pillar-desc">Aulas estruturadas, até 5 materiais anexos por aula, SOPs e biblioteca de playbooks escaláveis.</div>
        </div>
      </div>

      <div class="cover-meta">
        <div>
          <strong>Plataforma:</strong> Rocket Club Executive v2.4 Pro<br>
          <strong>Emitido em:</strong> ${currentDate}
        </div>
        <div style="text-align: right;">
          <strong>Confidencialidade:</strong> Uso Exclusivo da Mentoria<br>
          <strong>Ecossistema:</strong> Direção & Liderança
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 2: SUMÁRIO NAVEGÁVEL & VISÃO DO ECOSSISTEMA -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-index">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // GUIA DO SISTEMA</span>
        <span class="header-tag">ÍNDICE & ARQUITETURA</span>
      </div>

      <div style="margin-bottom: 12px;">
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 4px 0;">
          Sumário Geral dos Módulos
        </h2>
        <p style="font-size: 11px; color: #94A3B8; margin: 0;">
          Visão consolidada de todas as páginas operacionais e estratégicas integradas ao sistema.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; justify-content: center;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">01</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Cockpit do Comandante (Dashboard Geral)</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/dashboard • Pág. 3</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">02</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Base de Membros & Diretório de Líderes</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/mentorados • Pág. 4</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">03</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Acompanhamento Estratégico & Ficha 360° (Kanban)</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/kanban • Pág. 5</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">04</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Funil de Aquisição & Pipeline Comercial (CRM)</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/crm • Pág. 6</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">05</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Rocket Academy (Sala de Aulas & Múltiplos Materiais)</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/academy • Pág. 7</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">06</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Agenda de Eventos & Imersões Presenciais</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/events • Pág. 8</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">07</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Central Financeira & Fluxo de Receitas</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/financial • Pág. 9</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">08</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Central de Conhecimento & SOPs (Wiki)</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/wiki • Pág. 10</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(11,25,44,0.6); border: 1px solid #1E2D4A; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #DFB26C; font-weight: 800; font-family: 'Outfit'; font-size: 13px;">09</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #F1F5F9;">Governança Multi-Tenant & Controle de Acessos</span>
          </div>
          <span style="font-size: 10px; color: #64748B; font-family: monospace;">/settings • Pág. 11</span>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Rocket Club Platform Guide</div>
        <div class="footer-page-badge">Página 2 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 3: COCKPIT DO COMANDANTE (/dashboard) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-dashboard">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 01</span>
        <span class="header-tag">VISÃO GERAL DO COMANDO</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Módulo Principal</span>
          <h2 class="module-heading">Cockpit do Comandante</h2>
          <span class="module-route-badge">Rota: /dashboard</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Status do Módulo</div>
          <div style="color: #10B981; font-weight: 700; font-size: 11px;">● Produção Ativa</div>
        </div>
      </div>

      <!-- UI Mockup Render -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/dashboard — Cockpit Executivo</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B; text-transform: uppercase;">Membros Ativos</div>
            <div style="font-size: 12px; font-weight: 800; color: #DFB26C;">42 Líderes</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B; text-transform: uppercase;">Faixa Ouro/Diamante</div>
            <div style="font-size: 12px; font-weight: 800; color: #60A5FA;">18 Membros</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B; text-transform: uppercase;">Faturamento Base</div>
            <div style="font-size: 12px; font-weight: 800; color: #34D399;">R$ 2.480.000</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B; text-transform: uppercase;">Índice Retenção</div>
            <div style="font-size: 12px; font-weight: 800; color: #F59E0B;">94% Saúde</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 8px; border-radius: 6px;">
            <div style="font-size: 8px; font-weight: 700; color: #DFB26C; margin-bottom: 4px;">🎂 Mural de Aniversariantes (Trimestral)</div>
            <div style="display: flex; gap: 4px; font-size: 8px;">
              <span style="background: rgba(223,178,108,0.2); color: #DFB26C; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Mês Atual (3)</span>
              <span style="background: #0B1424; color: #64748B; padding: 2px 6px; border-radius: 4px;">Próximo Mês (2)</span>
            </div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 8px; border-radius: 6px;">
            <div style="font-size: 8px; font-weight: 700; color: #60A5FA; margin-bottom: 4px;">📅 Próximo Encontro Presencial</div>
            <div style="font-size: 8px; color: #CBD5E1;">Imersão de Escala 10X • 28/08</div>
          </div>
        </div>
      </div>

      <!-- Purpose & Explanations -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito Estratégico</div>
          <p class="info-card-text">
            O <strong>Cockpit do Comandante</strong> é o centro nervoso da mentoria. Fornece ao mentor e à equipe de direção uma visão 360° instantânea sobre a saúde do grupo, tração financeira dos empresários e marcos de relacionamento.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Principais Funcionalidades</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Métricas de Tração:</strong> Volume total de receita gerenciada pelo grupo e retenção.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Mural de Aniversariantes:</strong> Visão trimestral com gerador de Card de Aniversário e WhatsApp.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Exportação do Members Book:</strong> Download do book oficial em PDF em 1 clique.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Indicadores Gerenciais</div>
          <div class="kpi-badge-grid">
            <div class="kpi-mini-box">
              <div class="kpi-mini-label">Retenção</div>
              <div class="kpi-mini-val" style="color: #10B981;">94%</div>
            </div>
            <div class="kpi-mini-box">
              <div class="kpi-mini-label">Média Faturam.</div>
              <div class="kpi-mini-val" style="color: #DFB26C;">R$ 145k</div>
            </div>
            <div class="kpi-mini-box">
              <div class="kpi-mini-label">Engajamento</div>
              <div class="kpi-mini-val" style="color: #60A5FA;">88%</div>
            </div>
            <div class="kpi-mini-box">
              <div class="kpi-mini-label">NPS da Base</div>
              <div class="kpi-mini-val" style="color: #A78BFA;">9.8 / 10</div>
            </div>
          </div>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 01 • Cockpit do Comandante</div>
        <div class="footer-page-badge">Página 3 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 4: BASE DE MEMBROS & DIRETÓRIO (/mentorados) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-members">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 02</span>
        <span class="header-tag">DIRETÓRIO EXECUTIVO</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Gestão de Membros</span>
          <h2 class="module-heading">Base de Membros & Diretório</h2>
          <span class="module-route-badge">Rota: /mentorados</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Visualizações</div>
          <div style="color: #DFB26C; font-weight: 700; font-size: 11px;">Cards & Tabela</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/mentorados — Diretório Inteligente de Líderes</span>
        </div>

        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          <div style="flex: 1; background: #07192B; border: 1px solid #1E2D4A; padding: 4px 8px; border-radius: 6px; font-size: 8px; color: #64748B;">
            🔍 Pesquisar por nome, empresa, especialidade, CNPJ...
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 4px 8px; border-radius: 6px; font-size: 8px; color: #DFB26C;">
            Filtro: Todos os Nichos ▼
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #DFB26C; color: #071220; font-weight: bold; font-size: 8px; display: flex; align-items: center; justify-content: center;">GM</div>
              <div>
                <div style="font-size: 8.5px; font-weight: bold; color: #FFF;">Gabriel Miranda</div>
                <div style="font-size: 7px; color: #64748B;">Miranda Clinic</div>
              </div>
            </div>
            <div style="font-size: 7.5px; color: #34D399; font-weight: bold;">R$ 180.000/mês • Faixa Ouro</div>
          </div>

          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #60A5FA; color: #071220; font-weight: bold; font-size: 8px; display: flex; align-items: center; justify-content: center;">RF</div>
              <div>
                <div style="font-size: 8.5px; font-weight: bold; color: #FFF;">Rodrigo Freitas</div>
                <div style="font-size: 7px; color: #64748B;">Freitas Imóveis</div>
              </div>
            </div>
            <div style="font-size: 7.5px; color: #34D399; font-weight: bold;">R$ 350.000/mês • Diamante</div>
          </div>

          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #A78BFA; color: #071220; font-weight: bold; font-size: 8px; display: flex; align-items: center; justify-content: center;">LM</div>
              <div>
                <div style="font-size: 8.5px; font-weight: bold; color: #FFF;">Lucas Mendes</div>
                <div style="font-size: 7px; color: #64748B;">Nexus Digital</div>
              </div>
            </div>
            <div style="font-size: 7.5px; color: #34D399; font-weight: bold;">R$ 95.000/mês • Faixa Verde</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito do Módulo</div>
          <p class="info-card-text">
            Fornecer um diretório completo, seguro e pesquisável de todos os membros ativos da mentoria, permitindo segmentação estratégica, contato direto e análise de fit entre mentorados.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Capacidades Chave</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Segmentação por Faixa:</strong> Filtro por faixas de faturamento (Ouro, Diamante, Verde, Azul).</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Quick Actions:</strong> Abertura direta do WhatsApp, LinkedIn e Instagram do empresário.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Exportação Individual:</strong> Download de fichas em PDF individualizadas para alinhamentos.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Campos Cadastrais</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">✓</span> <span><strong>Empresariais:</strong> Razão Social, CNPJ, Nicho e Faturamento.</span></li>
            <li class="feature-item"><span class="feature-bullet">✓</span> <span><strong>Estratégicos:</strong> Gargalo Atual, Meta do Ano e Diagnóstico.</span></li>
            <li class="feature-item"><span class="feature-bullet">✓</span> <span><strong>Pessoais:</strong> Data de Nascimento, Filhos, Cônjuge e Hobbies.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 02 • Base de Membros & Diretório</div>
        <div class="footer-page-badge">Página 4 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 5: ACOMPANHAMENTO ESTRATÉGICO & KANBAN (/kanban) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-kanban">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 03</span>
        <span class="header-tag">PIPELINE DE EVOLUÇÃO</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Gestão do Ciclo de Vida</span>
          <h2 class="module-heading">Acompanhamento Estratégico & Ficha 360°</h2>
          <span class="module-route-badge">Rota: /kanban</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Estágios Ativos</div>
          <div style="color: #60A5FA; font-weight: 700; font-size: 11px;">5 Colunas Kanban</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/kanban — Pipeline de Acompanhamento & Diagnóstico</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #DFB26C; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">1. Diagnóstico (8)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Gabriel Miranda</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #60A5FA; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">2. Plano de Ação (12)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Patrícia Souza</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #34D399; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">3. Implementação (10)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Rodrigo Freitas</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #F59E0B; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">4. Escala (7)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Felipe Ramos</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #A78BFA; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">5. Consolidação (5)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Juliana Prado</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito do Pipeline</div>
          <p class="info-card-text">
            O <strong>Kanban Estratégico</strong> organiza visualmente o estágio de maturidade de cada empresário no ecossistema, garantindo que nenhum mentorado fique estagnado sem um próximo passo claro de execução.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Recursos Avançados</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Ficha Completa 360°:</strong> Modal rico com anotações de evolução, família e metas.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Exclusão Segura:</strong> Modal estilizado com dupla confirmação e proteção contra exclusões acidentais.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Edição em Tempo Real:</strong> Sincronização automática com o banco de dados.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Fases da Metodologia</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">1</span> <span><strong>Diagnóstico:</strong> Mapeamento do gargalo principal e faturamento base.</span></li>
            <li class="feature-item"><span class="feature-bullet">2</span> <span><strong>Plano de Ação:</strong> Definição de metas e OKRs do trimestre.</span></li>
            <li class="feature-item"><span class="feature-bullet">3</span> <span><strong>Implementação:</strong> Ajuste de processos e novos canais de tração.</span></li>
            <li class="feature-item"><span class="feature-bullet">4</span> <span><strong>Escala & Consolidação:</strong> Multiplicação de receita e governança.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 03 • Acompanhamento Estratégico (Kanban)</div>
        <div class="footer-page-badge">Página 5 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 6: FUNIL DE VENDAS & CRM (/crm) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-crm">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 04</span>
        <span class="header-tag">AQUISIÇÃO & PIPELINE COMERCIAL</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Aquisição de Membros</span>
          <h2 class="module-heading">Funil de Vendas & CRM</h2>
          <span class="module-route-badge">Rota: /crm</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Taxa de Conversão</div>
          <div style="color: #10B981; font-weight: 700; font-size: 11px;">32% Lead-to-Member</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/crm — Pipeline de Novos Contratos</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #94A3B8; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">Prospecção (14)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Dr. André Matos • R$ 50k</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #60A5FA; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">Qualificação (9)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Mariana Rios • R$ 80k</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #DFB26C; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">Apresentação (6)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Bruno Castro • R$ 120k</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #F59E0B; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">Negociação (4)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Cláudia Leite • R$ 200k</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: 700; color: #10B981; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; margin-bottom: 4px;">Fechado 🚀 (5)</div>
            <div style="background: #0B1424; padding: 4px; border-radius: 4px; font-size: 6.5px; color: #FFF;">Renato Russo • R$ 150k</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito do CRM</div>
          <p class="info-card-text">
            Gerenciar o fluxo comercial de admissão de novos empresários no Rocket Club, desde o primeiro contato no Instagram ou indicação até o fechamento do contrato de mentoria.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Destaques Operacionais</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Conversão em 1 Clique:</strong> Transforma um Lead qualificado diretamente em Membro Ativo.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Registro de Contatos:</strong> Linha do tempo com notas de ligações e reuniões.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Projeção de Pipeline:</strong> Soma do valor estimado das propostas em negociação.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Canais de Aquisição</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">📢</span> <span><strong>Tráfego Pago:</strong> Campanhas diretas para aplicação.</span></li>
            <li class="feature-item"><span class="feature-bullet">🤝</span> <span><strong>Indicação de Membros:</strong> Alto índice de aprovação.</span></li>
            <li class="feature-item"><span class="feature-bullet">🎟️</span> <span><strong>Eventos Presenciais:</strong> Conversão pós-imersão.</span></li>
            <li class="feature-item"><span class="feature-bullet">📱</span> <span><strong>WhatsApp Direct:</strong> Abordagem ativa de liderança.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 04 • Funil de Aquisição & CRM</div>
        <div class="footer-page-badge">Página 6 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 7: ROCKET ACADEMY (/academy) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-academy">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 05</span>
        <span class="header-tag">FORMAÇÃO & CONTEÚDO ESTRATÉGICO</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Educação Continuada</span>
          <h2 class="module-heading">Rocket Academy & Aulas</h2>
          <span class="module-route-badge">Rota: /academy</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Materiais Complementares</div>
          <div style="color: #DFB26C; font-weight: 700; font-size: 11px;">Até 5 Arquivos por Aula</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/academy — Sala de Aulas & Playlists</span>
        </div>

        <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="height: 48px; background: #000; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #DFB26C; font-size: 14px;">
              ▶ Player de Vídeo HD (Oceans / Custom CDN)
            </div>
            <div style="font-size: 7.5px; font-weight: bold; color: #FFF; margin-top: 4px;">Aula 2.1: Modelagem de Oferta High-Ticket</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Materiais: 📄 Planilha_Precificacao.xlsx • 📑 Script_Vendas.pdf</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7px; font-weight: bold; color: #DFB26C; margin-bottom: 4px;">Módulos do Curso</div>
            <div style="font-size: 6.5px; color: #60A5FA;">✓ 1. Fundamentos & Mindset</div>
            <div style="font-size: 6.5px; color: #FFF; font-weight: bold;">● 2. Escala & Vendas High-Ticket</div>
            <div style="font-size: 6.5px; color: #64748B;">○ 3. Gestão de Pessoas & Liderança</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito da Academy</div>
          <p class="info-card-text">
            Centralizar todo o acervo educacional da mentoria. Permite aos membros assistir às gravações de encontros, imersões e masterclasses gravadas com materiais de apoio para download imediato.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Recursos de Destaque</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Múltiplos Materiais (Até 5):</strong> Anexos dinâmicos com download direto.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Gestor de Categorias & Cursos:</strong> Criação e edição completa de trilhas.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Comentários & Dúvidas:</strong> Interação entre membros e mentores.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Estrutura de Conteúdo</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">📁</span> <span><strong>Trilhas Principais:</strong> Marketing, Vendas, Gestão e Cultura.</span></li>
            <li class="feature-item"><span class="feature-bullet">🎥</span> <span><strong>Imersões Gravadas:</strong> Acesso integral pós-evento.</span></li>
            <li class="feature-item"><span class="feature-bullet">📊</span> <span><strong>Progresso por Aluno:</strong> Acompanhamento de aulas concluídas.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 05 • Rocket Academy</div>
        <div class="footer-page-badge">Página 7 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 8: AGENDA DE EVENTOS & IMERSÕES (/events) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-events">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 06</span>
        <span class="header-tag">NETWORKING & ENCONTROS PRESENCIAIS</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Encontros Oficiais</span>
          <h2 class="module-heading">Agenda de Eventos & Imersões</h2>
          <span class="module-route-badge">Rota: /events</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Confirmação de Presença</div>
          <div style="color: #10B981; font-weight: 700; font-size: 11px;">RSVP Inteligente</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/events — Cronograma de Imersões e Jantares</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 7px; background: rgba(59,130,246,0.2); color: #60A5FA; padding: 1px 5px; border-radius: 4px; font-weight: bold;">Confirmado</span>
              <span style="font-size: 7px; color: #DFB26C;">28/08/2026</span>
            </div>
            <div style="font-size: 8.5px; font-weight: bold; color: #FFF;">Imersão de Escala 10X</div>
            <div style="font-size: 7px; color: #94A3B8;">📍 Hotel Fasano, São Paulo • 38/50 Vagas</div>
            <div style="margin-top: 4px; background: #10B981; color: #000; font-size: 7px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;">Presença Confirmada ✅</div>
          </div>

          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 7px; background: rgba(234,179,8,0.2); color: #EAB308; padding: 1px 5px; border-radius: 4px; font-weight: bold;">Futuro</span>
              <span style="font-size: 7px; color: #DFB26C;">15/09/2026</span>
            </div>
            <div style="font-size: 8.5px; font-weight: bold; color: #FFF;">Jantar Executivo dos Diamantes</div>
            <div style="font-size: 7px; color: #94A3B8;">📍 Rooftop Berrini, SP • 14/20 Vagas</div>
            <div style="margin-top: 4px; background: #DFB26C; color: #000; font-size: 7px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;">Confirmar Presença</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito dos Eventos</div>
          <p class="info-card-text">
            Coordenar a agenda de encontros presenciais, imersões de negócios, jantares VIP e transmissões ao vivo exclusivas para membros da mentoria.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Controles Operacionais</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>RSVP com 1 Clique:</strong> Confirmação de presença instantânea com persistência.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Gestão de Lotes & Vagas:</strong> Limite de lotação e controle de convidados.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Notificação Automática:</strong> Alerta no sino de notificações para novos eventos.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Formatos de Encontro</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">🏨</span> <span><strong>Imersões 2 Dias:</strong> Aprofundamento e dinâmicas práticas.</span></li>
            <li class="feature-item"><span class="feature-bullet">🍽️</span> <span><strong>Jantares Secretos:</strong> Conexão de alto valor entre faixas altas.</span></li>
            <li class="feature-item"><span class="feature-bullet">💻</span> <span><strong>Hotseats Online:</strong> Resolução de gargalos ao vivo.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 06 • Agenda de Eventos & Imersões</div>
        <div class="footer-page-badge">Página 8 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 9: CENTRAL FINANCEIRA (/financial) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-financial">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 07</span>
        <span class="header-tag">FLUXO DE CAIXA & CONTRATOS</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Gestão Financeira</span>
          <h2 class="module-heading">Central Financeira & Receitas</h2>
          <span class="module-route-badge">Rota: /financial</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Receita Recorrente (MRR)</div>
          <div style="color: #34D399; font-weight: 700; font-size: 11px;">R$ 210.000 / mês</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/financial — Gestão de Transações e Mensalidades</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B;">Receita Total Anual</div>
            <div style="font-size: 12px; font-weight: 800; color: #34D399;">R$ 1.850.000</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B;">Recebido Este Mês</div>
            <div style="font-size: 12px; font-weight: 800; color: #DFB26C;">R$ 195.000</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; padding: 6px; border-radius: 6px;">
            <div style="font-size: 7px; color: #64748B;">A Receber / Pendente</div>
            <div style="font-size: 12px; font-weight: 800; color: #F59E0B;">R$ 15.000</div>
          </div>
        </div>

        <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px; font-size: 7px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1E2D4A; padding-bottom: 3px; font-weight: bold; color: #64748B;">
            <span>Mentorado / Empresa</span>
            <span>Plano</span>
            <span>Valor</span>
            <span>Status</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #FFF;">
            <span>Gabriel Miranda (Miranda Clinic)</span>
            <span>Anual Diamante</span>
            <span>R$ 50.000</span>
            <span style="color: #34D399;">● Pago</span>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito Financeiro</div>
          <p class="info-card-text">
            Acompanhar a saúde financeira dos contratos da mentoria, controle de renovações, entradas de novos membros e previsão de fluxo de caixa do ecossistema.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Principais Ferramentas</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Nova Transação:</strong> Cadastro rápido de contratos, renovações e upsells.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Controle de Inadimplência:</strong> Visão clara de faturas pendentes.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Previsão de Renovações:</strong> Alertas sobre vencimento de contratos anuais.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Tipos de Contrato</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">💎</span> <span><strong>Mentoria Individual:</strong> Acompanhamento 1-on-1 quinzenal.</span></li>
            <li class="feature-item"><span class="feature-bullet">🚀</span> <span><strong>Mastermind Anual:</strong> Encontros presenciais e imersões.</span></li>
            <li class="feature-item"><span class="feature-bullet">🎟️</span> <span><strong>Imersões Avulsas:</strong> Ingressos para convidados externos.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 07 • Central Financeira & Receitas</div>
        <div class="footer-page-badge">Página 9 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 10: BASE DE CONHECIMENTO & SOPS (/wiki) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-wiki">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 08</span>
        <span class="header-tag">PLAYBOOKS & PROCEDIMENTOS OPERACIONAIS</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Gestão do Conhecimento</span>
          <h2 class="module-heading">Base de Conhecimento & SOPs</h2>
          <span class="module-route-badge">Rota: /wiki</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Documentos & Playbooks</div>
          <div style="color: #60A5FA; font-weight: 700; font-size: 11px;">Biblioteca Validada</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/wiki — Playbooks e Processos Operacionais Padrão</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="font-size: 7px; color: #DFB26C; font-weight: bold;">Playbook de Vendas</div>
            <div style="font-size: 8px; font-weight: bold; color: #FFF; margin: 2px 0;">SOP-01: Fechamento High-Ticket</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Roteiro passo a passo para vendas consultivas acima de R$ 20k.</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="font-size: 7px; color: #60A5FA; font-weight: bold;">Cultura & Gente</div>
            <div style="font-size: 8px; font-weight: bold; color: #FFF; margin: 2px 0;">SOP-02: Contratação de Líderes</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Matriz de competências e entrevistas comportamentais.</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 8px;">
            <div style="font-size: 7px; color: #34D399; font-weight: bold;">Finanças & Gestão</div>
            <div style="font-size: 8px; font-weight: bold; color: #FFF; margin: 2px 0;">SOP-03: DRE & Orçamento Anual</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Estrutura de controle de fluxo de caixa e margem líquida.</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito da Wiki</div>
          <p class="info-card-text">
            Armazenar todo o conhecimento empírico, playbooks de escala e procedimentos operacionais padrão (SOPs) testados e validados nas empresas dos mentores e mentorados.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Benefícios de Escala</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Padronização de Processos:</strong> Redução de erros na execução das equipes.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Busca Rápida de Frameworks:</strong> Acesso imediato a scripts, planilhas e modelos.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Crescimento Descentralizado:</strong> Capacitação dos gestores dos mentorados.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Categorias Disponíveis</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">🎯</span> <span><strong>Vendas & Negociação:</strong> Funis, scripts e contorno de objeções.</span></li>
            <li class="feature-item"><span class="feature-bullet">👥</span> <span><strong>Gestão de Pessoas:</strong> Onboarding, avaliação de desempenho e rituais.</span></li>
            <li class="feature-item"><span class="feature-bullet">📈</span> <span><strong>Operações & Qualidade:</strong> Checklists e manuais técnicos.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 08 • Base de Conhecimento & SOPs</div>
        <div class="footer-page-badge">Página 10 de 11</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PÁGINA 11: GOVERNANÇA & MULTI-TENANT (/settings) -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="a4-page" id="page-settings">
      <div class="doc-header">
        <span class="header-logo-text">ROCKET CLUB // MÓDULO 09</span>
        <span class="header-tag">GOVERNANÇA & CONTROLE DE ACESSOS</span>
      </div>

      <div class="module-hero">
        <div class="module-title-box">
          <span class="module-tag">Controle Institucional</span>
          <h2 class="module-heading">Governança Multi-Tenant & Acessos</h2>
          <span class="module-route-badge">Rota: /settings</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #94A3B8;">Segurança & White-Label</div>
          <div style="color: #DFB26C; font-weight: 700; font-size: 11px;">100% Parametrizável</div>
        </div>
      </div>

      <!-- UI Mockup Frame -->
      <div class="ui-mockup-frame">
        <div class="ui-mockup-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span class="ui-mockup-title">rocket-club.app/settings — Matriz de Permissões e Identidade Visual</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7.5px; font-weight: bold; color: #DFB26C; margin-bottom: 4px;">Matriz de Níveis de Acesso</div>
            <div style="font-size: 6.5px; color: #FFF;">👑 Master Admin • Acesso Completo Total</div>
            <div style="font-size: 6.5px; color: #60A5FA;">🚀 Mentor Sênior • Gestão da Base e Aulas</div>
            <div style="font-size: 6.5px; color: #34D399;">⭐ Mentorado • Acesso Academy e Eventos</div>
          </div>
          <div style="background: #07192B; border: 1px solid #1E2D4A; border-radius: 6px; padding: 6px;">
            <div style="font-size: 7.5px; font-weight: bold; color: #DFB26C; margin-bottom: 4px;">Personalização White-Label</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Logotipo Principal: [Carregado com Sucesso]</div>
            <div style="font-size: 6.5px; color: #94A3B8;">Cor Primária: Dourado Executivo (#DFB26C)</div>
            <div style="font-size: 6.5px; color: #34D399;">Segurança: Criptografia e Isolamento Ativos</div>
          </div>
        </div>
      </div>

      <!-- Explanation Grid -->
      <div class="explanation-grid">
        <div class="info-card">
          <div class="info-card-title">Propósito de Governança</div>
          <p class="info-card-text">
            Garantir a segurança, confidencialidade de dados estratégicos dos empresários e flexibilidade de identidade visual para operar como white-label sob a marca do mentor.
          </p>
          <div class="info-card-title" style="margin-top: 8px;">Recursos de Governança</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Matriz Granular de Módulos:</strong> Controle por checkbox de quais telas cada nível acessa.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Criação de Níveis Customizados:</strong> Flexibilidade para novos cargos da equipe.</span></li>
            <li class="feature-item"><span class="feature-bullet">◆</span> <span><strong>Identidade Visual Completa:</strong> Upload de logo, ícone e paleta temática.</span></li>
          </ul>
        </div>

        <div class="info-card">
          <div class="info-card-title">Garantias de Segurança</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-bullet">🛡️</span> <span><strong>Isolamento de Dados:</strong> Proteção de faturamento e notas confidenciais.</span></li>
            <li class="feature-item"><span class="feature-bullet">🔒</span> <span><strong>Auditoria de Modificações:</strong> Registro seguro de alterações de permissão.</span></li>
            <li class="feature-item"><span class="feature-bullet">⚙️</span> <span><strong>Feature Flags:</strong> Ativação e desativação modular instantânea.</span></li>
          </ul>
        </div>
      </div>

      <div class="doc-footer">
        <div class="footer-left">Módulo 09 • Governança Multi-Tenant & Acessos</div>
        <div class="footer-page-badge">Página 11 de 11</div>
      </div>
    </div>

  </div>

  <script>
    async function generateExecutiveGuidePdf() {
      const btn = document.getElementById('download-pdf-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span> Compilando PDF...';
      btn.disabled = true;

      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        });

        const pages = document.querySelectorAll('.a4-page');
        const total = pages.length;

        for (let i = 0; i < total; i++) {
          const page = pages[i];
          btn.innerHTML = '<span>⏳</span> Renderizando Pág. ' + (i + 1) + '/' + total + '...';

          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#07192B',
            logging: false,
            windowWidth: 1200
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) {
            pdf.addPage('a4', 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        btn.innerHTML = '<span>⏳</span> Baixando Arquivo...';
        pdf.save('${fileName}');
        btn.innerHTML = '<span>✅</span> Concluído!';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 3000);
      } catch (err) {
        console.error('Erro na geração do PDF:', err);
        alert('Ocorreu um erro ao gerar o PDF. Você também pode usar a opção "Imprimir / Salvar Navegador".');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
