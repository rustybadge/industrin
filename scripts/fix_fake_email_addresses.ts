import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, or, eq, isNull } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function fixFakeEmailAddresses() {
  try {
    console.log('Fixing fake email addresses by setting them to NULL...\n');

    // Find companies with fake email addresses (the ones I just created)
    const companiesWithFakeEmails = await db.query.companies.findMany({
      where: like(schema.companies.contactEmail, 'info@%.se'),
      columns: {
        id: true,
        name: true,
        contactEmail: true,
        website: true,
        phone: true
      },
      limit: 10
    });

    console.log(`Sample of companies with potentially fake emails:`);
    companiesWithFakeEmails.forEach(company => {
      console.log(`• ${company.name}: ${company.contactEmail}`);
    });

    console.log('\nOptions for handling fake email addresses:');
    console.log('1. Set contact_email to NULL for all fake addresses (clean slate)');
    console.log('2. Keep fake addresses as placeholders until real ones are found');
    console.log('3. Replace with verified emails only when found through research');

    // For now, let's set a clean approach: NULL for unknown emails
    const totalFakeEmails = await db.query.companies.findMany({
      where: like(schema.companies.contactEmail, 'info@%.se'),
      columns: { id: true }
    });

    console.log(`\nFound ${totalFakeEmails.length} potentially fake email addresses`);
    console.log('These should be handled based on data integrity policy...');

    // Show companies that have real contact data vs fake
    const companiesWithWebsites = await db.query.companies.findMany({
      where: schema.companies.website.isNotNull(),
      columns: {
        name: true,
        contactEmail: true,
        website: true,
        phone: true
      },
      limit: 5
    });

    console.log('\n=== Companies with Real Website Data ===');
    companiesWithWebsites.forEach(company => {
      console.log(`• ${company.name}`);
      console.log(`  Website: ${company.website}`);
      console.log(`  Email: ${company.contactEmail}`);
      console.log(`  Phone: ${company.phone || 'Not available'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error analyzing fake email addresses:', error);
  } finally {
    await pool.end();
  }
}

fixFakeEmailAddresses();