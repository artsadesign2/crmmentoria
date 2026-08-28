import { describe, expect, it } from 'vitest';
import {
  RETOMADA_PADRAO,
  decidirRetomada,
  dentroDoExpediente,
  lerDiasDeExpediente,
  type EstadoConversa,
  type RetomadaConfig,
} from '@/lib/bot/reengage';

/**
 * A regra que decide quando o robô volta a atender um lead que uma pessoa
 * deixou parado.
 *
 * Pura e testada aqui inteira porque erra em silêncio dos dois lados: cedo
 * demais, o robô interrompe um atendente que estava só almoçando; tarde demais,
 * o lead vai embora e nada no sistema registra que ele foi embora.
 */

const CONFIG: RetomadaConfig = {
  ...RETOMADA_PADRAO,
  timeZone: 'America/Sao_Paulo',
};

/** Quarta-feira, 14h em São Paulo — dentro do expediente padrão. */
const EXPEDIENTE = new Date('2026-08-26T17:00:00Z');
/** Mesma quarta, 22h em São Paulo. */
const MADRUGADA = new Date('2026-08-27T01:00:00Z');
/** Domingo, 14h em São Paulo. */
const DOMINGO = new Date('2026-08-30T17:00:00Z');

function estado(over: Partial<EstadoConversa> = {}): EstadoConversa {
  return {
    assignedUserId: 'atendente-1',
    esperandoDesde: null,
    ultimaRetomada: null,
    ...over,
  };
}

function horasAntes(referencia: Date, horas: number): Date {
  return new Date(referencia.getTime() - horas * 3_600_000);
}

describe('dentroDoExpediente', () => {
  it('quarta às 14h está dentro', () => {
    expect(dentroDoExpediente(EXPEDIENTE, CONFIG)).toBe(true);
  });

  it('quarta às 22h está fora', () => {
    expect(dentroDoExpediente(MADRUGADA, CONFIG)).toBe(false);
  });

  it('domingo às 14h está fora, mesmo sendo hora comercial', () => {
    expect(dentroDoExpediente(DOMINGO, CONFIG)).toBe(false);
  });

  it('respeita o fuso da organização e não o do servidor', () => {
    // 2026-08-26T23:00:00Z é 20h em São Paulo (fora) e 23h em Londres (fora),
    // mas 16h em Los Angeles (dentro). Sem conversão de fuso, os três dariam
    // a mesma resposta — e é justamente esse o erro que passa despercebido.
    const instante = new Date('2026-08-26T23:00:00Z');

    expect(dentroDoExpediente(instante, CONFIG)).toBe(false);
    expect(dentroDoExpediente(instante, { ...CONFIG, timeZone: 'America/Los_Angeles' })).toBe(true);
  });

  it('a hora de fim é exclusiva: 18h em ponto já está fora', () => {
    // 21:00Z = 18:00 em São Paulo.
    expect(dentroDoExpediente(new Date('2026-08-26T21:00:00Z'), CONFIG)).toBe(false);
    expect(dentroDoExpediente(new Date('2026-08-26T20:59:00Z'), CONFIG)).toBe(true);
  });

  it('organização que atende todo dia, o dia inteiro, nunca está fora', () => {
    const semParar: RetomadaConfig = {
      ...CONFIG,
      officeDays: [0, 1, 2, 3, 4, 5, 6],
      officeStartHour: 0,
      officeEndHour: 24,
    };

    expect(dentroDoExpediente(MADRUGADA, semParar)).toBe(true);
    expect(dentroDoExpediente(DOMINGO, semParar)).toBe(true);
  });
});

