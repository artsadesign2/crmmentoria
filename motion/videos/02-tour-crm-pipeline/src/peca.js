/* ScaleMentors - Vídeo 02: CRM Inteligente & Automação WhatsApp (~72s)
   Identidade: Cyber Tech / Dark Mode SaaS High-Ticket
   Diretrizes: Sem alvo/crosshair, zero transbordo de texto, títulos estritamente em 3 linhas, dinamismo constante, transições fluidas.
*/

const CYAN = '#38BDF8', CYAN_BRIGHT = '#00F0FF', CYAN_DARK = '#0284C7';
const EMERALD = '#10B981', EMERALD_LIGHT = '#34D399';
const PURPLE = '#818CF8', PURPLE_DARK = '#4F46E5';
const GOLD = '#FBBF24', GOLD_BRIGHT = '#FCD34D';
const RED_ALERT = '#EF4444', RED_BG = 'rgba(239, 68, 68, 0.15)';
const BG_DARK = '#070A12', BG_DEEP = '#0B1120';

const FD = (s, it) => FONT('display', s, it);
const FB = (s, it) => FONT('body', s, it);

const SC = [
  {
    type: 'gargalo',
    s: 0.0,
    e: 14.92,
    sub: 'GARGALO DE VENDAS NO WHATSAPP',
    title: 'Perdendo leads no *WhatsApp | por demora no atendimento | ou gargalos comerciais?'
  },
  {
    type: 'sdr_ia',
    s: 14.92,
    e: 29.12,
    sub: 'SDR VIRTUAL COM IA GENERATIVA',
    title: 'Atendimento em *segundos | com inteligência artificial: | zero leads no vácuo.'
  },
  {
    type: 'qualificacao',
    s: 29.12,
    e: 43.32,
    sub: 'QUALIFICAÇÃO & AGENDAMENTO VIP',
    title: 'Score e *qualificação | com sync no Google Calendar | 100% no automático.'
  },
  {
    type: 'kanban',
    s: 43.32,
    e: 58.56,
    sub: 'PIPELINE KANBAN & COPILOTO DE VENDAS',
    title: 'Visão 360° do *pipeline: | cadência anti-vácuo | e fechamento com IA.'
  },
  {
    type: 'final',
    s: 58.56,
    e: 72.12,
    sub: 'ESCALA COMERCIAL PREVISÍVEL',
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

// Renderização dos cards de UI ricos por cena
function drawSceneUI(g, sc, t) {
  const relT = t - sc.s;
  const sceneDur = sc.e - sc.s;
  
  // Transições suaves de Entrada e Saída entre cenas
  const enterProgress = eOut(clamp(relT / 0.55, 0, 1));
  const exitProgress = sc.type !== 'final' ? eIn(clamp((relT - (sceneDur - 0.45)) / 0.45, 0, 1)) : 0;
  
  const alphaScene = enterProgress * (1 - exitProgress);
  const slideY = lerp(45, 0, enterProgress) - lerp(0, 30, exitProgress);
  const scaleScene = lerp(0.96, 1.0, enterProgress) * (1 + 0.03 * exitProgress);

  if (alphaScene <= 0.01) return;

  g.save();
  g.globalAlpha = alphaScene;
  g.translate(W / 2, 1210);
  g.scale(scaleScene, scaleScene);
  g.translate(-W / 2, -1210 + slideY);

  if (sc.type === 'gargalo') {
    // ==========================================
    // CENA 01: Gargalo de Vendas (Dinâmico e Sequencial)
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 540;
    
    // Card Base
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    g.lineWidth = 2.5;
    g.shadowColor = 'rgba(239, 68, 68, 0.25)';
    g.shadowBlur = 30;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Cabeçalho com Alerta Pulsante
    g.fillStyle = 'rgba(239, 68, 68, 0.16)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 76, [28, 28, 0, 0]);
    g.fill();

    const beaconPulse = 1 + Math.sin(t * 8) * 0.2;
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(cx - cw/2 + 45, cy - ch/2 + 38, 7 * beaconPulse, 0, 7);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = '#f87171';
    g.fillText('⚠ GARGALO DE VENDAS · 3 LEADS QUALIFICADOS EM ESPERA', cx - cw/2 + 65, cy - ch/2 + 45);

    // Lista de Mensagens no WhatsApp não respondidas com Entrada Sequencial (Staggered)
    const msgs = [
      { name: 'Dr. Roberto (Clínica)', text: 'Gostaria de agendar o diagnóstico para minha clínica...', delay: 0.6, sla: 'SLA Estourado (+48m)', col: '#ef4444', waitTime: 48 },
      { name: 'Camila Santos (E-com 7D)', text: 'Vi o programa ScaleMentors. Como funciona a mentoria?', delay: 3.8, sla: 'Sem Resposta (1h 15m)', col: '#ef4444', waitTime: 75 },
      { name: 'Marcos Rezende (SaaS B2B)', text: 'Queremos estruturar nosso time de pré-vendas com IA.', delay: 7.2, sla: 'Risco Crítico de Perda', col: '#f59e0b', waitTime: 150 }
    ];

    msgs.forEach((m, idx) => {
      const msgRelT = relT - m.delay;
      if (msgRelT < 0) return;

      const mAlpha = eOut(clamp(msgRelT / 0.45, 0, 1));
      const mSlide = lerp(30, 0, mAlpha);
      const my = cy - ch/2 + 96 + idx * 110 + mSlide;

      g.save();
      g.globalAlpha = alphaScene * mAlpha;

      g.fillStyle = 'rgba(30, 41, 59, 0.7)';
      g.strokeStyle = m.col === '#ef4444' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(cx - cw/2 + 24, my, cw - 48, 96, 18);
      g.fill();
      g.stroke();

      // Avatar
      g.fillStyle = m.col === '#ef4444' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.22)';
      g.beginPath();
      g.arc(cx - cw/2 + 68, my + 48, 26, 0, 7);
      g.fill();

      g.font = FB(22, true);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.fillText('👤', cx - cw/2 + 68, my + 56);
      g.textAlign = 'left';

      // Nome do Lead
      g.font = FB(24, true);
      g.fillStyle = '#ffffff';
      g.fillText(m.name, cx - cw/2 + 110, my + 38);

      // Mensagem do Lead
      g.font = FB(20);
      g.fillStyle = '#94a3b8';
      g.fillText(m.text, cx - cw/2 + 110, my + 70);

      // Badge de SLA Estourado com pulso
      g.font = FB(17, true);
      g.fillStyle = m.col;
      g.textAlign = 'right';
      g.fillText(m.sla, cx + cw/2 - 45, my + 38);

      // Contador de espera dinâmico
      const waitCount = Math.min(m.waitTime, Math.floor(msgRelT * 12 + 10));
      g.font = FB(16);
      g.fillStyle = '#64748b';
      g.fillText(`Tempo: ${waitCount} min atrás`, cx + cw/2 - 45, my + 70);
      g.textAlign = 'left';

      g.restore();
    });

    // Barra de Prejuízo Estimado (Ativa a partir de 9.5s com animação)
    const lossRelT = relT - 9.5;
    if (lossRelT > 0) {
      const lAlpha = eOut(clamp(lossRelT / 0.5, 0, 1));
      const lossY = cy + ch/2 - 82;

      g.save();
      g.globalAlpha = alphaScene * lAlpha;
      g.fillStyle = 'rgba(239, 68, 68, 0.18)';
      g.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(cx - cw/2 + 24, lossY, cw - 48, 60, 16);
      g.fill();
      g.stroke();

      const valProgress = eOut(clamp(lossRelT / 1.2, 0, 1));
      const lossAmount = Math.floor(valProgress * 45000).toLocaleString('pt-BR');

      g.font = FB(22, true);
      g.fillStyle = '#f87171';
      g.fillText(`📉 Impacto Estimado: -R$ ${lossAmount} em Contratos Perdidos`, cx - cw/2 + 45, lossY + 38);
      g.restore();
    }
  }

  else if (sc.type === 'sdr_ia') {
    // ==========================================
    // CENA 02: SDR IA no WhatsApp (Sem Transbordo, Responsivo)
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Ciano Neon
    g.shadowColor = 'rgba(6, 182, 212, 0.3)';
    g.shadowBlur = 30;
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header do Chat com Status Online
    g.fillStyle = 'rgba(56, 189, 248, 0.12)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 76, [28, 28, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = CYAN_BRIGHT;
    g.fillText('🤖 SDR VIRTUAL COM IA · RESPOSTA IMEDIATA', cx - cw/2 + 30, cy - ch/2 + 48);

    g.fillStyle = '#10b981';
    g.beginPath();
    g.arc(cx + cw/2 - 40, cy - ch/2 + 44, 7, 0, 7);
    g.fill();
    g.font = FB(18, true);
    g.fillStyle = '#34d399';
    g.textAlign = 'right';
    g.fillText('3.2s', cx + cw/2 - 55, cy - ch/2 + 49);
    g.textAlign = 'left';

    // ----------------------------------------------------
    // Balão 1: Lead (Direita) - Entrada aos 0.4s
    // ----------------------------------------------------
    const b1RelT = relT - 0.4;
    if (b1RelT > 0) {
      const b1Alpha = eOut(clamp(b1RelT / 0.4, 0, 1));
      const b1y = cy - ch/2 + 96;
      const b1W = 680, b1H = 86;
      const b1X = cx + cw/2 - 24 - b1W;

      g.save();
      g.globalAlpha = alphaScene * b1Alpha;
      g.fillStyle = 'rgba(30, 41, 59, 0.85)';
      g.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(b1X, b1y, b1W, b1H, 18);
      g.fill();
      g.stroke();

      g.font = FB(21);
      g.fillStyle = '#f1f5f9';
      g.fillText('Olá, faturamos R$ 180k/mês e queremos', b1X + 24, b1y + 36);
      g.fillText('estruturar nosso comercial de alta performance.', b1X + 24, b1y + 66);

      g.font = FB(15);
      g.fillStyle = '#64748b';
      g.textAlign = 'right';
      g.fillText('14:02 ✓✓', b1X + b1W - 20, b1y + 66);
      g.textAlign = 'left';
      g.restore();
    }

    // ----------------------------------------------------
    // Balão 2: ScaleMentors Copilot (Esquerda) - Entrada aos 3.2s
    // ----------------------------------------------------
    const b2RelT = relT - 3.0;
    if (b2RelT > 0) {
      const b2Alpha = eOut(clamp(b2RelT / 0.45, 0, 1));
      const b2y = cy - ch/2 + 196;
      const b2W = 760, b2H = 124;
      const b2X = cx - cw/2 + 24;

      g.save();
      g.globalAlpha = alphaScene * b2Alpha;
      g.fillStyle = 'rgba(6, 182, 212, 0.12)';
      g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(b2X, b2y, b2W, b2H, 18);
      g.fill();
      g.stroke();

      g.font = FB(19, true);
      g.fillStyle = CYAN_BRIGHT;
      g.fillText('ScaleMentors Copilot (IA SDR):', b2X + 24, b2y + 32);

      g.font = FB(20);
      g.fillStyle = '#ffffff';
      g.fillText('Perfeito, Dr. Roberto! Nosso programa já acelerou +140 mentorias.', b2X + 24, b2y + 66);
      g.fillText('Qual seu maior desafio hoje: contratação ou fechamento de calls?', b2X + 24, b2y + 98);
      g.restore();
    }

    // ----------------------------------------------------
    // Balão 3: Agendamento Sincronizado (Esquerda) - Entrada aos 6.8s
    // ----------------------------------------------------
    const b3RelT = relT - 6.8;
    if (b3RelT > 0) {
      const b3Alpha = eOut(clamp(b3RelT / 0.45, 0, 1));
      const b3y = cy - ch/2 + 334;
      const b3W = 760, b3H = 112;
      const b3X = cx - cw/2 + 24;

      g.save();
      g.globalAlpha = alphaScene * b3Alpha;
      g.fillStyle = 'rgba(16, 185, 129, 0.14)';
      g.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(b3X, b3y, b3W, b3H, 18);
      g.fill();
      g.stroke();

      g.font = FB(19, true);
      g.fillStyle = '#34d399';
      g.fillText('📅 Sugestão de Horário Sincronizada:', b3X + 24, b3y + 32);

      g.font = FB(20);
      g.fillStyle = '#f1f5f9';
      g.fillText('Temos Terça às 14:00 ou Quarta às 16:00 disponíveis', b3X + 24, b3y + 66);
      g.fillText('para seu diagnóstico executivo com o mentor.', b3X + 24, b3y + 96);
      g.restore();
    }

    // Badge inferior de SLA 100% cumprido
    const b4y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(16, 185, 129, 0.18)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b4y, cw - 48, 54, 14);
    g.fill();

    g.font = FB(21, true);
    g.fillStyle = '#34d399';
    g.fillText('⚡ 100% dos Leads Atendidos em menos de 10s • Sem Vácuo Comercial', cx - cw/2 + 45, b4y + 35);
  }

  else if (sc.type === 'qualificacao') {
    // ==========================================
    // CENA 03: Qualificação & Google Calendar (Responsivo)
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Esmeralda
    g.shadowColor = 'rgba(16, 185, 129, 0.25)';
    g.shadowBlur = 30;
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header
    g.fillStyle = 'rgba(16, 185, 129, 0.14)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 76, [28, 28, 0, 0]);
    g.fill();

    g.font = FB(22, true);
    g.fillStyle = '#34d399';
    g.fillText('🎯 QUALIFICAÇÃO AUTOMÁTICA & SYNC GOOGLE CALENDAR', cx - cw/2 + 30, cy - ch/2 + 48);

    // 2 Colunas
    const leftW = 395, rightW = 415;

    // Coluna Esquerda: Lead Score Card
    const lcx = cx - cw/2 + 24;
    const lcy = cy - ch/2 + 96;
    g.fillStyle = 'rgba(30, 41, 59, 0.6)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(lcx, lcy, leftW, 320, 20);
    g.fill();
    g.stroke();

    g.font = FB(20, true);
    g.fillStyle = '#38bdf8';
    g.fillText('PERFIL QUALIFICADO (IA)', lcx + 20, lcy + 38);

    const leadInfo = [
      { label: 'Empresa', val: 'Silva Group E-com' },
      { label: 'Faturamento', val: 'R$ 180.000 / mês' },
      { label: 'Desafio', val: 'Escalar Time Comercial' },
      { label: 'Lead Score', val: '98 / 100 • FIT ALTO' }
    ];

    leadInfo.forEach((inf, idx) => {
      const iy = lcy + 76 + idx * 60;
      g.font = FB(16);
      g.fillStyle = '#94a3b8';
      g.fillText(inf.label, lcx + 20, iy);
      g.font = FB(21, true);
      g.fillStyle = idx === 3 ? '#34d399' : '#ffffff';
      g.fillText(inf.val, lcx + 20, iy + 26);
    });

    // Coluna Direita: Google Calendar Card
    const rcx = cx - cw/2 + 440;
    const rcy = cy - ch/2 + 96;
    g.fillStyle = 'rgba(30, 41, 59, 0.6)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(rcx, rcy, rightW, 320, 20);
    g.fill();
    g.stroke();

    g.font = FB(20, true);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('GOOGLE CALENDAR SYNC 📅', rcx + 20, rcy + 38);

    g.fillStyle = 'rgba(251, 191, 36, 0.14)';
    g.beginPath();
    g.roundRect(rcx + 16, rcy + 60, rightW - 32, 145, 14);
    g.fill();

    g.font = FB(21, true);
    g.fillStyle = '#ffffff';
    g.fillText('Reunião de Diagnóstico 360°', rcx + 30, rcy + 96);
    g.font = FB(17);
    g.fillStyle = GOLD;
    g.fillText('Terça-feira, 14:00 - 14:45', rcx + 30, rcy + 128);
    g.fillStyle = '#94a3b8';
    g.fillText('Link Google Meet integrado', rcx + 30, rcy + 158);

    g.font = FB(17, true);
    g.fillStyle = '#34d399';
    g.fillText('✓ Convite enviado no WhatsApp', rcx + 20, rcy + 245);
    g.fillStyle = '#94a3b8';
    g.font = FB(15);
    g.fillText('Lembretes automáticos 24h e 1h antes', rcx + 20, rcy + 275);

    // Rodapé
    const b5y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(16, 185, 129, 0.18)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b5y, cw - 48, 54, 14);
    g.fill();

    g.font = FB(21, true);
    g.fillStyle = '#34d399';
    g.fillText('🚀 Agenda do Closer Sempre Lotada sem Trabalho Manual', cx - cw/2 + 45, b5y + 35);
  }

  else if (sc.type === 'kanban') {
    // ==========================================
    // CENA 04: Pipeline Kanban 360° & Copiloto
    // ==========================================
    const cx = 540, cy = 1200, cw = 880, ch = 560;
    
    // Sombra Roxa / Ciano
    g.shadowColor = 'rgba(129, 140, 248, 0.3)';
    g.shadowBlur = 30;
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(129, 140, 248, 0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, ch, 28);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    // Header do Kanban
    g.fillStyle = 'rgba(129, 140, 248, 0.15)';
    g.beginPath();
    g.roundRect(cx - cw/2, cy - ch/2, cw, 76, [28, 28, 0, 0]);
    g.fill();

    g.font = FB(24, true);
    g.fillStyle = '#a5b4fc';
    g.fillText('📊 PIPELINE KANBAN HIGH-TICKET · GESTÃO 360°', cx - cw/2 + 36, cy - ch/2 + 48);

    // 3 Colunas Kanban
    const colW = 265;
    const cols = [
      { name: '1. QUALIFICADOS', count: '6', col: '#38bdf8' },
      { name: '2. DIAGNÓSTICO', count: '4', col: '#fbbf24' },
      { name: '3. FECHAMENTO VIP', count: '3', col: '#10b981' }
    ];

    cols.forEach((cl, idx) => {
      const colX = cx - cw/2 + 24 + idx * (colW + 18);
      const colY = cy - ch/2 + 96;

      g.fillStyle = 'rgba(30, 41, 59, 0.5)';
      g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(colX, colY, colW, 320, 18);
      g.fill();
      g.stroke();

      // Header da Coluna
      g.font = FB(17, true);
      g.fillStyle = cl.col;
      g.fillText(cl.name, colX + 16, colY + 34);

      g.fillStyle = 'rgba(255, 255, 255, 0.15)';
      g.beginPath();
      g.arc(colX + colW - 28, colY + 28, 14, 0, 7);
      g.fill();
      g.font = FB(15, true);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.fillText(cl.count, colX + colW - 28, colY + 34);
      g.textAlign = 'left';
    });

    // Deal Card 1 (Estático em Diagnóstico)
    const d1x = cx - cw/2 + 24 + 1 * (colW + 18) + 12;
    const d1y = cy - ch/2 + 155;
    g.fillStyle = 'rgba(15, 23, 42, 0.85)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(d1x, d1y, colW - 24, 110, 14);
    g.fill();
    g.stroke();

    g.font = FB(18, true);
    g.fillStyle = '#ffffff';
    g.fillText('Mentoria Black R$ 25k', d1x + 14, d1y + 32);
    g.font = FB(15);
    g.fillStyle = '#94a3b8';
    g.fillText('Carlos Silva · E-com', d1x + 14, d1y + 60);
    g.font = FB(15, true);
    g.fillStyle = '#fbbf24';
    g.fillText('Call Terça 14:00', d1x + 14, d1y + 90);

    // Deal Card 2 (Animado movendo para Fechamento VIP)
    const moveProgress = clamp((relT - 1.2) / 2.0, 0, 1);
    const startX = cx - cw/2 + 24 + 1 * (colW + 18) + 12;
    const endX = cx - cw/2 + 24 + 2 * (colW + 18) + 12;
    const d2x = lerp(startX, endX, eIO(moveProgress));
    const d2y = cy - ch/2 + 165;

    g.fillStyle = 'rgba(16, 185, 129, 0.2)';
    g.strokeStyle = '#34d399';
    g.lineWidth = 2;
    g.shadowColor = 'rgba(16, 185, 129, 0.4)';
    g.shadowBlur = 18;
    g.beginPath();
    g.roundRect(d2x, d2y, colW - 24, 120, 14);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    g.font = FB(18, true);
    g.fillStyle = '#ffffff';
    g.fillText('Contrato R$ 50.000', d2x + 14, d2y + 34);
    g.font = FB(15);
    g.fillStyle = '#94a3b8';
    g.fillText('Grupo Medeiros · Saúde', d2x + 14, d2y + 64);
    g.font = FB(15, true);
    g.fillStyle = '#34d399';
    g.fillText('Proposta Aceita ✓', d2x + 14, d2y + 96);

    // Copiloto de IA - Dica de Objeção
    const b6y = cy + ch/2 - 72;
    g.fillStyle = 'rgba(129, 140, 248, 0.18)';
    g.beginPath();
    g.roundRect(cx - cw/2 + 24, b6y, cw - 48, 54, 14);
    g.fill();

    g.font = FB(20, true);
    g.fillStyle = '#a5b4fc';
    g.fillText('💡 Copiloto IA: "Proposta enviada com condições especiais de pagamento"', cx - cw/2 + 35, b6y + 35);
  }

  else if (sc.type === 'final') {
    // ==========================================
    // CENA 05: CTA Final (Sem Colisão, Espaçamentos Perfeitos)
    // ==========================================
    const cx = 540, cy = 1240, cw = 880, ch = 490;

    // Sombra Dourada / Ciano
    g.shadowColor = 'rgba(251, 191, 36, 0.35)';
    g.shadowBlur = 35;
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
    g.fillText('Transforme seu WhatsApp', cx, cy - ch/2 + 75);
    g.fillStyle = GOLD_BRIGHT;
    g.fillText('em uma Máquina de Escala', cx, cy - ch/2 + 124);

    // 3 Benefícios Resumidos
    const benefits = [
      '⚡ Atendimento instantâneo com IA 24/7',
      '🎯 Qualificação e agendamento automático',
      '📊 Pipeline Kanban e Copiloto de Vendas'
    ];

    benefits.forEach((b, idx) => {
      g.font = FB(23, true);
      g.fillStyle = '#f1f5f9';
      g.fillText(b, cx, cy - ch/2 + 185 + idx * 46);
    });

    // Botão VIP (Dentro dos limites com padding seguro de 30px)
    const btnW = 760, btnH = 80;
    const btnY = cy + ch/2 - 110;
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

// Logo ScaleMentors renderizado com precisão
function drawScaleMentorsEmblem(g, cx, cy, alpha = 1, scale = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.scale(scale, scale);

  // Circulo com Glow
  g.shadowColor = 'rgba(6, 182, 212, 0.6)';
  g.shadowBlur = 20;
  g.fillStyle = '#090d16';
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

  // Título Principal com entrada dinâmica de palavras (Em no máximo 3 linhas bem espaçadas)
  if (sc.L) {
    drawWords(TX, sc.L.words, t, '#FFFFFF', CYAN_BRIGHT, { underline: true });
  }

  // Se for tela final, renderizar Emblema e Logo ScaleMentors em posição livre de colisões
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
    // Tamanho 58px e line-height 78px garantem exatamente 3 linhas limpas sem encavalamento
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
    K.shimmer(60.0);
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
    g.fillText('TOUR DO CRM &', 540, 780);

    g.fillStyle = CYAN_BRIGHT;
    g.fillText('AUTOMAÇÃO WHATSAPP', 540, 860);

    // Card Mockup de Destaque
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(140, 970, 800, 420, 24);
    g.fill();
    g.stroke();

    g.font = FB(32, true);
    g.fillStyle = '#34d399';
    g.textAlign = 'center';
    g.fillText('● SDR VIRTUAL COM IA & KANBAN', 540, 1050);

    g.font = FB(26);
    g.fillStyle = '#cbd5e1';
    g.fillText('Resposta Imediata no WhatsApp (3s)', 540, 1120);
    g.fillText('Qualificação de Faturamento & Lead Score', 540, 1180);
    g.fillText('Sincronização Google Calendar em Tempo Real', 540, 1240);
    g.fillText('Pipeline Kanban & Copiloto Anti-Vácuo', 540, 1300);

    // Selo de Demonstração
    g.fillStyle = 'rgba(6, 182, 212, 0.2)';
    g.strokeStyle = CYAN_BRIGHT;
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
