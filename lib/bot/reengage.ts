/**
 * Quando o robô volta a atender um lead que o atendimento humano deixou parado.
 *
 * A distribuição da F3 entrega a conversa nova ao atendente menos ocupado que
 * estiver online. É a regra certa e ela abre um buraco: a partir do instante em
 * que a conversa ganha dono, ninguém mais olha para ela. Se esse dono entra de
 * férias, muda de time ou só esquece, o lead espera para sempre — e o sistema
 * não acusa nada, porque do ponto de vista dele a conversa *está sendo
 * atendida*. É o pior modo de falha de um CRM: silencioso e caro.
 *
 * Duas situações devolvem o cliente ao robô, e elas não merecem o mesmo
 * tratamento:
 *
 * - **ABANDONO** — o cliente falou por último e ninguém respondeu há mais de N
 *   horas. A conversa volta para a fila do setor e quem a deixou parada recebe
 *   um e-mail. Aqui houve, de fato, uma falha de atendimento.
 *
 * - **FORA_DE_HORARIO** — o cliente escreveu à noite ou no fim de semana. A
 *   conversa **não** muda de dono: o atendente não fez nada errado, está fora
 *   do expediente. O robô só cobre o intervalo e sai de cena na primeira
 *   resposta humana.
 *
 * Este arquivo é puro de propósito. A regra erra em silêncio dos dois lados —
 * cedo demais, o robô atropela quem foi almoçar; tarde demais, o lead já foi
 * embora — e nenhum dos dois erros produz exceção. O que não produz exceção
 * precisa de teste.
 */

export type MotivoRetomada = 'ABANDONO' | 'FORA_DE_HORARIO';

export interface RetomadaConfig {
  reengageEnabled: boolean;
  /** Silêncio humano que caracteriza abandono. */
  reengageAfterHours: number;
  /** Dias de expediente, 0 = domingo. */
  officeDays: number[];
  officeStartHour: number;
  officeEndHour: number;
  timeZone: string;
}

export const DIAS_UTEIS = [1, 2, 3, 4, 5];

export const RETOMADA_PADRAO: RetomadaConfig = {
  reengageEnabled: true,
  reengageAfterHours: 24,
  officeDays: DIAS_UTEIS,
  officeStartHour: 9,
  officeEndHour: 18,
  timeZone: 'America/Sao_Paulo',
};

export interface EstadoConversa {
  assignedUserId: string | null;
  /**
   * Desde quando o cliente espera resposta de uma pessoa.
   *
   * É o instante da mensagem mais antiga do cliente que nenhum humano respondeu
   * — não a última mensagem recebida. A diferença importa: o webhook grava a
   * mensagem nova *antes* de chamar o robô, então "última mensagem do cliente"
   * seria sempre agora, e o abandono nunca dispararia.
   *
   * Nulo quando o atendente está em dia.
   */
  esperandoDesde: Date | null;
  /** Início da última sessão de robô nesta conversa. Nulo se nunca houve. */
  ultimaRetomada: Date | null;
  /**
   * Quando uma **pessoa** escreveu por último nesta conversa.
   *
   * Serve para saber se há gente por perto agora, o que é diferente de saber
   * se é horário comercial. Um atendente que responde às 22h de domingo está
   * trabalhando, e o robô não tem o que fazer ali.
   */
  ultimaRespostaHumana: Date | null;
}

/**
 * Quanto tempo uma resposta humana mantém o robô fora da conversa.
 *
 * Curto de propósito: é "esta pessoa está no teclado agora", não "esta pessoa
 * cuida deste cliente". Passada a janela, a cobertura fora do expediente volta
 * a valer — o atendente que respondeu às 19h não fica de plantão a noite toda
 * por causa disso.
 */
export const JANELA_HUMANO_PRESENTE_MS = 30 * 60_000;

export interface Retomada {
  motivo: MotivoRetomada;
  /** Tira o dono e devolve ao setor, para qualquer um poder assumir. */
  devolveParaFila: boolean;
  /** Avisa por e-mail quem estava com a conversa. */
  notifica: boolean;
}

/**
 * Decide se o robô retoma, e em que termos.
 *
 * `null` é a resposta mais comum e a mais importante: significa "está tudo bem,
 * não faça nada".
 */
