import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please add it to your .env.local file. ' +
    'You can find it in your Supabase project settings under Database > Connection string.'
  );
}

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
