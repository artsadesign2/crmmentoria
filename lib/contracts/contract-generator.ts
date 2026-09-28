import crypto from 'crypto';

export interface ContractParty {
  name: string;
  document: string; // CPF ou CNPJ
  email: string;
  phone?: string;
  address?: string;
  role: 'CONTRATANTE' | 'CONTRATADA';
}

export interface ContractDetails {
  contractNumber: string;
  title: string;
  mentorProgram: string;
  durationMonths: number;
  totalValue: number;
  paymentMethod: string;
  startDate: string;
  contractor: ContractParty;
  contractee: ContractParty;
  clauses?: string[];
}

export interface SignedContractMetadata {
  contractId: string;
  signedAt: string;
  signerName: string;
  signerDocument: string;
  signerEmail: string;
  signatureImageBase64?: string;
  ipAddress: string;
  userAgent: string;
  hashAuditSha256: string;
}

export const DEFAULT_CONTRACT_CLAUSES = [
  'CLÁUSULA 1ª - DO OBJETO: O presente instrumento tem por objeto a prestação de serviços de mentoria executiva, consultoria estratégica e capacitação empresarial pelo programa especificado.',
  'CLÁUSULA 2ª - DOS ENTREGÁVEIS: A CONTRATADA fornecerá acesso à plataforma Rocket Club, encontros de alinhamento 1-on-1, acesso à Rocket Academy, modelos operacionais (SOPs) e suporte do mentor master.',
  'CLÁUSULA 3ª - DO INVESTIMENTO & PAGAMENTO: Pela prestação dos serviços, a CONTRATANTE pagará à CONTRATADA o valor ajustado neste termo, mediante a forma de pagamento selecionada.',
  'CLÁUSULA 4ª - DA CONFIDENCIALIDADE: As partes comprometem-se a manter total sigilo sobre quaisquer dados operacionais, financeiros, listas de clientes e estratégias compartilhadas durante os encontros.',
  'CLÁUSULA 5ª - DA VIGÊNCIA & RESCISÃO: O presente contrato vige pelo prazo estipulado a contar da assinatura digital, podendo ser renovado mediante termo aditivo.',
  'CLÁUSULA 6ª - DA VALIDADE DA ASSINATURA ELETRÔNICA: As partes reconhecem a plena validade jurídica e eficácia probatória deste documento eletrônico nos termos da legislação vigente.',
];

/**
 * Gera os dados consolidados do contrato
 */
export function generateContractModel(params: {
  clientName: string;
  clientDoc?: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  programName?: string;
  durationMonths?: number;
  value: number;
  paymentMethod?: string;
}): ContractDetails {
  const contractNumber = `RKT-CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    contractNumber,
    title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MENTORIA EXECUTIVA & ACELERAÇÃO',
    mentorProgram: params.programName || 'Mentoria Rocket Scale High-Ticket',
    durationMonths: params.durationMonths || 6,
    totalValue: params.value,
    paymentMethod: params.paymentMethod || 'Pix / Cartão de Crédito via Gateway Seguro',
    startDate: new Date().toLocaleDateString('pt-BR'),
    contractor: {
      name: 'ROCKET CLUB GESTÃO & CONSULTORIA LTDA',
      document: '48.912.345/0001-89',
      email: 'contratos@rocketclub.com.br',
      phone: '(11) 99530-2672',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
      role: 'CONTRATADA',
    },
    contractee: {
      name: params.clientName,
      document: params.clientDoc || '000.000.000-00',
      email: params.clientEmail,
      phone: params.clientPhone || '',
      address: params.clientAddress || 'Endereço Comercial',
      role: 'CONTRATANTE',
    },
    clauses: DEFAULT_CONTRACT_CLAUSES,
  };
}

/**
 * Gera o carimbo criptográfico SHA-256 de integridade e auditoria da assinatura
 */
export function generateSignatureAuditHash(
  contractId: string,
  signerEmail: string,
  timestamp: string,
  ipAddress: string
): string {
  const payload = `${contractId}|${signerEmail}|${timestamp}|${ipAddress}|ROCKET-CLUB-LEGAL-INTEGRITY`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
