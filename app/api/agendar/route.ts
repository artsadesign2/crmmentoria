import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEvolutionWhatsAppMessage, formatWhatsAppNumber } from '@/lib/evolution-api';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const sessionType = typeof body.sessionType === 'string' ? body.sessionType : 'Diagnóstico Estratégico 1-on-1';
  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';

  if (!name || !email || !phone || !date || !time) {
    return NextResponse.json(
      { ok: false, error: 'Preencha todos os campos obrigatórios (nome, e-mail, telefone, data e horário).' },
      { status: 400 }
    );
  }

  // 1. Busca a primeira organização disponível para associar o agendamento
  let orgId = '';
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (org) orgId = org.id;
  } catch (err) {
    console.warn('[Agendamento] Falha ao obter org:', err);
  }

  // 2. Dispara mensagem de confirmação via WhatsApp (Evolution API)
  if (phone) {
    const cleanPhone = formatWhatsAppNumber(phone);
    const firstName = name.split(' ')[0];
    const msg = `Olá, *${firstName}*! 🚀\n\nSua sessão de *${sessionType}* no *Rocket Club* está confirmada!\n\n📅 *Data:* ${date}\n⏰ *Horário:* ${time}\n💼 *Empresa:* ${company || 'Negócio'}\n\n📍 *Link da Sala:* https://meet.google.com/rocket-club-1on1\n\nNos vemos ao vivo! 🛸`;

    try {
      await sendEvolutionWhatsAppMessage(cleanPhone, msg);
    } catch (err) {
      console.warn('[Agendamento] Erro no WhatsApp:', err);
    }
  }

  // 3. Notificação In-App em tempo real via SSE
  if (orgId) {
    try {
      broadcastNotificationToOrg(orgId, {
        id: `notif-${Date.now()}`,
        sector: 'mentorados',
        type: 'success',
        title: '📅 Novo Agendamento de Mentoria 1-on-1',
        message: `${name} (${company || 'Mentorado'}) agendou "${sessionType}" para ${date} às ${time}.`,
        link: '/mentorados',
        actionText: 'Ver Agenda',
        createdAt: 'Agora mesmo',
        read: false,
      });
    } catch (err) {
      console.warn('[Agendamento SSE Warning]:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    booking: {
      name,
      email,
      phone,
      company,
      sessionType,
      date,
      time,
      meetUrl: 'https://meet.google.com/rocket-club-1on1',
    },
    message: 'Agendamento confirmado com sucesso!',
  });
}
