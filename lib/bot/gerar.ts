import { generate, isAiConfigured } from '@/lib/ai/gemini';
import { importarGrafo } from './import';
import type { BotGraph } from './types';

/**
 * Fluxo escrito pela IA a partir de uma descrição em português.
 *
 * Não é um caminho paralelo ao da importação: a IA produz JSON e esse JSON
 * entra pela mesma porta que um arquivo colado à mão, com a mesma checagem de
 * forma e a mesma checagem de sentido depois. O modelo é uma fonte de texto a
 * mais, e não uma fonte de confiança a mais — se ele inventar um tipo de passo
 * que não existe, `importarGrafo` recusa igual recusaria de qualquer um.
 *
 * O que a IA entrega é sempre **rascunho**. Publicar continua sendo um gesto
 * humano e explícito, porque publicar é o que faz o texto alcançar clientes.
 */

/**
 * Os tipos de passo que o motor executa. Vai no prompt, e é a mesma lista que
 * `import.ts` aceita — divergir aqui gera fluxos que a importação recusa.
 */
export const TIPOS_DE_PASSO = [
  'START',
  'MESSAGE',
  'QUESTION',
  'CONDITION',
  'CAPTURE',
  'TRANSFER',
  'AI',
  'END',
] as const;

/**
 * NÃO use `responseSchema` aqui. A decodificação forçada é o que quebra.
 *
 * O caminho natural seria pedir JSON com `responseMimeType` e `responseSchema`
 * — é o que o resto do sistema faz e é o que a documentação recomenda. Para
 * este pedido, medido, ela produz repetição degenerada: o modelo entra num
 * laço dentro de um campo de texto e escreve até o orçamento de tokens acabar.
 * Duas amostras, dois modelos diferentes:
 *
 *   3.5-flash + esquema:  40s, MAX_TOKENS, cauda "323232323232..."
 *   3.6-flash + esquema:  33s, MAX_TOKENS, cauda "...amen hallelujah glory"
 *   3.6-flash sem esquema: 16s, STOP, 668 tokens, 6 passos, 0 problemas
 *
 * `maxLength` em toda string não resolve: a API **aceita** a restrição e não a
 * aplica — a degeneração passou por cima dela. E `maxItems` junto de
 * `maxLength` faz a API recusar o pedido inteiro com 400.
 *
 * A explicação que bate com os dados é a conhecida da decodificação por
 * gramática: dentro de uma string a gramática aceita qualquer caractere, o
 * modelo perde o fio, e nada o interrompe. Sem gramática, o fim natural da
 * frase volta a existir — e o `finishReason` vira STOP.
 *
 * A rede de segurança nunca foi o esquema: é `importarGrafo`, que recusa o que
 * não tiver forma de grafo venha de onde vier.
 */

export interface SetorDisponivel {
  id: string;
  name: string;
}

/**
 * As instruções do modelo. Pura, e exportada, para poder ser conferida sem
 * gastar uma chamada — o prompt é a parte que mais muda e a que mais quebra.
 */
