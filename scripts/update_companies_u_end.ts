import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import fs from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface ExcelCompany {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateCompanies() {
  try {
    // Read the Excel data
    const excelData: ExcelCompany[] = JSON.parse(
      fs.readFileSync('attached_assets/excel_companies.json', 'utf8')
    );

    console.log(`Starting to update ${excelData.length} companies from Excel file...`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const company of excelData) {
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

    console.log('\n=== Update Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`⚠ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${excelData.length}`);

    // Show a few examples of updated companies
    console.log('\n=== Sample Updates ===');
    const sampleUpdated = excelData.slice(0, 3);
    for (const company of sampleUpdated) {
      console.log(`\n${company.name}:`);
      console.log(`  English: ${company.description.substring(0, 100)}...`);
      console.log(`  Swedish: ${company.description_sv.substring(0, 100)}...`);
    }

  } catch (error) {
    console.error('Error updating companies:', error);
  } finally {
    await pool.end();
  }
}

updateCompanies();