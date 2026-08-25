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
 * Universal Proxy Helper - Makes server-to-server requests to eliminate Browser CORS restrictions
 */
async function callEvolutionProxy(
  config: EvolutionApiConfig,
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/evolution/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        endpoint,
        method,
        body,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.error || `Erro HTTP ${res.status} no proxy do servidor.`,
      };
    }

    return {
      ok: json.ok ?? true,
      status: json.status ?? 200,
      data: json.data,
      error: json.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'Falha ao conectar com o proxy do servidor.',
    };
  }
}

/**
 * Checks connection status of the instance on Evolution API (CORS-free)
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

  const endpoint = `/instance/connectionState/${config.instanceName}`;
  const res = await callEvolutionProxy(config, endpoint, 'GET');

  if (!res.ok) {
    if (res.status === 404) {
      return {
        success: true,
        state: { state: 'close' },
        error: 'Instância não criada ainda no servidor. Clique em "Conectar / Gerar QR Code".',
      };
    }
    return {
      success: false,
      state: { state: 'unknown' },
      error: res.error || `Erro ao consultar status da instância (${res.status}).`,
    };
  }

  const data = res.data;
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
}

/**
 * Creates or connects instance and fetches QR Code (CORS-free)
 */
export async function fetchEvolutionQRCode(
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; qrcode?: EvolutionQRCodeResponse; error?: string }> {
  const config = configOverride || getEvolutionConfig();

  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return { success: false, error: 'Configure a URL, Chave API e Nome da Instância.' };
  }

  // 1. Try to fetch existing connection / QR Code
  let res = await callEvolutionProxy(config, `/instance/connect/${config.instanceName}`, 'GET');

  // 2. If instance does not exist (404), create it automatically on Evolution API
  if (res.status === 404 || (res.data && res.data.status === 404)) {
    const createRes = await callEvolutionProxy(config, '/instance/create', 'POST', {
      instanceName: config.instanceName,
      token: config.apiKey,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    if (!createRes.ok) {
      return {
        success: false,
        error: createRes.data?.message || createRes.error || `Erro ${createRes.status} ao criar instância.`,
      };
    }

    const createData = createRes.data;
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
    res = await callEvolutionProxy(config, `/instance/connect/${config.instanceName}`, 'GET');
  }

  if (!res.ok) {
    return {
      success: false,
      error: res.data?.message || res.error || `Erro ${res.status} ao buscar QR Code.`,
    };
  }

  const data = res.data;
  return {
    success: true,
    qrcode: {
      base64: data?.base64 || data?.qrcode?.base64,
      code: data?.code || data?.qrcode?.code,
      pairingCode: data?.pairingCode || data?.qrcode?.pairingCode,
      count: data?.count,
    },
  };
}

/**
 * Sends a real text message via Evolution API to a WhatsApp contact (CORS-free)
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

  const res = await callEvolutionProxy(
    config,
    `/message/sendText/${config.instanceName}`,
    'POST',
    {
      number: cleanPhone,
      text: message,
      options: {
        delay: 1200,
        presence: 'composing',
        linkPreview: true,
      },
    }
  );

  if (!res.ok) {
    const errData = res.data;
    return {
      success: false,
      error: errData?.response?.message?.[0] || errData?.message || res.error || `Erro ${res.status} no envio.`,
    };
  }

  const messageId = res.data?.key?.id || res.data?.id || `msg-${Date.now()}`;
  return {
    success: true,
    messageId,
  };
}

/**
 * Logs out / disconnects instance from WhatsApp (CORS-free)
 */
export async function logoutEvolutionInstance(
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; error?: string }> {
  const config = configOverride || getEvolutionConfig();
  if (!config.serverUrl || !config.apiKey || !config.instanceName) {
    return { success: false, error: 'Credenciais ausentes.' };
  }

  const res = await callEvolutionProxy(config, `/instance/logout/${config.instanceName}`, 'DELETE');
  if (!res.ok) {
    return { success: false, error: `Erro ${res.status} ao desconectar instância.` };
  }

  return { success: true };
}
