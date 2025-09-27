import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

interface CSVCompany {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function importSwedishDescriptions() {
  console.log("Importing Swedish descriptions from companies_export.csv...");
  
  const updates: CSVCompany[] = [];
  
  console.log('Reading CSV file...');
  
  const parser = createReadStream('companies_export.csv')
    .pipe(parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true
    }));

  for await (const record of parser) {
    // Use description_sv if available, otherwise use description
    const swedishDescription = record.description_sv || record.description;
    
    // Skip if no Swedish description
    if (!swedishDescription || swedishDescription.trim() === '') {
      console.log(`Skipping ${record.name} - no Swedish description`);
      continue;
    }

    updates.push({
      id: record.id,
      name: record.name,
      description: record.description,
      description_sv: swedishDescription
    });
  }

  console.log(`Found ${updates.length} companies with Swedish descriptions`);

  // Update companies in database
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const update of updates) {
    try {
      // Try to find by ID first, then by name
      let existingCompany;
      
      if (update.id) {
        existingCompany = await db
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(eq(companies.id, update.id))
          .limit(1);
      }
      
      // If not found by ID, try by name
      if (!existingCompany || existingCompany.length === 0) {
        existingCompany = await db
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(eq(companies.name, update.name))
          .limit(1);
      }

      if (existingCompany && existingCompany.length > 0) {
        // Update with Swedish description
        await db
          .update(companies)
          .set({
            description: update.description_sv, // Use Swedish as main description
            description_sv: update.description_sv
          })
          .where(eq(companies.id, existingCompany[0].id));

        updated++;
        if (updated % 50 === 0) {
          console.log(`✓ Updated ${updated} companies...`);
        }
      } else {
        notFound++;
        console.log(`✗ Not found: ${update.name} (ID: ${update.id})`);
      }
    } catch (error) {
      errors++;
      console.error(`Error updating ${update.name}:`, error);
    }
  }

  console.log(`\nImport complete:`);
  console.log(`- Updated: ${updated} companies`);
  console.log(`- Not found: ${notFound} companies`);
  console.log(`- Errors: ${errors} companies`);
  console.log(`- Total processed: ${updates.length} companies`);
  
  // Show a few examples
  console.log(`\nSample updated companies:`);
  const sampleCompanies = await db
    .select({ name: companies.name, description: companies.description })
    .from(companies)
    .where(eq(companies.name, "A Lundgren Smide AB"))
    .limit(3);
    
  sampleCompanies.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`${company.description?.substring(0, 100)}...`);
  });
}

importSwedishDescriptions().catch(console.error);
