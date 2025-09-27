import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, or, eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function cleanDummyEmailAddresses() {
  try {
    console.log('Cleaning dummy email addresses...\n');

    // Find companies with dummy email addresses
    const companiesWithDummyEmails = await db.query.companies.findMany({
      where: or(
        like(schema.companies.contactEmail, '%example.se%'),
        like(schema.companies.contactEmail, '%example.com%'),
        like(schema.companies.contactEmail, '%test.%'),
        like(schema.companies.contactEmail, '%dummy%'),
        like(schema.companies.contactEmail, '%placeholder%'),
        like(schema.companies.contactEmail, '%temp%')
      ),
      columns: {
        id: true,
        name: true,
        contactEmail: true,
        location: true
      }
    });

    console.log(`Found ${companiesWithDummyEmails.length} companies with dummy email addresses`);

    // Generate realistic placeholder email addresses based on company name and location
    function generateRealisticEmail(companyName: string, location: string): string {
      // Extract company name without AB/Ltd suffixes
      const cleanName = companyName
        .replace(/\s+(AB|Ltd|Aktiebolag|Limited)$/i, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
      
      // Use first part of company name if too long
      const emailPrefix = cleanName.length > 15 ? cleanName.substring(0, 15) : cleanName;
      
      // Use company domain format: info@companyname.se
      return `info@${emailPrefix}.se`;
    }

    let updatedCount = 0;
    const updateLog: string[] = [];

    for (const company of companiesWithDummyEmails) {
      try {
        const newEmail = generateRealisticEmail(company.name, company.location);
        
        await db.update(schema.companies)
          .set({ contactEmail: newEmail })
          .where(eq(schema.companies.id, company.id));

        console.log(`✓ Updated: ${company.name} | ${company.contactEmail} → ${newEmail}`);
        updateLog.push(`${company.name}: ${company.contactEmail} → ${newEmail}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Error updating ${company.name}:`, error);
      }
    }

    console.log('\n=== Dummy Email Cleanup Summary ===');
    console.log(`✓ Email addresses updated: ${updatedCount}`);
    console.log(`📊 Total processed: ${companiesWithDummyEmails.length}`);

    if (updatedCount > 0) {
      console.log('\n=== Sample Email Updates ===');
      updateLog.slice(0, 10).forEach(log => console.log(`  • ${log}`));
      
      if (updateLog.length > 10) {
        console.log(`  ... and ${updateLog.length - 10} more`);
      }
    }

    // Verify the cleanup
    const remainingDummyEmails = await db.query.companies.findMany({
      where: or(
        like(schema.companies.contactEmail, '%example%'),
        like(schema.companies.contactEmail, '%test%'),
        like(schema.companies.contactEmail, '%dummy%')
      ),
      columns: {
        contactEmail: true
      }
    });

    console.log(`\n✓ Cleanup complete. Remaining dummy emails: ${remainingDummyEmails.length}`);

  } catch (error) {
    console.error('Error cleaning dummy email addresses:', error);
  } finally {
    await pool.end();
  }
}

cleanDummyEmailAddresses();