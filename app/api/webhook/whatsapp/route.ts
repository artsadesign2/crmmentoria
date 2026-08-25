import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verification / healthcheck or incoming payload from WhatsApp provider
    const event = body.event || body.type || 'message';
    const messageData = body.data || body;

    const sender = messageData.sender || messageData.phone || messageData.from || 'Desconhecido';
    const messageText = messageData.text || messageData.message || messageData.body || '';

    // Log payload for debugging / AI agent integration
    console.log(`[WhatsApp Webhook] Event: ${event} | From: ${sender} | Message: ${messageText}`);

    // Response for webhook confirmation
    return NextResponse.json({
      ok: true,
      status: 'received',
      timestamp: new Date().toISOString(),
      agentStatus: 'online',
    });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Rocket Club WhatsApp AI Agent Webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
