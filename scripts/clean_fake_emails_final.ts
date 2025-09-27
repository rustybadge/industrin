import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, and, or, eq, isNull, ne } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function cleanFakeEmailsFinal() {
  try {
    console.log('Final cleanup of fake email addresses...\n');

    // Set fake emails to NULL for companies without websites (clearly fake)
    const companiesWithFakeEmailsNoWebsite = await db.query.companies.findMany({
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

    console.log(`Setting ${companiesWithFakeEmailsNoWebsite.length} fake emails to NULL (no website)...`);

    let nulledCount = 0;
    for (const company of companiesWithFakeEmailsNoWebsite) {
      await db.update(schema.companies)
        .set({ contactEmail: null })
        .where(eq(schema.companies.id, company.id));
      nulledCount++;
    }

    console.log(`✓ Set ${nulledCount} fake emails to NULL`);

    // Check which companies have websites but still have fake emails
    const companiesWithWebsitesAndFakeEmails = await db.query.companies.findMany({
      where: and(
        like(schema.companies.contactEmail, 'info@%.se'),
        schema.companies.website.ne('')
      ),
      columns: {
        name: true,
        contactEmail: true,
        website: true
      }
    });

    console.log(`\n${companiesWithWebsitesAndFakeEmails.length} companies have websites but fake emails:`);
    companiesWithWebsitesAndFakeEmails.slice(0, 5).forEach(company => {
      console.log(`• ${company.name}: ${company.contactEmail} (${company.website})`);
    });

    // Final statistics
    const stats = await db.query.companies.findMany({
      columns: {
        contactEmail: true,
        website: true
      }
    });

    const finalStats = {
      total: stats.length,
      withEmails: stats.filter(c => c.contactEmail && c.contactEmail !== '').length,
      withNullEmails: stats.filter(c => !c.contactEmail).length,
      withWebsites: stats.filter(c => c.website && c.website !== '').length
    };

    console.log('\n=== Final Contact Data Statistics ===');
    console.log(`Total companies: ${finalStats.total}`);
    console.log(`Companies with emails: ${finalStats.withEmails}`);
    console.log(`Companies with NULL emails: ${finalStats.withNullEmails}`);
    console.log(`Companies with websites: ${finalStats.withWebsites}`);

  } catch (error) {
    console.error('Error in final cleanup:', error);
  } finally {
    await pool.end();
  }
}

cleanFakeEmailsFinal();