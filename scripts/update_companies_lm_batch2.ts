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

// City to region mapping for Swedish companies
const cityRegionMapping: Record<string, string> = {
  'Fjärdhundra': 'Uppsala län',
  'Enköping': 'Uppsala län',
  'Ljungby': 'Kronobergs län',
  'Köping': 'Västmanland',
  'Gnarp': 'Gävleborg',
  'Bollnäs': 'Gävleborg',
  'Luleå': 'Norrbotten',
  'Laholm': 'Halland',
  'Landsbro': 'Värmland',
  'Östersund': 'Jämtland',
  'Lökeberg': 'Västra Götaland',
  'Kungälv': 'Västra Götaland',
  'Göteborg': 'Västra Götaland',
  'Skara': 'Västra Götaland',
  'Vara': 'Västra Götaland',
  'Ludvika': 'Dalarna',
  'Dalstorp': 'Västra Götaland',
  'Charlottenberg': 'Värmland',
  'Åsele': 'Västerbotten',
  'Askim': 'Västra Götaland',
  'Matfors': 'Västernorrland',
  'Surahammar': 'Västmanland',
  'Kvidinge': 'Skåne',
  'Hallstahammar': 'Västmanland',
  'Merlänna': 'Södermanland',
  'Strängnäs': 'Södermanland',
  'Stockholm': 'Stockholm',
  'Malmö': 'Skåne',
  'Helsingborg': 'Skåne'
};

interface CompanyData {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateLMCompaniesBatch2() {
  try {
    console.log('Processing L-M Companies Batch 2 data...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/LM-Companies_eng_swe_REPLIT_1753915133902.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    }) as CompanyData[];

    // Remove duplicates based on ID
    const uniqueRecords = records.filter((record, index, arr) => 
      arr.findIndex(r => r.id === record.id) === index
    );

    console.log(`Found ${records.length} total companies, ${uniqueRecords.length} unique companies to process\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedDuplicates = 0;
    const updateLog: string[] = [];

    for (const record of uniqueRecords) {
      try {
        // Skip entries with "not available" descriptions
        if (record.description === 'not available' || record.description_sv === 'inte tillgänglig') {
          console.log(`⚠️  Skipping ${record.name} - no description available`);
          continue;
        }

        // Find existing company by ID
        const existingCompany = await db.query.companies.findFirst({
          where: eq(schema.companies.id, record.id)
        });

        if (existingCompany) {
          // Extract location from company name or use existing location
          let location = existingCompany.location;
          let region = existingCompany.region;

          // Try to extract location from description if not already set properly
          if (!location || location === 'Stockholm' && !record.name.includes('Stockholm')) {
            // Look for city names in the descriptions
            for (const [city, regionName] of Object.entries(cityRegionMapping)) {
              if (record.description.includes(city) || record.description_sv.includes(city) || record.name.includes(city)) {
                location = city;
                region = regionName;
                break;
              }
            }
          }

          // Special case handling for location extraction from name/description
          if (record.description.includes('Fjärdhundra') || record.description.includes('Enköping')) {
            location = 'Enköping';
            region = 'Uppsala län';
          } else if (record.description.includes('Ljungby')) {
            location = 'Ljungby';
            region = 'Kronobergs län';
          } else if (record.description.includes('Köping')) {
            location = 'Köping';
            region = 'Västmanland';
          } else if (record.description.includes('Gnarp')) {
            location = 'Gnarp';
            region = 'Gävleborg';
          } else if (record.description.includes('Bollnäs')) {
            location = 'Bollnäs';
            region = 'Gävleborg';
          } else if (record.description.includes('Luleå')) {
            location = 'Luleå';
            region = 'Norrbotten';
          } else if (record.description.includes('Laholm')) {
            location = 'Laholm';
            region = 'Halland';
          } else if (record.description.includes('Landsbro')) {
            location = 'Landsbro';
            region = 'Värmland';
          } else if (record.description.includes('Östersund')) {
            location = 'Östersund';
            region = 'Jämtland';
          } else if (record.description.includes('Lökeberg') || record.description.includes('Kungälv')) {
            location = 'Kungälv';
            region = 'Västra Götaland';
          } else if (record.description.includes('Skara') || record.description.includes('Vara')) {
            location = 'Skara';
            region = 'Västra Götaland';
          } else if (record.description.includes('Ludvika')) {
            location = 'Ludvika';
            region = 'Dalarna';
          } else if (record.description.includes('Dalstorp')) {
            location = 'Dalstorp';
            region = 'Västra Götaland';
          } else if (record.description.includes('Charlottenberg')) {
            location = 'Charlottenberg';
            region = 'Värmland';
          } else if (record.description.includes('Åsele')) {
            location = 'Åsele';
            region = 'Västerbotten';
          } else if (record.description.includes('Askim')) {
            location = 'Göteborg';
            region = 'Västra Götaland';
          } else if (record.description.includes('Matfors')) {
            location = 'Matfors';
            region = 'Västernorrland';
          } else if (record.description.includes('Surahammar')) {
            location = 'Surahammar';
            region = 'Västmanland';
          } else if (record.description.includes('Kvidinge')) {
            location = 'Kvidinge';
            region = 'Skåne';
          } else if (record.description.includes('Hallstahammar')) {
            location = 'Hallstahammar';
            region = 'Västmanland';
          } else if (record.description.includes('Merlänna') || record.description.includes('Strängnäs')) {
            location = 'Strängnäs';
            region = 'Södermanland';
          }

          // Update company with authentic bilingual descriptions
          await db.update(schema.companies)
            .set({
              description: record.description,
              descriptionSv: record.description_sv,
              location: location,
              region: region
            })
            .where(eq(schema.companies.id, record.id));

          console.log(`✓ Updated: ${record.name} (${location})`);
          updateLog.push(`${record.name} - Added bilingual descriptions, location: ${location}`);
          updatedCount++;
        } else {
          console.log(`✗ Not found in database: ${record.name} (ID: ${record.id})`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${record.name}:`, error);
      }
    }

    if (records.length > uniqueRecords.length) {
      skippedDuplicates = records.length - uniqueRecords.length;
      console.log(`\n⚠️  Skipped ${skippedDuplicates} duplicate entries`);
    }

    console.log('\n=== L-M Companies Batch 2 Update Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`✗ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${uniqueRecords.length}`);
    if (skippedDuplicates > 0) {
      console.log(`⚠️  Duplicates skipped: ${skippedDuplicates}`);
    }

    if (updateLog.length > 0) {
      console.log('\n=== Detailed Update Log ===');
      updateLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show sample of updated companies
    if (updatedCount > 0) {
      console.log('\n=== Sample Updated Companies ===');
      const sampleCompanies = await db.query.companies.findMany({
        where: eq(schema.companies.id, uniqueRecords[0].id),
        limit: 3
      });
      
      sampleCompanies.forEach(company => {
        console.log(`${company.name} (${company.location}, ${company.region})`);
        console.log(`  English: ${company.description?.substring(0, 100)}...`);
        console.log(`  Swedish: ${company.descriptionSv?.substring(0, 100)}...`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error processing L-M companies batch 2:', error);
  } finally {
    await pool.end();
  }
}

updateLMCompaniesBatch2();