import { describe, it, expect } from 'vitest';
import { parseEvolutionEvent, type InboundMessage } from '../inbound';

/**
 * O webhook é a única porta pela qual dados de fora entram no banco. Um parser
 * frouxo aqui grava lixo em `messages` para sempre, então cada formato que a
 * Evolution API sabe emitir tem um caso.
 */

const JID = '5511987654321@s.whatsapp.net';

/** Envelope da Evolution com a mensagem já montada. */
function evento(message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    event: 'messages.upsert',
    instance: 'rocket-club-crm',
    data: {
      key: { id: 'MSG-1', remoteJid: JID, fromMe: false },
      pushName: 'Helena',
      messageTimestamp: 1756300000,
      message,
      ...extra,
    },
  };
}

/** Estreita o tipo e falha o teste com mensagem útil se não for MESSAGE. */
function comoMensagem(payload: unknown): InboundMessage {
  const resultado = parseEvolutionEvent(payload);
  if (resultado.kind !== 'MESSAGE') {
    throw new Error(`esperava MESSAGE, veio ${resultado.kind}`);
  }
  return resultado;
}

describe('parseEvolutionEvent — formatos de mensagem', () => {
  it('texto simples vem em `conversation`', () => {
    const m = comoMensagem(evento({ conversation: 'Oi, vi o material' }));

    expect(m.contentType).toBe('TEXT');
    expect(m.content).toBe('Oi, vi o material');
    expect(m.mediaUrl).toBeNull();
  });

  it('texto com citacao ou link vem em `extendedTextMessage`', () => {
    const m = comoMensagem(evento({ extendedTextMessage: { text: 'Segue o link' } }));

    expect(m.contentType).toBe('TEXT');
    expect(m.content).toBe('Segue o link');
  });

  it('imagem preserva a legenda e a url da midia', () => {
    const m = comoMensagem(
      evento({ imageMessage: { caption: 'Print do erro', url: 'https://cdn/img.jpg' } })
    );

    expect(m.contentType).toBe('IMAGE');
    expect(m.content).toBe('Print do erro');
    expect(m.mediaUrl).toBe('https://cdn/img.jpg');
  });

  it('imagem sem legenda recebe rotulo, nao string vazia', () => {
    const m = comoMensagem(evento({ imageMessage: { url: 'https://cdn/img.jpg' } }));

    expect(m.contentType).toBe('IMAGE');
    expect(m.content).toBe('[Imagem]');
  });

  it('video preserva legenda e midia', () => {
    const m = comoMensagem(
      evento({ videoMessage: { caption: 'Olha isso', url: 'https://cdn/v.mp4' } })
    );

    expect(m.contentType).toBe('VIDEO');
    expect(m.content).toBe('Olha isso');
    expect(m.mediaUrl).toBe('https://cdn/v.mp4');
  });

  it('audio vira rotulo; a transcricao e da F4', () => {
    const m = comoMensagem(evento({ audioMessage: { url: 'https://cdn/a.ogg', seconds: 12 } }));

    expect(m.contentType).toBe('AUDIO');
    expect(m.content).toBe('[Mensagem de áudio]');
    expect(m.mediaUrl).toBe('https://cdn/a.ogg');
  });

  it('documento usa o nome do arquivo', () => {
    const m = comoMensagem(
      evento({ documentMessage: { fileName: 'contrato.pdf', url: 'https://cdn/c.pdf' } })
    );

    expect(m.contentType).toBe('DOCUMENT');
    expect(m.content).toBe('[Documento]: contrato.pdf');
    expect(m.mediaUrl).toBe('https://cdn/c.pdf');
  });

  it('documento sem nome nao produz rotulo pela metade', () => {
    const m = comoMensagem(evento({ documentMessage: { url: 'https://cdn/c.pdf' } }));

    expect(m.content).toBe('[Documento]');
  });

  it('figurinha e localizacao tem tipo proprio', () => {
    expect(comoMensagem(evento({ stickerMessage: { url: 'https://cdn/s.webp' } })).contentType).toBe(
      'STICKER'
    );
    expect(
      comoMensagem(evento({ locationMessage: { degreesLatitude: -23, degreesLongitude: -46 } }))
        .contentType
    ).toBe('LOCATION');
  });
});

