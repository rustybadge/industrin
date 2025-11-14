import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, or, eq, isNotNull, and } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function removeExampleEmails() {
  try {
    console.log('Finding and removing placeholder emails (e.g., info@example.se)...\n');

    // Find all companies with example placeholder emails
    // Look for patterns like: info@example.se, contact@example.se, etc.
    const placeholderPatterns = [
      like(schema.companies.contactEmail, '%@example.se'),
      like(schema.companies.contactEmail, '%@example.com'),
      like(schema.companies.contactEmail, '%@example.net'),
      like(schema.companies.contactEmail, '%@example.org'),
    ];

    const companiesWithPlaceholderEmails = await db.query.companies.findMany({
      where: and(
        isNotNull(schema.companies.contactEmail),
        or(...placeholderPatterns)
      ),
      columns: {
        id: true,
        name: true,
        contactEmail: true
      }
    });

    console.log(`Found ${companiesWithPlaceholderEmails.length} companies with placeholder emails:\n`);

    if (companiesWithPlaceholderEmails.length > 0) {
      // Show first 10 as examples
      companiesWithPlaceholderEmails.slice(0, 10).forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}: ${company.contactEmail}`);
      });

      if (companiesWithPlaceholderEmails.length > 10) {
        console.log(`... and ${companiesWithPlaceholderEmails.length - 10} more`);
      }

      console.log(`\nRemoving placeholder emails...`);

      let removedCount = 0;
      for (const company of companiesWithPlaceholderEmails) {
        await db.update(schema.companies)
          .set({ contactEmail: null })
          .where(eq(schema.companies.id, company.id));
        removedCount++;
      }

      console.log(`✓ Removed ${removedCount} placeholder emails (set to NULL)\n`);
    } else {
      console.log('No placeholder emails found.\n');
    }

    // Final statistics
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

    console.log('=== Final Email Statistics ===');
    console.log(`Total companies: ${stats.total}`);
    console.log(`Companies with emails: ${stats.withEmails}`);
    console.log(`Companies without emails (will show "E-postadress saknas"): ${stats.withoutEmails}`);

  } catch (error) {
    console.error('Error removing placeholder emails:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

removeExampleEmails();

