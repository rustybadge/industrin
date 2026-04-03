import { config } from 'dotenv';
config();
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const result = await sql`SELECT COUNT(*) as count FROM companies`;
console.log('Total companies:', result[0].count);
