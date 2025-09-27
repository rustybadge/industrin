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
  'Skurup': 'Skåne',
  'Kallinge': 'Blekinge',
  'Njurunda': 'Västernorrland',
  'Uttran': 'Stockholm',
  'Karlstad': 'Värmland',
  'Angered': 'Västra Götaland',
  'Göteborg': 'Västra Götaland',
  'Partille': 'Västra Götaland',
  'Billesholm': 'Skåne',
  'Åstorp': 'Skåne',
  'Bjuv': 'Skåne',
  'Eslöv': 'Skåne',
  'Kungsängen': 'Stockholm',
  'Sävsjö': 'Jönköpings län',
  'Tyresö': 'Stockholm',
  'Pettersboda': 'Stockholm',
  'Jukkasjärvi': 'Norrbotten',
  'Västerfärnebo': 'Västmanland',
  'Visby': 'Gotland',
  'Häggenås': 'Jämtland',
  'Norrköping': 'Östergötland',
  'Ronneby': 'Blekinge',
  'Sundsbruk': 'Gävleborg',
  'Vännäs': 'Västerbotten',
  'Vännäsby': 'Västerbotten',
  'Sikeå': 'Västerbotten',
  'Örnsköldsvik': 'Västernorrland',
  'Sundsvall': 'Västernorrland',
  'Kramfors': 'Västernorrland',
  'Järbo': 'Gävleborg',
  'Kumla': 'Örebro län',
  'Kiruna': 'Norrbotten',
  'Linköping': 'Östergötland',
  'Katrineholm': 'Södermanland'
};

interface CompanyData {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateJKCompanies() {
  try {
    console.log('Processing J-K Companies data...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/JK-Companies_eng_swe_REPLIT_1753897103644.csv', 'utf-8');
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
          if (record.name.includes('Skurup') || record.description.includes('Skurup')) {
            location = 'Skurup';
            region = 'Skåne';
          } else if (record.name.includes('Kallinge') || record.description.includes('Kallinge')) {
            location = 'Kallinge';
            region = 'Blekinge';
          } else if (record.description.includes('Njurunda')) {
            location = 'Njurunda';
            region = 'Västernorrland';
          } else if (record.description.includes('Uttran')) {
            location = 'Uttran';
            region = 'Stockholm';
          } else if (record.description.includes('Karlstad')) {
            location = 'Karlstad';
            region = 'Värmland';
          } else if (record.description.includes('Angered') || record.description.includes('Göteborg')) {
            location = 'Göteborg';
            region = 'Västra Götaland';
          } else if (record.description.includes('Partille')) {
            location = 'Partille';
            region = 'Västra Götaland';
          } else if (record.description.includes('Billesholm')) {
            location = 'Billesholm';
            region = 'Skåne';
          } else if (record.description.includes('Eslöv')) {
            location = 'Eslöv';
            region = 'Skåne';
          } else if (record.description.includes('Kungsängen')) {
            location = 'Kungsängen';
            region = 'Stockholm';
          } else if (record.description.includes('Sävsjö')) {
            location = 'Sävsjö';
            region = 'Jönköpings län';
          } else if (record.description.includes('Tyresö') || record.description.includes('Pettersboda')) {
            location = 'Tyresö';
            region = 'Stockholm';
          } else if (record.description.includes('Jukkasjärvi')) {
            location = 'Jukkasjärvi';
            region = 'Norrbotten';
          } else if (record.description.includes('Västerfärnebo')) {
            location = 'Västerfärnebo';
            region = 'Västmanland';
          } else if (record.description.includes('Visby')) {
            location = 'Visby';
            region = 'Gotland';
          } else if (record.description.includes('Häggenås')) {
            location = 'Häggenås';
            region = 'Jämtland';
          } else if (record.description.includes('Norrköping')) {
            location = 'Norrköping';
            region = 'Östergötland';
          } else if (record.description.includes('Ronneby')) {
            location = 'Ronneby';
            region = 'Blekinge';
          } else if (record.description.includes('Sundsbruk')) {
            location = 'Sundsbruk';
            region = 'Gävleborg';
          } else if (record.description.includes('Vännäs')) {
            location = 'Vännäs';
            region = 'Västerbotten';
          } else if (record.description.includes('Sundsvall')) {
            location = 'Sundsvall';
            region = 'Västernorrland';
          } else if (record.description.includes('Järbo')) {
            location = 'Järbo';
            region = 'Gävleborg';
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

    console.log('\n=== J-K Companies Update Summary ===');
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
    console.error('Error processing J-K companies:', error);
  } finally {
    await pool.end();
  }
}

updateJKCompanies();