/* ScaleMentors - Apresentação Comercial WhatsApp (74s)
   Identidade: Cyber Tech / Dark Mode SaaS
   Elemento condutor: Cyber Pointer (cursor de precisão com feixe de luz neon)
*/

const CYAN = '#38BDF8', CYAN_BRIGHT = '#00F0FF', CYAN_DARK = '#0284C7';
const EMERALD = '#10B981', EMERALD_LIGHT = '#34D399';
const PURPLE = '#818CF8', PURPLE_DARK = '#4F46E5';
const BG_DARK = '#070A12', BG_DEEP = '#0B1120';

const FD = (s, it) => FONT('display', s, it);
const FB = (s, it) => FONT('body', s, it);

const SC = [
  {
    type: 'hook',
    s: 0.0,
    e: 11.2,
    sub: 'OPERACIONAL TRAVADO?',
    title: 'Gerenciar mentorados | com *planilhas soltas | está custando caro.'
  },
  {
    type: 'dashboard',
    s: 11.2,
    e: 23.4,
    sub: 'PAINEL CENTRAL EXECUTIVO',
    title: 'Conheça o *ScaleMentors | gestão 360° em tempo real.',
    mrr: 'R$ 148.500',
    alunos: '142 Mentorados',
    retencao: '96.4% Retenção'
  },
  {
    type: 'crm',
    s: 23.4,
    e: 37.5,
    sub: 'VENDAS & ATENDIMENTO COM IA',
    title: 'CRM e *WhatsApp | integrados: nenhum lead | ou aluno perdido.',
    dealName: 'Renovação Mentoria Black',
    dealValue: 'R$ 15.000,00'
  },
  {
    type: 'academy',
    s: 37.5,
    e: 49.7,
    sub: 'PORTAL DO ALUNO & GAMIFICAÇÃO',
    title: 'Aulas, *certificados e XP: | experiência de alto valor.',
    course: 'Aceleração de Negócios 2026',
    progress: '88%'
  },
  {
    type: 'security',
    s: 49.7,
    e: 61.1,
    sub: 'SEGURANÇA JURÍDICA & LTV',
    title: 'Contratos *SHA-256 e | métricas avançadas de escala.',
    sha: '0x8f4b...c3a9 (Autenticado)'
  },
  {
    type: 'final',
    s: 61.1,
    e: 74.0,
    sub: 'TRANSFORME SUA MENTORIA',
    title: 'Responda *QUERO agora | para receber demonstração.',
    ctaTitle: 'Responda "QUERO"',
    ctaDesc: 'Para receber sua demonstração exclusiva.'
  }
];

const BOUNDS = SC.slice(1).map(s => s.s);
let WP = [];
let EVENTS = [];

function pointerAt(t) {
  let i = 0;
  while (i < WP.length - 1 && WP[i + 1].t <= t) i++;
  const a = WP[i] || { t: 0, x: 540, y: 960, r: 20, a: 1 };
  const b = WP[Math.min(i + 1, WP.length - 1)] || a;
  const p = b.t > a.t ? eIO(clamp((t - a.t) / (b.t - a.t), 0, 1)) : 1;
  const o = {};
  for (const k of ['x', 'y', 'r', 'a']) o[k] = lerp(a[k], b[k], p);
  o.x += Math.sin(t * 2.2) * 5;
  o.y += Math.cos(t * 1.8) * 5;
  return o;
}

const sceneAt = t => SC.find(s => t >= s.s && t < s.e) || SC[SC.length - 1];

