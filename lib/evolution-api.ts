'use client';

export interface EvolutionApiConfig {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
  autoConnect?: boolean;
}

export interface EvolutionConnectionState {
  state: 'open' | 'connecting' | 'close' | 'refused' | 'unknown';
  instanceName?: string;
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface EvolutionQRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

const STORAGE_KEY = 'rocket_club_evolution_api_config';

export function getEvolutionConfig(): EvolutionApiConfig {
  if (typeof window === 'undefined') {
    return {
      serverUrl: process.env.NEXT_PUBLIC_EVOLUTION_API_URL || '',
      apiKey: process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || '',
      instanceName: process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE_NAME || 'rocket-club-crm',
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading Evolution API config from localStorage', e);
  }

  return {
    serverUrl: '',
    apiKey: '',
    instanceName: 'rocket-club-crm',
  };
}

export function saveEvolutionConfig(config: EvolutionApiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Evolution API config to localStorage', e);
  }
}

/**
 * Normalizes phone numbers to international standard WhatsApp format (e.g. 5511999998888)
 */
export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Checks connection status of the instance on Evolution API
 */
export async function checkEvolutionConnection(
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; state: EvolutionConnectionState; error?: string }> {
  const config = configOverride || getEvolutionConfig();

  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return {
      success: false,
      state: { state: 'close' },
      error: 'Credenciais da Evolution API incompletas.',
    };
  }

  const cleanUrl = config.serverUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanUrl}/instance/connectionState/${config.instanceName}`, {
      method: 'GET',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          success: true,
          state: { state: 'close' },
          error: 'Instância não encontrada no servidor.',
        };
      }
      return {
        success: false,
        state: { state: 'unknown' },
        error: `Erro HTTP ${res.status} ao consultar status.`,
      };
    }

    const data = await res.json();
    const rawState = data?.instance?.state || data?.state || 'close';

    return {
      success: true,
      state: {
        state: rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close',
        instanceName: config.instanceName,
        ownerJid: data?.instance?.owner || data?.ownerJid,
        profileName: data?.instance?.profileName,
        profilePictureUrl: data?.instance?.profilePictureUrl,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      state: { state: 'refused' },
      error: err.message || 'Falha de conexão com o servidor Evolution API.',
    };
  }
}

/**
 * Creates or connects instance and fetches QR Code
 */
export async function fetchEvolutionQRCode(
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; qrcode?: EvolutionQRCodeResponse; error?: string }> {
  const config = configOverride || getEvolutionConfig();

  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return { success: false, error: 'Configure a URL, Chave API e Nome da Instância.' };
  }

  const cleanUrl = config.serverUrl.replace(/\/+$/, '');

  try {
    // 1. Try to fetch existing connection / QR Code
    let res = await fetch(`${cleanUrl}/instance/connect/${config.instanceName}`, {
      method: 'GET',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // 2. If instance does not exist (404), create it automatically
    if (res.status === 404) {
      const createRes = await fetch(`${cleanUrl}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: config.instanceName,
          token: config.apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        return {
          success: false,
          error: createErr?.message || `Erro ${createRes.status} ao criar instância.`,
        };
      }

      const createData = await createRes.json();
      if (createData?.qrcode?.base64) {
        return {
          success: true,
          qrcode: {
            base64: createData.qrcode.base64,
            code: createData.qrcode.code,
            pairingCode: createData.qrcode.pairingCode,
          },
        };
      }

      // Try connect once more
      res = await fetch(`${cleanUrl}/instance/connect/${config.instanceName}`, {
        method: 'GET',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData?.message || `Erro ${res.status} ao buscar QR Code.`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      qrcode: {
        base64: data?.base64 || data?.qrcode?.base64,
        code: data?.code || data?.qrcode?.code,
        pairingCode: data?.pairingCode || data?.qrcode?.pairingCode,
        count: data?.count,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha de comunicação com a Evolution API.',
    };
  }
}

/**
 * Sends a real text message via Evolution API to a WhatsApp contact
 */
export async function sendEvolutionWhatsAppMessage(
  phone: string,
  message: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = configOverride || getEvolutionConfig();

  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return {
      success: false,
      error: 'Evolution API não configurada. Preencha as credenciais em Configurações > WhatsApp.',
    };
  }

  const cleanPhone = formatWhatsAppNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Número de telefone inválido para envio de WhatsApp.' };
  }

  const cleanUrl = config.serverUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData?.response?.message?.[0] || errData?.message || `Erro ${res.status} no envio.`,
      };
    }

    const data = await res.json();
    const messageId = data?.key?.id || data?.id || `msg-${Date.now()}`;

    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha ao conectar com o servidor da Evolution API.',
    };
  }
}

/**
 * Logs out / disconnects instance from WhatsApp
 */
export async function logoutEvolutionInstance(
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; error?: string }> {
  const config = configOverride || getEvolutionConfig();
  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return { success: false, error: 'Credenciais ausentes.' };
  }

  const cleanUrl = config.serverUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanUrl}/instance/logout/${config.instanceName}`, {
      method: 'DELETE',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return { success: false, error: `Erro ${res.status} ao desconectar instância.` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao desconectar.' };
  }
}
