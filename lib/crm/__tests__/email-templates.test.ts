import { describe, it, expect } from 'vitest';
import { passwordResetEmail } from '@/lib/email/templates';

/**
 * O nome do usuário vem do cadastro, que é campo livre. Interpolar campo livre
 * em HTML é exatamente onde nasce injeção — e num e-mail o estrago sai do
 * sistema junto com a mensagem.
 */

describe('passwordResetEmail', () => {
  it('o codigo aparece no assunto, no html e no texto', () => {
    const { subject, html, text } = passwordResetEmail('048213', 'Marcio Araujo');

    expect(subject).toContain('048213');
    expect(html).toContain('048213');
    expect(text).toContain('048213');
  });

  it('a versao texto existe de fato: e o que aparece em cliente sem html', () => {
    const { text } = passwordResetEmail('123456', 'Marcio');

    expect(text.length).toBeGreaterThan(60);
    expect(text).not.toContain('<');
  });

  it('escapa o nome antes de po-lo no html', () => {
    const { html } = passwordResetEmail('123456', '<script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('usa so o primeiro nome na saudacao', () => {
    const { html } = passwordResetEmail('123456', 'Ana Paula Ribeiro');
    expect(html).toContain('Olá, Ana.');
  });

  it('nome vazio nao produz saudacao quebrada', () => {
    const { html, text } = passwordResetEmail('123456', '   ');

    expect(html).toContain('Olá, você.');
    expect(text).not.toContain('Olá, !');
  });
});