// Fundo Cyber Tech com malha e partículas de luz
function drawWorld(g, t) {
  bgGradient(g, '#0A0F1D', '#04070E');
  bgLights(g, t, '6,182,212', 0.18, 4, true);

  // Grid cibernético sutil
  g.save();
  g.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  g.lineWidth = 1;
  const offY = (t * 25) % 80;
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

// Renderização dos cards de UI ricos por cena
function drawSceneUI(g, sc, t) {
  const relT = t - sc.s;
  const alphaIn = eOut(clamp(relT / 0.6, 0, 1));
  const slideY = lerp(40, 0, alphaIn);

  g.save();
  g.globalAlpha = alphaIn;
  g.translate(0, slideY);

  if (sc.type === 'hook') {
    // Card de Dor: Planilhas / Caos
    const cx = 540, cy = 1180, cw = 880, ch = 480;
    g.fillStyle = 'rgba(15, 23, 42, 0.7)';
    g.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 24);
    g.fill();
    g.stroke();

    // Cabeçalho do Card
    g.fillStyle = 'rgba(239, 68, 68, 0.15)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 70, [24, 24, 0, 0]);
    g.fill();

    g.font = FB(28);
    g.fillStyle = '#f87171';
    g.fillText('⚠ CONTROLE MANUAL: PLANILHAS & DISPERSÃO', cx - cw/2 + 36, cy - ch/2 + 45);

    // Linhas de simulação de planilha confusa
    const items = [
      { name: 'Mentorado 01 (João)', status: 'Atrasado 12 dias', icon: '❌', col: '#ef4444' },
      { name: 'Mentorado 02 (Camila)', status: 'Contrato não assinado', icon: '⚠', col: '#f59e0b' },
      { name: 'Mentorado 03 (Rafael)', status: 'Lead parado no WhatsApp', icon: '⌛', col: '#ef4444' },
      { name: 'Mentorado 04 (Mariana)', status: 'Sem controle de renovação', icon: '❓', col: '#94a3b8' }
    ];

    items.forEach((it, idx) => {
      const iy = cy - ch/2 + 120 + idx * 80;
      g.fillStyle = 'rgba(30, 41, 59, 0.5)';
      g.beginPath();
      g.roundRect(cx - cw/2 + 24, iy, cw - 48, 64, 12);
      g.fill();

      g.font = FB(30, true);
      g.fillStyle = '#f1f5f9';
      g.fillText(it.name, cx - cw/2 + 50, iy + 42);

      g.font = FB(26);
      g.fillStyle = it.col;
      g.textAlign = 'right';
      g.fillText(it.status, cx + cw/2 - 50, iy + 42);
      g.textAlign = 'left';
    });
  }

  else if (sc.type === 'dashboard') {
    // Card Principal: KPIs Executivos
    const cx = 540, cy = 1180, cw = 880, ch = 520;
    
    // Sombra Neon Ciano
    g.shadowColor = 'rgba(6, 182, 212, 0.25)';
    g.shadowBlur = 30;
    g.fillStyle = 'rgba(15, 23, 42, 0.85)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header do Painel
    g.font = FB(26);
    g.fillStyle = '#38bdf8';
    g.fillText('● SCALE MENTORS DASHBOARD · LIVE METRICS', cx - cw/2 + 36, cy - ch/2 + 55);

    // 3 Cards de KPI em linha
    const kpis = [
      { label: 'MRR ATUAL', val: 'R$ 148.5K', growth: '+28.4%', col: '#10b981' },
      { label: 'RETENÇÃO', val: '96.4%', growth: 'M0-M12', col: '#38bdf8' },
      { label: 'ALUNOS', val: '142 Ativos', growth: 'Capacidade 85%', col: '#818cf8' }
    ];

    const kw = (cw - 72) / 3;
    kpis.forEach((kp, idx) => {
      const kx = cx - cw/2 + 24 + idx * (kw + 12);
      const ky = cy - ch/2 + 90;
      g.fillStyle = 'rgba(30, 41, 59, 0.6)';
      g.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(kx, ky, kw, 120, 16);
      g.fill();
      g.stroke();

      g.font = FB(20);
      g.fillStyle = '#94a3b8';
      g.fillText(kp.label, kx + 16, ky + 34);

      g.font = FD(34, true);
      g.fillStyle = '#ffffff';
      g.fillText(kp.val, kx + 16, ky + 76);

      g.font = FB(18);
      g.fillStyle = kp.col;
      g.fillText(kp.growth, kx + 16, ky + 104);
    });

    // Gráfico de Linha Neon
    const gy = cy + 60, gh = 180, gw = cw - 48;
    g.fillStyle = 'rgba(2, 6, 23, 0.6)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, gy, gw, gh, 18);
    g.fill();

    // Linhas de curva com animação
    const chartProgress = clamp((relT - 0.4) / 1.5, 0, 1);
    g.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    g.beginPath();
    for (let l = 1; l <= 3; l++) {
      g.moveTo(cx - cw/2 + 40, gy + (gh/4)*l);
      g.lineTo(cx + cw/2 - 40, gy + (gh/4)*l);
    }
    g.stroke();

    // Curva Ascendente
    g.strokeStyle = CYAN_BRIGHT;
    g.lineWidth = 4;
    g.beginPath();
    const pts = [
      { x: 0, y: 0.8 }, { x: 0.2, y: 0.7 }, { x: 0.4, y: 0.55 },
      { x: 0.6, y: 0.4 }, { x: 0.8, y: 0.25 }, { x: 1.0, y: 0.1 }
    ];
    pts.forEach((p, idx) => {
      const px = (cx - cw/2 + 50) + p.x * (gw - 100) * chartProgress;
      const py = gy + gh * p.y;
      if (idx === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.stroke();

    // Ponto final brilhante
    const lastX = (cx - cw/2 + 50) + (gw - 100) * chartProgress;
    const lastY = gy + gh * 0.1;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(lastX, lastY, 7, 0, 7);
    g.fill();
  }

  else if (sc.type === 'crm') {
    // Card CRM & Conversas WhatsApp Inteligentes
    const cx = 540, cy = 1180, cw = 880, ch = 520;
    g.fillStyle = 'rgba(15, 23, 42, 0.85)';
    g.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();

    // Header WhatsApp / CRM
    g.font = FB(26);
    g.fillStyle = '#34d399';
    g.fillText('⚡ CRM WHATSAPP · DISPARO & IA NATIVOS', cx - cw/2 + 36, cy - ch/2 + 55);

    // Balões de Mensagem Estilo WhatsApp
    const msgs = [
      { from: 'lead', text: 'Olá! Tenho interesse em renovar minha mentoria este mês.', t: 0.2, w: 700 },
      { from: 'bot', text: 'Perfeito! Já gerei sua proposta e seu contrato digital oficial.', t: 1.0, w: 780 },
      { from: 'bot', text: 'Toque para assinar com carimbo de segurança SHA-256.', t: 1.8, w: 700 }
    ];

    msgs.forEach((m, idx) => {
      const msgAlpha = eOut(clamp((relT - m.t) / 0.5, 0, 1));
      if (msgAlpha <= 0) return;
      const isBot = m.from === 'bot';
      const bw = m.w, bh = 76;
      const bx = isBot ? cx + cw/2 - bw - 28 : cx - cw/2 + 28;
      const by = cy - ch/2 + 86 + idx * 98;

      g.save();
      g.globalAlpha = msgAlpha;
      g.fillStyle = isBot ? '#064e3b' : 'rgba(30, 41, 59, 0.9)';
      g.strokeStyle = isBot ? '#059669' : 'rgba(71, 85, 105, 0.5)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(bx, by, bw, bh, 18);
      g.fill();
      g.stroke();

      g.font = FB(21);
      g.fillStyle = '#ffffff';
      g.fillText(m.text, bx + 22, by + 46);
      g.restore();
    });

    // Tag de Deal Fechado
    const tagAlpha = eOut(clamp((relT - 2.5) / 0.5, 0, 1));
    if (tagAlpha > 0) {
      g.save();
      g.globalAlpha = tagAlpha;
      g.fillStyle = 'rgba(16, 185, 129, 0.2)';
      g.strokeStyle = '#10b981';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(cx - 240, cy + ch/2 - 80, 480, 58, 29);
      g.fill();
      g.stroke();

      g.font = FB(24, true);
      g.fillStyle = '#34d399';
      g.textAlign = 'center';
      g.fillText('✓ DEAL GANHO: R$ 15.000,00', cx, cy + ch/2 - 44);
      g.textAlign = 'left';
      g.restore();
    }
  }

  else if (sc.type === 'academy') {
    // Portal do Aluno & Gamificação
    const cx = 540, cy = 1180, cw = 880, ch = 520;
    g.fillStyle = 'rgba(15, 23, 42, 0.85)';
    g.strokeStyle = 'rgba(129, 140, 248, 0.4)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();

    g.font = FB(26);
    g.fillStyle = '#a5b4fc';
    g.fillText('🏆 ROCKET ACADEMY & GAMIFICAÇÃO', cx - cw/2 + 36, cy - ch/2 + 55);

    // Barra de Progresso do Curso
    const py = cy - ch/2 + 100;
    g.font = FD(32, true);
    g.fillStyle = '#ffffff';
    g.fillText('Formação Scale Mentors 2026', cx - cw/2 + 36, py + 30);

    g.font = FB(24);
    g.fillStyle = '#94a3b8';
    g.fillText('Módulo 04: Estratégias de Escala e Retenção', cx - cw/2 + 36, py + 70);

    // Barra
    const progVal = clamp(relT / 1.8, 0, 0.88);
    g.fillStyle = 'rgba(30, 41, 59, 0.8)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 36, py + 95, cw - 72, 20, 10);
    g.fill();

    g.fillStyle = CYAN_BRIGHT;
    g.beginPath();
    g.roundRect(cx - cw/2 + 36, py + 95, (cw - 72) * progVal, 20, 10);
    g.fill();

    g.font = FD(24, true);
    g.fillStyle = '#38bdf8';
    g.textAlign = 'right';
    g.fillText(`${Math.round(progVal * 100)}% CONCLUÍDO`, cx + cw/2 - 36, py + 80);
    g.textAlign = 'left';

    // Insígnias de Gamificação / Leaderboard
    const badges = [
      { name: '🔥 100k Club', rank: '#1', xp: '2.450 XP' },
      { name: '⭐ Top Executor', rank: '#2', xp: '1.980 XP' },
      { name: '🚀 Super Escala', rank: '#3', xp: '1.750 XP' }
    ];

    badges.forEach((b, idx) => {
      const bx = cx - cw/2 + 36 + idx * ((cw - 96) / 3 + 12);
      const by = cy + 40;
      const bw = (cw - 96) / 3;
      g.fillStyle = 'rgba(30, 41, 59, 0.7)';
      g.strokeStyle = 'rgba(129, 140, 248, 0.25)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(bx, by, bw, 140, 18);
      g.fill();
      g.stroke();

      g.font = FB(22, true);
      g.fillStyle = '#ffffff';
      g.fillText(b.name, bx + 16, by + 40);

      g.font = FD(28, true);
      g.fillStyle = '#818cf8';
      g.fillText(b.rank, bx + 16, by + 82);

      g.font = FB(20);
      g.fillStyle = '#34d399';
      g.fillText(b.xp, bx + 16, by + 116);
    });
  }

  else if (sc.type === 'security') {
    // Segurança Jurídica, SHA-256 e Cohort
    const cx = 540, cy = 1180, cw = 880, ch = 520;
    g.fillStyle = 'rgba(15, 23, 42, 0.85)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();

    g.font = FB(26);
    g.fillStyle = '#38bdf8';
    g.fillText('🔒 AUTENTICIDADE CRIPTOGRÁFICA & RETENÇÃO', cx - cw/2 + 36, cy - ch/2 + 55);

    // Carimbo SHA-256
    const sy = cy - ch/2 + 100;
    g.fillStyle = 'rgba(16, 185, 129, 0.12)';
    g.strokeStyle = '#10b981';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(cx - cw/2 + 36, sy, cw - 72, 130, 20);
    g.fill();
    g.stroke();

    g.font = FD(30, true);
    g.fillStyle = '#34d399';
    g.fillText('✓ CONTRATO HOMOLOGADO & ASSINADO', cx - cw/2 + 64, sy + 46);

    g.font = FB(22);
    g.fillStyle = '#cbd5e1';
    g.fillText('Hash SHA-256: 8f4b6a19e2c4d077b5a19028f...', cx - cw/2 + 64, sy + 82);

    g.font = FB(20);
    g.fillStyle = '#94a3b8';
    g.fillText('Carimbo de Tempo: 2026-09-29 11:45:00 UTC-3', cx - cw/2 + 64, sy + 112);

    // Heatmap Cohort Simulado
    const hy = cy + 70;
    g.font = FB(24, true);
    g.fillStyle = '#ffffff';
    g.fillText('Matriz de Retenção Cohort (M0 a M12)', cx - cw/2 + 36, hy + 20);

    const blocks = [100, 96, 94, 91, 89, 88];
    const hw = (cw - 72) / 6;
    blocks.forEach((pct, idx) => {
      const hx = cx - cw/2 + 36 + idx * hw;
      g.fillStyle = `rgba(16, 185, 129, ${pct / 120})`;
      g.beginPath();
      g.roundRect(hx + 4, hy + 40, hw - 8, 60, 10);
      g.fill();

      g.font = FB(22, true);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.fillText(`${pct}%`, hx + hw/2, hy + 78);
      g.textAlign = 'left';
    });
  }

  else if (sc.type === 'final') {
    // Tela Final com Logo e CTA de Venda
    const cx = 540, cy = 1200;

    // Botão de Chamada para Ação
    g.fillStyle = 'rgba(6, 182, 212, 0.2)';
    g.strokeStyle = CYAN_BRIGHT;
    g.lineWidth = 3;
    g.shadowColor = 'rgba(6, 182, 212, 0.4)';
    g.shadowBlur = 35;
    g.beginPath();
    g.roundRect(cx - 360, cy - 60, 720, 120, 60);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    g.font = FD(44, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('RESPONDA "QUERO"', cx, cy + 14);

    g.font = FB(28);
    g.fillStyle = '#94a3b8';
    g.fillText('Para ver uma demonstração exclusiva da sua mentoria', cx, cy + 110);
    g.fillText('ScaleMentors · A Plataforma dos Grandes Mentores', cx, cy + 155);
    g.textAlign = 'left';
  }

  g.restore();
}

function drawScaleMentorsEmblem(g, cx, cy, alpha = 1, scale = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.scale(scale, scale);

  // Circulo com Glow
  g.shadowColor = 'rgba(6, 182, 212, 0.6)';
  g.shadowBlur = 24;
  g.fillStyle = '#090d16';
  g.strokeStyle = '#38bdf8';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(-220, 0, 64, 0, 7);
  g.fill();
  g.stroke();
  g.shadowBlur = 0;

  // Barras de escala
  g.fillStyle = '#38bdf8';
  g.beginPath(); g.roundRect(-252, 10, 14, 30, 6); g.fill();
  g.fillStyle = '#06b6d4';
  g.beginPath(); g.roundRect(-230, -10, 14, 50, 6); g.fill();
  g.fillStyle = '#10b981';
  g.beginPath(); g.roundRect(-208, -30, 14, 70, 6); g.fill();

  // Seta de crescimento
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(-242, 35);
  g.lineTo(-220, 0);
  g.lineTo(-190, -32);
  g.stroke();

  // Texto ScaleMentors
  g.font = FD(60, true);
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.fillText('Scale', -130, 14);
  g.fillStyle = CYAN_BRIGHT;
  g.fillText('Mentors', 40, 14);

  // Subtitulo do logo
  g.font = FB(20, true);
  g.fillStyle = '#94a3b8';
  g.letterSpacing = '5px';
  g.fillText('SAAS · MENTORSHIP OS', -126, 48);
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
  TX.font = FB(30, true);
  TX.fillStyle = '#38bdf8';
  TX.letterSpacing = '4px';
  TX.fillText(sc.sub, 100, 240);
  TX.restore();

  // Título Principal com entrada dinâmica de palavras
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
  const s = 1 + 0.08 * q + 0.04 * flashAt(t, BOUNDS);

  g.save();
  g.globalAlpha = 1 - q;
  if (q > 0.01) g.filter = `blur(${q * 12}px)`;
  g.translate(W / 2, H / 2);
  g.scale(s, s);
  g.translate(-W / 2, -H / 2);
  g.drawImage(TL, 0, 0);
  g.restore();
}

// Renderiza o Cyber Pointer (Elemento Condutor)
function drawPointer(g, t) {
  const p = pointerAt(t);
  if (p.a <= 0.01) return;

  g.save();
  g.globalAlpha = p.a;

  // Brilho Neon em torno do cursor
  g.shadowColor = CYAN_BRIGHT;
  g.shadowBlur = 20;

  // Feixe de luz
  g.strokeStyle = CYAN_BRIGHT;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(p.x, p.y, p.r, 0, 7);
  g.stroke();

  // Ponto central
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(p.x, p.y, 5, 0, 7);
  g.fill();

  // Mira cibernética
  g.beginPath();
  g.moveTo(p.x - p.r - 8, p.y);
  g.lineTo(p.x + p.r + 8, p.y);
  g.moveTo(p.x, p.y - p.r - 8);
  g.lineTo(p.x + p.r + 8, p.y);
  g.stroke();

  g.restore();
}

const PECA = {
  init() {
    // Processamento de textos de cada cena
    SC.forEach((sc, idx) => {
      const t0 = sc.s + 0.3;
      sc.L = layText(sc.title, {
        role: 'display',
        size: 72,
        maxW: 880,
        x: 100,
        y: 330,
        lh: 92,
        t0: t0,
        stag: 0.12,
        align: 'left'
      });
    });

    // Caminho dinâmico do Cyber Pointer navegando entre as telas
    const add = (t, x, y, r = 24, a = 1) => WP.push({ t, x, y, r, a });
    add(0.0, 540, 1180, 28, 1);
    add(5.0, 750, 1260, 24, 1);
    add(11.2, 540, 960, 32, 1);
    add(16.0, 320, 1160, 26, 1);
    add(20.0, 780, 1260, 28, 1);
    add(23.4, 540, 960, 32, 1);
    add(29.0, 680, 1240, 24, 1);
    add(34.0, 540, 1420, 30, 1);
    add(37.5, 540, 960, 32, 1);
    add(43.0, 780, 1140, 26, 1);
    add(47.0, 380, 1340, 28, 1);
    add(49.7, 540, 960, 32, 1);
    add(55.0, 540, 1180, 30, 1);
    add(61.1, 540, 680, 34, 1);
    add(66.0, 540, 1200, 28, 1);
    add(74.0, 540, 1200, 28, 1);
  },

  render(t) {
    const sc = sceneAt(t);

    // 1. Fundo do Mundo
    drawWorld(ctx, t);

    // 2. UI da Cena Atual
    drawSceneUI(ctx, sc, t);

    // 3. Camada de Texto
    drawTextLayer(t);
    compText(ctx, t);

    // 4. Flash de Transição nas trocas de cena
    const flash = flashAt(t, BOUNDS);
    if (flash > 0) {
      lightFlash(ctx, flash, W / 2, H / 2, '6,182,212', false);
    }

    // 6. Textura de Filme & Vinheta
    grain(ctx, t, 0.04);
    vignette(ctx, 0.22);
  },

  audio(K) {
    // Trilha Sonora Cyber Tech (com ducking automático pela voz)
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
    K.shimmer(61.2);
  },

  cover(g, w, h, nome) {
    // Capa Oficial do Reels / WhatsApp (1080x1920)
    bgGradient(g, '#0A0F1D', '#03060C');
    bgLights(g, 1.0, '6,182,212', 0.25, 4, true);

    // Logo no topo
    drawScaleMentorsEmblem(g, 540, 520, 1.0, 1.0);

    // Título Principal de Alto Impacto
    g.font = FD(68, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('O NOVO PADRÃO DE', 540, 820);

    g.fillStyle = CYAN_BRIGHT;
    g.fillText('GESTÃO DE MENTORIAS', 540, 910);

    // Card Mockup de Destaque
    g.fillStyle = 'rgba(15, 23, 42, 0.9)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(140, 1020, 800, 360, 24);
    g.fill();
    g.stroke();

    g.font = FB(34, true);
    g.fillStyle = '#34d399';
    g.textAlign = 'center';
    g.fillText('● SCALE MENTORS SaaS', 540, 1100);

    g.font = FB(28);
    g.fillStyle = '#cbd5e1';
    g.fillText('CRM WhatsApp · Contratos SHA-256', 540, 1170);
    g.fillText('Portal do Aluno · Gamificação & XP', 540, 1230);
    g.fillText('Dashboard Executivo em Tempo Real', 540, 1290);

    // Selo de Demonstração
    g.fillStyle = 'rgba(6, 182, 212, 0.2)';
    g.strokeStyle = CYAN_BRIGHT;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(240, 1460, 600, 90, 45);
    g.fill();
    g.stroke();

    g.font = FD(34, true);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('ASSISTA A DEMONSTRAÇÃO', 540, 1518);
    g.textAlign = 'left';

    grain(g, 1.0, 0.05);
    vignette(g, 0.25);
  }
};
