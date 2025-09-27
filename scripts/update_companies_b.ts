import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { companies } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface CompanyUpdate {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateCompaniesFromCSV() {
  const updates: CompanyUpdate[] = [];
  
  console.log('Reading CSV file...');
  
  const parser = createReadStream('attached_assets/companies_B_ENG_SWE_1753815413745.csv')
    .pipe(parse({
      delimiter: ';',
      columns: true,
      skip_empty_lines: true
    }));

  for await (const record of parser) {
    // Skip if either description is "not available" or "inte tillgänglig"
    if (record.description === 'not available' || record.description_sv === 'inte tillgänglig') {
      console.log(`Skipping ${record.name} - descriptions not available`);
      continue;
    }

    updates.push({
      id: record.id,
      name: record.name,
      description: record.description,
      description_sv: record.description_sv
    });
  }

  console.log(`Found ${updates.length} companies to update`);

  // Update companies in database
  let updated = 0;
  let notFound = 0;

  for (const update of updates) {
    try {
      const result = await db
        .update(companies)
        .set({
          description: update.description,
          description_sv: update.description_sv
        })
        .where(eq(companies.id, update.id))
        .returning({ id: companies.id, name: companies.name });

      if (result.length > 0) {
        updated++;
        console.log(`✓ Updated: ${update.name}`);
      } else {
        notFound++;
        console.log(`✗ Not found: ${update.name} (ID: ${update.id})`);
      }
    } catch (error) {
      console.error(`Error updating ${update.name}:`, error);
    }
  }

  console.log(`\nUpdate complete:`);
  console.log(`- Updated: ${updated} companies`);
  console.log(`- Not found: ${notFound} companies`);
  console.log(`- Total processed: ${updates.length} companies`);
}

updateCompaniesFromCSV().catch(console.error);