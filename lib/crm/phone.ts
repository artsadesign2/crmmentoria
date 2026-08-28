/**
 * Normalização de telefone para uso como chave natural do contato.
 *
 * O mesmo cliente chega por caminhos diferentes — digitado à mão no CRM,
 * vindo do webhook do WhatsApp como JID, colado de uma planilha. Sem uma forma
 * canônica, `(11) 98765-4321` e `5511987654321` viram dois contatos distintos
 * e o histórico da conversa se parte em dois.
 *
 * A forma canônica é E.164 sem o "+": apenas dígitos, com DDI.
 */

const DDI_BR = '55';

/** Comprimentos válidos de um número nacional brasileiro: DDD + 8 ou 9 dígitos. */
const BR_NACIONAL = [10, 11];

/**
 * Converte qualquer grafia para dígitos com DDI.
 *
 * Números com 10 ou 11 dígitos são tratados como brasileiros sem DDI e ganham
 * o 55 — é o caso da digitação manual no Brasil, de longe o mais comum aqui.
 *
 * A ambiguidade real: `+1 415 555 0123` também tem 11 dígitos, e virar
 * `5514155550123` seria um número inexistente. O `+` inicial resolve — ele
 * declara que o DDI já está presente, então o número passa intacto.
 */
export function normalizePhone(raw: string): string {
  const texto = (raw ?? '').trim();
  const digits = texto.replace(/\D/g, '');
  if (!digits) return '';

  // Já veio em E.164: o DDI está declarado, não há o que inferir.
  if (texto.startsWith('+')) return digits;

  if (BR_NACIONAL.includes(digits.length)) {
    return `${DDI_BR}${digits}`;
  }

  return digits;
}

/**
 * Formata para exibição na interface. Só reconhece o padrão brasileiro;
 * qualquer outro volta como veio, em vez de sair mal formatado.
 */
export function formatPhoneBr(e164: string): string {
  const digits = (e164 ?? '').replace(/\D/g, '');
  if (!digits.startsWith(DDI_BR)) return e164 ?? '';

  const nacional = digits.slice(DDI_BR.length);
  if (!BR_NACIONAL.includes(nacional.length)) return e164;

  const ddd = nacional.slice(0, 2);
  const numero = nacional.slice(2);
  const meio = numero.length === 9 ? numero.slice(0, 5) : numero.slice(0, 4);
  const fim = numero.length === 9 ? numero.slice(5) : numero.slice(4);

  return `(${ddd}) ${meio}-${fim}`;
}

/** JID do WhatsApp (`5511987654321@s.whatsapp.net`) para a forma canônica. */
export function phoneFromWhatsAppJid(jid: string): string {
  return normalizePhone((jid ?? '').split('@')[0] ?? '');
}

/**
 * Se dois números são a mesma pessoa.
 *
 * Existe por causa do nono dígito. O mesmo celular aparece como
 * `5511987654321` e como `551187654321` dependendo de quem escreveu o cadastro
 * e de como o WhatsApp devolveu o JID, e a comparação literal diria que são
 * duas pessoas.
 *
 * A tolerância vale **só** para números brasileiros. Fora do Brasil, "mesmo DDD
 * e mesmos 8 últimos dígitos" não quer dizer nada, e um falso positivo aqui é
 * caro: quem chama isto trata número interno como mensagem a descartar, então
 * confundir um cliente com um atendente faria a mensagem do cliente sumir.
 */
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizePhone(a ?? '');
  const y = normalizePhone(b ?? '');

  if (!x || !y) return false;
  if (x === y) return true;

  const cx = chaveBr(x);
  const cy = chaveBr(y);

  return cx !== null && cx === cy;
}

/** DDD + os 8 dígitos finais, ou `null` quando o número não é brasileiro. */
function chaveBr(e164: string): string | null {
  if (!e164.startsWith(DDI_BR)) return null;

  const nacional = e164.slice(DDI_BR.length);
  if (!BR_NACIONAL.includes(nacional.length)) return null;

  return nacional.slice(0, 2) + nacional.slice(2).slice(-8);
}