export function promptDoFluxo(setores: SetorDisponivel[], persona: string): string {
  const listaSetores =
    setores.length > 0
      ? setores.map((s) => `- ${s.name} → departmentId: "${s.id}"`).join('\n')
      : '- (nenhum setor cadastrado; deixe departmentId vazio nas transferências)';

  const quemEscreve = persona
    ? `Você escreve as falas como ${persona}, a pessoa que atende no WhatsApp da empresa.`
    : 'Você escreve as falas de quem atende no WhatsApp da empresa.';

  return `Você monta fluxos de atendimento por WhatsApp. ${quemEscreve}

O FORMATO
Um fluxo é um grafo: "nodes" são os passos e "edges" ligam um passo ao seguinte.

Tipos de passo:
- START: onde a conversa começa. Existe exatamente um, e ele precisa de uma saída.
- MESSAGE: manda um texto e segue. Precisa de "data.text".
- QUESTION: pergunta e espera a resposta. Precisa de "data.text".
  Com "data.options" vira menu: cada opção tem "key" (o que o cliente digita)
  e "label". Cada opção PRECISA de uma edge com "sourceHandle" igual à "key".
  Sem options, é campo livre — a resposta é guardada e o fluxo segue pela
  única edge de saída.
- CONDITION: bifurca por uma variável guardada. Precisa de "data.variable" e
  "data.equals", e de DUAS edges, com sourceHandle "true" e "false".
- CAPTURE: guarda a última resposta na ficha do contato. Precisa de "data.field".
- TRANSFER: entrega a conversa a uma pessoa e sai de cena. "data.departmentId"
  escolhe o setor. "data.text" é a última frase antes de alguém assumir.
- AI: responde pela base de conhecimento da empresa. Use no máximo um.
- END: encerra. Precisa de "data.text".

REGRAS QUE NÃO PODEM SER QUEBRADAS
1. Exatamente um START.
2. Todo passo tem que ser alcançável a partir do START.
3. Toda opção de QUESTION tem a sua edge, com o sourceHandle igual à key.
4. Todo caminho termina em TRANSFER ou END. Um fluxo que dá voltas sem
   chegar a uma pessoa nem a um fim deixa o cliente falando sozinho.
5. Nunca invente um departmentId. Use só os da lista abaixo.
6. No máximo 14 passos, e no máximo 5 opções por pergunta. Um menu maior que
   isso ninguém lê no WhatsApp, e um fluxo maior que isso é melhor dividido.
7. Ids curtos, em minúsculas, com hífen: "menu", "leva-comercial", "fim".

SETORES DA EMPRESA
${listaSetores}

COMO ESCREVER AS FALAS
Escreva como uma pessoa escreve no WhatsApp, não como uma empresa escreve num
e-mail. Frases curtas. Nada de "prezado", "informamos que", "sua solicitação".
Nada de saudação com hora ("bom dia") — a mensagem pode chegar de madrugada.
Use "{{nome}}" para o primeiro nome do cliente. No máximo um emoji no fluxo
inteiro, e só se ele couber naturalmente.

Em pergunta de sim ou não, use "estilo": "LIVRE" — enumerar as opções produz
"Você ainda precisa? Ainda preciso ou Já resolvi?", que ninguém escreve.
Em menu de setores, use "estilo": "LISTA".

Não prometa preço, prazo, desconto nem cancelamento em nenhuma fala: isso é
assunto de gente, e a fala do robô vira compromisso da empresa.

A RESPOSTA
Só o JSON, sem texto antes nem depois, neste formato:

{"nodes":[{"id":"inicio","type":"START","data":{}},
          {"id":"menu","type":"QUESTION","data":{"text":"...","estilo":"LISTA",
           "options":[{"key":"1","label":"..."}]}}],
 "edges":[{"source":"inicio","target":"menu"},
          {"source":"menu","target":"...","sourceHandle":"1"}]}`;
}

/**
 * Tira a cerca de código quando ela vem.
 *
 * Sem `responseSchema`, o modelo às vezes embrulha o JSON em ```json. É o
 * preço de não usar a decodificação forçada, e é um preço de três linhas.
 */
export function limparCerca(texto: string): string {
  const cercado = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (cercado ? cercado[1] : texto).trim();
}

export type ResultadoGeracao =
  | { ok: true; grafo: BotGraph; avisos: string[] }
  | { ok: false; erro: string };

export async function gerarFluxo(
  descricao: string,
  setores: SetorDisponivel[],
  persona = ''
): Promise<ResultadoGeracao> {
  const pedido = descricao.trim();

  if (pedido.length < 10) {
    return { ok: false, erro: 'Descreva o atendimento com um pouco mais de detalhe.' };
  }

  if (!isAiConfigured()) {
    return {
      ok: false,
      erro: 'A IA não está configurada no servidor. Dá para importar um JSON no lugar.',
    };
  }

  // Duas tentativas, com temperaturas diferentes.
  //
  // `generate` já repete quando a Google devolve 429 ou 503 — o que ele não
  // repete é HTTP 200 com conteúdo inaproveitável, que é justamente a falha
  // desta chamada. A segunda tentativa sobe a temperatura de propósito: a
  // repetição degenerada é uma falha de amostragem determinista demais, e
  // repetir com o mesmo 0.3 tende a repetir o mesmo laço.
  const temperaturas = [0.3, 0.6];
  let ultimoErro = 'A IA respondeu algo que não dá para usar.';

  for (const temperatura of temperaturas) {
    const resposta = await generate({
      system: promptDoFluxo(setores, persona),
      parts: [{ text: pedido }],
      // Sem `json:` de propósito — veja o bloco sobre decodificação forçada.
      temperature: temperatura,
      maxOutputTokens: 8000,
    });

    if (!resposta.ok) {
      // Erro de rede ou de cota não melhora com outra temperatura.
      return { ok: false, erro: resposta.error };
    }

    let cru: unknown;
    try {
      cru = JSON.parse(limparCerca(resposta.text));
    } catch {
      ultimoErro = 'A IA respondeu algo que não é JSON. Tente descrever de novo.';
      continue;
    }

    const importado = importarGrafo(cru);

    if (!importado.ok) {
      ultimoErro = `A IA montou um fluxo inválido: ${importado.erros[0] ?? 'formato inesperado.'}`;
      continue;
    }

    return { ok: true, grafo: importado.grafo, avisos: importado.avisos };
  }

  return { ok: false, erro: ultimoErro };
}
