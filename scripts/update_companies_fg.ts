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
  'Falkenberg': 'Halland',
  'Sollefteå': 'Västernorrland',
  'Linköping': 'Östergötland',
  'Östersund': 'Jämtland',
  'Uddevalla': 'Västra Götaland',
  'Degerfors': 'Örebro län',
  'Simrishamn': 'Skåne',
  'Lotorp': 'Östergötland',
  'Ulricehamn': 'Västra Götaland',
  'Vallentuna': 'Stockholm',
  'Jönköping': 'Jönköpings län',
  'Gislaved': 'Jönköpings län',
  'Bredaryd': 'Jönköpings län',
  'Torshälla': 'Västmanland',
  'Floda': 'Västra Götaland',
  'Upplands-Bro': 'Stockholm',
  'Vårgårda': 'Västra Götaland',
  'Norrköping': 'Östergötland',
  'Knivsta': 'Uppsala',
  'Fagersta': 'Västmanland', 
  'Tumba': 'Stockholm',
  'Bromma': 'Stockholm',
  'Göteborg': 'Västra Götaland'
};

interface CompanyData {
  id: string;
  name: string;
  description: string;
  description_sv: string;
}

async function updateFGCompanies() {
  try {
    console.log('Processing F-G Companies data...\n');

    // Read and parse CSV file
    const csvContent = readFileSync('attached_assets/FG-Companies-eng-swe_1753886353076.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    }) as CompanyData[];

    console.log(`Found ${records.length} companies to process\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateLog: string[] = [];

    for (const record of records) {
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
              if (record.description.includes(city) || record.description_sv.includes(city)) {
                location = city;
                region = regionName;
                break;
              }
            }
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

    console.log('\n=== F-G Companies Update Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`✗ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${records.length}`);

    if (updateLog.length > 0) {
      console.log('\n=== Detailed Update Log ===');
      updateLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show sample of updated companies
    if (updatedCount > 0) {
      console.log('\n=== Sample Updated Companies ===');
      const sampleCompanies = await db.query.companies.findMany({
        where: eq(schema.companies.id, records[0].id),
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
    console.error('Error processing F-G companies:', error);
  } finally {
    await pool.end();
  }
}

updateFGCompanies();