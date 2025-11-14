import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, ilike } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function deleteCompany() {
  try {
    const companyName = "Cargoservice OÜ";
    
    console.log(`Searching for company: "${companyName}"...\n`);
    
    // First, find the company
    const company = await db.query.companies.findFirst({
      where: ilike(schema.companies.name, companyName),
      columns: {
        id: true,
        name: true,
        slug: true
      }
    });
    
    if (!company) {
      console.log(`❌ Company "${companyName}" not found in database.`);
      return;
    }
    
    console.log(`Found company:`);
    console.log(`  ID: ${company.id}`);
    console.log(`  Name: ${company.name}`);
    console.log(`  Slug: ${company.slug}`);
    console.log(`\nDeleting company...`);
    
    // Delete the company
    await db.delete(schema.companies)
      .where(eq(schema.companies.id, company.id));
    
    console.log(`✅ Successfully deleted "${companyName}" from the database.`);
    
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

deleteCompany();



