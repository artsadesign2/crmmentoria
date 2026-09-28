import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEvolutionWhatsAppMessage, formatWhatsAppNumber } from '@/lib/evolution-api';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';
import { createGoogleCalendarBooking } from '@/lib/calendar/google-calendar';

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

  // 1. Gera sincronização com Google Calendar e Link do Meet
  const combinedDateTime = new Date(`${date}T${time}:00`);
  const validDateTime = isNaN(combinedDateTime.getTime()) ? new Date() : combinedDateTime;

  const gcalResult = await createGoogleCalendarBooking({
    title: `Mentoria 1-on-1: ${name} (${company || 'Rocket Club'}) - ${sessionType}`,
    description: `Sessão individual de acompanhamento estratégico.\n\n👤 Mentorado: ${name}\n💼 Empresa: ${company || 'N/A'}\n📧 E-mail: ${email}\n📱 WhatsApp: ${phone}\n🎯 Foco: ${topic || 'Alinhamento geral'}`,
    startDate: validDateTime,
    durationMinutes: 45,
    guestEmail: email,
    guestName: name,
  });

  const meetUrl = gcalResult.meetUrl;
  const googleCalendarUrl = gcalResult.googleCalendarUrl;

  // 2. Busca organização para associar o agendamento
  let orgId = '';
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (org) orgId = org.id;
  } catch (err) {
    console.warn('[Agendamento] Falha ao obter org:', err);
  }

  // 3. Dispara mensagem de confirmação via WhatsApp (Evolution API)
  if (phone) {
    const cleanPhone = formatWhatsAppNumber(phone);
    const firstName = name.split(' ')[0];
    const msg = `Olá, *${firstName}*! 🚀\n\nSua sessão de *${sessionType}* no *Rocket Club* está confirmada!\n\n📅 *Data:* ${date}\n⏰ *Horário:* ${time}\n💼 *Empresa:* ${company || 'Negócio'}\n\n📍 *Link da Sala:* ${meetUrl}\n🗓️ *Adicionar à Agenda Google:* ${googleCalendarUrl}\n\nNos vemos ao vivo! 🛸`;

    try {
      await sendEvolutionWhatsAppMessage(cleanPhone, msg);
    } catch (err) {
      console.warn('[Agendamento] Erro no WhatsApp:', err);
    }
  }

  // 4. Notificação In-App em tempo real via SSE
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
      meetUrl,
      googleCalendarUrl,
    },
    message: 'Agendamento confirmado com sucesso e sincronizado no Google Calendar!',
  });
}
