/**
 * Aplica prisma/migrations/<nome>/migration.sql contra o banco.
 *
 * NÃO usa lib/neon-db.ts de propósito: `queryNeon` captura toda exceção e
 * devolve `[]`, o que faria uma migração falha parecer bem-sucedida. Aqui as
 * falhas precisam interromper a execução, então o executor é próprio e estrito.
 *
 * O endpoint HTTP do Neon aceita uma instrução por requisição, então o arquivo
 * é dividido e executado em sequência. Toda instrução do arquivo é idempotente,
 * de modo que rodar este script mais de uma vez é seguro.
 *
 * Uso: npm run db:migrate <nome-da-migracao>
 */
import fs from 'fs';
import path from 'path';

const MIGRATION = process.argv[2];

if (!MIGRATION || !/^[a-z0-9-]+$/.test(MIGRATION)) {
  console.error('Informe o nome da migracao. Exemplo: npm run db:migrate f1-crm');
  process.exit(1);
}

const SQL_PATH = path.join(import.meta.dirname, 'migrations', MIGRATION, 'migration.sql');

if (!fs.existsSync(SQL_PATH)) {
  console.error(`Migracao nao encontrada: prisma/migrations/${MIGRATION}/migration.sql`);
  process.exit(1);
}

function connectionString(): { host: string; conn: string } {
  const { NEON_HOST, NEON_USER, NEON_PASS, NEON_DB } = process.env;
  if (!NEON_HOST || !NEON_USER || !NEON_PASS) {
    throw new Error(
      'Credenciais NEON_* ausentes. Rode com: npm run db:migrate <nome-da-migracao>'
    );
  }
  return {
    host: NEON_HOST,
    conn: `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/${NEON_DB ?? 'neondb'}?sslmode=require`,
  };
}

/** Executa uma instrução. Diferente de queryNeon, lança em qualquer falha. */
async function execute(sql: string): Promise<void> {
  const { host, conn } = connectionString();

  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Neon-Connection-String': conn,
    },
    body: JSON.stringify({ query: sql, params: [] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { error?: unknown };
  if (data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  }
}

/**
 * Divide o arquivo em instruções. Blocos `DO $$ ... $$;` contêm ponto e vírgula
 * internos, então são tratados como unidade em vez de partidos no `;`.
 */
function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const statements: string[] = [];
  let buffer = '';
  let insideDollarBlock = false;

  for (const chunk of withoutComments.split(';')) {
    buffer += chunk;
    const dollarCount = (chunk.match(/\$\$/g) ?? []).length;
    if (dollarCount % 2 === 1) insideDollarBlock = !insideDollarBlock;

    if (insideDollarBlock) {
      buffer += ';';
      continue;
    }
    const statement = buffer.trim();
    if (statement) statements.push(statement);
    buffer = '';
  }

  return statements;
}

async function main() {
  const statements = splitStatements(fs.readFileSync(SQL_PATH, 'utf8'));
  console.log(`Aplicando ${statements.length} instrucoes de ${MIGRATION}/migration.sql\n`);

  for (const [index, statement] of statements.entries()) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 70);
    process.stdout.write(`  [${String(index + 1).padStart(2, '0')}/${statements.length}] ${label} ... `);
    try {
      await execute(statement);
      console.log('ok');
    } catch (error) {
      console.log('FALHOU');
      console.error(`\nInstrucao ${index + 1} falhou:\n${statement}\n`);
      throw error;
    }
  }

  console.log(`\nMigracao ${MIGRATION} aplicada com sucesso.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
