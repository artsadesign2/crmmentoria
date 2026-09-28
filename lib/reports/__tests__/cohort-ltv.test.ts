import { describe, it, expect } from 'vitest';
import { generateCohortAnalysis, exportCohortToCSV } from '../cohort-ltv';

describe('Cohort Analysis & LTV Engine', () => {
  it('should generate valid cohort matrix and key executive metrics', () => {
    const data = generateCohortAnalysis();

    expect(data.cohorts.length).toBeGreaterThan(0);
    expect(data.averageLtv).toBeGreaterThan(0);
    expect(data.averageCac).toBeGreaterThan(0);
    expect(data.ltvToCacRatio).toBeGreaterThan(1);
    expect(data.renewalRate).toBeGreaterThan(50);
    expect(data.averageLifetimeMonths).toBeGreaterThan(6);

    const firstCohort = data.cohorts[0];
    expect(firstCohort.retention.m0).toBe(100);
    expect(firstCohort.initialMentees).toBeGreaterThan(0);
  });

  it('should format CSV export correctly with headers and rows', () => {
    const data = generateCohortAnalysis();
    const csv = exportCohortToCSV(data);

    expect(csv).toContain('Safra (Cohort)');
    expect(csv).toContain('Mês 0 (%)');
    expect(csv).toContain('MÉTRICAS EXECUTIVAS GERAIS');
    expect(csv).toContain('LTV Médio');
    expect(csv).toContain('Ratio LTV/CAC');
  });
});