describe('parseEvolutionEvent — identificacao', () => {
  it('normaliza o telefone a partir do JID', () => {
    expect(comoMensagem(evento({ conversation: 'oi' })).phone).toBe('5511987654321');
  });

  it('preserva o pushName e o id externo', () => {
    const m = comoMensagem(evento({ conversation: 'oi' }));

    expect(m.pushName).toBe('Helena');
    expect(m.externalId).toBe('MSG-1');
  });

  it('pushName vazio vira null, e nao string vazia', () => {
    const m = comoMensagem(evento({ conversation: 'oi' }, { pushName: '   ' }));

    expect(m.pushName).toBeNull();
  });

  it('converte messageTimestamp de segundos para Date', () => {
    const m = comoMensagem(evento({ conversation: 'oi' }));

    expect(m.timestamp.getTime()).toBe(1756300000 * 1000);
  });

  it('sem messageTimestamp usa o instante atual, nao 1970', () => {
    const antes = Date.now();
    const m = comoMensagem(evento({ conversation: 'oi' }, { messageTimestamp: undefined }));

    expect(m.timestamp.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('mensagem enviada pelo aparelho e marcada com fromMe', () => {
    const payload = evento({ conversation: 'respondi pelo celular' });
    payload.data.key.fromMe = true;

    expect(comoMensagem(payload).fromMe).toBe(true);
  });
});

describe('parseEvolutionEvent — o que nao entra', () => {
  it('grupo e descartado: atendimento em grupo e outro produto', () => {
    const payload = evento({ conversation: 'oi' });
    payload.data.key.remoteJid = '120363000000000000@g.us';

    const r = parseEvolutionEvent(payload);
    expect(r.kind).toBe('IGNORED');
    if (r.kind === 'IGNORED') expect(r.reason).toContain('grupo');
  });

  it('status do WhatsApp e descartado', () => {
    const payload = evento({ conversation: 'meu status' });
    payload.data.key.remoteJid = 'status@broadcast';

    expect(parseEvolutionEvent(payload).kind).toBe('IGNORED');
  });

  it('mensagem sem id externo e descartada: nao ha como evitar duplicata', () => {
    const payload = evento({ conversation: 'oi' });
    payload.data.key.id = '';

    const r = parseEvolutionEvent(payload);
    expect(r.kind).toBe('IGNORED');
    if (r.kind === 'IGNORED') expect(r.reason).toContain('identificador');
  });

  it('mensagem sem conteudo reconhecivel e descartada', () => {
    const r = parseEvolutionEvent(evento({ protocolMessage: { type: 'REVOKE' } }));

    expect(r.kind).toBe('IGNORED');
  });

  it('JID sem digitos e descartado', () => {
    const payload = evento({ conversation: 'oi' });
    payload.data.key.remoteJid = '@s.whatsapp.net';

    expect(parseEvolutionEvent(payload).kind).toBe('IGNORED');
  });
});

describe('parseEvolutionEvent — outros eventos', () => {
  it('reconhece connection.update e devolve o estado', () => {
    const r = parseEvolutionEvent({ event: 'connection.update', data: { state: 'open' } });

    expect(r.kind).toBe('CONNECTION');
    if (r.kind === 'CONNECTION') expect(r.state).toBe('open');
  });

  it('reconhece a forma em caixa alta que a Evolution tambem emite', () => {
    expect(parseEvolutionEvent({ event: 'MESSAGES_UPSERT', data: {} }).kind).not.toBe('UNKNOWN');
    expect(parseEvolutionEvent({ event: 'QRCODE_UPDATED' }).kind).toBe('QRCODE');
  });

  it('evento desconhecido e nomeado, para aparecer no log', () => {
    const r = parseEvolutionEvent({ event: 'contacts.update', data: {} });

    expect(r.kind).toBe('UNKNOWN');
    if (r.kind === 'UNKNOWN') expect(r.event).toBe('contacts.update');
  });

  it('payload que nao e objeto nao explode', () => {
    expect(parseEvolutionEvent(null).kind).toBe('UNKNOWN');
    expect(parseEvolutionEvent('texto solto').kind).toBe('UNKNOWN');
    expect(parseEvolutionEvent(undefined).kind).toBe('UNKNOWN');
  });
});
