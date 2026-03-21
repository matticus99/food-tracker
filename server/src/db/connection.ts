import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// URL-encode password if it contains special characters (e.g. & in password)
let connectionString = rawUrl;
try {
  new URL(rawUrl);
} catch {
  const m = rawUrl.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.+)(@.+)$/);
  if (m) connectionString = m[1]! + encodeURIComponent(m[2]!) + m[3]!;
}

// Connection for queries (pooled)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

export const db = drizzle(queryClient, { schema });
export { queryClient };
