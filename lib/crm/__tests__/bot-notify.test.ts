import { describe, expect, it } from 'vitest';
import { mesmoTelefone } from '@/lib/crm/phone';
import { textoLeadParado } from '@/lib/bot/notify-text';
import { esperaLegivel } from '@/lib/crm/sla';

/**
 * O aviso que chega no WhatsApp do atendente, e o reconhecimento do número dele.
 *
 * As duas coisas juntas porque falham juntas: se `mesmoTelefone` não reconhecer
 * o número do atendente, o aviso que o sistema acabou de mandar volta pelo
 * webhook e vira um lead com o nome dele dentro do próprio funil.
 */

describe('mesmoTelefone', () => {
  it('reconhece o mesmo número escrito de formas diferentes', () => {
    expect(mesmoTelefone('5511987654321', '(11) 98765-4321')).toBe(true);
    expect(mesmoTelefone('+55 11 98765-4321', '5511987654321')).toBe(true);
  });

  it('atravessa o nono dígito', () => {
    // O mesmo celular aparece com e sem o 9 dependendo de quem escreveu o
    // cadastro e de como o WhatsApp devolveu o JID.
    expect(mesmoTelefone('5511987654321', '551187654321')).toBe(true);
  });

  it('números diferentes continuam diferentes', () => {
    expect(mesmoTelefone('5511987654321', '5511987654322')).toBe(false);
    expect(mesmoTelefone('5511987654321', '5521987654321')).toBe(false);
  });

  it('vazio nunca casa com nada', () => {
    expect(mesmoTelefone('', '5511987654321')).toBe(false);
    expect(mesmoTelefone(null, null)).toBe(false);
    expect(mesmoTelefone('5511987654321', undefined)).toBe(false);
  });

  it('fora do Brasil exige igualdade exata', () => {
    // "Mesmos dois primeiros e mesmos oito últimos" não quer dizer nada fora
    // do plano de numeração brasileiro, e o falso positivo aqui é caro: a
    // mensagem de um cliente seria descartada como se fosse da equipe.
    expect(mesmoTelefone('+14155550123', '+14155550123')).toBe(true);
    expect(mesmoTelefone('+14155550123', '+14255550123')).toBe(false);
  });
});

describe('esperaLegivel', () => {
  it('nunca escreve "1 horas" nem "0 dias"', () => {
    expect(esperaLegivel(1)).toBe('1 hora');
    expect(esperaLegivel(0.2)).toBe('1 hora');
    expect(esperaLegivel(26)).toBe('26 horas');
    expect(esperaLegivel(48)).toBe('2 dias');
    expect(esperaLegivel(30)).toBe('30 horas');
  });

  it('vira dias a partir de dois', () => {
    expect(esperaLegivel(72)).toBe('3 dias');
    expect(esperaLegivel(50)).toBe('2 dias');
  });
});

describe('textoLeadParado', () => {
  const base = {
    contato: 'Maria Souza',
    telefone: '(11) 98888-7777',
    horasParado: 26,
    url: 'https://app.exemplo.com/inbox',
  };

  it('abre com o nome e o tempo, que é o que cabe na notificação', () => {
    const texto = textoLeadParado(base);
    const primeira = texto.split('\n')[0];

    expect(primeira).toContain('Maria Souza');
    expect(primeira).toContain('26 horas');
  });

  it('diz o que já foi feito, para ninguém entrar em pânico', () => {
    expect(textoLeadParado(base)).toMatch(/voltou para a fila/i);
  });

  it('não usa jargão do sistema', () => {
    const texto = textoLeadParado(base).toLowerCase();

    for (const palavra of ['sla', 'lead', 'sessão', 'reengaj', 'null', 'uuid']) {
      expect(texto).not.toContain(palavra);
    }
  });

  it('sem link, omite a linha do link em vez de mandar um quebrado', () => {
    const texto = textoLeadParado({ ...base, url: '' });

    expect(texto).not.toContain('Inbox:');
    expect(texto).not.toContain('http');
    expect(texto).toContain('Maria Souza');
  });

  it('contato sem telefone não deixa um travessão solto', () => {
    const texto = textoLeadParado({ ...base, telefone: null });

    expect(texto).not.toContain('—');
    expect(texto).toContain('Maria Souza');
  });
});
