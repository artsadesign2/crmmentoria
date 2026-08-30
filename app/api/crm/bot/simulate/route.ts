import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { sessaoInicial, step } from '@/lib/bot/engine';
import { validateGraph } from '@/lib/bot/validate';
import { getVozConfig } from '@/lib/bot/settings';
import { asGraph, type BotGraph, type BotSessionState } from '@/lib/bot/types';

/**
 * O simulador: roda o motor sobre um grafo, sem tocar em nada.
 *
 * Sem banco, sem Evolution, sem Gemini. Nada é gravado e nada é enviado — a
 * rota só chama `step`, que é puro, e devolve o que ele decidiu.
 *
 * **Ela não aceita `flowId`, e essa é a decisão de segurança do arquivo.**
 * Recebendo um id, um parâmetro trocado bastaria para o "simulador" executar
 * sobre um fluxo no ar e, dali, sobre uma conversa real. Recebendo o grafo
 * inteiro no corpo, não existe caminho de código daqui até um cliente: o pior
 * que esta rota pode fazer é devolver um JSON errado.
 *
 * O nó de IA não é chamado aqui. Ele devolve a ação `PERGUNTAR_IA` e para — a
 * tela mostra que é ali que a IA entraria, e quem simula pode digitar em
 * `respostaIa` o que quer testar como resposta dela. Chamar o Gemini de dentro
 * do simulador gastaria cota a cada tecla e ainda daria respostas diferentes a
 * cada rodada, tornando o simulador inútil justamente para o que ele serve:
 * conferir o caminho do fluxo.
 */

/** Teto do grafo aceito. Um corpo de 10 MB não é um fluxo, é um ataque. */
const MAX_NOS = 300;
const MAX_ARESTAS = 600;

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if ('flowId' in body) {
    return NextResponse.json(
      {
        ok: false,
        error: 'O simulador recebe o grafo, não o id de um fluxo.',
      },
      { status: 400 }
    );
  }

  const graph = asGraph(body.graph);

  if (graph.nodes.length > MAX_NOS || graph.edges.length > MAX_ARESTAS) {
    return NextResponse.json({ ok: false, error: 'Fluxo grande demais.' }, { status: 413 });
  }

  const contato = lerContato(body.contato);
  const sessao = lerSessao(body.sessao, graph);

  /**
   * A voz sai da configuração da organização, não do corpo do pedido.
   *
   * Simular com humanização diferente da que está valendo produziria uma
   * prévia que mente: alguém testaria o menu em frase corrida e publicaria um
   * fluxo que, no ar, mandaria lista numerada. A prévia precisa ser a coisa.
   */
  const voz = await getVozConfig(session.organizationId);

  const resultado = step(graph, sessao, {
    texto: typeof body.texto === 'string' ? body.texto : '',
    contato,
    humanizado: voz.humanized,
    persona: voz.personaName,
    ...(typeof body.respostaIa === 'string' ? { respostaIa: body.respostaIa } : {}),
  });

  return NextResponse.json({
    ok: true,
    acoes: resultado.acoes,
    sessao: resultado.proximaSessao,
    status: resultado.status,
    // De carona, para a tela poder avisar antes de o operador se perguntar por
    // que a opção 3 não leva a lugar nenhum.
    problemas: validateGraph(graph),
  });
});

function lerContato(bruto: unknown): { nome: string; empresa: string | null } {
  const dado = (bruto ?? {}) as Record<string, unknown>;

  return {
    // Um nome sempre, para `{{nome}}` não aparecer cru na simulação.
    nome: typeof dado.nome === 'string' && dado.nome.trim() ? dado.nome.trim() : 'Cliente',
    empresa: typeof dado.empresa === 'string' && dado.empresa.trim() ? dado.empresa.trim() : null,
  };
}

/**
 * O estado da simulação vem do cliente, então nada nele é confiável.
 *
 * O motor é puro e não valida o que recebe — ele confia no estado porque, em
 * produção, quem o monta é o banco. Aqui quem monta é o navegador.
 */
function lerSessao(bruto: unknown, graph: BotGraph): BotSessionState {
  if (!bruto || typeof bruto !== 'object') return sessaoInicial(graph);

  const dado = bruto as Record<string, unknown>;
  const inicial = sessaoInicial(graph);

  const variaveis: Record<string, string> = {};
  if (dado.variables && typeof dado.variables === 'object') {
    for (const [chave, valor] of Object.entries(dado.variables as Record<string, unknown>)) {
      if (typeof valor === 'string') variaveis[chave] = valor;
    }
  }

  const noAtual =
    typeof dado.currentNodeId === 'string' &&
    graph.nodes.some((n) => n.id === dado.currentNodeId)
      ? dado.currentNodeId
      : inicial.currentNodeId;

  return {
    currentNodeId: noAtual,
    variables: variaveis,
    // Number.isInteger barra `NaN`, `Infinity` e o "3" em string que faria a
    // comparação com o teto de trocas nunca ser verdadeira.
    aiTurns: Number.isInteger(dado.aiTurns) ? Math.max(0, dado.aiTurns as number) : 0,
    awaitingInput: dado.awaitingInput === true,
  };
}
