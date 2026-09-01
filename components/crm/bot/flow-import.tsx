'use client';

import { useState } from 'react';
import { AlertTriangle, FileJson, Loader2, Sparkles, Upload, X } from 'lucide-react';
import type { FlowDTO } from '@/lib/bot/flows';

/**
 * Duas maneiras de criar um fluxo sem desenhar: descrever, ou colar.
 *
 * Ficam no mesmo painel porque são a mesma decisão vista de dois lados — "eu
 * sei o que quero, escreve pra mim" e "eu já tenho o arquivo". Separá-las em
 * dois botões no menu obrigaria a pessoa a saber, antes de clicar, que as
 * duas existem.
 *
 * O painel só cria rascunho. Publicar continua a um clique de distância e num
 * lugar diferente, porque ler o que o robô vai dizer antes de ele dizer é a
 * única salvaguarda que sobra quando o texto vem de um modelo.
 */

type Aba = 'ia' | 'json';

const EXEMPLO = `Atendimento de uma clínica odontológica. Pergunta se a pessoa
quer marcar avaliação, tirar dúvida sobre um tratamento em andamento, ou falar
de pagamento. Avaliação e pagamento vão para setores diferentes; dúvida sobre
tratamento passa pela IA antes de chamar alguém.`;

export function FlowImport({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: (flow: FlowDTO, avisos: string[]) => void;
}) {
  const [aba, setAba] = useState<Aba>('ia');
  const [descricao, setDescricao] = useState('');
  const [json, setJson] = useState('');
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    setOcupado(true);
    setErro(null);

    const rota = aba === 'ia' ? '/api/crm/bot/gerar' : '/api/crm/bot/importar';
    const corpo = aba === 'ia' ? { descricao, name: nome } : { json, name: nome };

    try {
      const resposta = await fetch(rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json();

      if (!resposta.ok || !dados.ok) {
        setErro(dados.error ?? 'Não foi possível criar o fluxo.');
        return;
      }

      onCriado(dados.flow as FlowDTO, (dados.avisos as string[]) ?? []);
    } catch {
      setErro('Falha de rede.');
    } finally {
      setOcupado(false);
    }
  };

  const lerArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setJson(await arquivo.text());
    // O nome do arquivo é um palpite melhor que "Fluxo importado", e continua
    // editável no campo acima.
    if (!nome) setNome(arquivo.name.replace(/\.json$/i, ''));
  };

  const pronto = aba === 'ia' ? descricao.trim().length >= 10 : json.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 modal-backdrop-animate"
      style={{ background: '#00000099' }}
      onClick={onFechar}
    >
      <div
        className="modal-card-animate flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border sm:rounded-2xl"
        style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Criar fluxo sem desenhar"
      >
        <header
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <h2
            className="flex-1 text-sm font-semibold"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Criar fluxo sem desenhar
          </h2>

          <button
            type="button"
            onClick={onFechar}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/5"
            aria-label="Fechar"
          >
            <X size={16} style={{ color: 'var(--theme-text-secondary)' }} />
          </button>
        </header>

        <div
          className="flex gap-1 border-b px-3 pt-3"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <AbaBotao ativa={aba === 'ia'} Icone={Sparkles} onClick={() => setAba('ia')}>
            Descrever para a IA
          </AbaBotao>
          <AbaBotao ativa={aba === 'json'} Icone={FileJson} onClick={() => setAba('json')}>
            Colar JSON
          </AbaBotao>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {aba === 'ia' ? (
            <>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                Descreva o atendimento como você explicaria a alguém no primeiro
                dia. Os setores cadastrados na empresa entram sozinhos — não
                precisa citar códigos.
              </p>

              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={7}
                placeholder={EXEMPLO}
                className="w-full resize-y rounded-lg border bg-transparent p-3 text-sm outline-none"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </>
          ) : (
            <>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                Cole o conteúdo de um fluxo exportado, ou escolha o arquivo. O
                que estiver faltando é preenchido e listado depois.
              </p>

              <label
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-xs transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text-secondary)',
                }}
              >
                <Upload size={14} />
                Escolher arquivo .json
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => void lerArquivo(e.target.files?.[0])}
                />
              </label>

              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={9}
                spellCheck={false}
                placeholder='{ "name": "Triagem", "graph": { "nodes": [...], "edges": [...] } }'
                className="w-full resize-y rounded-lg border bg-transparent p-3 font-mono text-[11px] leading-relaxed outline-none"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </>
          )}

          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do fluxo (opcional)"
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
          />

          {erro && (
            <p
              className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed"
              style={{ background: '#EF444414', borderColor: '#EF444455', color: '#FCA5A5' }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {erro}
            </p>
          )}
        </div>

        <footer
          className="flex items-center gap-2 border-t px-4 py-3"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <p className="flex-1 text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>
            Entra como rascunho. Nada vai ao ar sem você publicar.
          </p>

          <button
            type="button"
            onClick={() => void enviar()}
            disabled={!pronto || ocupado}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--primary-color)', color: '#0A0F1A' }}
          >
            {ocupado ? (
              <Loader2 className="animate-spin" size={13} />
            ) : aba === 'ia' ? (
              <Sparkles size={13} />
            ) : (
              <FileJson size={13} />
            )}
            {aba === 'ia' ? 'Montar fluxo' : 'Importar'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AbaBotao({
  ativa,
  Icone,
  onClick,
  children,
}: {
  ativa: boolean;
  Icone: typeof Sparkles;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors"
      style={{
        borderColor: ativa ? 'var(--primary-color)' : 'transparent',
        color: ativa ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
      }}
    >
      <Icone size={13} />
      {children}
    </button>
  );
}
