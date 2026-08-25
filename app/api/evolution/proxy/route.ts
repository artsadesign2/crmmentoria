import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-Side Evolution API Proxy Route
 * Completely eliminates Browser CORS issues by routing requests server-to-server.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { serverUrl, apiKey, endpoint, method = 'GET', body } = payload;

    if (!serverUrl || !apiKey || !endpoint) {
      return NextResponse.json(
        { ok: false, error: 'Parâmetros obrigatórios ausentes (serverUrl, apiKey, endpoint).' },
        { status: 400 }
      );
    }

    const cleanServerUrl = serverUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${cleanServerUrl}${cleanEndpoint}`;

    console.log(`[Evolution Proxy] ${method} -> ${targetUrl}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      responseData = { text };
    }

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[Evolution Proxy Error]:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Falha ao conectar com o servidor da Evolution API no Railway.',
      },
      { status: 500 }
    );
  }
}
