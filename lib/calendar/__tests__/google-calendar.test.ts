import { describe, it, expect } from 'vitest';
import {
  formatGoogleCalendarDate,
  generateGoogleCalendarUrl,
  createGoogleCalendarBooking,
  checkSlotAvailability,
} from '../google-calendar';

describe('Google Calendar 2-Way Synchronization', () => {
  it('should format dates properly for Google Calendar template links', () => {
    const testDate = new Date('2026-10-15T14:30:00.000Z');
    const formatted = formatGoogleCalendarDate(testDate);
    expect(formatted).toBe('20261015T143000Z');
  });

  it('should generate valid Google Calendar URL with required parameters', () => {
    const url = generateGoogleCalendarUrl({
      title: 'Mentoria 1-on-1: João Silva',
      description: 'Alinhamento de metas de escala',
      startDate: new Date('2026-10-15T14:30:00.000Z'),
      durationMinutes: 45,
      guestEmail: 'joao@empresa.com',
      guestName: 'João Silva',
      meetUrl: 'https://meet.google.com/test-1on1',
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Mentoria+1-on-1%3A+Jo%C3%A3o+Silva');
    expect(url).toContain('add=joao%40empresa.com');
    expect(url).toContain('https%3A%2F%2Fmeet.google.com%2Ftest-1on1');
  });

  it('should create booking with meet link and calendar event link successfully', async () => {
    const result = await createGoogleCalendarBooking({
      title: 'Diagnóstico Estratégico',
      description: 'Sessão 1-on-1',
      startDate: new Date('2026-10-15T10:00:00.000Z'),
      durationMinutes: 45,
      guestEmail: 'cliente@teste.com',
    });

    expect(result.success).toBe(true);
    expect(result.googleCalendarUrl).toBeDefined();
    expect(result.meetUrl).toContain('https://meet.google.com/');
    expect(result.eventId).toBeDefined();
  });

  it('should check slot availability accurately', () => {
    const booked = [
      { date: '2026-10-15', time: '14:00' },
      { date: '2026-10-15', time: '15:30' },
    ];

    expect(checkSlotAvailability(booked, '2026-10-15', '14:00')).toBe(false);
    expect(checkSlotAvailability(booked, '2026-10-15', '16:00')).toBe(true);
    expect(checkSlotAvailability(booked, '2026-10-16', '14:00')).toBe(true);
  });
});
