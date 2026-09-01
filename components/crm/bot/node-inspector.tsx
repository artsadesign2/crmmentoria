'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { APARENCIA } from './bot-nodes';
import type { BotNode, BotNodeData } from '@/lib/bot/types';

/**
 * Edita o nó selecionado.
 *
 * Um painel só, mostrando apenas os campos que o tipo usa. A alternativa —
 * todos os campos sempre visíveis, cinza quando não se aplicam — enche a tela
 * de perguntas que não têm resposta e faz o operador procurar qual delas
 * importa.
 *
 * O que muda aqui vai direto para o grafo. Não há "salvar" neste painel: o
 * salvamento é do fluxo inteiro, e um botão por nó daria a impressão errada de
 * que existem duas coisas para salvar.
 */

export interface SetorOpcao {
  id: string;
  name: string;
}

const CAMPO =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary-color)]';

const estiloCampo = {
  background: 'var(--theme-bg)',
  borderColor: 'var(--theme-border)',
  color: 'var(--theme-text-primary)',
};

function Rotulo({ children, dica }: { children: React.ReactNode; dica?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        {children}
      </label>
      {dica && (
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
          {dica}
        </p>
      )}
    </div>
  );
}

export function NodeInspector({
  node,
  setores,
  problemas,
  somenteLeitura,
  onAlterar,
  onRemover,
  onFechar,
}: {
  node: BotNode;
  setores: SetorOpcao[];
  problemas: string[];
  somenteLeitura: boolean;
  onAlterar: (data: BotNodeData) => void;
  onRemover: () => void;
  onFechar: () => void;
}) {
  const { cor, Icone, titulo } = APARENCIA[node.type];
  const d = node.data;

  const alterar = (parcial: Partial<BotNodeData>) => onAlterar({ ...d, ...parcial });

  const opcoes = d.options ?? [];

  const alterarOpcao = (i: number, campo: 'key' | 'label', valor: string) => {
    const proximas = opcoes.map((o, j) => (i === j ? { ...o, [campo]: valor } : o));
    alterar({ options: proximas });
  };

  const adicionarOpcao = () => {
    // A próxima tecla livre, e não `length + 1`: apagar a opção 2 de um menu
    // de três e adicionar outra criaria uma segunda opção "3".
    const usadas = new Set(opcoes.map((o) => o.key));
    let chave = 1;
    while (usadas.has(String(chave))) chave += 1;

    alterar({ options: [...opcoes, { key: String(chave), label: '' }] });
  };

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col border-t lg:w-80 lg:border-l lg:border-t-0"
      style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
    >
      <header
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded"
          style={{ background: `${cor}1A` }}
        >
          <Icone size={15} style={{ color: cor }} />
        </span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          {titulo}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="ml-auto rounded p-1 transition-colors hover:bg-white/5"
          aria-label="Fechar painel"
        >
          <X size={16} style={{ color: 'var(--theme-text-secondary)' }} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {problemas.length > 0 && (
          <div
            className="rounded-lg border px-3 py-2"
            style={{ background: '#EF444414', borderColor: '#EF444455' }}
          >
            <ul className="space-y-1 text-[11px] leading-snug" style={{ color: '#FCA5A5' }}>
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Rotulo dica="Só para você se achar no canvas. O cliente nunca vê.">Nome do bloco</Rotulo>
          <input
            className={CAMPO}
            style={estiloCampo}
            value={d.label ?? ''}
            disabled={somenteLeitura}
            onChange={(e) => alterar({ label: e.target.value })}
            placeholder={titulo}
          />
        </div>

        {(node.type === 'MESSAGE' ||
          node.type === 'QUESTION' ||
          node.type === 'END' ||
          node.type === 'TRANSFER') && (
          <div>
            <Rotulo
              dica={
                node.type === 'TRANSFER'
                  ? 'A última frase antes de uma pessoa assumir. Em branco, o robô usa a frase padrão. Aceita {{nome}}, {{empresa}} e {{atendente}}.'
                  : 'Aceita {{nome}}, {{empresa}} e {{atendente}}, trocados na hora do envio.'
              }
            >
              {node.type === 'TRANSFER' ? 'Frase antes de entregar' : 'Texto enviado'}
            </Rotulo>
            <textarea
              className={`${CAMPO} min-h-[110px] resize-y`}
              style={estiloCampo}
              value={d.text ?? ''}
              disabled={somenteLeitura}
              onChange={(e) => alterar({ text: e.target.value })}
              placeholder={
                node.type === 'TRANSFER'
                  ? 'Perfeito, já vou olhar isso pra você.'
                  : 'Oi, {{nome}}! Tudo bem?'
              }
            />
          </div>
        )}

        {node.type === 'QUESTION' && (
          <div>
            <Rotulo dica="Sem nenhuma opção, vira campo livre: o cliente escreve o que quiser e um bloco de captura guarda a resposta.">
              Opções do menu
            </Rotulo>

            <div className="space-y-2">
              {opcoes.map((o, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    className={`${CAMPO} w-12 text-center font-mono`}
                    style={estiloCampo}
                    value={o.key}
                    disabled={somenteLeitura}
                    onChange={(e) => alterarOpcao(i, 'key', e.target.value)}
                  />
                  <input
                    className={CAMPO}
                    style={estiloCampo}
                    value={o.label}
                    disabled={somenteLeitura}
                    onChange={(e) => alterarOpcao(i, 'label', e.target.value)}
                    placeholder="Falar com vendas"
                  />
                  <button
                    type="button"
                    disabled={somenteLeitura}
                    onClick={() => alterar({ options: opcoes.filter((_, j) => j !== i) })}
                    className="rounded p-1.5 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                    aria-label={`Remover a opção ${o.key}`}
                  >
                    <Trash2 size={14} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={adicionarOpcao}
              disabled={somenteLeitura}
              className="mt-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
            >
              <Plus size={13} /> Adicionar opção
            </button>

            {opcoes.length > 0 && (
              <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
                Cada opção tem a própria saída à direita do bloco. Ligue todas —
                uma opção solta deixa o cliente sem resposta.
              </p>
            )}

            {opcoes.length > 0 && (
              <div className="mt-4">
                <Rotulo dica="O cliente é entendido de qualquer jeito: pelo número, pelo nome da opção ou por uma palavra dela dentro da frase.">
                  Como oferecer as opções
                </Rotulo>
                <select
                  className={CAMPO}
                  style={estiloCampo}
                  value={d.estilo ?? ''}
                  disabled={somenteLeitura}
                  onChange={(e) =>
                    alterar({
                      estilo: e.target.value
                        ? (e.target.value as 'LISTA' | 'NATURAL' | 'LIVRE')
                        : undefined,
                    })
                  }
                >
                  <option value="">Como estiver configurado para a empresa</option>
                  <option value="NATURAL">Em frase: “Vendas, Financeiro ou Suporte?”</option>
                  <option value="LISTA">Numerada: “1) Vendas”, “2) Financeiro”</option>
                  <option value="LIVRE">Não listar — a pergunta já diz quais são</option>
                </select>
                <p
                  className="mt-1.5 text-[11px] leading-snug"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Lista numerada é a coisa que mais denuncia um robô. Só vale a
                  pena quando as opções são muitas ou muito parecidas entre si.
                </p>
              </div>
            )}

            <div className="mt-4">
              <Rotulo dica="Vai na frente da pergunta quando o cliente responde algo que não casa com opção nenhuma.">
                Se o cliente não entender
              </Rotulo>
              <input
                className={CAMPO}
                style={estiloCampo}
                value={d.reperguntaTexto ?? ''}
                disabled={somenteLeitura}
                onChange={(e) => alterar({ reperguntaTexto: e.target.value || undefined })}
                placeholder="Foi mal, deixa eu perguntar de outro jeito."
              />
              <p
                className="mt-1.5 text-[11px] leading-snug"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                Na segunda vez sem se entenderem, o robô para de insistir e
                entrega a conversa a uma pessoa.
              </p>
            </div>
          </div>
        )}

        {node.type === 'CONDITION' && (
          <>
            <div>
              <Rotulo dica="O nome do campo guardado por um bloco de captura.">Variável</Rotulo>
              <input
                className={`${CAMPO} font-mono`}
                style={estiloCampo}
                value={d.variable ?? ''}
                disabled={somenteLeitura}
                onChange={(e) => alterar({ variable: e.target.value })}
                placeholder="plano"
              />
            </div>
            <div>
              <Rotulo>É igual a</Rotulo>
              <input
                className={CAMPO}
                style={estiloCampo}
                value={d.equals ?? ''}
                disabled={somenteLeitura}
                onChange={(e) => alterar({ equals: e.target.value })}
                placeholder="ouro"
              />
            </div>
          </>
        )}

        {node.type === 'CAPTURE' && (
          <div>
            <Rotulo dica="Vai para a ficha do contato, sem apagar o que já estiver lá.">
              Guardar em
            </Rotulo>
            <input
              className={`${CAMPO} font-mono`}
              style={estiloCampo}
              value={d.field ?? ''}
              disabled={somenteLeitura}
              onChange={(e) => alterar({ field: e.target.value })}
              placeholder="email"
            />
          </div>
        )}

        {node.type === 'TRANSFER' && (
          <div>
            <Rotulo dica="Sem setor, a conversa vai para o atendente menos ocupado que estiver online.">
              Setor de destino
            </Rotulo>
            <select
              className={CAMPO}
              style={estiloCampo}
              value={d.departmentId ?? ''}
              disabled={somenteLeitura}
              onChange={(e) => alterar({ departmentId: e.target.value || null })}
            >
              <option value="">Qualquer setor (distribuição automática)</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {node.type === 'AI' && (
          <div
            className="rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: '#8B5CF614',
              borderColor: '#8B5CF655',
              color: 'var(--theme-text-secondary)',
            }}
          >
            O assistente responde <strong>só</strong> com o que estiver escrito
            em Configurações → Copiloto de IA. Fora disso, entrega a conversa a
            uma pessoa. O mesmo acontece se o cliente pedir um atendente, tocar
            em preço, contrato ou cancelamento, ou depois de três trocas.
            <br />
            <br />
            Com a base vazia, este bloco transfere sem nem consultar a IA.
          </div>
        )}

        {node.type === 'START' && (
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            O bloco de início não tem configuração. Ele existe para o motor saber
            por onde começar, e só pode haver um.
          </p>
        )}
      </div>

      {node.type !== 'START' && !somenteLeitura && (
        <footer className="border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
          <button
            type="button"
            onClick={onRemover}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors hover:bg-red-500/10"
            style={{ borderColor: '#EF444455', color: '#EF4444' }}
          >
            <Trash2 size={13} /> Remover este bloco
          </button>
        </footer>
      )}
    </aside>
  );
}
