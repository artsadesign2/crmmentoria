'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Zap, AlertCircle, Check } from 'lucide-react';
import type { DispatchPolicy } from '@/lib/dispatch/policy';
import type { QuickReplyDTO } from '@/lib/crm/quick-reply-text';

/**
 * Configurações de disparo: ritmo anti-bloqueio e respostas prontas.
 *
 * As duas coisas moram juntas porque são as duas partes do WhatsApp que valem
 * para a empresa inteira, e não para uma conversa. O ritmo em especial: se cada
 * campanha escolhesse o seu, três campanhas somariam envios pelo mesmo número —
 * que é exatamente o que o intervalo existe para impedir.
 */

interface DispatchSettingsSectionProps {
  canEdit: boolean;
}

export function DispatchSettingsSection({ canEdit }: DispatchSettingsSectionProps) {
  const [politica, setPolitica] = useState<DispatchPolicy | null>(null);
  const [respostas, setRespostas] = useState<QuickReplyDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [novoAtalho, setNovoAtalho] = useState('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTexto, setNovoTexto] = useState('');
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    let ativo = true;

    void Promise.all([
      fetch('/api/crm/dispatch-settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/crm/quick-replies').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([config, prontas]) => {
        if (!ativo) return;
        if (config?.settings) setPolitica(config.settings as DispatchPolicy);
        if (prontas?.quickReplies) setRespostas(prontas.quickReplies as QuickReplyDTO[]);
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        setErro('Não foi possível carregar as configurações de disparo.');
        setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const salvarPolitica = async () => {
    if (!politica || salvando) return;

    setSalvando(true);
    setErro(null);
    setSalvo(false);

    try {
      const resposta = await fetch('/api/crm/dispatch-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(politica),
      });

      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.ok) {
        setErro(corpo.error ?? 'Não foi possível salvar.');
        return;
      }

      setPolitica(corpo.settings as DispatchPolicy);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch {
      setErro('Falha de rede ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const criarResposta = async () => {
    if (criando) return;

    setCriando(true);
    setErro(null);

    try {
      const resposta = await fetch('/api/crm/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut: novoAtalho, title: novoTitulo, content: novoTexto }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.ok) {
        setErro(corpo.error ?? 'Não foi possível criar a resposta.');
        return;
      }

      setRespostas((atual) =>
        [...atual, corpo.quickReply as QuickReplyDTO].sort((a, b) =>
          a.shortcut.localeCompare(b.shortcut)
        )
      );
      setNovoAtalho('');
      setNovoTitulo('');
      setNovoTexto('');
    } catch {
      setErro('Falha de rede ao criar a resposta.');
    } finally {
      setCriando(false);
    }
  };

  const apagarResposta = async (id: string) => {
    try {
      const resposta = await fetch(`/api/crm/quick-replies/${id}`, { method: 'DELETE' });
      if (resposta.ok) setRespostas((atual) => atual.filter((r) => r.id !== id));
    } catch {
      setErro('Falha de rede ao apagar a resposta.');
    }
  };

  if (carregando) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Carregando configurações de disparo…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {erro && (
        <p className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
          <AlertCircle size={14} />
          {erro}
        </p>
      )}

      <section>
        <h3 className="text-sm font-black text-[var(--theme-text-primary)]">Ritmo do disparo</h3>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[var(--theme-text-secondary)]">
          Nenhum destes números impede o WhatsApp de bloquear um número — eles reduzem o risco. A
          variação aleatória é a que mais importa: um envio a cada 4 segundos exatos é mais
          suspeito que um a cada 4 a 7 segundos, porque cadência perfeita é o que nenhuma pessoa
          produz.
        </p>

        {politica && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              rotulo="Intervalo mínimo (ms)"
              apoio="Espera base entre um envio e o seguinte."
              valor={politica.minIntervalMs}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, minIntervalMs: v })}
            />
            <Campo
              rotulo="Variação aleatória (ms)"
              apoio="Somada ao intervalo, sorteada a cada envio."
              valor={politica.jitterMs}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, jitterMs: v })}
            />
            <Campo
              rotulo="Máximo por minuto"
              apoio="Vale para a empresa toda, não por campanha."
              valor={politica.maxPerMinute}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, maxPerMinute: v })}
            />
            <Campo
              rotulo="Início da janela (hora)"
              apoio="Antes disso, a fila espera."
              valor={politica.windowStartHour}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, windowStartHour: v })}
            />
            <Campo
              rotulo="Fim da janela (hora)"
              apoio="Para o dia inteiro, use 0 e 24."
              valor={politica.windowEndHour}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, windowEndHour: v })}
            />
            <Campo
              rotulo="Teto diário"
              apoio="Mensagens por dia, somando todas as campanhas."
              valor={politica.dailyCap}
              editavel={canEdit}
              onChange={(v) => setPolitica({ ...politica, dailyCap: v })}
            />
          </div>
        )}

        {canEdit && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void salvarPolitica()}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)', color: '#0B0F17' }}
            >
              {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar ritmo
            </button>

            {salvo && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <Check size={12} />
                Salvo.
              </span>
            )}
          </div>
        )}

        {!canEdit && (
          <p className="mt-2 text-[11px] text-[var(--theme-text-secondary)]">
            Só Administrador ou acima altera estes números — afrouxá-los é assumir risco pelo
            número da empresa.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-black text-[var(--theme-text-primary)]">Respostas rápidas</h3>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[var(--theme-text-secondary)]">
          O atendente digita <code>/</code> no início da caixa e escolhe. O texto entra na mensagem
          e continua editável. Use <code>{'{{nome}}'}</code> e <code>{'{{empresa}}'}</code> para
          personalizar.
        </p>

        <ul className="mt-3 space-y-2">
          {respostas.map((resposta) => (
            <li
              key={resposta.id}
              className="flex items-start gap-2 rounded-xl border border-[var(--theme-border)] p-2.5"
            >
              <Zap size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--primary-color)' }} />

              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="text-[11px] font-black text-[var(--theme-text-primary)]">
                    /{resposta.shortcut}
                  </span>
                  <span className="truncate text-[11px] text-[var(--theme-text-secondary)]">
                    {resposta.title}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--theme-text-secondary)]">
                  {resposta.content}
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => void apagarResposta(resposta.id)}
                  aria-label={`Apagar /${resposta.shortcut}`}
                  className="shrink-0 rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}

          {respostas.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--theme-border)] p-4 text-center text-[11px] text-[var(--theme-text-secondary)]">
              Nenhuma resposta rápida ainda.
            </li>
          )}
        </ul>

        {canEdit && (
          <div className="mt-3 space-y-2 rounded-xl border border-[var(--theme-border)] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={novoAtalho}
                onChange={(e) => setNovoAtalho(e.target.value)}
                placeholder="Atalho, ex.: preco"
                className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
              />
              <input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Título, ex.: Tabela de preços"
                className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
              />
            </div>

            <textarea
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              rows={3}
              placeholder="Oi {{nome}}, nossos planos começam em…"
              className="w-full resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2.5 text-xs leading-relaxed text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
            />

            <button
              type="button"
              onClick={() => void criarResposta()}
              disabled={criando || !novoAtalho.trim() || !novoTitulo.trim() || !novoTexto.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-primary)] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {criando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Adicionar resposta
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Campo({
  rotulo,
  apoio,
  valor,
  editavel,
  onChange,
}: {
  rotulo: string;
  apoio: string;
  valor: number;
  editavel: boolean;
  onChange: (valor: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-[var(--theme-border)] p-2.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
        {rotulo}
      </span>
      <input
        type="number"
        value={valor}
        disabled={!editavel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--theme-text-primary)] outline-none disabled:opacity-60"
      />
      <span className="mt-1 block text-[10px] leading-snug text-[var(--theme-text-secondary)]">
        {apoio}
      </span>
    </label>
  );
}
