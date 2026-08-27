import crypto from 'crypto';

/**
 * Autenticação do endpoint do worker.
 *
 * O worker é isento de sessão: quem o chama é um agendador, que não tem cookie.
 * E ele *envia mensagens* — deixá-lo aberto na internet seria entregar o número
 * da empresa para quem quiser queimá-lo.
 *
 * Aceita três formas porque três agendadores diferentes precisam alcançá-lo:
 * o Vercel Cron manda `Authorization: Bearer`, um cron externo costuma mandar
 * cabeçalho próprio, e a tela do disparo usa a query string.
 *
 * Falha fechada: sem `CRON_SECRET` no ambiente, nada passa.
 */
export function verifyCronSecret(request: Request): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return false;

  const url = new URL(request.url);
  const autorizacao = request.headers.get('authorization') ?? '';

  const recebido =
    (autorizacao.startsWith('Bearer ') ? autorizacao.slice(7) : '') ||
    request.headers.get('x-cron-secret') ||
    url.searchParams.get('secret') ||
    '';

  return compararEmTempoConstante(recebido, esperado);
}

/**
 * Mesma razão do webhook da F3: `===` para no primeiro byte diferente, e o
 * tempo de resposta revela o prefixo correto. O hash antes iguala o tamanho
 * dos buffers e impede que o comprimento do segredo vaze junto.
 */
function compararEmTempoConstante(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();

  return crypto.timingSafeEqual(ha, hb);
}
