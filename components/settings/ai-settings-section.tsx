'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react';

/**
 * Base de conhecimento do copiloto.
 *
 * Esta tela é a diferença entre um copiloto que ajuda e um que inventa preço
 * na frente do cliente. O aviso no topo diz isso com todas as letras, porque
 * uma caixa de texto vazia sem explicação seria preenchida por ninguém.
 *
 * Texto livre, e não campos separados para "preço" e "prazo": quem escreve
 * conhece o negócio, e um formulário fixo deixaria de fora justamente o que
 * aquele negócio tem de particular.
 */

interface AiSettings {
  knowledgeBase: string;
  tone: string;
  enabled: boolean;
  updatedAt: string | null;
  available: boolean;
}

const EXEMPLO = `Exemplo do que vale escrever aqui:

Plano Anual — R$ 24.000, em até 12x sem juros.
Imersão presencial — R$ 8.000, duas por ano.
Turma de setembro: 6 vagas restantes.

Não damos desconto para ex-alunos do curso básico.
Parcelamento acima de 12x só com aprovação do Marcio.

Quando perguntarem sobre garantia: 7 dias, contados da
primeira aula liberada.`;

export function AiSettingsSection({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [tone, setTone] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/ai/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => {
        if (!corpo?.settings) return;
        const s = corpo.settings as AiSettings;
        setSettings(s);
        setKnowledgeBase(s.knowledgeBase);
        setTone(s.tone);
        setEnabled(s.enabled);
      })
      .catch(() => setErro('Não foi possível carregar as configurações de IA.'));
  }, []);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setSalvo(false);

    try {
      const resposta = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeBase, tone, enabled }),
      });
      const corpo = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(corpo.error ?? 'Não foi possível salvar.');
        return;
      }

      setSettings(corpo.settings as AiSettings);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch {
      setErro('Falha de conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  const semChave = settings !== null && !settings.available && settings.enabled;

  const campo =
    'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-xs leading-relaxed text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-secondary)] focus:border-[var(--primary-color)] disabled:opacity-60';

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Sparkles size={18} style={{ color: 'var(--primary-color)' }} />
        <h2 className="text-sm font-black text-[var(--theme-text-primary)]">
          Copiloto de IA
        </h2>
      </header>

      {semChave && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-300">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          A chave da IA não está configurada no servidor. Defina{' '}
          <code className="font-mono">GEMINI_API_KEY</code> para os recursos aparecerem no Inbox.
        </p>
      )}

      <div className="rounded-xl border border-[var(--theme-border)] p-3">
        <p className="text-xs leading-relaxed text-[var(--theme-text-secondary)]">
          O copiloto só pode afirmar ao cliente o que estiver escrito aqui. Com este campo vazio,
          ele é instruído a <strong className="text-[var(--theme-text-primary)]">não citar
          preço, prazo ou vaga</strong> — vai responder que confirma com a equipe. É o que impede
          a IA de inventar um valor numa conversa de venda.
        </p>
      </div>

      <div>
        <label
          htmlFor="ia-base"
          className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]"
        >
          Base de conhecimento
        </label>
        <textarea
          id="ia-base"
          value={knowledgeBase}
          onChange={(e) => setKnowledgeBase(e.target.value)}
          disabled={!canEdit}
          rows={14}
          placeholder={EXEMPLO}
          className={`${campo} resize-y font-mono`}
        />
      </div>

      <div>
        <label
          htmlFor="ia-tom"
          className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]"
        >
          Tom de voz
        </label>
        <input
          id="ia-tom"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          disabled={!canEdit}
          placeholder="próximo, direto, sem formalidade excessiva"
          className={campo}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!canEdit}
          className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
        />
        <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
          Copiloto ativo para esta organização
        </span>
      </label>

      {erro && <p className="text-xs font-bold text-red-400">{erro}</p>}

      {canEdit ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-[#0B0F17] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Salvar
          </button>

          {salvo && (
            <span className="text-xs font-bold text-emerald-400">Base atualizada.</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--theme-text-secondary)]">
          Só Administrador ou acima pode editar a base de conhecimento.
        </p>
      )}
    </div>
  );
}
