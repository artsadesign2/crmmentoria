/* ScaleMentors - Vídeo 03: Scale Academy, Certificação & Clube VIP (~67s)
   Identidade: Cyber Tech / Dark Mode SaaS High-Ticket
   Diretrizes: Regra de 8pt, sem alvo/crosshair, zero transbordo, títulos em 3 linhas, dinamismo sequencial.
*/

const CYAN = '#38BDF8', CYAN_BRIGHT = '#00F0FF', CYAN_DARK = '#0284C7';
const EMERALD = '#10B981', EMERALD_LIGHT = '#34D399';
const PURPLE = '#818CF8', PURPLE_DARK = '#4F46E5';
const GOLD = '#FBBF24', GOLD_BRIGHT = '#FCD34D';
const RED_ALERT = '#EF4444';
const BG_DARK = '#070A12', BG_DEEP = '#0B1120';

const FD = (s, it) => FONT('display', s, it);
const FB = (s, it) => FONT('body', s, it);

const SC = [
  {
    type: 'academy',
    s: 0.0,
    e: 16.32,
    sub: 'FORMAÇÃO EXECUTIVA PARA MENTORES',
    title: 'Acelere no *ScaleMentors: | com trilhas práticas de escala | e alta conversão comercial.'
  },
  {
    type: 'aulas_materiais',
    s: 16.32,
    e: 27.88,
    sub: 'AULAS DINÂMICAS & PLAYBOOKS PRÁTICOS',
    title: 'Módulos direto ao *ponto | com playbooks acionáveis | e ferramentas prontas.'
  },
  {
    type: 'certificado',
    s: 27.88,
    e: 40.48,
    sub: 'CERTIFICAÇÃO OFICIAL & AUTENTICIDADE DIGITAL',
    title: 'Emita seu *certificado VIP | com validação por QR Code | e autoridade no mercado.'
  },
  {
    type: 'clube_vantagens',
    s: 40.48,
    e: 54.64,
    sub: 'CLUBE DE VANTAGENS & MATCHMAKING EXECUTIVO',
    title: 'Acesse o *Clube de Vantagens | com benefícios exclusivos | e networking de alto valor.'
  },
  {
    type: 'final',
    s: 54.64,
    e: 66.84,
    sub: 'ECOSSISTEMA COMPLETO DE ALTO IMPACTO',
    title: 'Conheça o *ScaleMentors: | solicite sua demonstração | executiva agora mesmo.'
  }
];

const BOUNDS = SC.slice(1).map(s => s.s);

const sceneAt = t => SC.find(s => t >= s.s && t < s.e) || SC[SC.length - 1];

// Fundo Cyber Tech com malha e partículas de luz dinâmicas
function drawWorld(g, t) {
  bgGradient(g, '#090D1A', '#03050A');
  bgLights(g, t, '6,182,212', 0.20, 5, true);

  // Grid cibernético com pulso suave
  g.save();
  const gridAlpha = 0.03 + 0.015 * Math.sin(t * 1.5);
  g.strokeStyle = `rgba(56, 189, 248, ${gridAlpha})`;
  g.lineWidth = 1;
  const offY = (t * 20) % 80;
  for (let x = 0; x <= W; x += 80) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = offY; y <= H; y += 80) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.restore();
}