export function decidirRetomada(
  estado: EstadoConversa,
  agora: Date,
  config: RetomadaConfig
): Retomada | null {
  if (!config.reengageEnabled) return null;

  // Sem dono, não há o que retomar: a conversa já está na fila e o robô a
  // atende pelo caminho normal.
  if (!estado.assignedUserId) return null;

  if (abandonada(estado, agora, config) && !retomadaRecente(estado, agora, config)) {
    return { motivo: 'ABANDONO', devolveParaFila: true, notifica: true };
  }

  // A trava de insistência não se aplica aqui de propósito: responder quem
  // acabou de escrever nunca é insistência — foi o cliente que procurou a
  // empresa. Duas noites seguidas precisam ser cobertas.
  //
  // Já a presença de um humano se aplica, e é o que impede o pior caso: um
  // atendente que responde às 22h de domingo está trabalhando, e o robô entrar
  // por cima dele seria falar em duas vozes com o mesmo cliente.
  if (!dentroDoExpediente(agora, config) && !humanoPresente(estado, agora)) {
    return { motivo: 'FORA_DE_HORARIO', devolveParaFila: false, notifica: false };
  }

  return null;
}

/** Uma pessoa escreveu aqui há pouco. */
export function humanoPresente(estado: EstadoConversa, agora: Date): boolean {
  if (!estado.ultimaRespostaHumana) return false;

  return agora.getTime() - estado.ultimaRespostaHumana.getTime() < JANELA_HUMANO_PRESENTE_MS;
}

function abandonada(estado: EstadoConversa, agora: Date, config: RetomadaConfig): boolean {
  if (!estado.esperandoDesde) return false;

  const espera = agora.getTime() - estado.esperandoDesde.getTime();
  return espera >= config.reengageAfterHours * 3_600_000;
}

/**
 * Trava anti-insistência.
 *
 * Sem ela, o cron de hora em hora reabriria o mesmo lead a cada passagem, e o
 * cliente esquecido viraria o cliente perseguido. Uma retomada por período de
 * abandono é o suficiente para alguém perceber.
 */
function retomadaRecente(estado: EstadoConversa, agora: Date, config: RetomadaConfig): boolean {
  if (!estado.ultimaRetomada) return false;

  const desde = agora.getTime() - estado.ultimaRetomada.getTime();
  return desde < config.reengageAfterHours * 3_600_000;
}

/**
 * Verdadeiro quando há gente trabalhando neste instante.
 *
 * Dia e hora **no fuso da organização**, nunca no do servidor: função
 * serverless roda em UTC, e sem conversão "18h" viraria 15h em São Paulo — com
 * a madrugada inteira contando como expediente.
 */
export function dentroDoExpediente(agora: Date, config: RetomadaConfig): boolean {
  const { dia, hora } = partesLocais(config.timeZone, agora);

  if (!config.officeDays.includes(dia)) return false;

  // Janela normal: início antes do fim, no mesmo dia.
  if (config.officeStartHour <= config.officeEndHour) {
    return hora >= config.officeStartHour && hora < config.officeEndHour;
  }

  // Turno que cruza a meia-noite (22h às 6h): vale de qualquer um dos lados.
  return hora >= config.officeStartHour || hora < config.officeEndHour;
}

const DIA_POR_SIGLA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partesLocais(timeZone: string, instante: Date): { dia: number; hora: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(instante);

  const sigla = partes.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? '0');

  return {
    dia: DIA_POR_SIGLA[sigla] ?? 0,
    // Meia-noite sai como "24" em alguns ambientes, e `0 >= 9` e `24 >= 9` são
    // respostas opostas para o mesmo instante.
    hora: hora % 24,
  };
}

/**
 * Lê a coluna `office_days` ('1,2,3,4,5') como lista de dias.
 *
 * Uma lista vazia significaria "nunca há expediente", e todo lead cairia no
 * robô para sempre — um estranho jeito de um campo em branco derrubar o
 * atendimento humano inteiro. Vazio cai no padrão.
 */
export function lerDiasDeExpediente(bruto: string | null | undefined): number[] {
  const dias = (bruto ?? '')
    .split(',')
    .map((parte) => parte.trim())
    // `Number('')` é 0, e 0 é domingo: sem este filtro, um campo em branco
    // viraria "atende só aos domingos".
    .filter((parte) => parte !== '')
    .map(Number)
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);

  const unicos = [...new Set(dias)].sort((a, b) => a - b);

  return unicos.length > 0 ? unicos : DIAS_UTEIS;
}