describe('lerDiasDeExpediente', () => {
  it('lê a lista gravada no banco', () => {
    expect(lerDiasDeExpediente('1,2,3,4,5')).toEqual([1, 2, 3, 4, 5]);
  });

  it('ignora lixo e ordena sem repetir', () => {
    expect(lerDiasDeExpediente('5, 1 ,x,1,9,-2,3')).toEqual([1, 3, 5]);
  });

  it('string vazia cai no padrão em vez de deixar a semana sem expediente', () => {
    // Uma lista vazia significaria "nunca há expediente", e todo lead cairia no
    // robô para sempre. O padrão é o palpite honesto.
    expect(lerDiasDeExpediente('')).toEqual([1, 2, 3, 4, 5]);
    expect(lerDiasDeExpediente(null)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('decidirRetomada', () => {
  it('conversa sem dono não é retomada: o robô já atende por conta própria', () => {
    const semDono = estado({ assignedUserId: null, esperandoDesde: horasAntes(EXPEDIENTE, 72) });
    expect(decidirRetomada(semDono, EXPEDIENTE, CONFIG)).toBeNull();
  });

  it('atendente calado há 30h com o cliente esperando é abandono', () => {
    const parada = estado({ esperandoDesde: horasAntes(EXPEDIENTE, 30) });
    const decisao = decidirRetomada(parada, EXPEDIENTE, CONFIG);

    expect(decisao?.motivo).toBe('ABANDONO');
    expect(decisao?.devolveParaFila).toBe(true);
    expect(decisao?.notifica).toBe(true);
  });

  it('23h de espera ainda não é abandono com o limite em 24', () => {
    const quase = estado({ esperandoDesde: horasAntes(EXPEDIENTE, 23) });
    expect(decidirRetomada(quase, EXPEDIENTE, CONFIG)).toBeNull();
  });

  it('cliente que não está esperando resposta nenhuma não gera abandono', () => {
    // `esperandoDesde` nulo é o atendente em dia: respondeu tudo o que chegou.
    expect(decidirRetomada(estado(), EXPEDIENTE, CONFIG)).toBeNull();
  });

  it('fora do expediente o robô cobre, mas não tira a conversa de ninguém', () => {
    const decisao = decidirRetomada(estado(), MADRUGADA, CONFIG);

    expect(decisao?.motivo).toBe('FORA_DE_HORARIO');
    // O atendente não fez nada errado — está fora do horário. Devolvê-lo para a
    // fila e mandar um e-mail de cobrança seria punir alguém por dormir.
    expect(decisao?.devolveParaFila).toBe(false);
    expect(decisao?.notifica).toBe(false);
  });

  it('abandono vence fora de horário quando os dois valem', () => {
    const parada = estado({ esperandoDesde: horasAntes(MADRUGADA, 40) });
    expect(decidirRetomada(parada, MADRUGADA, CONFIG)?.motivo).toBe('ABANDONO');
  });

  it('não repete o abandono dentro do mesmo período', () => {
    // Sem esta trava, o cron de hora em hora reabriria o mesmo lead a cada
    // passagem: o cliente esquecido viraria o cliente perseguido.
    const jaRetomada = estado({
      esperandoDesde: horasAntes(EXPEDIENTE, 40),
      ultimaRetomada: horasAntes(EXPEDIENTE, 2),
    });

    expect(decidirRetomada(jaRetomada, EXPEDIENTE, CONFIG)).toBeNull();
  });

  it('retomada antiga não bloqueia um novo abandono', () => {
    const denovo = estado({
      esperandoDesde: horasAntes(EXPEDIENTE, 40),
      ultimaRetomada: horasAntes(EXPEDIENTE, 30),
    });

    expect(decidirRetomada(denovo, EXPEDIENTE, CONFIG)?.motivo).toBe('ABANDONO');
  });

  it('a trava de insistência não vale para fora de horário', () => {
    // Responder quem acabou de escrever nunca é insistência: foi o cliente que
    // procurou a empresa. Duas noites seguidas precisam ser cobertas.
    const ontemANoite = estado({ ultimaRetomada: horasAntes(MADRUGADA, 24) });
    expect(decidirRetomada(ontemANoite, MADRUGADA, CONFIG)?.motivo).toBe('FORA_DE_HORARIO');
  });

  it('desligada, a retomada não acontece em nenhuma hipótese', () => {
    const desligada: RetomadaConfig = { ...CONFIG, reengageEnabled: false };
    const parada = estado({ esperandoDesde: horasAntes(MADRUGADA, 90) });

    expect(decidirRetomada(parada, MADRUGADA, desligada)).toBeNull();
    expect(decidirRetomada(estado(), MADRUGADA, desligada)).toBeNull();
  });
});
