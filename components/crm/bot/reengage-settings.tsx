'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

/**
 * Quando o robô retoma um lead que o atendimento humano deixou parado.
 *
 * A tela diz em voz alta o que cada campo provoca, porque nenhum deles produz
 * efeito visível na hora: a pessoa muda "24" para "4" e não acontece nada até
 * um cliente ficar esperando quatro horas, semanas depois. Um número sem
 * consequência aparente é um número que alguém mexe sem pensar.
 */

export interface BotSettingsDTO {
  reengageEnabled: boolean;
  reengageAfterHours: number;
  officeDays: number[];
  officeStartHour: number;
  officeEndHour: number;
  timeZone: string;
  notifyByWhatsapp: boolean;
  notifyByEmail: boolean;
  personaName: string;
  humanized: boolean;
}

const DIAS = [
  { valor: 0, nome: 'Dom' },
  { valor: 1, nome: 'Seg' },
  { valor: 2, nome: 'Ter' },
  { valor: 3, nome: 'Qua' },
  { valor: 4, nome: 'Qui' },
  { valor: 5, nome: 'Sex' },
  { valor: 6, nome: 'Sáb' },
];

const CAMPO = 'rounded-lg border px-3 py-2 text-sm outline-none';

const estiloCampo = {
  background: 'var(--theme-bg)',
  borderColor: 'var(--theme-border)',
  color: 'var(--theme-text-primary)',
};

