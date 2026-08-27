import { phoneFromWhatsAppJid } from './phone';

/**
 * Interpretação do webhook da Evolution API.
 *
 * Função pura, sem I/O e sem Prisma, por dois motivos. O primeiro é que esta é
 * a única porta pela qual dados de fora entram no banco: precisa ser
 * demonstrável em teste, e um parser que abre conexão não é. O segundo é que a
 * Evolution muda o formato do payload entre versões — quando mudar, o conserto
 * é neste arquivo e em nenhum outro.
 *
 * A extração de conteúdo vem da versão anterior da rota de webhook, que já
 * sabia ler os seis formatos; aqui ela ganha `contentType`, `mediaUrl` e testes.
 */

export type MessageContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'LOCATION'
  | 'STICKER';

export interface InboundMessage {
  kind: 'MESSAGE';
  /** `key.id` da Evolution. É a chave de idempotência do webhook. */
  externalId: string;
  /** JID completo, guardado em `conversations.external_id`. */
  jid: string;
  /** E.164 sem "+". */
  phone: string;
  /** Nome que o cliente escolheu no aparelho. Nunca sobrescreve nome cadastrado. */
  pushName: string | null;
  /** Verdadeiro quando alguém respondeu pelo celular, fora do sistema. */
  fromMe: boolean;
  contentType: MessageContentType;
  content: string;
  mediaUrl: string | null;
  timestamp: Date;
}

export type InboundEvent =
  | InboundMessage
  | { kind: 'CONNECTION'; state: string }
  | { kind: 'QRCODE' }
  | { kind: 'IGNORED'; reason: string }
  | { kind: 'UNKNOWN'; event: string };

type Dict = Record<string, unknown>;

function isDict(valor: unknown): valor is Dict {
  return typeof valor === 'object' && valor !== null;
}

function dict(origem: unknown, chave: string): Dict | null {
  if (!isDict(origem)) return null;
  const valor = origem[chave];
  return isDict(valor) ? valor : null;
}

function texto(origem: unknown, chave: string): string | null {
  if (!isDict(origem)) return null;
  const valor = origem[chave];
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}

/**
 * `messageTimestamp` chega em segundos, e às vezes como string. Sem ele, o
 * instante atual — um horário aproximado é útil, 1970 não é.
 */
function instante(data: Dict): Date {
  const bruto = data.messageTimestamp;
  const segundos = typeof bruto === 'string' ? Number(bruto) : bruto;

  if (typeof segundos === 'number' && Number.isFinite(segundos) && segundos > 0) {
    return new Date(segundos * 1000);
  }
  return new Date();
}

interface Conteudo {
  contentType: MessageContentType;
  content: string;
  mediaUrl: string | null;
}

/**
 * Ordem importa: `extendedTextMessage` acompanha citações e prévias de link,
 * e um payload pode trazer mais de uma chave. Texto primeiro, mídia depois.
 */
function extrairConteudo(message: Dict | null): Conteudo | null {
  if (!message) return null;

  const conversation = texto(message, 'conversation');
  if (conversation) {
    return { contentType: 'TEXT', content: conversation, mediaUrl: null };
  }

  const estendida = texto(dict(message, 'extendedTextMessage'), 'text');
  if (estendida) {
    return { contentType: 'TEXT', content: estendida, mediaUrl: null };
  }

  const imagem = dict(message, 'imageMessage');
  if (imagem) {
    return {
      contentType: 'IMAGE',
      content: texto(imagem, 'caption') ?? '[Imagem]',
      mediaUrl: texto(imagem, 'url'),
    };
  }

  const video = dict(message, 'videoMessage');
  if (video) {
    return {
      contentType: 'VIDEO',
      content: texto(video, 'caption') ?? '[Vídeo]',
      mediaUrl: texto(video, 'url'),
    };
  }

  const audio = dict(message, 'audioMessage');
  if (audio) {
    // A transcrição é da F4 e vai para a coluna `transcription`, não para cá:
    // o que foi dito e o que a IA entendeu são coisas diferentes.
    return {
      contentType: 'AUDIO',
      content: '[Mensagem de áudio]',
      mediaUrl: texto(audio, 'url'),
    };
  }

  const documento = dict(message, 'documentMessage');
  if (documento) {
    const nome = texto(documento, 'fileName');
    return {
      contentType: 'DOCUMENT',
      content: nome ? `[Documento]: ${nome}` : '[Documento]',
      mediaUrl: texto(documento, 'url'),
    };
  }

  const figurinha = dict(message, 'stickerMessage');
  if (figurinha) {
    return { contentType: 'STICKER', content: '[Figurinha]', mediaUrl: texto(figurinha, 'url') };
  }

  const local = dict(message, 'locationMessage');
  if (local) {
    return { contentType: 'LOCATION', content: '[Localização]', mediaUrl: null };
  }

  // Recibo de leitura, revogação, chamada perdida: eventos de protocolo que não
  // são conversa e não devem virar linha na tabela de mensagens.
  return null;
}

function nomeDoEvento(payload: Dict): string {
  return (texto(payload, 'event') ?? texto(payload, 'type') ?? '').toLowerCase().replace(/_/g, '.');
}

function ignorar(reason: string): InboundEvent {
  return { kind: 'IGNORED', reason };
}

export function parseEvolutionEvent(payload: unknown): InboundEvent {
  if (!isDict(payload)) {
    return { kind: 'UNKNOWN', event: 'payload-nao-e-objeto' };
  }

  const evento = nomeDoEvento(payload);
  const data = dict(payload, 'data') ?? payload;

  if (evento === 'connection.update') {
    return { kind: 'CONNECTION', state: texto(data, 'state') ?? texto(data, 'status') ?? 'unknown' };
  }

  if (evento === 'qrcode.updated') {
    return { kind: 'QRCODE' };
  }

  if (evento !== 'messages.upsert') {
    return { kind: 'UNKNOWN', event: evento || 'sem-evento' };
  }

  const key = dict(data, 'key');
  const jid = texto(key, 'remoteJid') ?? texto(data, 'sender') ?? '';

  if (jid.endsWith('@g.us')) {
    return ignorar(`mensagem de grupo (${jid})`);
  }
  if (jid.startsWith('status@')) {
    return ignorar('status do WhatsApp');
  }

  const phone = phoneFromWhatsAppJid(jid);
  if (!phone) {
    return ignorar(`JID sem número reconhecível (${jid || 'vazio'})`);
  }

  const externalId = texto(key, 'id');
  if (!externalId) {
    // Sem identificador não há como barrar reenvio: o índice único de
    // idempotência é sobre ele. Melhor perder a mensagem do que duplicá-la
    // a cada retentativa da Evolution.
    return ignorar('mensagem sem identificador externo');
  }

  const conteudo = extrairConteudo(dict(data, 'message') ?? dict(data, 'msg'));
  if (!conteudo) {
    return ignorar('evento sem conteúdo de conversa');
  }

  return {
    kind: 'MESSAGE',
    externalId,
    jid,
    phone,
    pushName: texto(data, 'pushName'),
    fromMe: dict(data, 'key')?.fromMe === true,
    timestamp: instante(data),
    ...conteudo,
  };
}
