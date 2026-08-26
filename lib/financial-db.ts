import { queryNeon } from './neon-db';
import { Transaction, MOCK_TRANSACTIONS } from './mock-data';

export interface DbTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  date: string;
  dueDate?: string;
  memberId?: string;
  memberName?: string;
  gateway?: 'ASAAS' | 'STRIPE' | 'MANUAL' | 'PIX';
  paymentLink?: string;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  invoiceUrl?: string;
  createdAt?: string;
}

let cachedFinancialData: { data: DbTransaction[]; timestamp: number } | null = null;
const FINANCIAL_CACHE_TTL_MS = 25000;

export function invalidateFinancialCache() {
  cachedFinancialData = null;
}

let tableInitChecked = false;

export async function ensureFinancialTable() {
  if (tableInitChecked) return;
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id VARCHAR(100) PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        type VARCHAR(20) NOT NULL DEFAULT 'INCOME',
        category VARCHAR(100) NOT NULL DEFAULT 'Mensalidade',
        status VARCHAR(30) NOT NULL DEFAULT 'PAID',
        date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        due_date TIMESTAMPTZ,
        member_id VARCHAR(100),
        member_name VARCHAR(255),
        gateway VARCHAR(50) DEFAULT 'MANUAL',
        payment_link TEXT,
        pix_copia_cola TEXT,
        pix_qrcode_base64 TEXT,
        invoice_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    tableInitChecked = true;
  } catch (err) {
    console.error('Error ensuring financial table:', err);
  }
}

export async function fetchAllFinancialTransactions(): Promise<DbTransaction[]> {
  if (cachedFinancialData && Date.now() - cachedFinancialData.timestamp < FINANCIAL_CACHE_TTL_MS) {
    return cachedFinancialData.data;
  }

  await ensureFinancialTable();

  try {
    const rows = await queryNeon<any>(`
      SELECT 
        id,
        description,
        amount::FLOAT as amount,
        type,
        category,
        status,
        date,
        due_date as "dueDate",
        member_id as "memberId",
        member_name as "memberName",
        gateway,
        payment_link as "paymentLink",
        pix_copia_cola as "pixCopiaECola",
        pix_qrcode_base64 as "pixQrCodeBase64",
        invoice_url as "invoiceUrl",
        created_at as "createdAt"
      FROM financial_transactions
      ORDER BY date DESC, created_at DESC
    `);

    if (rows && rows.length > 0) {
      const mapped: DbTransaction[] = rows.map((r: any) => ({
        id: r.id,
        description: r.description || 'Transação Rocket Club',
        amount: typeof r.amount === 'number' ? r.amount : parseFloat(r.amount) || 0,
        type: r.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
        category: r.category || 'Mensalidade',
        status: (['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'].includes(r.status) ? r.status : 'PAID') as any,
        date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
        dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
        memberId: r.memberId || undefined,
        memberName: r.memberName || 'Mentorado Rocket Club',
        gateway: r.gateway || 'MANUAL',
        paymentLink: r.paymentLink || undefined,
        pixCopiaECola: r.pixCopiaECola || undefined,
        pixQrCodeBase64: r.pixQrCodeBase64 || undefined,
        invoiceUrl: r.invoiceUrl || undefined,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));

      cachedFinancialData = {
        data: mapped,
        timestamp: Date.now(),
      };
      return mapped;
    }
  } catch (err) {
    console.error('Failed to fetch financial transactions from DB:', err);
  }

  // Safe fallback to mock transactions if DB is empty or connecting
  const fallbackList: DbTransaction[] = MOCK_TRANSACTIONS.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category,
    status: t.status,
    date: t.date,
    memberName: t.memberName,
    gateway: 'MANUAL',
  }));

  return fallbackList;
}

export async function createFinancialTransaction(data: Partial<DbTransaction>): Promise<DbTransaction> {
  await ensureFinancialTable();
  const id = data.id || `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const description = data.description || 'Mensalidade Mentoria';
  const amount = typeof data.amount === 'number' ? data.amount : 0;
  const type = data.type || 'INCOME';
  const category = data.category || 'Mensalidade';
  const status = data.status || 'PAID';
  const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
  const memberId = data.memberId || null;
  const memberName = data.memberName || null;
  const gateway = data.gateway || 'MANUAL';
  const paymentLink = data.paymentLink || null;
  const pixCopiaECola = data.pixCopiaECola || null;
  const pixQrCodeBase64 = data.pixQrCodeBase64 || null;
  const invoiceUrl = data.invoiceUrl || null;

  await queryNeon(
    `
    INSERT INTO financial_transactions (
      id, description, amount, type, category, status, date, due_date,
      member_id, member_name, gateway, payment_link, pix_copia_cola,
      pix_qrcode_base64, invoice_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `,
    [
      id,
      description,
      amount,
      type,
      category,
      status,
      date,
      dueDate,
      memberId,
      memberName,
      gateway,
      paymentLink,
      pixCopiaECola,
      pixQrCodeBase64,
      invoiceUrl,
    ]
  );

  invalidateFinancialCache();

  return {
    id,
    description,
    amount,
    type,
    category,
    status,
    date,
    dueDate: dueDate || undefined,
    memberId: memberId || undefined,
    memberName: memberName || undefined,
    gateway,
    paymentLink: paymentLink || undefined,
    pixCopiaECola: pixCopiaECola || undefined,
    pixQrCodeBase64: pixQrCodeBase64 || undefined,
    invoiceUrl: invoiceUrl || undefined,
  };
}

export async function updateFinancialTransactionStatus(
  id: string,
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
) {
  await ensureFinancialTable();
  await queryNeon(`UPDATE financial_transactions SET status = $2 WHERE id = $1`, [id, status]);
  invalidateFinancialCache();
}

export async function deleteFinancialTransaction(id: string) {
  await ensureFinancialTable();
  await queryNeon(`DELETE FROM financial_transactions WHERE id = $1`, [id]);
  invalidateFinancialCache();
}
