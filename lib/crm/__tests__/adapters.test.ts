import { describe, it, expect } from 'vitest';
import { dealToLead } from '../adapters';
import type { DealCardDTO } from '../types';

const deal: DealCardDTO = {
  id: 'deal-1',
  contactId: 'contact-1',
  stageId: 'stage-1',
  assignedUserId: 'user-1',
  assignedUserName: 'Marcio Araujo',
  departmentId: null,
  channel: 'WHATSAPP',
  title: 'Mentoria Rocket Club',
  dealValue: 25000.55,
  priority: 'HIGH',
  position: 0,
  lastMessageText: 'Bom dia, quero saber mais sobre a mentoria',
  lastMessageAt: '2026-08-27T11:00:00.000Z',
  reminderAt: null,
  slaDueAt: null,
  totalTasks: 12,
  completedTasks: 1,
  isPrivate: false,
  lostReason: null,
  customFields: { produto: 'Plano Anual', currentRevenue: 'R$ 180.000/mes' },
  contact: {
    id: 'contact-1',
    name: 'Dr. Fernando Albuquerque',
    phone: '5511987654321',
    phoneFormatted: '(11) 98765-4321',
    avatarUrl: null,
    company: 'Clinica Albuquerque',
    tags: [{ id: 'tag-1', name: 'Alta prioridade', colorHex: '#EF4444' }],
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-27T11:00:00.000Z',
};

describe('dealToLead', () => {
  const lead = dealToLead(deal, '1. Novos Leads');

  it('preserva identidade e valor', () => {
    expect(lead.id).toBe('deal-1');
    expect(lead.name).toBe('Dr. Fernando Albuquerque');
    expect(lead.company).toBe('Clinica Albuquerque');
    expect(lead.estimatedValue).toBe(25000.55);
  });

  it('usa o telefone formatado, que e o que o drawer exibe', () => {
    expect(lead.phone).toBe('(11) 98765-4321');
  });

  it('traduz prioridade do vocabulario do CRM para o do Lead', () => {
    expect(lead.priority).toBe('alta');
    expect(dealToLead({ ...deal, priority: 'MEDIUM' }, 'x').priority).toBe('media');
    expect(dealToLead({ ...deal, priority: 'LOW' }, 'x').priority).toBe('baixa');
    expect(dealToLead({ ...deal, priority: 'URGENT' }, 'x').priority).toBe('alta');
  });

  it('traduz canal para a origem do Lead', () => {
    expect(lead.source).toBe('WhatsApp Direct');
    expect(dealToLead({ ...deal, channel: 'INSTAGRAM' }, 'x').source).toBe('Instagram');
  });

  it('promove campos de qualificacao de customFields', () => {
    expect(lead.currentRevenue).toBe('R$ 180.000/mes');
  });

  it('usa o nome da etapa como stage textual, sem inventar enum', () => {
    expect(lead.stage).toBe('novo');
    expect(dealToLead(deal, '5. Ganhos (Convertidos)').stage).toBe('ganho');
    expect(dealToLead(deal, '6. Perdidos').stage).toBe('perdido');
  });

  it('sobrevive a contato sem telefone nem empresa', () => {
    const magro = dealToLead(
      { ...deal, contact: { ...deal.contact, phone: null, phoneFormatted: null, company: null } },
      'x'
    );
    expect(magro.phone).toBe('');
    expect(magro.company).toBe('');
  });
});
