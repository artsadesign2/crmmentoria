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
    if (res.status === 404 || res.data?.status === 404) {
      return {
        success: true,
        state: { state: 'close' },
        error: 'Instância ainda não criada no servidor. Clique no botão "Conectar / Gerar QR Code" para criá-la.',
      };
    }
    return {
      success: false,
      state: { state: 'unknown' },
      error: res.data?.message || res.error || `Erro ao consultar status da instância (${res.status}).`,
    };
  }

  const data = res.data;
  const rawState = data?.instance?.state || data?.state || 'close';

  return {
    success: true,
    state: {
      state: rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close',
      instanceName: config.instanceName,
      ownerJid: data?.instance?.owner || data?.ownerJid || data?.instance?.ownerJid,
      profileName: data?.instance?.profileName || data?.profileName,
      profilePictureUrl: data?.instance?.profilePictureUrl || data?.profilePictureUrl,
    },
  };
}

/**
 * Helper to extract base64 QR Code string from various Evolution API payload structures
 */
function extractQRCodeFromData(data: any): EvolutionQRCodeResponse | null {
  if (!data) return null;

  let base64 =
    data?.base64 ||
    data?.qrcode?.base64 ||
    (typeof data?.qrcode === 'string' && data.qrcode.startsWith('data:') ? data.qrcode : undefined);

  let code = data?.code || data?.qrcode?.code || (typeof data?.code === 'string' ? data.code : undefined);
  let pairingCode = data?.pairingCode || data?.qrcode?.pairingCode;

  if (base64 || code || pairingCode) {
    return {
      base64,
      code,
      pairingCode,
      count: data?.count,
    };
  }

  return null;
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

  // 1. Try to connect to existing instance first
  let connectRes = await callEvolutionProxy(config, `/instance/connect/${config.instanceName}`, 'GET');

  // Check if QR Code is returned directly
  let qrFound = extractQRCodeFromData(connectRes.data);
  if (connectRes.ok && qrFound) {
    return {
      success: true,
      qrcode: qrFound,
    };
  }

  // 2. If instance does not exist (404), or connect failed, attempt to create it
  if (!connectRes.ok || !qrFound) {
    const createRes = await callEvolutionProxy(config, '/instance/create', 'POST', {
      instanceName: config.instanceName,
      token: config.apiKey,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    const createQr = extractQRCodeFromData(createRes.data);
    if (createRes.ok && createQr) {
      return {
        success: true,
        qrcode: createQr,
      };
    }

    // 3. If instance already existed or was created without QR in payload, call connect one more time
    const retryConnect = await callEvolutionProxy(config, `/instance/connect/${config.instanceName}`, 'GET');
    const retryQr = extractQRCodeFromData(retryConnect.data);
    if (retryConnect.ok && retryQr) {
      return {
        success: true,
        qrcode: retryQr,
      };
    }

    // If connected already (state: open)
    const stateRes = await checkEvolutionConnection(config);
    if (stateRes.success && stateRes.state.state === 'open') {
      return {
        success: true,
        error: 'WhatsApp já está conectado e online nesta instância!',
      };
    }

    const errMsg =
      createRes.data?.response?.message?.[0] ||
      createRes.data?.message ||
      connectRes.data?.message ||
      createRes.error ||
      connectRes.error ||
      'Não foi possível obter o QR Code. Verifique a URL e a API Key no Railway.';

    return {
      success: false,
      error: errMsg,
    };
  }

    return {
      success: false,
      error: 'Falha inesperada ao solicitar QR Code.',
    };
}

export const SAFE_TEST_PHONE = '5511995302672';
const TEST_MODE_KEY = 'rocket_club_whatsapp_test_mode';

/**
 * Checks if WhatsApp Safety Test Mode is enabled (defaults to true to protect real client data)
 */
export function isWhatsAppTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(TEST_MODE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch (e) {}
  return true; // Safe default
}

export function setWhatsAppTestMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEST_MODE_KEY, String(enabled));
  } catch (e) {}
}

/**
 * Sends a real text message via Evolution API to a WhatsApp contact (CORS-free).
 * If Test Mode is enabled, it automatically redirects the message to the user's test phone (11995302672)
 * so that real clients are NEVER spammed with test messages.
 */
export async function sendEvolutionWhatsAppMessage(
  phone: string,
  message: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; isTestRedirected?: boolean }> {
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

  const isTestMode = isWhatsAppTestModeEnabled();
  let targetNumber = cleanPhone;
  let finalMessage = message;
  let isTestRedirected = false;

  // SAFETY GUARDRAIL: Redirect to verified administrator test phone (11995302672)
  if (isTestMode && cleanPhone !== SAFE_TEST_PHONE) {
    targetNumber = SAFE_TEST_PHONE;
    isTestRedirected = true;
    finalMessage = `🚨 *[MODO DE TESTE SEGURO - ROCKET CLUB]*\n_Mensagem interceptada com segurança para não disparar para cliente real._\n\n🎯 *Destinatário Original:* +${cleanPhone}\n━━━━━━━━━━━━━━━━━━\n\n${message}`;
  }

  const res = await callEvolutionProxy(
    config,
    `/message/sendText/${config.instanceName}`,
    'POST',
    {
      number: targetNumber,
      text: finalMessage,
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
    isTestRedirected,
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
