import { describe, it, expect } from 'vitest';
import { avaliarMidia, TAMANHO_MAXIMO_BYTES } from '@/lib/ai/transcribe';

/**
 * A decisão de nem tentar é a parte que precisa ser demonstrável: ela evita
 * mandar 40 MB de vídeo para a Gemini e receber a conta.
 */

describe('avaliarMidia', () => {
  it('aceita os formatos de audio que o WhatsApp usa', () => {
    for (const mime of ['audio/ogg', 'audio/ogg; codecs=opus', 'audio/mpeg', 'audio/mp4', 'audio/wav']) {
      expect(avaliarMidia(mime, 100_000).ok, mime).toBe(true);
    }
  });

  it('recusa o que nao e audio', () => {
    for (const mime of ['video/mp4', 'application/pdf', 'image/jpeg', 'text/plain']) {
      const r = avaliarMidia(mime, 100_000);
      expect(r.ok, mime).toBe(false);
    }
  });

  it('recusa acima do teto, sem chamar a IA', () => {
    const r = avaliarMidia('audio/ogg', TAMANHO_MAXIMO_BYTES + 1);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/grande|tamanho|MB/i);
  });

  it('aceita exatamente no teto', () => {
    expect(avaliarMidia('audio/ogg', TAMANHO_MAXIMO_BYTES).ok).toBe(true);
  });

  it('tamanho desconhecido passa: so o download revela', () => {
    expect(avaliarMidia('audio/ogg', null).ok).toBe(true);
  });

  it('mime desconhecido passa: a Evolution nem sempre informa', () => {
    // Recusar por falta de informação perderia áudio bom. O download em si
    // ainda protege pelo tamanho.
    expect(avaliarMidia(null, 100_000).ok).toBe(true);
  });

  it('arquivo vazio nao vale uma chamada', () => {
    expect(avaliarMidia('audio/ogg', 0).ok).toBe(false);
  });
});
