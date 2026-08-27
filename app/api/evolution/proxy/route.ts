import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { readEvolutionEnv } from '@/lib/evolution/server';

/**
 * Proxy servidor-a-servidor para a Evolution API.
 *
 * Duas correções de segurança em relação à versão anterior:
 *
 * 1. Exigia nada: qualquer visitante podia chamar esta rota. Agora exige sessão.
 * 2. Aceitava `serverUrl` e `apiKey` vindos do corpo da requisição e encaminhava
 *    para onde mandassem, o que a tornava um relay aberto (SSRF) — dava para
 *    usar o servidor da aplicação para bater em qualquer host da internet, ou
 *    da rede interna. As credenciais agora saem do ambiente do servidor e o
 *    destino não é mais escolhido pelo cliente.
 *
 * O cliente envia apenas `endpoint`, `method` e `body`.
 */

export const POST = withAuth(async (request: Request) => {
  await requireSession();

  const env = readEvolutionEnv();
  if (!env) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Evolution API não configurada no servidor. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY.',
      },
      { status: 503 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint : '';
  const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : 'GET';

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: 'Parâmetro obrigatório ausente: endpoint.' },
      { status: 400 }
    );
  }

  // Só caminhos relativos: bloqueia `//outro-host` e `https://outro-host`,
  // que escapariam da base e reabririam o SSRF.
  if (!endpoint.startsWith('/') || endpoint.startsWith('//') || endpoint.includes('://')) {
    return NextResponse.json(
      { ok: false, error: 'Endpoint inválido: informe um caminho relativo começando com "/".' },
      { status: 400 }
    );
  }

  const targetUrl = `${env.serverUrl}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers: { apikey: env.apiKey, 'Content-Type': 'application/json' },
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD' && payload.body) {
    fetchOptions.body = JSON.stringify(payload.body);
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : { text: await response.text() };

    return NextResponse.json({ ok: response.ok, status: response.status, data });
  } catch (error) {
    // A URL de destino não vai para o cliente: ela expõe topologia interna.
    console.error('[Evolution Proxy] falha ao contatar', targetUrl, error);
    return NextResponse.json(
      { ok: false, status: 502, error: 'Não foi possível contatar a Evolution API.' },
      { status: 502 }
    );
  }
});

/** Nome da instância configurada, para a interface exibir sem conhecer credenciais. */
export const GET = withAuth(async () => {
  await requireSession();
  const env = readEvolutionEnv();

  return NextResponse.json({
    ok: true,
    configured: env !== null,
    instanceName: env?.instanceName ?? null,
  });
});
