import { describe, it, expect } from 'vitest';
import {
  generateContractModel,
  generateSignatureAuditHash,
  DEFAULT_CONTRACT_CLAUSES,
} from '../contract-generator';

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
    expect(contract.clauses).toHaveLength(DEFAULT_CONTRACT_CLAUSES.length);
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
