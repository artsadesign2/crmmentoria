import { describe, it, expect } from 'vitest';
import { renderTemplate, placeholdersDesconhecidos } from '@/lib/dispatch/template';

/**
 * O template é resolvido uma vez por destinatário, então cada erro aqui sai
 * multiplicado por toda a lista. Um "Olá {{nome}}" literal chegando a 300
 * pessoas não é um bug que se conserta depois.
 */

describe('renderTemplate', () => {
  it('troca nome e empresa', () => {
    const saida = renderTemplate('Olá {{nome}}, tudo bem na {{empresa}}?', {
      nome: 'Ana Paula',
      empresa: 'Clínica Vida',
    });

    expect(saida).toBe('Olá Ana Paula, tudo bem na Clínica Vida?');
  });

  it('aceita espaco dentro das chaves e maiuscula', () => {
    expect(renderTemplate('Oi {{ NOME }}', { nome: 'Ana', empresa: null })).toBe('Oi Ana');
  });

  it('troca todas as ocorrencias, nao so a primeira', () => {
    expect(renderTemplate('{{nome}}, {{nome}}!', { nome: 'Ana', empresa: null })).toBe('Ana, Ana!');
  });

  it('empresa ausente nao deixa buraco nem espaco duplo', () => {
    const saida = renderTemplate('Olá {{nome}}, da {{empresa}} — tudo certo?', {
      nome: 'Ana',
      empresa: null,
    });

    expect(saida).not.toContain('{{');
    expect(saida).not.toMatch(/ {2}/);
    expect(saida).toContain('Ana');
  });

  it('preserva quebra de linha: e a formatacao da mensagem no WhatsApp', () => {
    const saida = renderTemplate('Oi {{nome}}\n\nSegue o link.', { nome: 'Ana', empresa: null });
    expect(saida).toBe('Oi Ana\n\nSegue o link.');
  });

  it('placeholder desconhecido fica literal, para aparecer na previa', () => {
    // Apagar em silêncio produziria uma frase sem sentido que ninguém revisa.
    // Deixando visível, quem confere a prévia percebe antes de disparar.
    const saida = renderTemplate('Oi {{sobrenome}}', { nome: 'Ana', empresa: null });
    expect(saida).toBe('Oi {{sobrenome}}');
  });

  it('template sem placeholder passa intacto', () => {
    expect(renderTemplate('Promoção até sexta.', { nome: 'Ana', empresa: null })).toBe(
      'Promoção até sexta.'
    );
  });
});

describe('placeholdersDesconhecidos', () => {
  it('lista o que a tela precisa avisar antes do disparo', () => {
    expect(placeholdersDesconhecidos('Oi {{nome}}, {{sobrenome}} da {{empresa}}')).toEqual([
      'sobrenome',
    ]);
  });

  it('sem desconhecidos, lista vazia', () => {
    expect(placeholdersDesconhecidos('Oi {{nome}}')).toEqual([]);
  });

  it('nao repete o mesmo desconhecido duas vezes', () => {
    expect(placeholdersDesconhecidos('{{cpf}} e {{cpf}}')).toEqual(['cpf']);
  });
});
