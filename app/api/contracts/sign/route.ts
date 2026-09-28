import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { generateSignatureAuditHash, SignedContractMetadata } from '@/lib/contracts/contract-generator';
import { sendText } from '@/lib/evolution/server';
import { normalizePhone } from '@/lib/crm/phone';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      contractNumber,
      clientName,
      signerName,
      signerDocument,
      signerEmail,
      signerPhone,
      signatureImageBase64,
      programName,
      totalValue,
      dealId,
    } = body;

    if (!contractNumber || !signerName || !signerDocument || !signerEmail) {
      return NextResponse.json(
        { ok: false, error: 'Dados do signatário e número do contrato são obrigatórios.' },
        { status: 400 }
      );
    }

    // Capturar IP e User-Agent para conformidade jurídica
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser Client';
    const signedAt = new Date().toISOString();

    // Gerar Hash Criptográfico de Auditoria SHA-256
    const hashAuditSha256 = generateSignatureAuditHash(
      contractNumber,
      signerEmail,
      signedAt,
      ipAddress
    );

    const signedMetadata: SignedContractMetadata = {
      contractId: contractNumber,
      signedAt,
      signerName,
      signerDocument,
      signerEmail,
      signatureImageBase64,
      ipAddress,
      userAgent,
      hashAuditSha256,
    };

    // Se houver dealId no CRM, registrar a assinatura no card
    if (dealId) {
      try {
        await prisma.dealCard.update({
          where: { id: dealId },
          data: {
            customFields: {
              contractSigned: true,
              contractNumber,
              contractSignedAt: signedAt,
              contractHash: hashAuditSha256,
            },
          },
        });
      } catch (err) {
        console.warn('[CONTRACT SIGN] Falha ao atualizar DealCard:', err);
      }
    }

    // Notificar Organização no SSE
    const orgId = auth.session.organizationId;
    if (orgId) {
      broadcastNotificationToOrg(orgId, {
        id: `notif-ctr-${Date.now()}`,
        sector: 'mentorados',
        title: '📜 Contrato de Mentoria Assinado!',
        message: `${signerName} assinou eletronicamente o contrato ${contractNumber}. Hash: ${hashAuditSha256.slice(0, 8)}...`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/mentorados',
      });
    }

    // Enviar confirmação no WhatsApp com o recibo de assinatura
    const targetPhone = signerPhone || '';
    if (targetPhone) {
      const normalized = normalizePhone(targetPhone);
      if (normalized) {
        const whatsAppMsg =
          `*🚀 ROCKET CLUB — CONTRATO ASSINADO COM SUCESSO!*\n\n` +
          `Olá, *${signerName}*!\n\n` +
          `Confirmamos a assinatura digital e registro de integridade jurídica do seu contrato:\n\n` +
          `📄 *Contrato:* ${contractNumber}\n` +
          `🎓 *Programa:* ${programName || 'Mentoria Rocket Scale'}\n` +
          `📅 *Data/Hora:* ${new Date(signedAt).toLocaleString('pt-BR')}\n` +
          `🔒 *Hash de Auditoria SHA-256:* \n\`${hashAuditSha256}\`\n\n` +
          `Seja muito bem-vindo(a) à nossa elite de mentorados! 🚀`;

        try {
          await sendText(normalized, whatsAppMsg);
        } catch (e) {
          console.warn('[CONTRACT SIGN] Erro envio WhatsApp:', e);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Contrato assinado eletronicamente com sucesso!',
      signedMetadata,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao processar assinatura' },
      { status: 500 }
    );
  }
}
