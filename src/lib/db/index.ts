import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment or build-time fallback
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

// Create postgres.js client with connection pooling settings
// suitable for serverless environments (Vercel)
const client = postgres(connectionString, {
  max: 1, // Serverless: use 1 connection per function invocation
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout connecting after 10 seconds
});

// Create Drizzle ORM instance with full schema for relational queries
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export { schema };
