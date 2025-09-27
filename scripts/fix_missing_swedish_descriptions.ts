import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface CompanyData {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function fixMissingSwedishDescriptions() {
  try {
    console.log('Fixing missing Swedish descriptions from L-M batch...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/LM-Companies_eng_swe_REPLIT_1753915133902.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    }) as CompanyData[];

    console.log(`Found ${records.length} companies in CSV\n`);

    let fixedCount = 0;
    let notFoundCount = 0;
    let alreadyHasSwedishCount = 0;
    const fixLog: string[] = [];

    for (const record of records) {
      try {
        // Skip if no Swedish description in CSV
        if (!record.description_sv || record.description_sv.trim() === '') {
          continue;
        }

        // Find existing company by ID
        const existingCompany = await db.query.companies.findFirst({
          where: eq(schema.companies.id, record.id)
        });

        if (existingCompany) {
          // Check if Swedish description is missing or empty
          if (!existingCompany.descriptionSv || existingCompany.descriptionSv.trim() === '') {
            // Update with Swedish description
            await db.update(schema.companies)
              .set({
                descriptionSv: record.description_sv
              })
              .where(eq(schema.companies.id, record.id));

            console.log(`✓ Fixed: ${record.name}`);
            fixLog.push(`${record.name} - Added missing Swedish description`);
            fixedCount++;
          } else {
            console.log(`→ Already has Swedish: ${record.name}`);
            alreadyHasSwedishCount++;
          }
        } else {
          console.log(`✗ Not found in database: ${record.name} (ID: ${record.id})`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${record.name}:`, error);
      }
    }

    console.log('\n=== Swedish Description Fix Summary ===');
    console.log(`✓ Companies fixed: ${fixedCount}`);
    console.log(`→ Already had Swedish: ${alreadyHasSwedishCount}`);
    console.log(`✗ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${records.length}`);

    if (fixLog.length > 0) {
      console.log('\n=== Fix Log ===');
      fixLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show verification of some fixed companies
    if (fixedCount > 0) {
      console.log('\n=== Verification - Sample Fixed Companies ===');
      const sampleCompanies = await db.query.companies.findMany({
        where: eq(schema.companies.id, records[0].id),
        limit: 3
      });
      
      sampleCompanies.forEach(company => {
        console.log(`${company.name} (${company.location})`);
        console.log(`  English: ${company.description?.substring(0, 80)}...`);
        console.log(`  Swedish: ${company.descriptionSv?.substring(0, 80)}...`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error fixing Swedish descriptions:', error);
  } finally {
    await pool.end();
  }
}

fixMissingSwedishDescriptions();