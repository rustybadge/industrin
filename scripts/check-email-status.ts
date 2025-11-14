import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function checkEmailStatus() {
  try {
    console.log('Checking email status...\n');

    const companies = await db.query.companies.findMany({
      where: isNotNull(schema.companies.contactEmail),
      columns: {
        name: true,
        contactEmail: true
      },
      limit: 20
    });

    console.log(`Companies with non-null emails: ${companies.length}`);
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}: ${company.contactEmail}`);
    });

    const allCompanies = await db.query.companies.findMany({
      columns: {
        contactEmail: true
      }
    });

    const stats = {
      total: allCompanies.length,
      withEmails: allCompanies.filter(c => c.contactEmail && c.contactEmail !== '').length,
      withoutEmails: allCompanies.filter(c => !c.contactEmail || c.contactEmail === '').length,
    };

    console.log('\n=== Email Statistics ===');
    console.log(`Total companies: ${stats.total}`);
    console.log(`Companies with emails: ${stats.withEmails}`);
    console.log(`Companies without emails: ${stats.withoutEmails}`);

  } catch (error) {
    console.error('Error checking email status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkEmailStatus();



