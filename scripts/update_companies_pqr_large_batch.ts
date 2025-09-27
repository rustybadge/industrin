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

async function updatePQRLargeCompanies() {
  try {
    console.log('Processing large PQR-companies batch...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/PQR_ReplitReady_1753983876456.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    }) as CompanyData[];

    console.log(`Found ${records.length} companies in CSV\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    const updateLog: string[] = [];
    const errorLog: string[] = [];

    for (const record of records) {
      try {
        // Skip empty rows
        if (!record.id || !record.name) {
          console.log(`⏭ Skipping empty row`);
          skippedCount++;
          continue;
        }

        // Skip if no descriptions provided
        if ((!record.description || record.description.trim() === '') && 
            (!record.description_sv || record.description_sv.trim() === '')) {
          console.log(`⏭ Skipping ${record.name} - no descriptions provided`);
          skippedCount++;
          continue;
        }

        // Find existing company by ID
        const existingCompany = await db.query.companies.findFirst({
          where: eq(schema.companies.id, record.id)
        });

        if (existingCompany) {
          // Prepare update data
          const updateData: any = {};
          
          // Add English description if provided
          if (record.description && record.description.trim() !== '') {
            updateData.description = record.description;
          }
          
          // Add Swedish description if provided
          if (record.description_sv && record.description_sv.trim() !== '') {
            updateData.description_sv = record.description_sv;
          }

          // Only update if we have data to update
          if (Object.keys(updateData).length > 0) {
            await db.update(schema.companies)
              .set(updateData)
              .where(eq(schema.companies.id, record.id));

            console.log(`✓ Updated: ${record.name}`);
            const descTypes = [];
            if (updateData.description) descTypes.push('English');
            if (updateData.description_sv) descTypes.push('Swedish');
            updateLog.push(`${record.name} - Added ${descTypes.join(' + ')} descriptions`);
            updatedCount++;
          } else {
            console.log(`⏭ Skipped ${record.name} - no valid descriptions`);
            skippedCount++;
          }
        } else {
          console.log(`✗ Not found in database: ${record.name} (ID: ${record.id})`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${record.name}:`, error);
        errorLog.push(`${record.name}: ${error}`);
      }
    }

    console.log('\n=== Large PQR-Companies Update Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`⏭ Companies skipped: ${skippedCount}`);
    console.log(`✗ Companies not found: ${notFoundCount}`);
    console.log(`❌ Errors encountered: ${errorLog.length}`);
    console.log(`📊 Total processed: ${records.length}`);

    if (errorLog.length > 0) {
      console.log('\n=== Error Log ===');
      errorLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show sample verification of updated companies
    if (updatedCount > 0) {
      console.log('\n=== Verification - Sample Updated Companies ===');
      const sampleCompanies = await db.query.companies.findMany({
        where: eq(schema.companies.id, records.find(r => r.description || r.description_sv)?.id || records[0].id),
        limit: 5
      });
      
      sampleCompanies.forEach(company => {
        console.log(`${company.name} (${company.location})`);
        if (company.description) {
          console.log(`  English: ${company.description.substring(0, 80)}...`);
        }
        if (company.description_sv) {
          console.log(`  Swedish: ${company.description_sv.substring(0, 80)}...`);
        }
        console.log('');
      });
    }

    console.log('\n=== Processing Complete ===');
    console.log(`Database now contains ${updatedCount} additional companies with bilingual descriptions`);

  } catch (error) {
    console.error('Error updating large PQR-companies batch:', error);
  } finally {
    await pool.end();
  }
}

updatePQRLargeCompanies();