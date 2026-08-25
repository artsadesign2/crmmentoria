import { NextResponse } from 'next/server';
import { fetchAllMembersFromDb } from '@/lib/neon-db';
import { INITIAL_MEMBERS } from '@/lib/mock-data';
import { DEFAULT_TENANT } from '@/lib/tenant';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('member_id') || searchParams.get('id');
  const autoDownload = searchParams.get('download') === '1' || searchParams.get('auto') === 'true';

  let members = await fetchAllMembersFromDb();
  if (!members || members.length === 0) {
    members = INITIAL_MEMBERS as any;
  }

  // Filter single member if ID provided
  if (memberId) {
    members = members.filter((m: any) => String(m.id) === String(memberId));
  } else {
    // Exclude members marked as excludeFromBook if present
    members = members.filter((m: any) => !m.excludeFromBook);
  }

  if (members.length === 0) {
    return NextResponse.json({ ok: false, error: 'Nenhum membro encontrado para o relatório.' }, { status: 404 });
  }

  // Sort members alphabetically by name
  members.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  const currentDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalPagesCount = memberId ? 1 : members.length + 2;

  const sanitizedFileName = memberId
    ? `Ficha_${members[0]?.name ? members[0].name.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'Mentorado'}.pdf`
    : `Members_Book_Rocket_Club_${new Date().getFullYear()}.pdf`;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${memberId ? `Ficha — ${members[0]?.name || 'Mentorado'}` : 'Members Book — Rocket Club'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Modern Client-Side PDF Generation Libraries -->
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
      gap: 12px;
    }

    .toolbar-badge {
      padding: 4px 10px;
      border-radius: 8px;
      background: linear-gradient(135deg, #DFB26C 0%, #B38345 100%);
      color: #07192B;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .toolbar-title {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #F1F5F9;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #DFB26C 0%, #B38345 100%);
      color: #07192B;
      box-shadow: 0 4px 14px rgba(223, 178, 108, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(223, 178, 108, 0.4);
    }

    .btn-secondary {
      background: #132238;
      color: #DFB26C;
      border-color: #2A4365;
    }

    .btn-secondary:hover {
      background: #1A3050;
      color: #FFFFFF;
    }

    .btn-back {
      background: transparent;
      color: #94A3B8;
      border-color: #1E2D4A;
    }

    .btn-back:hover {
      background: #132238;
      color: #F1F5F9;
    }

    /* ── PROGRESS MODAL (DURING GENERATION) ── */
    #download-progress-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000000;
      background: rgba(5, 11, 20, 0.88);
      backdrop-filter: blur(8px);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #F1F5F9;
      font-family: 'Inter', sans-serif;
    }

    .progress-card {
      background: #0D2238;
      border: 1px solid #DFB26C;
      border-radius: 20px;
      padding: 32px 40px;
      width: 90%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    }

    .progress-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #DFB26C;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .progress-bar-wrap {
      width: 100%;
      height: 10px;
      background: #071424;
      border-radius: 20px;
      overflow: hidden;
      margin: 18px 0 10px 0;
      border: 1px solid #1E3A54;
    }

    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #B38345 0%, #DFB26C 100%);
      transition: width 0.2s ease;
      border-radius: 20px;
    }

    /* ── BOOK VIEWER CONTAINER ── */
    .book-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 0 60px 0;
      gap: 30px;
    }

    /* ── A4 PAGE WRAPPER (210mm x 297mm) ── */
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      max-height: 297mm;
      background-color: #07192B;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      scroll-margin-top: 80px;
    }

    /* ── CAPA EXECUTIVA (COVER PAGE) ── */
    .cover-page {
      background: radial-gradient(circle at 50% 30%, #113654 0%, #07192B 65%, #030A12 100%);
      padding: 0 22mm;
      align-items: center;
    }

    .cover-top-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 14px;
      background: linear-gradient(90deg, #B38345 0%, #DFB26C 50%, #B38345 100%);
    }

    .cover-header {
      margin-top: 48mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cover-logo-badge {
      width: 96px;
      height: 96px;
      border-radius: 28px;
      background: linear-gradient(135deg, #DFB26C 0%, #B38345 100%);
      color: #07192B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 50px;
      margin-bottom: 26px;
      box-shadow: 0 12px 35px rgba(223, 178, 108, 0.35);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 40pt;
      font-weight: 900;
      color: #DFB26C;
      letter-spacing: 4px;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      text-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }

    .cover-subtitle {
      font-family: 'Outfit', sans-serif;
      font-size: 13pt;
      font-weight: 700;
      color: #CBD5E1;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 28px;
    }

    .cover-divider {
      width: 80mm;
      height: 2px;
      background: linear-gradient(90deg, transparent, #DFB26C, transparent);
      margin: 0 auto 28px auto;
    }

    .cover-edition {
      display: inline-block;
      padding: 10px 28px;
      border-radius: 30px;
      background-color: rgba(13, 44, 70, 0.8);
      border: 1.5px solid #DFB26C;
      color: #DFB26C;
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    .cover-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 30mm;
      background-color: #0B2238;
      border-top: 3px solid #DFB26C;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 22mm;
    }

    .cover-footer-text {
      font-size: 9pt;
      font-weight: 700;
      color: #DFB26C;
      letter-spacing: 1px;
    }

    /* ── ÍNDICE DE MENTORADOS (INDEX PAGE) ── */
    .index-page {
      background: linear-gradient(180deg, #0D2C46 0%, #07192B 100%);
      padding: 16mm 15mm 12mm 15mm;
    }

    .page-top-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 10px;
      background: linear-gradient(90deg, #B38345 0%, #DFB26C 50%, #B38345 100%);
    }

    .index-title {
      font-family: 'Outfit', sans-serif;
      font-size: 17pt;
      font-weight: 800;
      color: #DFB26C;
      text-align: center;
      letter-spacing: 2px;
      margin: 2px 0 4px 0;
      text-transform: uppercase;
    }

    .index-subtitle {
      font-size: 8.5pt;
      color: #94A3B8;
      text-align: center;
      margin-bottom: 8px;
    }

    .index-divider {
      width: 60mm;
      height: 2px;
      background: linear-gradient(90deg, transparent, #DFB26C, transparent);
      margin: 0 auto 14px auto;
    }

    .index-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      flex: 1;
      align-content: start;
    }

    /* ── CLICKABLE INDEX ITEM WITH SMOOTH JUMP ── */
    .index-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 12px;
      border-bottom: 1px solid #1E3A54;
      background-color: rgba(14, 44, 70, 0.6);
      border-radius: 9px;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid rgba(223, 178, 108, 0.15);
    }

    .index-item:hover {
      background-color: rgba(223, 178, 108, 0.2);
      border-color: #DFB26C;
      transform: translateX(3px);
    }

    .index-item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .index-item-number {
      font-family: monospace;
      font-size: 8pt;
      font-weight: 800;
      color: #DFB26C;
      background: rgba(223, 178, 108, 0.15);
      padding: 2px 5px;
      border-radius: 4px;
      shrink: 0;
    }

    .index-item-name {
      font-weight: 700;
      font-size: 8.5pt;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .index-item-right {
      display: flex;
      align-items: center;
      gap: 6px;
      shrink: 0;
    }

    .index-item-page {
      font-size: 7.5pt;
      color: #94A3B8;
      font-weight: 600;
    }

    .index-item-arrow {
      font-size: 10pt;
      color: #DFB26C;
      font-weight: 800;
    }

    /* ── FICHA DO MENTORADO (MEMBER PROFILE PAGE) ── */
    .page-card {
      background: linear-gradient(180deg, #0C283F 0%, #07192B 100%);
      padding: 14mm 14mm 12mm 14mm;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #DFB26C;
      padding-bottom: 10px;
      margin-bottom: 14px;
      margin-top: 2px;
    }

    .member-name {
      font-family: 'Outfit', sans-serif;
      font-size: 20pt;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.1;
      margin-bottom: 3px;
    }

    .member-specialty {
      font-size: 10pt;
      color: #DFB26C;
      font-weight: 600;
    }

    .card-badge-status {
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── TWO-COLUMN REFINED DISTRIBUTION ── */
    .card-grid {
      display: grid;
      grid-template-columns: 62mm 1fr;
      gap: 14px;
      flex: 1;
    }

    /* ── NON-STRETCHED SQUARE PORTRAIT PHOTO ── */
    .profile-photo-wrapper {
      width: 62mm;
      height: 62mm;
      border-radius: 14px;
      border: 2px solid #DFB26C;
      background: #0E324E;
      overflow: hidden;
      position: relative;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .profile-photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover !important;
      object-position: center center !important;
      display: block;
    }

    .profile-avatar-fallback {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: linear-gradient(135deg, #DFB26C 0%, #B38345 100%);
      color: #07192B;
      font-family: 'Outfit', sans-serif;
      font-size: 32pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .info-box {
      background-color: rgba(14, 50, 78, 0.65);
      border: 1px solid #1E4B6E;
      border-radius: 8px;
      padding: 7px 11px;
      margin-bottom: 7px;
    }

    .info-label {
      font-size: 7pt;
      text-transform: uppercase;
      color: #94A3B8;
      font-weight: 700;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }

    .info-value {
      font-size: 8.5pt;
      color: #F1F5F9;
      font-weight: 600;
      line-height: 1.3;
    }

    .info-value-highlight {
      color: #34D399;
      font-size: 10.5pt;
      font-weight: 800;
    }

    .card-footer {
      border-top: 1px solid #1E4B6E;
      padding-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94A3B8;
    }

    /* ── PRINT MEDIA RULES ── */
    @media print {
      body {
        background-color: #07192B !important;
      }

      .top-toolbar, .no-print, #download-progress-overlay {
        display: none !important;
      }

      .book-container {
        padding: 0 !important;
        gap: 0 !important;
      }

      .a4-page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>

  <!-- STICKY TOP ACTIONS BAR -->
  <header class="top-toolbar no-print">
    <div class="toolbar-container">
      <div class="toolbar-brand">
        <div class="toolbar-badge">Rocket Club</div>
        <div class="toolbar-title">${memberId ? `Ficha: ${members[0]?.name || 'Mentorado'}` : `Members Book (${members.length} Mentorados)`}</div>
      </div>

      <div class="toolbar-actions">
        <a href="/kanban" class="btn-action btn-back">
          ← Voltar ao Kanban
        </a>
        <button onclick="window.print()" class="btn-action btn-primary" title="Imprimir ou Salvar em PDF em alta definição">
          🖨️ Imprimir / Salvar PDF
        </button>
        <button id="btn-download-pdf" onclick="generateDirectPdf()" class="btn-action btn-secondary" title="Baixar arquivo PDF diretamente">
          📥 Baixar PDF
        </button>
      </div>
    </div>
  </header>

  <!-- GENERATION PROGRESS MODAL -->
  <div id="download-progress-overlay">
    <div class="progress-card">
      <div class="progress-spinner"></div>
      <h3 style="font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 800; color: #DFB26C; margin: 0 0 8px 0;">GERANDO MEMBERS BOOK PDF</h3>
      <p id="progress-status-text" style="font-size: 13px; color: #94A3B8; margin: 0;">Compilando páginas com alta fidelidade visual...</p>
      
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progress-bar-inner"></div>
      </div>
      
      <span id="progress-page-count" style="font-size: 12px; font-weight: 700; color: #DFB26C; font-family: monospace;">Página 1 de ${totalPagesCount}</span>
    </div>
  </div>

  <main class="book-container" id="pdf-main-content">
  ${
    !memberId
      ? `
    <!-- CAPA EXECUTIVA -->
    <section class="a4-page cover-page">
      <div class="cover-top-bar"></div>
      <div class="cover-header">
        <div class="cover-logo-badge">🚀</div>
        <h1 class="cover-title">${DEFAULT_TENANT.name || 'MEMBERS BOOK'}</h1>
        <div class="cover-subtitle">Catálogo Oficial da Tripulação Rocket Club</div>
        <div class="cover-divider"></div>
        <div class="cover-edition">EDIÇÃO EXECUTIVA • ${members.length} MENTORADOS ATIVOS</div>
      </div>
      <div class="cover-footer">
        <div class="cover-footer-text">${(DEFAULT_TENANT.name || 'ROCKET CLUB').toUpperCase()} ECOSYSTEM</div>
        <div class="cover-footer-text">${currentDate.toUpperCase()}</div>
      </div>
    </section>

    <!-- ÍNDICE DE MENTORADOS CLICÁVEL -->
    <section class="a4-page index-page" id="indice">
      <div class="page-top-bar"></div>
      <div>
        <h2 class="index-title">ÍNDICE DE MENTORADOS</h2>
        <div class="index-subtitle">Clique sobre o nome do empresário para navegar até a sua ficha cadastral</div>
        <div class="index-divider"></div>
        <div class="index-grid">
          ${members
            .map(
              (m: any, idx: number) => `
            <a 
              href="#member-${m.id}" 
              onclick="document.getElementById('member-${m.id}')?.scrollIntoView({ behavior: 'smooth' })"
              class="index-item" 
              title="Abrir ficha de ${m.name}"
            >
              <div class="index-item-left">
                <span class="index-item-number">${String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <div class="index-item-name">${m.name}</div>
                  <div style="font-size:7pt; color:#94A3B8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px;">
                    ${m.tradeName || m.companyName || m.specialty || 'Empresário'}
                  </div>
                </div>
              </div>
              <div class="index-item-right">
                <span class="index-item-page">Pág. ${idx + 3}</span>
                <span class="index-item-arrow">→</span>
              </div>
            </a>
          `
            )
            .join('')}
        </div>
      </div>
      <div class="card-footer" style="border:none; padding-top:0;">
        <span>Rocket Club Ecosystem • Sumário Executivo</span>
        <span>Página 2</span>
      </div>
    </section>
    `
      : ''
  }

  <!-- FICHAS DOS MENTORADOS -->
  ${members
    .map((m: any, idx: number) => {
      const photoUrl = m.avatar || m.coverImage;
      const pageNum = memberId ? 1 : idx + 3;

      let badgeBg = 'rgba(223, 178, 108, 0.15)';
      let badgeBorder = '#DFB26C';
      let badgeColor = '#DFB26C';

      if (m.status === 'diamante') {
        badgeBg = 'rgba(96, 165, 250, 0.2)';
        badgeBorder = '#60A5FA';
        badgeColor = '#93C5FD';
      } else if (m.status === 'ouro') {
        badgeBg = 'rgba(234, 179, 8, 0.2)';
        badgeBorder = '#EAB308';
        badgeColor = '#FDE047';
      } else if (m.status === 'verde') {
        badgeBg = 'rgba(52, 211, 153, 0.2)';
        badgeBorder = '#34D399';
        badgeColor = '#6EE7B7';
      } else if (m.status === 'azul') {
        badgeBg = 'rgba(59, 130, 246, 0.2)';
        badgeBorder = '#3B82F6';
        badgeColor = '#93C5FD';
      }

      return `
    <section class="a4-page page-card" id="member-${m.id}">
      <div class="page-top-bar"></div>

      <div>
        <div class="card-header">
          <div>
            <div class="member-name">${m.name}</div>
            <div class="member-specialty">${m.specialty || 'Empreendedor'} • ${m.tradeName || m.companyName || 'Empresa Própria'}</div>
          </div>
          <div class="card-badge-status" style="background:${badgeBg}; border: 1px solid ${badgeBorder}; color:${badgeColor};">
            ${m.status || 'Tripulante'}
          </div>
        </div>

        <div class="card-grid">
          <!-- COLUNA ESQUERDA: FOTO, FATURAMENTO, DADOS DA EMPRESA, LOCALIZAÇÃO -->
          <div>
            <div class="profile-photo-wrapper">
              ${
                photoUrl
                  ? `<img src="${photoUrl}" alt="${m.name}" class="profile-photo-img" crossOrigin="anonymous" />`
                  : `<div class="profile-avatar-fallback">${m.name.charAt(0)}</div>`
              }
            </div>

            <div class="info-box">
              <div class="info-label">Faturamento Mensal</div>
              <div class="info-value info-value-highlight">${m.monthlyRevenue || 'Sob Consulta'}</div>
            </div>

            <div class="info-box">
              <div class="info-label">Empresa & Razão Social</div>
              <div class="info-value">${m.companyName || m.tradeName || 'Empresa Própria'}</div>
              ${m.cnpj ? `<div style="font-size:7pt; color:#94A3B8; margin-top:2px;">CNPJ: ${m.cnpj}</div>` : ''}
              ${m.professionalRegister ? `<div style="font-size:7pt; color:#DFB26C; margin-top:2px;">Registro: ${m.professionalRegister}</div>` : ''}
            </div>

            <div class="info-box">
              <div class="info-label">Origem & Pessoal</div>
              <div class="info-value">${m.residence || m.birthplace || 'Brasil'} ${m.age ? `• ${m.age}` : ''}</div>
              ${m.birthdate ? `<div style="font-size:7pt; color:#DFB26C; margin-top:2px;">🎂 Aniversário: ${m.birthdate}</div>` : ''}
            </div>

            ${
              m.hobbies || m.sportsInfo
                ? `
            <div class="info-box">
              <div class="info-label">Lifestyle & Família</div>
              <div class="info-value" style="font-size:8pt; color:#CBD5E1;">
                ${m.sportsInfo ? `🏃 ${m.sportsInfo} ` : ''}
                ${m.hobbies ? `• 🎯 ${m.hobbies}` : ''}
                ${m.spouseInfo ? `<br>💍 ${m.spouseInfo}` : ''}
              </div>
            </div>`
                : ''
            }
          </div>

          <!-- COLUNA DIREITA: CONTATOS, OBJETIVOS, DESAFIOS E DIAGNÓSTICO -->
          <div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:7px;">
              <div class="info-box">
                <div class="info-label">WhatsApp / Fone</div>
                <div class="info-value">${m.phone || '(11) 99999-0000'}</div>
              </div>

              <div class="info-box">
                <div class="info-label">Instagram</div>
                <div class="info-value" style="color:#DFB26C;">${m.instagram || '—'}</div>
              </div>
            </div>

            <div class="info-box">
              <div class="info-label">E-mail Corporativo</div>
              <div class="info-value" style="word-break: break-all;">${m.email || 'contato@mentorados.com'}</div>
            </div>

            <div class="info-box" style="border-color: rgba(223, 178, 108, 0.4); background: rgba(223, 178, 108, 0.08);">
              <div class="info-label" style="color:#DFB26C;">🎯 Objetivo Principal no Rocket Club</div>
              <div class="info-value" style="color:#F1F5F9; font-weight:700;">
                ${m.mainGoal || 'Escala de faturamento, novos canais de tração e governança.'}
              </div>
            </div>

            ${
              m.biggestChallenge
                ? `
            <div class="info-box" style="border-color: rgba(248, 113, 113, 0.3); background: rgba(239, 68, 68, 0.06);">
              <div class="info-label" style="color:#F87171;">⚠️ Maior Desafio / Gargalo Atual</div>
              <div class="info-value" style="color:#FECDD3; font-size:8pt;">${m.biggestChallenge}</div>
            </div>`
                : ''
            }

            <div class="info-box">
              <div class="info-label">Interesse & Frentes de Mentoria</div>
              <div class="info-value" style="font-size:8pt; color:#CBD5E1;">
                ${m.mentorshipInterest || 'Estratégia comercial, esteira de produtos e posicionamento.'}
              </div>
            </div>

            <div class="info-box" style="margin-bottom:0;">
              <div class="info-label">Anotações & Diagnóstico Estratégico</div>
              <div class="info-value" style="font-weight: 400; font-size: 8pt; color: #CBD5E1; line-height: 1.35;">
                ${m.notes || 'Tripulante ativo no ecossistema Rocket Club.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <a 
          href="#indice" 
          onclick="document.getElementById('indice')?.scrollIntoView({ behavior: 'smooth' })"
          class="no-print" 
          style="color: #DFB26C; text-decoration: none; font-weight: 700;"
        >
          ↑ Voltar ao Índice
        </a>
        <span>Rocket Club Ecosystem • Catálogo Oficial de Mentorados</span>
        <span>Página ${pageNum} de ${totalPagesCount}</span>
      </div>
    </section>
    `;
    })
    .join('')}
  </main>

  <script>
    async function generateDirectPdf() {
      const overlay = document.getElementById('download-progress-overlay');
      const statusText = document.getElementById('progress-status-text');
      const progressBar = document.getElementById('progress-bar-inner');
      const pageCount = document.getElementById('progress-page-count');
      const filename = ${JSON.stringify(sanitizedFileName)};

      if (overlay) overlay.style.display = 'flex';

      try {
        const pages = document.querySelectorAll('.a4-page');
        if (!pages || pages.length === 0) throw new Error('Nenhuma página encontrada');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const currentNum = i + 1;
          const total = pages.length;
          const percent = Math.round((currentNum / total) * 100);

          if (progressBar) progressBar.style.width = percent + '%';
          if (pageCount) pageCount.textContent = 'Página ' + currentNum + ' de ' + total + ' (' + percent + '%)';
          if (statusText) statusText.textContent = 'Renderizando página ' + currentNum + ' com alta fidelidade...';

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

        if (statusText) statusText.textContent = 'Salvando arquivo PDF...';
        pdf.save(filename);

        setTimeout(() => {
          if (overlay) overlay.style.display = 'none';
        }, 800);
      } catch (err) {
        console.error('Erro na geração do PDF:', err);
        if (statusText) statusText.textContent = 'Iniciando diálogo nativo de impressão...';
        setTimeout(() => {
          if (overlay) overlay.style.display = 'none';
          window.print();
        }, 500);
      }
    }

    ${
      autoDownload
        ? `
    window.addEventListener('load', () => {
      setTimeout(() => {
        generateDirectPdf();
      }, 600);
    });
    `
        : ''
    }
  </script>
</body>
</html>`;

  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': memberId ? `inline; filename="Ficha_${memberId}.html"` : 'inline; filename="Members_Book.html"',
    },
  });
}
