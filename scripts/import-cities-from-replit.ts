import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

interface CSVCompany {
  id: string;
  name: string;
  city: string;
}

async function importCitiesFromReplit() {
  console.log("Importing city names from companies_cities_export.csv...");
  
  const updates: CSVCompany[] = [];
  
  console.log('Reading CSV file...');
  
  const parser = createReadStream('companies_cities_export.csv')
    .pipe(parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true
    }));

  for await (const record of parser) {
    if (record.city && record.city.trim() !== '') {
      updates.push({
        id: record.id,
        name: record.name,
        city: record.city.trim()
      });
    }
  }

  console.log(`Found ${updates.length} companies with city data`);

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
        // Update with city name
        await db
          .update(companies)
          .set({
            city: update.city
          })
          .where(eq(companies.id, existingCompany[0].id));

        updated++;
        if (updated % 100 === 0) {
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
    .select({ name: companies.name, city: companies.city })
    .from(companies)
    .where(eq(companies.name, "A Lundgren Smide AB"))
    .limit(3);
    
  sampleCompanies.forEach(company => {
    console.log(`${company.name}: ${company.city}`);
  });
  
  // Also check how many companies now have city data vs "Sverige"
  const cityStats = await db.execute(`
    SELECT 
      COUNT(*) as total_companies,
      COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as companies_with_city,
      COUNT(CASE WHEN location = 'Sverige' THEN 1 END) as companies_showing_sverige
    FROM companies
  `);
  
  console.log(`\nFinal statistics:`);
  console.log(`- Total companies: ${cityStats.rows[0].total_companies}`);
  console.log(`- Companies with city data: ${cityStats.rows[0].companies_with_city}`);
  console.log(`- Companies still showing "Sverige": ${cityStats.rows[0].companies_showing_sverige}`);
}

importCitiesFromReplit().catch(console.error);