// Renderização dos cards de UI ricos por cena (Regra de 8pt estrita)
function drawSceneUI(g, sc, t) {
  const relT = t - sc.s;
  const sceneDur = sc.e - sc.s;
  
  // Transições suaves de Entrada e Saída entre cenas
  const enterProgress = eOut(clamp(relT / 0.55, 0, 1));
  const exitProgress = sc.type !== 'final' ? eIn(clamp((relT - (sceneDur - 0.45)) / 0.45, 0, 1)) : 0;
  
  const alphaScene = enterProgress * (1 - exitProgress);
  const slideY = lerp(48, 0, enterProgress) - lerp(0, 32, exitProgress);
  const scaleScene = lerp(0.96, 1.0, enterProgress) * (1 + 0.03 * exitProgress);

  if (alphaScene <= 0.01) return;

  g.save();
  g.globalAlpha = alphaScene;
  g.translate(W / 2, 1208);
  g.scale(scaleScene, scaleScene);
  g.translate(-W / 2, -1208 + slideY);

  if (sc.type === 'academy') {
    // ==========================================
    // CENA 01: Dashboard Academy 360° & Trilhas
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Card Base
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.lineWidth = 2.5;
    g.shadowColor = 'rgba(56, 189, 248, 0.25)';
    g.shadowBlur = 32;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 32);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header do Academy
    g.fillStyle = 'rgba(56, 189, 248, 0.14)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 80, [32, 32, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = CYAN_BRIGHT;
    g.fillText('🎓 SCALE ACADEMY · FORMAÇÃO EXECUTIVA ATIVA', cx - cw/2 + 32, cy - ch/2 + 50);

    // Barra de Progresso Geral do Mentorado (Animada de 0 a 85%)
    const progVal = eOut(clamp(relT / 1.8, 0, 0.85));
    const progPct = Math.round(progVal * 100);
    
    g.fillStyle = 'rgba(16, 185, 129, 0.2)';
    g.beginPath();
    g.roundRect(cx + cw/2 - 180, cy - ch/2 + 24, 148, 32, 16);
    g.fill();

    g.font = FB(16, true);
    g.fillStyle = '#34d399';
    g.textAlign = 'center';
    g.fillText(`● ${progPct}% Concluído`, cx + cw/2 - 106, cy - ch/2 + 46);
    g.textAlign = 'left';

    // 3 Trilhas Executivas com Entrada Sequencial
    const tracks = [
      { name: '1. Vendas High-Ticket & Fechamento VIP', aulas: '12 aulas · 100%', tag: 'CONCLUÍDO ✓', col: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', delay: 0.4, p: 1.0 },
      { name: '2. Estruturação de Ofertas Irresistíveis', aulas: '8 aulas · 80%', tag: 'EM ANDAMENTO', col: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', delay: 3.6, p: 0.8 },
      { name: '3. Liderança Comercial & Copiloto de IA', aulas: '10 aulas · 65%', tag: 'EM ANDAMENTO', col: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', delay: 7.0, p: 0.65 }
    ];

    tracks.forEach((tr, idx) => {
      const trRelT = relT - tr.delay;
      if (trRelT < 0) return;

      const tAlpha = eOut(clamp(trRelT / 0.45, 0, 1));
      const tSlide = lerp(24, 0, tAlpha);
      const ty = cy - ch/2 + 104 + idx * 112 + tSlide;

      g.save();
      g.globalAlpha = alphaScene * tAlpha;

      g.fillStyle = 'rgba(30, 41, 59, 0.7)';
      g.strokeStyle = tr.col === '#10b981' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(cx - cw/2 + 24, ty, cw - 48, 96, 18);
      g.fill();
      g.stroke();

      // Ícone do Curso
      g.fillStyle = tr.bg;
      g.beginPath();
      g.arc(cx - cw/2 + 72, ty + 48, 28, 0, 7);
      g.fill();

      g.font = FB(22, true);
      g.fillStyle = tr.col;
      g.textAlign = 'center';
      g.fillText(idx === 0 ? '🏆' : idx === 1 ? '💎' : '⚡', cx - cw/2 + 72, ty + 56);
      g.textAlign = 'left';

      // Nome e Info
      g.font = FB(22, true);
      g.fillStyle = '#ffffff';
      g.fillText(tr.name, cx - cw/2 + 116, ty + 40);

      g.font = FB(16);
      g.fillStyle = '#94a3b8';
      g.fillText(tr.aulas, cx - cw/2 + 116, ty + 68);

      // Mini barra de progresso da trilha
      const barW = 160, barH = 8;
      const barX = cx - cw/2 + 270;
      const barY = ty + 60;
      g.fillStyle = 'rgba(255, 255, 255, 0.1)';
      g.beginPath();
      g.roundRect(barX, barY, barW, barH, 4);
      g.fill();

      g.fillStyle = tr.col;
      g.beginPath();
      g.roundRect(barX, barY, barW * tr.p, barH, 4);
      g.fill();

      // Badge de Status
      g.fillStyle = tr.bg;
      g.beginPath();
      g.roundRect(cx + cw/2 - 190, ty + 30, 150, 36, 12);
      g.fill();

      g.font = FB(15, true);
      g.fillStyle = tr.col;
      g.textAlign = 'center';
      g.fillText(tr.tag, cx + cw/2 - 115, ty + 54);
      g.textAlign = 'left';

      g.restore();
    });

    // Rodapé do Card
    const b1y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(56, 189, 248, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b1y, cw - 48, 56, 14);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = CYAN_BRIGHT;
    g.fillText('⚡ Metodologia Validada com +140 Empresas de Alta Performance', cx - cw/2 + 45, b1y + 36);
  }

  else if (sc.type === 'aulas_materiais') {
    // ==========================================
    // CENA 02: Player Executivo & Playbooks Práticos
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Ciano
    g.shadowColor = 'rgba(56, 189, 248, 0.25)';
    g.shadowBlur = 32;
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 32);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header
    g.fillStyle = 'rgba(56, 189, 248, 0.14)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 80, [32, 32, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = CYAN_BRIGHT;
    g.fillText('▶ PLAYER EXECUTIVO & RECURSOS COMPLEMENTARES', cx - cw/2 + 32, cy - ch/2 + 50);

    // 2 Colunas: Esquerda = Player de Vídeo | Direita = Materiais de Download
    const leftW = 400, rightW = 410;

    // Coluna 1: Mini Player de Vídeo com Timeline
    const lcx = cx - cw/2 + 24;
    const lcy = cy - ch/2 + 104;
    g.fillStyle = 'rgba(30, 41, 59, 0.6)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(lcx, lcy, leftW, 312, 20);
    g.fill();
    g.stroke();

    // Tela de Vídeo Mockup
    g.fillStyle = '#050B14';
    g.beginPath();
    g.roundRect(lcx + 16, lcy + 16, leftW - 32, 175, 14);
    g.fill();

    // Botão Play pulsante
    const playPulse = 1 + Math.sin(t * 5) * 0.06;
    g.save();
    g.translate(lcx + leftW/2, lcy + 103);
    g.scale(playPulse, playPulse);
    g.fillStyle = 'rgba(56, 189, 248, 0.85)';
    g.beginPath();
    g.arc(0, 0, 26, 0, 7);
    g.fill();
    g.fillStyle = '#070A12';
    g.beginPath();
    g.moveTo(-6, -12); g.lineTo(12, 0); g.lineTo(-6, 12);
    g.fill();
    g.restore();

    // Título da Aula no Player
    g.font = FB(19, true);
    g.fillStyle = '#ffffff';
    g.fillText('Aula 04: Fechamento High-Ticket', lcx + 20, lcy + 228);

    g.font = FB(15);
    g.fillStyle = '#94a3b8';
    g.fillText('Módulo 1 · Duração: 18m · Full HD 4K', lcx + 20, lcy + 256);

    // Barra de Reprodução Dinâmica
    const playBarW = leftW - 40;
    const pProg = clamp((relT * 0.08) % 1, 0.15, 0.95);
    g.fillStyle = 'rgba(255, 255, 255, 0.15)';
    g.beginPath();
    g.roundRect(lcx + 20, lcy + 280, playBarW, 6, 3);
    g.fill();

    g.fillStyle = CYAN_BRIGHT;
    g.beginPath();
    g.roundRect(lcx + 20, lcy + 280, playBarW * pProg, 6, 3);
    g.fill();

    // Coluna 2: Downloads & Ferramentas Prontas
    const rcx = cx - cw/2 + 446;
    const rcy = cy - ch/2 + 104;
    g.fillStyle = 'rgba(30, 41, 59, 0.6)';
    g.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(rcx, rcy, rightW, 312, 20);
    g.fill();
    g.stroke();

    g.font = FB(19, true);
    g.fillStyle = '#34d399';
    g.fillText('MATERIAIS DE APOIO 📥', rcx + 20, rcy + 38);

    const downloads = [
      { name: 'Playbook de Scripts.pdf', tag: 'Pronto p/ Uso', icon: '📄' },
      { name: 'Planilha de Precificação.xlsx', tag: 'Calculadora', icon: '📊' },
      { name: 'Copiloto de Objeções IA', tag: 'Template VIP', icon: '🤖' }
    ];

    downloads.forEach((dl, idx) => {
      const dly = rcy + 60 + idx * 76;
      g.fillStyle = 'rgba(15, 23, 42, 0.7)';
      g.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(rcx + 16, dly, rightW - 32, 66, 12);
      g.fill();
      g.stroke();

      g.font = FB(22);
      g.fillText(dl.icon, rcx + 28, dly + 42);

      g.font = FB(16, true);
      g.fillStyle = '#ffffff';
      g.fillText(dl.name, rcx + 65, dly + 30);

      g.font = FB(14);
      g.fillStyle = '#34d399';
      g.fillText(`● ${dl.tag}`, rcx + 65, dly + 52);
    });

    // Rodapé
    const b2y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(16, 185, 129, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b2y, cw - 48, 56, 14);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = '#34d399';
    g.fillText('💡 Aplicação Prática Imediata no Seu Negócio no Mesmo Dia', cx - cw/2 + 45, b2y + 36);
  }

  else if (sc.type === 'certificado') {
    // ==========================================
    // CENA 03: Modal de Certificação Oficial com QR Code
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Dourada
    g.shadowColor = 'rgba(251, 191, 36, 0.35)';
    g.shadowBlur = 36;
    g.fillStyle = 'rgba(15, 23, 42, 0.94)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 32);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header
    g.fillStyle = 'rgba(251, 191, 36, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 80, [32, 32, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('🏆 CERTIFICADO OFICIAL DE ESPECIALISTA SCALEMENTORS', cx - cw/2 + 32, cy - ch/2 + 50);

    // Certificado Mockup Interno
    const certW = 832, certH = 312;
    const certX = cx - cw/2 + 24;
    const certY = cy - ch/2 + 104;

    g.fillStyle = 'rgba(30, 41, 59, 0.65)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(certX, certY, certW, certH, 20);
    g.fill();
    g.stroke();

    // Selo Dourado com Estrela
    g.fillStyle = 'rgba(251, 191, 36, 0.2)';
    g.beginPath();
    g.arc(certX + 70, certY + 70, 38, 0, 7);
    g.fill();

    g.font = FB(32);
    g.textAlign = 'center';
    g.fillText('🎖️', certX + 70, certY + 82);
    g.textAlign = 'left';

    g.font = FB(24, true);
    g.fillStyle = '#ffffff';
    g.fillText('Certificado de Conclusão & Especialização', certX + 128, certY + 58);

    g.font = FB(16);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('Outorgado a: Dr. Roberto Martins · ScaleMentors Academy', certX + 128, certY + 86);

    // Texto descritivo do certificado
    g.font = FB(19);
    g.fillStyle = '#cbd5e1';
    g.fillText('Formação Executiva em Estruturação Comercial & Vendas High-Ticket', certX + 32, certY + 144);
    g.fillText('Carga Horária: 60 Horas · Metodologia ScaleMentors 360°', certX + 32, certY + 176);

    // QR Code Mockup (Autenticidade Digital)
    const qrX = certX + certW - 130, qrY = certY + 115;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(qrX, qrY, 96, 96, 8);
    g.fill();

    // Desenho do QR Code
    g.fillStyle = '#070A12';
    g.fillRect(qrX + 8, qrY + 8, 26, 26);
    g.fillRect(qrX + 62, qrY + 8, 26, 26);
    g.fillRect(qrX + 8, qrY + 62, 26, 26);
    g.fillRect(qrX + 42, qrY + 42, 14, 14);
    g.fillRect(qrX + 62, qrY + 62, 14, 14);

    g.fillStyle = '#ffffff';
    g.fillRect(qrX + 14, qrY + 14, 14, 14);
    g.fillRect(qrX + 68, qrY + 14, 14, 14);
    g.fillRect(qrX + 14, qrY + 68, 14, 14);

    // Botões de Ação do Certificado (Regra de 8pt)
    const btnW = 380, btnH = 64;
    const btn1X = certX + 24, btn2X = certX + 428;
    const btnY = certY + 224;

    // Botão 1: Baixar PDF
    g.fillStyle = GOLD;
    g.beginPath();
    g.roundRect(btn1X, btnY, btnW, btnH, 16);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = '#070A12';
    g.textAlign = 'center';
    g.fillText('BAIXAR CERTIFICADO (PDF) 📥', btn1X + btnW/2, btnY + 40);

    // Botão 2: Compartilhar LinkedIn
    g.fillStyle = 'rgba(56, 189, 248, 0.2)';
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(btn2X, btnY, btnW, btnH, 16);
    g.fill();
    g.stroke();

    g.fillStyle = '#ffffff';
    g.fillText('COMPARTILHAR NO LINKEDIN 🔗', btn2X + btnW/2, btnY + 40);
    g.textAlign = 'left';

    // Rodapé
    const b3y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(251, 191, 36, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b3y, cw - 48, 56, 14);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('✓ Autenticidade Digital Verificada · Reconhecimento no Mercado', cx - cw/2 + 45, b3y + 36);
  }

  else if (sc.type === 'clube_vantagens') {
    // ==========================================
    // CENA 04: Clube de Vantagens & Matchmaking
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Roxa / Ciano
    g.shadowColor = 'rgba(129, 140, 248, 0.3)';
    g.shadowBlur = 32;
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(129, 140, 248, 0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 32);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header
    g.fillStyle = 'rgba(129, 140, 248, 0.15)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 80, [32, 32, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = '#a5b4fc';
    g.fillText('💎 CLUBE DE VANTAGENS & MATCHMAKING EXECUTIVO', cx - cw/2 + 32, cy - ch/2 + 50);

    // 3 Cards de Benefícios e Parcerias (Regra de 8pt)
    const perks = [
      { title: 'Stripe Payments Partner', val: 'Até $50.000 em taxas zeradas', icon: '💳', col: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
      { title: 'HubSpot Enterprise Scale', val: '75% OFF no primeiro ano de CRM', icon: '🚀', col: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { title: 'Matchmaking 1-on-1 VIP', val: 'Conexões de alto valor entre mentorados', icon: '🤝', col: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
    ];

    perks.forEach((pk, idx) => {
      const pky = cy - ch/2 + 104 + idx * 112;
      g.fillStyle = 'rgba(30, 41, 59, 0.7)';
      g.strokeStyle = pk.col === '#10b981' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(129, 140, 248, 0.3)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(cx - cw/2 + 24, pky, cw - 48, 96, 18);
      g.fill();
      g.stroke();

      // Ícone
      g.fillStyle = pk.bg;
      g.beginPath();
      g.arc(cx - cw/2 + 72, pky + 48, 28, 0, 7);
      g.fill();

      g.font = FB(24);
      g.textAlign = 'center';
      g.fillText(pk.icon, cx - cw/2 + 72, pky + 57);
      g.textAlign = 'left';

      // Textos do Benefício
      g.font = FB(22, true);
      g.fillStyle = '#ffffff';
      g.fillText(pk.title, cx - cw/2 + 116, pky + 40);

      g.font = FB(17);
      g.fillStyle = pk.col;
      g.fillText(pk.val, cx - cw/2 + 116, pky + 68);

      // Badge de Ativo
      g.fillStyle = pk.bg;
      g.beginPath();
      g.roundRect(cx + cw/2 - 180, pky + 30, 140, 36, 12);
      g.fill();

      g.font = FB(15, true);
      g.fillStyle = pk.col;
      g.textAlign = 'center';
      g.fillText('BENEFÍCIO ATIVO', cx + cw/2 - 110, pky + 54);
      g.textAlign = 'left';
    });

    // Rodapé
    const b4y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(129, 140, 248, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b4y, cw - 48, 56, 14);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = '#a5b4fc';
    g.fillText('🤝 Mais de R$ 120.000 em Benefícios & Conexões Exclusivas', cx - cw/2 + 45, b4y + 36);
  }

  else if (sc.type === 'final') {
    // ==========================================
    // CENA 05: CTA Final (Sem Colisão, Espaçamentos Perfeitos)
    // ==========================================
    const cx = 540, cy = 1240, cw = 880, ch = 496;

    // Sombra Dourada / Ciano
    g.shadowColor = 'rgba(251, 191, 36, 0.35)';
    g.shadowBlur = 36;
    g.fillStyle = 'rgba(15, 23, 42, 0.95)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 32);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Cabeçalho Interno do Card
    g.font = FD(38, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('Eleve o Padrão do seu Negócio', cx, cy - ch/2 + 76);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('com o Ecossistema ScaleMentors', cx, cy - ch/2 + 126);

    // 3 Benefícios Resumidos
    const benefits = [
      '🎓 Trilhas executivas práticas e playbooks acionáveis',
      '🏆 Certificação oficial de especialista com QR Code',
      '💎 Clube de vantagens exclusivo e networking de alto valor'
    ];

    benefits.forEach((b, idx) => {
      g.font = FB(21, true);
      g.fillStyle = '#f1f5f9';
      g.fillText(b, cx, cy - ch/2 + 188 + idx * 46);
    });

    // Botão VIP (Dentro dos limites com padding de segurança)
    const btnW = 768, btnH = 80;
    const btnY = cy + ch/2 - 112;
    const pulse = 1 + Math.sin(t * 6) * 0.02;

    g.save();
    g.translate(cx, btnY + btnH/2);
    g.scale(pulse, pulse);
    g.translate(-cx, -(btnY + btnH/2));

    g.shadowColor = 'rgba(251, 191, 36, 0.5)';
    g.shadowBlur = 25;
    g.fillStyle = GOLD;
    g.beginPath();
    g.roundRect(cx - btnW/2, btnY, btnW, btnH, 22);
    g.fill();
    g.shadowBlur = 0;

    g.font = FD(30, true);
    g.fillStyle = '#0B0F17';
    g.fillText('SOLICITAR DEMONSTRAÇÃO VIP 🚀', cx, btnY + 52);
    g.restore();

    // Texto de apoio abaixo do card
    g.font = FB(22);
    g.fillStyle = '#94a3b8';
    g.textAlign = 'center';
    g.fillText('Responda esta mensagem no WhatsApp para começar', cx, cy + ch/2 + 42);
    g.textAlign = 'left';
  }

  g.restore();
}

// Logo Oficial ScaleMentors
function drawScaleMentorsEmblem(g, cx, cy, alpha = 1, scale = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.scale(scale, scale);

  // Circulo com Glow
  g.shadowColor = 'rgba(6, 182, 212, 0.6)';
  g.shadowBlur = 20;
  g.fillStyle = '#090D1A';
  g.strokeStyle = '#38bdf8';
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(-220, 0, 58, 0, 7);
  g.fill();
  g.stroke();
  g.shadowBlur = 0;

  // Barras de escala
  g.fillStyle = '#38bdf8';
  g.beginPath(); g.roundRect(-248, 8, 12, 28, 5); g.fill();
  g.fillStyle = '#06b6d4';
  g.beginPath(); g.roundRect(-228, -10, 12, 46, 5); g.fill();
  g.fillStyle = '#10b981';
  g.beginPath(); g.roundRect(-208, -28, 12, 64, 5); g.fill();

  // Seta de crescimento
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-238, 30);
  g.lineTo(-218, 0);
  g.lineTo(-192, -28);
  g.stroke();

  // Texto ScaleMentors
  g.font = FD(56, true);
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.fillText('Scale', -130, 14);
  g.fillStyle = CYAN_BRIGHT;
  g.fillText('Mentors', 30, 14);

  // Subtitulo do logo
  g.font = FB(18, true);
  g.fillStyle = '#94a3b8';
  g.letterSpacing = '4px';
  g.fillText('CRM · VENDAS & MENTORIA COM IA', -126, 46);
  g.letterSpacing = '0px';

  g.restore();
}

function drawTextLayer(t) {
  TX.clearRect(0, 0, W, H);
  const sc = sceneAt(t);

  // Subtítulo / Categoria da Tela
  const alphaIn = eOut(clamp((t - sc.s) / 0.5, 0, 1));
  TX.save();
  TX.globalAlpha = alphaIn;
  TX.font = FB(28, true);
  TX.fillStyle = '#38bdf8';
  TX.letterSpacing = '4px';
  TX.fillText(sc.sub, 100, 240);
  TX.restore();

  // Título Principal em 3 Linhas Exatas
  if (sc.L) {
    drawWords(TX, sc.L.words, t, '#FFFFFF', CYAN_BRIGHT, { underline: true });
  }

  // Se for tela final, renderizar Emblema e Logo ScaleMentors
  if (sc.type === 'final') {
    const u = eOut(clamp((t - (sc.s + 0.1)) / 0.7, 0, 1));
    drawScaleMentorsEmblem(TX, 540, 680, clamp(u * 1.5, 0, 1), 0.95 + 0.05 * u);
  }
}

function compText(g, t) {
  const sc = sceneAt(t);
  const q = sc.type !== 'final' ? eIn(clamp((t - (sc.e - 0.45)) / 0.45, 0, 1)) : 0;
  const s = 1 + 0.06 * q + 0.03 * flashAt(t, BOUNDS);

  g.save();
  g.globalAlpha = 1 - q;
  if (q > 0.01) g.filter = `blur(${q * 10}px)`;
  g.translate(W / 2, H / 2);
  g.scale(s, s);
  g.translate(-W / 2, -H / 2);
  g.drawImage(TL, 0, 0);
  g.restore();
}

// Inicialização das Cenas e Textos
function setup() {
  SC.forEach((sc, i) => {
    const t0 = sc.s + 0.25;
    sc.L = layText(sc.title, {
      role: 'display',
      size: 58,
      maxW: 900,
      x: 100,
      y: 330,
      lh: 78,
      t0: t0,
      stag: 0.10,
      align: 'left'
    });
  });
}

// Loop Principal de Renderização por Frame
function draw(g, t) {
  drawWorld(g, t);

  const sc = sceneAt(t);
  drawSceneUI(g, sc, t);

  drawTextLayer(t);
  compText(g, t);
}

const PECA = {
  init() {
    setup();
  },

  render(t) {
    draw(ctx, t);

    // Flash e Transição Suave nas trocas de cena
    const flash = flashAt(t, BOUNDS);
    if (flash > 0) {
      lightFlash(ctx, flash, W / 2, H / 2, '6,182,212', false);
    }

    // Textura de Filme & Vinheta
    grain(ctx, t, 0.04);
    vignette(ctx, 0.20);
  },

  audio(K) {
    // Trilha Sonora Cyber Tech
    const chords = [
      [48, 55, 60, 63], // Cm7
      [44, 51, 56, 60], // Abmaj7
      [46, 53, 58, 62], // Bb7
      [48, 55, 60, 65]  // Csus4
    ];

    for (let t = 0; t < DUR; t += 3.0) {
      const chord = chords[Math.floor(t / 3.0) % chords.length];
      K.pad(t, chord, 3.2, 0.14);
      K.synth(t, chord[0] + 12, 0.08, 0.8, 'triangle', 800);
      K.synth(t + 1.5, chord[2] + 12, 0.06, 0.6, 'sine', 1200);
    }

    // Batidas sutis de fundo
    for (let t = 0.5; t < DUR - 1.0; t += 1.0) {
      K.kick(t, 0.18);
      K.hat(t + 0.5, 0.08);
    }

    // Efeitos sonoros nas transições de cena
    BOUNDS.forEach(tb => {
      K.whoosh(tb);
      K.shimmer(tb + 0.2);
    });

    K.boom(0.1);
    K.shimmer(55.0);
  },

  cover(g, w, h, nome) {
    // Capa Oficial do Reels / WhatsApp (1080x1920)
    bgGradient(g, '#090D1A', '#03050A');
    bgLights(g, 1.0, '6,182,212', 0.25, 5, true);

    // Logo no topo
    drawScaleMentorsEmblem(g, 540, 500, 1.0, 1.0);

    // Título Principal de Alto Impacto (3 Linhas no Máximo)
    g.font = FD(64, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('SCALE ACADEMY &', 540, 780);

    g.fillStyle = CYAN_BRIGHT;
    g.fillText('CERTIFICAÇÃO VIP', 540, 860);

    // Card Mockup de Destaque
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(140, 970, 800, 420, 24);
    g.fill();
    g.stroke();

    g.font = FB(32, true);
    g.fillStyle = GOLD_BRIGHT;
    g.textAlign = 'center';
    g.fillText('🏆 CERTIFICADO COM QR CODE & CLUBE VIP', 540, 1050);

    g.font = FB(26);
    g.fillStyle = '#cbd5e1';
    g.fillText('Trilhas Executivas de Escala Comercial', 540, 1120);
    g.fillText('Playbooks e Ferramentas Prontas para Uso', 540, 1180);
    g.fillText('Certificado Oficial com Autenticidade Digital', 540, 1240);
    g.fillText('Clube de Vantagens com Benefícios Exclusivos', 540, 1300);

    // Selo de Demonstração
    g.fillStyle = 'rgba(251, 191, 36, 0.2)';
    g.strokeStyle = GOLD_BRIGHT;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(240, 1470, 600, 88, 44);
    g.fill();
    g.stroke();

    g.font = FD(32, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('ASSISTA A DEMONSTRAÇÃO', 540, 1526);
    g.textAlign = 'left';

    grain(g, 1.0, 0.05);
    vignette(g, 0.22);
  }
};
