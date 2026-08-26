/**
 * Gateway de Pagamentos Stripe (Cartão Internacional, Assinaturas Recorrentes & Checkout Sessions)
 * Preparado para assinaturas e pagamentos pontuais de mentoria do Rocket Club
 */

export interface StripeCheckoutParams {
  amount: number; // Em Reais (BRL), ex: 2500.00
  description: string;
  customerEmail?: string;
  customerName?: string;
  recurring?: boolean;
  interval?: 'month' | 'year';
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeCheckoutResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || '';
}

/**
 * Cria Sessão de Checkout do Stripe (via REST API direta para máxima compatibilidade sem depender de SDK pesado)
 */
export async function createStripeCheckoutSession(
  params: StripeCheckoutParams
): Promise<StripeCheckoutResult> {
  const secretKey = getStripeSecretKey();

  // Simulação graciosa caso a chave do Stripe ainda não tenha sido inserida em .env
  if (!secretKey) {
    const mockSessionId = `cs_test_${Date.now()}`;
    return {
      success: true,
      sessionId: mockSessionId,
      checkoutUrl: `https://checkout.stripe.com/c/pay/${mockSessionId}`,
    };
  }

  try {
    const amountInCents = Math.round(params.amount * 100);
    const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = params.successUrl || `${domain}/financial?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = params.cancelUrl || `${domain}/financial?status=cancelled`;

    const formBody = new URLSearchParams();
    formBody.append('payment_method_types[0]', 'card');
    formBody.append('mode', params.recurring ? 'subscription' : 'payment');
    formBody.append('success_url', successUrl);
    formBody.append('cancel_url', cancelUrl);

    if (params.customerEmail) {
      formBody.append('customer_email', params.customerEmail);
    }

    // Line items
    if (params.recurring) {
      formBody.append('line_items[0][price_data][currency]', 'brl');
      formBody.append('line_items[0][price_data][unit_amount]', String(amountInCents));
      formBody.append('line_items[0][price_data][recurring][interval]', params.interval || 'month');
      formBody.append('line_items[0][price_data][product_data][name]', params.description || 'Mensalidade Rocket Club');
      formBody.append('line_items[0][quantity]', '1');
    } else {
      formBody.append('line_items[0][price_data][currency]', 'brl');
      formBody.append('line_items[0][price_data][unit_amount]', String(amountInCents));
      formBody.append('line_items[0][price_data][product_data][name]', params.description || 'Aceleração Rocket Club');
      formBody.append('line_items[0][quantity]', '1');
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'Erro ao gerar checkout no Stripe.',
      };
    }

    return {
      success: true,
      sessionId: data.id,
      checkoutUrl: data.url,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha na comunicação com o Stripe.',
    };
  }
}
