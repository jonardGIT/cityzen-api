import '../env.js';
import postgres, { type Sql } from 'postgres';

declare global {
  var __sql__: Sql | undefined;
}

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured');
  }

  return connectionString;
}

function createSqlClient(): Sql {
  return postgres(requireDatabaseUrl(), {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });
}

const sql = globalThis.__sql__ ?? createSqlClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__sql__ = sql;
}

export default sql;
