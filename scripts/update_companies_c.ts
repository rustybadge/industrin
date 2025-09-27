import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import fs from 'fs';
import { parse } from 'csv-parse/sync';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface CSVCompany {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateCompanies() {
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('attached_assets/C-Companies_eng_swe_I_CAN_ADD_THISINREPLIT_1753875177538.csv', 'utf-8');
    
    // Parse CSV with semicolon delimiter
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true
    }) as CSVCompany[];

    console.log(`Starting to update ${records.length} C-companies from CSV file...`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const company of records) {
      try {
        // Find the company by ID
        const existingCompany = await db.query.companies.findFirst({
          where: eq(schema.companies.id, company.id)
        });

        if (existingCompany) {
          // Update the company with new descriptions
          await db.update(schema.companies)
            .set({
              description: company.description,
              description_sv: company.description_sv,
              // Keep the name in case it was updated
              name: company.name
            })
            .where(eq(schema.companies.id, company.id));

          console.log(`✓ Updated: ${company.name}`);
          updatedCount++;
        } else {
          console.log(`⚠ Company not found: ${company.name} (ID: ${company.id})`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`✗ Error updating ${company.name}:`, error);
      }
    }

    console.log('\n=== C-Companies Update Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`⚠ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${records.length}`);

    // Show a few examples of updated companies
    console.log('\n=== Sample C-Company Updates ===');
    const sampleUpdated = records.slice(0, 3);
    for (const company of sampleUpdated) {
      console.log(`\n${company.name}:`);
      console.log(`  English: ${company.description.substring(0, 100)}...`);
      console.log(`  Swedish: ${company.description_sv.substring(0, 100)}...`);
    }

  } catch (error) {
    console.error('Error updating C-companies:', error);
  } finally {
    await pool.end();
  }
}

updateCompanies();