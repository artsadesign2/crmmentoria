import { describe, it, expect } from 'vitest';
import {
  generateContractModel,
  generateSignatureAuditHash,
  DEFAULT_CONTRACT_CLAUSES,
  splitContractClauses,
} from '../contract-generator';
import {
  interpolateContractTemplate,
  DEFAULT_CONTRACT_TEMPLATE,
} from '../contract-template';

describe('Contract Generator & Audit Hash', () => {
  it('should generate a valid contract model with default clauses and party details', () => {
    const contract = generateContractModel({
      clientName: 'Carlos Silva',
      clientDoc: '123.456.789-00',
      clientEmail: 'carlos@empresa.com',
      clientPhone: '(11) 98888-7777',
      clientAddress: 'Av. Brigadeiro Faria Lima, 2000, SP',
      programName: 'Mentoria Scale High-Ticket',
      durationMonths: 6,
      value: 15000,
      paymentMethod: 'Pix Parcelado',
    });

    expect(contract.contractNumber).toMatch(/^RKT-CTR-\d{4}-\d{4}$/);
    expect(contract.title).toBe('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MENTORIA EXECUTIVA & ACELERAÇÃO');
    expect(contract.mentorProgram).toBe('Mentoria Scale High-Ticket');
    expect(contract.totalValue).toBe(15000);
    expect(contract.contractor.name).toBe('ROCKET CLUB GESTÃO & CONSULTORIA LTDA');
    expect(contract.contractee.name).toBe('Carlos Silva');
    expect(contract.contractee.document).toBe('123.456.789-00');
    expect(contract.contractee.email).toBe('carlos@empresa.com');
    expect(contract.clauses && contract.clauses.length).toBeGreaterThan(0);
  });

  it('should interpolate template tags with custom mentorado data correctly', () => {
    const customTemplate = {
      title: 'TERMO DE PARCERIA EXECUTIVA HOMOLOGADO',
      contractorName: 'MINHA EMPRESA DE CONSULTORIA LTDA',
      contractorDocument: '11.222.333/0001-44',
      contractorEmail: 'contato@minhaempresa.com',
      contractorPhone: '(11) 99999-0000',
      contractorAddress: 'Rua Bela Cintra, 500 - SP',
      contractorRepresentative: 'Ana Paula Diretora',
      clausesText: 'CLÁUSULA 1: O cliente {{NOME_MENTORADO}} (Doc: {{CPF_CNPJ}}) contrata {{PROGRAMA_MENTORIA}} no valor de {{VALOR_TOTAL}} por {{DURACAO_MESES}} meses.',
    };

    const contract = generateContractModel(
      {
        clientName: 'Juliana Ferreira',
        clientDoc: '987.654.321-99',
        clientEmail: 'juliana@tech.com',
        value: 24000,
        durationMonths: 12,
        programName: 'Black Mentorship Pro',
      },
      customTemplate
    );

    expect(contract.title).toBe('TERMO DE PARCERIA EXECUTIVA HOMOLOGADO');
    expect(contract.contractor.name).toBe('MINHA EMPRESA DE CONSULTORIA LTDA');
    expect(contract.contractor.document).toBe('11.222.333/0001-44');
    expect(contract.clausesText).toContain('Juliana Ferreira');
    expect(contract.clausesText).toContain('987.654.321-99');
    expect(contract.clausesText).toContain('Black Mentorship Pro');
    expect(contract.clausesText).toContain('R$ 24.000,00');
    expect(contract.clausesText).toContain('12 meses');
  });

  it('should split contract text into separate clauses correctly', () => {
    const raw = `CLÁUSULA 1 - OBJETO\nTexto do objeto.\n\nCLÁUSULA 2 - VALOR\nTexto do valor.`;
    const clauses = splitContractClauses(raw);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toContain('CLÁUSULA 1');
    expect(clauses[1]).toContain('CLÁUSULA 2');
  });

  it('should generate a consistent and unique SHA-256 audit hash', () => {
    const hash1 = generateSignatureAuditHash(
      'RKT-CTR-2026-1001',
      'carlos@empresa.com',
      '2026-09-28T14:00:00Z',
      '187.12.34.56'
    );

    const hash2 = generateSignatureAuditHash(
      'RKT-CTR-2026-1001',
      'carlos@empresa.com',
      '2026-09-28T14:00:00Z',
      '187.12.34.56'
    );

    const differentHash = generateSignatureAuditHash(
      'RKT-CTR-2026-1002',
      'carlos@empresa.com',
      '2026-09-28T14:00:00Z',
      '187.12.34.56'
    );

    expect(hash1).toHaveLength(64); // SHA-256 is 64 hex characters
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(differentHash);
  });
});

