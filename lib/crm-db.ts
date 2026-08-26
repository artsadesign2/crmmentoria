import { queryNeon } from './neon-db';
import { Lead, MOCK_LEADS } from './mock-data';

let cachedLeadsData: { data: Lead[]; timestamp: number } | null = null;
const LEADS_CACHE_TTL_MS = 25000;

export function invalidateLeadsCache() {
  cachedLeadsData = null;
}

let tableInitChecked = false;

export async function ensureLeadsTable() {
  if (tableInitChecked) return;
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        specialty TEXT,
        email TEXT,
        phone TEXT,
        stage VARCHAR(50) DEFAULT 'NOVO_LEAD',
        estimated_value NUMERIC(12,2) DEFAULT 25000,
        source VARCHAR(50) DEFAULT 'Instagram',
        priority VARCHAR(20) DEFAULT 'alta',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    tableInitChecked = true;
  } catch (err) {
    console.error('Error ensuring crm_leads table:', err);
  }
}

export async function fetchAllLeadsFromDb(): Promise<Lead[]> {
  if (cachedLeadsData && Date.now() - cachedLeadsData.timestamp < LEADS_CACHE_TTL_MS) {
    return cachedLeadsData.data;
  }

  await ensureLeadsTable();

  try {
    const rows = await queryNeon<any>(`
      SELECT 
        id,
        name,
        company,
        specialty,
        email,
        phone,
        stage,
        estimated_value::FLOAT as "estimatedValue",
        source,
        priority,
        notes,
        created_at as "createdAt"
      FROM crm_leads
      ORDER BY created_at DESC
    `);

    if (rows && rows.length > 0) {
      const mapped: Lead[] = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        company: r.company || 'Empresa',
        specialty: r.specialty || 'Empresário',
        email: r.email || '',
        phone: r.phone || '',
        stage: r.stage || 'NOVO_LEAD',
        estimatedValue: typeof r.estimatedValue === 'number' ? r.estimatedValue : 25000,
        source: r.source || 'Instagram',
        priority: r.priority || 'alta',
        notes: r.notes || '',
        lastContact: r.lastContact || '2026-08-20',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));

      cachedLeadsData = {
        data: mapped,
        timestamp: Date.now(),
      };
      return mapped;
    }
  } catch (err) {
    console.error('Failed to fetch leads from DB:', err);
  }

  return MOCK_LEADS;
}

export async function createLeadInDb(data: Partial<Lead>): Promise<Lead> {
  await ensureLeadsTable();
  const id = data.id || `lead-${Date.now()}`;
  const name = data.name || 'Novo Lead';
  const company = data.company || 'Empresa';
  const specialty = data.specialty || 'Empresário';
  const email = data.email || '';
  const phone = data.phone || '';
  const stage = data.stage || 'NOVO_LEAD';
  const estimatedValue = data.estimatedValue || 25000;
  const source = data.source || 'Instagram';
  const priority = data.priority || 'alta';
  const notes = data.notes || '';
  const lastContact = data.lastContact || new Date().toISOString().split('T')[0];

  await queryNeon(
    `
    INSERT INTO crm_leads (
      id, name, company, specialty, email, phone, stage, estimated_value, source, priority, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `,
    [id, name, company, specialty, email, phone, stage, estimatedValue, source, priority, notes]
  );

  invalidateLeadsCache();

  return {
    id,
    name,
    company,
    specialty,
    email,
    phone,
    stage: stage as any,
    estimatedValue,
    source: source as any,
    priority: priority as any,
    notes,
    lastContact,
    createdAt: new Date().toISOString(),
  };
}

export async function updateLeadInDb(id: string, updates: Partial<Lead>) {
  await ensureLeadsTable();
  await queryNeon(
    `
    UPDATE crm_leads
    SET 
      name = COALESCE($2, name),
      company = COALESCE($3, company),
      specialty = COALESCE($4, specialty),
      email = COALESCE($5, email),
      phone = COALESCE($6, phone),
      stage = COALESCE($7, stage),
      estimated_value = COALESCE($8, estimated_value),
      source = COALESCE($9, source),
      priority = COALESCE($10, priority),
      notes = COALESCE($11, notes)
    WHERE id = $1
  `,
    [
      id,
      updates.name || null,
      updates.company || null,
      updates.specialty || null,
      updates.email || null,
      updates.phone || null,
      updates.stage || null,
      updates.estimatedValue || null,
      updates.source || null,
      updates.priority || null,
      updates.notes || null,
    ]
  );

  invalidateLeadsCache();
}

export async function deleteLeadFromDb(id: string) {
  await ensureLeadsTable();
  await queryNeon(`DELETE FROM crm_leads WHERE id = $1`, [id]);
  invalidateLeadsCache();
}
