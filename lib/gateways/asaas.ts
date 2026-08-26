/**
 * Gateway de Pagamentos Asaas (Pix Instantâneo, Boleto Bancário & Cartão de Crédito)
 * Suporta ambiente de Sandbox e Produção para mensalidades do Rocket Club
 */

export interface AsaasConfig {
  apiKey: string;
  isSandbox: boolean;
}

export interface CreateAsaasChargeParams {
  customerName: string;
  customerCpfCnpj?: string;
  customerEmail?: string;
  customerPhone?: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
}

export interface AsaasChargeResult {
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  error?: string;
}

const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_PROD_URL = 'https://api.asaas.com/v3';

export function getAsaasConfig(): AsaasConfig {
  const apiKey = process.env.ASAAS_API_KEY || process.env.NEXT_PUBLIC_ASAAS_API_KEY || '';
  const env = process.env.ASAAS_ENVIRONMENT || 'sandbox';
  return {
    apiKey,
    isSandbox: env !== 'production',
  };
}

/**
 * Cria ou recupera cliente no Asaas pelo CPF/CNPJ ou Email
 */
async function getOrCreateAsaasCustomer(
  config: AsaasConfig,
  params: { name: string; cpfCnpj?: string; email?: string; phone?: string }
): Promise<string | null> {
  const baseUrl = config.isSandbox ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;
  if (!config.apiKey) return null;

  try {
    // 1. Tentar buscar cliente existente
    if (params.cpfCnpj || params.email) {
      const searchUrl = `${baseUrl}/customers?${params.cpfCnpj ? `cpfCnpj=${encodeURIComponent(params.cpfCnpj)}` : `email=${encodeURIComponent(params.email || '')}`}`;
      const searchRes = await fetch(searchUrl, {
        headers: { access_token: config.apiKey },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          return searchData.data[0].id;
        }
      }
    }

    // 2. Criar novo cliente
    const createRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: config.apiKey,
      },
      body: JSON.stringify({
        name: params.name,
        cpfCnpj: params.cpfCnpj ? params.cpfCnpj.replace(/\D/g, '') : undefined,
        email: params.email,
        mobilePhone: params.phone ? params.phone.replace(/\D/g, '') : undefined,
        notificationDisabled: false,
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      return createData.id;
    }
  } catch (err) {
    console.error('Error creating Asaas customer:', err);
  }

  return null;
}

/**
 * Gera Cobrança Completa no Asaas (com Pix, Boleto ou Link de Pagamento)
 */
export async function createAsaasPayment(
  params: CreateAsaasChargeParams
): Promise<AsaasChargeResult> {
  const config = getAsaasConfig();
  const baseUrl = config.isSandbox ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;

  // Se não houver chave real configurada, gera simulação realista de Pix Copia e Cola / QR Code
  if (!config.apiKey) {
    const mockId = `pay_asaas_${Date.now()}`;
    const mockPixCode = `00020126580014br.gov.bcb.pix0136rocketclub-${mockId}520400005303986540${params.value.toFixed(2)}5802BR5925ROCKET CLUB MENTORIA6009SAO PAULO62070503***6304ABCD`;

    return {
      success: true,
      paymentId: mockId,
      invoiceUrl: `https://sandbox.asaas.com/i/${mockId}`,
      bankSlipUrl: `https://sandbox.asaas.com/b/pdf/${mockId}`,
      pixCopiaECola: mockPixCode,
      pixQrCodeBase64: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="50%" y="50%" font-size="14" font-weight="bold" fill="%230B0F17" text-anchor="middle" dominant-baseline="middle">PIX ROCKET CLUB</text></svg>`,
    };
  }

  try {
    const customerId = await getOrCreateAsaasCustomer(config, {
      name: params.customerName,
      cpfCnpj: params.customerCpfCnpj,
      email: params.customerEmail,
      phone: params.customerPhone,
    });

    const body: any = {
      customer: customerId || undefined,
      billingType: params.billingType,
      value: params.value,
      dueDate: params.dueDate,
      description: params.description,
      postalService: false,
    };

    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: config.apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.errors?.[0]?.description || 'Erro ao gerar cobrança no Asaas.',
      };
    }

    const paymentId = data.id;
    let pixCopiaECola: string | undefined;
    let pixQrCodeBase64: string | undefined;

    // Buscar QR Code Pix se for Pix ou Indefinido
    if (params.billingType === 'PIX' || params.billingType === 'UNDEFINED') {
      try {
        const pixRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
          headers: { access_token: config.apiKey },
        });
        if (pixRes.ok) {
          const pixData = await pixRes.json();
          pixCopiaECola = pixData.payload;
          pixQrCodeBase64 = pixData.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : undefined;
        }
      } catch (err) {
        console.error('Error fetching Asaas Pix QR Code:', err);
      }
    }

    return {
      success: true,
      paymentId,
      invoiceUrl: data.invoiceUrl,
      bankSlipUrl: data.bankSlipUrl,
      pixCopiaECola,
      pixQrCodeBase64,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha na comunicação com o Asaas.',
    };
  }
}
