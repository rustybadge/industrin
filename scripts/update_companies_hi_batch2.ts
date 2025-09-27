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
  'Iggesund': 'Gävleborg',
  'Stockholm': 'Stockholm',
  'Rättvik': 'Dalarna',
  'Vikingstad': 'Östergötland',
  'Ljungby': 'Kronobergs län',
  'Eslöv': 'Skåne',
  'Anderstorp': 'Jönköpings län',
  'Halmstad': 'Halland',
  'Linköping': 'Östergötland',
  'Ekshärad': 'Värmland',
  'Eskilstuna': 'Södermanland',
  'Hestra': 'Jönköpings län',
  'Heby': 'Uppsala',
  'Borås': 'Västra Götaland',
  'Göteborg': 'Västra Götaland',
  'Växjö': 'Kronobergs län'
};

interface CompanyData {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateHIBatch2Companies() {
  try {
    console.log('Processing H-I Companies Batch 2 data...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/HI-Companies_eng_swe_REPLIT_1753889636850.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    }) as CompanyData[];

    // Remove duplicates based on ID (there appear to be some duplicate entries)
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
          if (record.name.includes('Borins') && record.description.includes('Iggesund')) {
            location = 'Iggesund';
            region = 'Gävleborg';
          } else if (record.name.includes('HARALD PIHL')) {
            location = 'Stockholm';
            region = 'Stockholm';
          } else if (record.name.includes('HDIT') && record.description.includes('Rättvik')) {
            location = 'Rättvik';
            region = 'Dalarna';
          } else if (record.name.includes('HEKTOR') && record.description.includes('Vikingstad')) {
            location = 'Vikingstad';
            region = 'Östergötland';
          } else if (record.name.includes('HENJO') && record.description.includes('Ljungby')) {
            location = 'Ljungby';
            region = 'Kronobergs län';
          } else if (record.name.includes('HJ Mek') && record.description.includes('1968')) {
            location = 'Eslöv';
            region = 'Skåne';
          } else if (record.name.includes('HUGMA') && record.description.includes('Anderstorp')) {
            location = 'Anderstorp';
            region = 'Jönköpings län';
          } else if (record.name.includes('HYBE') && record.description.includes('Halmstad')) {
            location = 'Halmstad';
            region = 'Halland';
          } else if (record.name.includes('HaMi') && record.description.includes('Linköping')) {
            location = 'Linköping';
            region = 'Östergötland';
          } else if (record.name.includes('Hagfors') && record.description.includes('Ekshärad')) {
            location = 'Ekshärad';
            region = 'Värmland';
          } else if (record.name.includes('Halitec') && record.description.includes('Eskilstuna')) {
            location = 'Eskilstuna';
            region = 'Södermanland';
          } else if (record.name.includes('Hestra')) {
            location = 'Hestra';
            region = 'Jönköpings län';
          } else if (record.name.includes('Halmstads')) {
            location = 'Halmstad';
            region = 'Halland';
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

    console.log('\n=== H-I Companies Batch 2 Update Summary ===');
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
    console.error('Error processing H-I companies batch 2:', error);
  } finally {
    await pool.end();
  }
}

updateHIBatch2Companies();