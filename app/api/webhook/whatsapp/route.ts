import { NextRequest, NextResponse } from 'next/server';

/**
 * Evolution API Webhook Receiver
 * Handles incoming WhatsApp messages, delivery updates, and connection events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const event = body.event || body.type || 'messages.upsert';
    const instance = body.instance || body.instanceName || 'rocket-club';
    const data = body.data || body;

    console.log(`[Evolution API Webhook] Instance: ${instance} | Event: ${event}`);

    // 1. Process Incoming / Outgoing Messages
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const messageInfo = data?.message || data;
      const key = data?.key || {};
      const isFromMe = key?.fromMe ?? false;
      const remoteJid = key?.remoteJid || data?.sender || '';
      const pushName = data?.pushName || '';

      // Extract raw phone number
      const phoneDigits = (remoteJid || '').split('@')[0].replace(/\D/g, '');

      // Extract message content from different possible formats in Evolution API
      let text = '';
      if (messageInfo?.conversation) {
        text = messageInfo.conversation;
      } else if (messageInfo?.extendedTextMessage?.text) {
        text = messageInfo.extendedTextMessage.text;
      } else if (messageInfo?.imageMessage?.caption) {
        text = `[Imagem]: ${messageInfo.imageMessage.caption}`;
      } else if (messageInfo?.videoMessage?.caption) {
        text = `[Vídeo]: ${messageInfo.videoMessage.caption}`;
      } else if (messageInfo?.audioMessage) {
        text = '[Mensagem de Áudio]';
      } else if (messageInfo?.documentMessage) {
        text = `[Documento]: ${messageInfo.documentMessage.fileName || 'Arquivo'}`;
      } else if (typeof data?.text === 'string') {
        text = data.text;
      }

      console.log(`[WhatsApp Message] From: ${pushName} (${phoneDigits}) | fromMe: ${isFromMe} | Text: ${text}`);

      return NextResponse.json({
        ok: true,
        event: 'messages.upsert',
        senderPhone: phoneDigits,
        senderName: pushName,
        isFromMe,
        text,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Process Connection Status Update
    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const state = data?.state || data?.status || 'unknown';
      console.log(`[WhatsApp Connection Update] State: ${state}`);
      return NextResponse.json({ ok: true, event: 'connection.update', state });
    }

    // 3. Process QR Code Update
    if (event === 'qrcode.updated' || event === 'QRCODE_UPDATED') {
      console.log(`[WhatsApp QR Code Updated]`);
      return NextResponse.json({ ok: true, event: 'qrcode.updated' });
    }

    return NextResponse.json({
      ok: true,
      status: 'received',
      event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Rocket Club - Evolution API Webhook Receiver',
    version: '2.0.0',
    supportedEvents: ['messages.upsert', 'messages.update', 'connection.update', 'qrcode.updated'],
    timestamp: new Date().toISOString(),
  });
}
