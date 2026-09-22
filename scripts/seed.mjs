#!/usr/bin/env node
/**
 * Apply the development seed (supabase/seed/seed.sql) against DATABASE_URL.
 * Idempotent. DEVELOPMENT DATA ONLY — do not run against a live store you have
 * already populated with real products.
 *
 * Usage: DATABASE_URL=postgres://... node scripts/seed.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set. See .env.example.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  const sql = readFileSync(join(__dirname, '..', 'supabase', 'seed', 'seed.sql'), 'utf8');
  await client.query(sql);
  console.log('Seed applied.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => client.end());