export function ReengageSettings({
  podeEditar,
  onFechar,
}: {
  podeEditar: boolean;
  onFechar: () => void;
}) {
  const [config, setConfig] = useState<BotSettingsDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      const resposta = await fetch('/api/crm/bot/settings');
      const corpo = await resposta.json();
      if (corpo.ok) setConfig(corpo.settings as BotSettingsDTO);
      else setErro(corpo.error ?? 'Não foi possível carregar a configuração.');
    })();
  }, []);

  const salvar = async () => {
    if (!config) return;

    setSalvando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch('/api/crm/bot/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.ok) {
        setErro(corpo.error ?? 'Não foi possível salvar.');
        return;
      }

      setConfig(corpo.settings as BotSettingsDTO);
      setAviso('Configuração salva.');
    } catch {
      setErro('Falha de rede ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const alterar = (parcial: Partial<BotSettingsDTO>) =>
    setConfig((c) => (c ? { ...c, ...parcial } : c));

  const alternarDia = (dia: number) => {
    if (!config) return;
    const tem = config.officeDays.includes(dia);
    alterar({
      officeDays: tem
        ? config.officeDays.filter((d) => d !== dia)
        : [...config.officeDays, dia].sort((a, b) => a - b),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border"
        style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      >
        <header
          className="flex items-center border-b px-5 py-4"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Comportamento do robô
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              Como ele fala, e o que acontece quando um lead fica sem resposta.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="ml-auto rounded p-1 hover:bg-white/5"
            aria-label="Fechar"
          >
            <X size={18} style={{ color: 'var(--theme-text-secondary)' }} />
          </button>
        </header>

        {!config ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--primary-color)' }} />
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={config.reengageEnabled}
                disabled={!podeEditar}
                onChange={(e) => alterar({ reengageEnabled: e.target.checked })}
              />
              <span>
                <span
                  className="block text-sm font-medium"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  Ligada
                </span>
                <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  Desligada, nenhuma conversa volta para a fila e ninguém é
                  avisado — nem que o cliente espere uma semana.
                </span>
              </span>
            </label>

            <div>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                Considerar abandono depois de
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={720}
                  className={`${CAMPO} w-24`}
                  style={estiloCampo}
                  value={config.reengageAfterHours}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ reengageAfterHours: Number(e.target.value) })}
                />
                <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                  horas de silêncio
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
                Passado esse tempo com o cliente esperando, a conversa volta para
                a fila do setor e o atendente que estava com ela é avisado.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                Expediente
              </p>
              <p className="mt-0.5 mb-2 text-xs leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
                Fora dele o robô responde no lugar da equipe — sem tirar a
                conversa de ninguém.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((d) => {
                  const ativo = config.officeDays.includes(d.valor);
                  return (
                    <button
                      key={d.valor}
                      type="button"
                      disabled={!podeEditar}
                      onClick={() => alternarDia(d.valor)}
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                      style={{
                        background: ativo ? 'var(--primary-color)' : 'transparent',
                        borderColor: ativo ? 'var(--primary-color)' : 'var(--theme-border)',
                        color: ativo ? '#0A0F1A' : 'var(--theme-text-secondary)',
                      }}
                    >
                      {d.nome}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  className={`${CAMPO} w-20`}
                  style={estiloCampo}
                  value={config.officeStartHour}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ officeStartHour: Number(e.target.value) })}
                />
                <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                  às
                </span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className={`${CAMPO} w-20`}
                  style={estiloCampo}
                  value={config.officeEndHour}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ officeEndHour: Number(e.target.value) })}
                />
                <input
                  className={`${CAMPO} flex-1`}
                  style={estiloCampo}
                  value={config.timeZone}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ timeZone: e.target.value })}
                />
              </div>
            </div>

            <div
              className="border-t pt-5"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                Como o robô fala
              </p>

              <label className="mt-2 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={config.humanized}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ humanized: e.target.checked })}
                />
                <span>
                  <span className="block text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                    Escrever como gente
                  </span>
                  <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    Pausa antes de responder, indicador de “digitando…”,
                    mensagens curtas em sequência e menu em frase corrida no
                    lugar de lista numerada. Desmarcar devolve o robô
                    instantâneo — é a reversão sem precisar de deploy.
                  </span>
                </span>
              </label>

              <div className="mt-3">
                <label
                  htmlFor="persona"
                  className="block text-sm"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  Nome de quem atende
                </label>
                <input
                  id="persona"
                  className={`${CAMPO} mt-1.5 w-full`}
                  style={estiloCampo}
                  maxLength={60}
                  placeholder="deixe em branco para não usar nome"
                  value={config.personaName}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ personaName: e.target.value })}
                />
                <p
                  className="mt-1.5 text-xs leading-snug"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Com um nome aqui, o robô se apresenta e responde por ele
                  quando perguntam. Em branco, ele atende sem se nomear — que é
                  o normal. O nome entra em fluxos criados a partir daqui e em
                  qualquer texto que use <code>{'{{atendente}}'}</code>.
                </p>
              </div>
            </div>

            <div
              className="border-t pt-5"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                Como avisar o atendente
              </p>

              <label className="mt-2 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={config.notifyByWhatsapp}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ notifyByWhatsapp: e.target.checked })}
                />
                <span>
                  <span className="block text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                    WhatsApp
                  </span>
                  <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    Sai pelo número da empresa para o celular cadastrado no
                    usuário. Quem não tem telefone na ficha não recebe.
                  </span>
                </span>
              </label>

              <label className="mt-2 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={config.notifyByEmail}
                  disabled={!podeEditar}
                  onChange={(e) => alterar({ notifyByEmail: e.target.checked })}
                />
                <span>
                  <span className="block text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                    E-mail
                  </span>
                  <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    Usado quando o WhatsApp não serve: sem telefone na ficha, ou
                    envio recusado.
                  </span>
                </span>
              </label>
            </div>

            {erro && (
              <p className="text-xs" style={{ color: '#EF4444' }}>
                {erro}
              </p>
            )}
            {aviso && (
              <p className="text-xs" style={{ color: '#22C55E' }}>
                {aviso}
              </p>
            )}

            {podeEditar && (
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--primary-color)', color: '#0A0F1A' }}
              >
                {salvando && <Loader2 className="animate-spin" size={14} />}
                Salvar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
