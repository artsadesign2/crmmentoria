import crypto from 'crypto';
import {
  ContractTemplateConfig,
  DEFAULT_CONTRACT_TEMPLATE,
  getStoredContractTemplate,
  interpolateContractTemplate,
} from './contract-template';

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
  clausesText?: string;
  pdfReferenceUrl?: string;
  pdfReferenceName?: string;
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
 * Divide o texto do contrato em blocos/cláusulas organizados para exibição
 */
export function splitContractClauses(text: string): string[] {
  if (!text) return DEFAULT_CONTRACT_CLAUSES;
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  return blocks.length > 0 ? blocks : [text];
}

/**
 * Gera os dados consolidados do contrato
 */
export function generateContractModel(
  params: {
    clientName: string;
    clientDoc?: string;
    clientEmail: string;
    clientPhone?: string;
    clientAddress?: string;
    companyName?: string;
    specialty?: string;
    programName?: string;
    durationMonths?: number;
    value: number;
    paymentMethod?: string;
    startDate?: string;
  },
  customTemplate?: ContractTemplateConfig
): ContractDetails {
  const contractNumber = `RKT-CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const template = customTemplate || getStoredContractTemplate() || DEFAULT_CONTRACT_TEMPLATE;

  const startDateStr = params.startDate || new Date().toLocaleDateString('pt-BR');

  const interpolatedText = interpolateContractTemplate(template.clausesText, {
    nomeMentorado: params.clientName,
    documento: params.clientDoc || '000.000.000-00',
    email: params.clientEmail,
    telefone: params.clientPhone || '',
    endereco: params.clientAddress || 'Endereço Comercial / Residencial',
    empresaCliente: params.companyName || 'Empresa do Mentorado',
    especialidade: params.specialty || 'Negócios & Estratégia',
    programaMentoria: params.programName || 'Mentoria Rocket Scale High-Ticket',
    valorTotal: params.value,
    duracaoMeses: params.durationMonths || 6,
    formaPagamento: params.paymentMethod || 'Pix / Cartão de Crédito via Gateway Seguro',
    dataInicio: startDateStr,
    razaoSocialContratada: template.contractorName,
    cnpjContratada: template.contractorDocument,
    enderecoContratada: template.contractorAddress,
  });

  const clausesList = splitContractClauses(interpolatedText);

  return {
    contractNumber,
    title: template.title || 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MENTORIA EXECUTIVA & ACELERAÇÃO',
    mentorProgram: params.programName || 'Mentoria Rocket Scale High-Ticket',
    durationMonths: params.durationMonths || 6,
    totalValue: params.value,
    paymentMethod: params.paymentMethod || 'Pix / Cartão de Crédito via Gateway Seguro',
    startDate: startDateStr,
    contractor: {
      name: template.contractorName || 'ROCKET CLUB GESTÃO & CONSULTORIA LTDA',
      document: template.contractorDocument || '48.912.345/0001-89',
      email: template.contractorEmail || 'contratos@rocketclub.com.br',
      phone: template.contractorPhone || '(11) 99530-2672',
      address: template.contractorAddress || 'Av. Paulista, 1000 - São Paulo/SP',
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
    clauses: clausesList,
    clausesText: interpolatedText,
    pdfReferenceUrl: template.pdfReferenceUrl,
    pdfReferenceName: template.pdfReferenceName,
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

