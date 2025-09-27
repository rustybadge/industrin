import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, and, or, eq, isNull, isNotNull } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function cleanFakeEmailsProperly() {
  try {
    console.log('Cleaning fake email addresses properly...\n');

    // Find companies with fake emails but no website (definitely fake)
    const companiesWithFakeEmails = await db.query.companies.findMany({
      where: and(
        like(schema.companies.contactEmail, 'info@%.se'),
        or(
          isNull(schema.companies.website),
          eq(schema.companies.website, '')
        )
      ),
      columns: {
        id: true,
        name: true,
        contactEmail: true
      }
    });

    console.log(`Found ${companiesWithFakeEmails.length} companies with fake emails and no website`);
    console.log('Setting these email addresses to NULL...\n');

    let updatedCount = 0;

    for (const company of companiesWithFakeEmails) {
      try {
        await db.update(schema.companies)
          .set({ contactEmail: null })
          .where(eq(schema.companies.id, company.id));

        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`Progress: ${updatedCount} companies updated...`);
        }
      } catch (error) {
        console.error(`Error updating ${company.name}:`, error);
      }
    }

    console.log(`✓ Cleaned ${updatedCount} fake email addresses`);

    // Keep emails for companies that have websites (might be real)
    const companiesWithWebsitesAndEmails = await db.query.companies.findMany({
      where: and(
        like(schema.companies.contactEmail, 'info@%.se'),
        schema.companies.website.isNotNull()
      ),
      columns: {
        name: true,
        contactEmail: true,
        website: true
      },
      limit: 5
    });

    console.log('\n=== Companies with websites (keeping emails for verification) ===');
    companiesWithWebsitesAndEmails.forEach(company => {
      console.log(`• ${company.name}: ${company.contactEmail} (website: ${company.website})`);
    });

    // Show final email status
    const finalStats = await db.query.companies.findMany({
      columns: {
        contactEmail: true
      }
    });

    const emailStats = {
      total: finalStats.length,
      withEmails: finalStats.filter(c => c.contactEmail && c.contactEmail !== '').length,
      nullEmails: finalStats.filter(c => !c.contactEmail || c.contactEmail === '').length
    };

    console.log('\n=== Final Email Statistics ===');
    console.log(`Total companies: ${emailStats.total}`);
    console.log(`Companies with emails: ${emailStats.withEmails}`);
    console.log(`Companies with NULL emails: ${emailStats.nullEmails}`);

  } catch (error) {
    console.error('Error cleaning fake emails:', error);
  } finally {
    await pool.end();
  }
}

cleanFakeEmailsProperly();