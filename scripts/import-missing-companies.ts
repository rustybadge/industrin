import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from "../server/db.js";
import { companies, type InsertCompany } from "../shared/schema.js";
import { nanoid } from 'nanoid';

interface CSVCompany {
  id: string;
  name: string;
  description: string;
  description_sv?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Extract city from description (common pattern: "grundades YYYY i CITY")
function extractCity(description: string): string | null {
  const match = description.match(/i\s+([A-ZÅÄÖ][a-zåäö\s]+?)(?:\s+och|\.|,|$)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

// Simple region mapping based on common cities
function mapCityToRegion(city: string | null): string {
  if (!city) return 'Sverige';
  
  const cityLower = city.toLowerCase();
  
  // Stockholm region
  if (cityLower.includes('stockholm') || cityLower.includes('tyresö') || 
      cityLower.includes('nacka') || cityLower.includes('solna') ||
      cityLower.includes('sollentuna')) {
    return 'Stockholm';
  }
  
  // Västra Götaland
  if (cityLower.includes('göteborg') || cityLower.includes('alingsås') ||
      cityLower.includes('borås') || cityLower.includes('trollhättan')) {
    return 'Västra Götaland';
  }
  
  // Skåne
  if (cityLower.includes('malmö') || cityLower.includes('helsingborg') ||
      cityLower.includes('lund') || cityLower.includes('kristianstad')) {
    return 'Skåne';
  }
  
  // Other common patterns
  if (cityLower.includes('uppsala')) return 'Uppsala län';
  if (cityLower.includes('örebro')) return 'Örebro län';
  if (cityLower.includes('västerås')) return 'Västmanlands län';
  if (cityLower.includes('linköping') || cityLower.includes('norrköping')) return 'Östergötlands län';
  if (cityLower.includes('jönköping')) return 'Jönköpings län';
  if (cityLower.includes('växjö')) return 'Kronobergs län';
  if (cityLower.includes('kalmar')) return 'Kalmar län';
  if (cityLower.includes('karlstad')) return 'Värmlands län';
  if (cityLower.includes('umeå')) return 'Västerbottens län';
  if (cityLower.includes('luleå') || cityLower.includes('piteå')) return 'Norrbottens län';
  if (cityLower.includes('östersund')) return 'Jämtlands län';
  if (cityLower.includes('sundsvall')) return 'Västernorrlands län';
  if (cityLower.includes('gävle')) return 'Gävleborgs län';
  if (cityLower.includes('halmstad')) return 'Hallands län';
  
  return 'Sverige';
}

async function importMissingCompanies() {
  try {
    console.log("Reading companies_export.csv...");
    const csvContent = readFileSync('companies_export.csv', 'utf-8');
    const csvCompanies: CSVCompany[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    });

    console.log(`Found ${csvCompanies.length} companies in CSV\n`);

    // Get all existing companies from database
    console.log("Checking existing companies in database...");
    const existingCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
    }).from(companies);

    const existingNames = new Set(existingCompanies.map(c => c.name.toLowerCase().trim()));
    const existingSlugs = new Set(existingCompanies.map(c => c.slug));
    const existingIds = new Set(existingCompanies.map(c => c.id));

    console.log(`Found ${existingCompanies.length} existing companies\n`);

    // Find missing companies
    const toImport: InsertCompany[] = [];
    let skipped = 0;
    let duplicateNames = 0;

    for (const csvCompany of csvCompanies) {
      const normalizedName = csvCompany.name.toLowerCase().trim();
      
      // Skip if already exists by name
      if (existingNames.has(normalizedName)) {
        skipped++;
        continue;
      }

      // Generate slug and check for conflicts
      let slug = generateSlug(csvCompany.name);
      let slugCounter = 1;
      while (existingSlugs.has(slug)) {
        slug = `${generateSlug(csvCompany.name)}-${slugCounter}`;
        slugCounter++;
      }

      // Extract city and region from description
      const city = extractCity(csvCompany.description || csvCompany.description_sv || '');
      const region = mapCityToRegion(city);
      const location = city ? `${city}, Sverige` : 'Sverige';

      // Use CSV ID if it's not already in use, otherwise generate new one
      let companyId = csvCompany.id;
      if (existingIds.has(companyId) || !companyId || companyId.length < 5) {
        companyId = nanoid();
      }

      toImport.push({
        id: companyId,
        name: csvCompany.name.trim(),
        slug: slug,
        description: csvCompany.description || csvCompany.description_sv || `${csvCompany.name} - industriföretag specialiserat inom service och reparationer.`,
        description_sv: csvCompany.description_sv || csvCompany.description || `${csvCompany.name} - industriföretag specialiserat inom service och reparationer.`,
        categories: ['Service, Reparation & Underhåll'],
        location: location,
        region: region,
        contactEmail: 'info@example.se', // Default email
        city: city || '',
      });
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   CSV companies: ${csvCompanies.length}`);
    console.log(`   Already in database: ${skipped}`);
    console.log(`   To import: ${toImport.length}\n`);

    if (toImport.length === 0) {
      console.log('✅ All companies already exist in database!');
      process.exit(0);
    }

    // Import in batches
    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    console.log(`\nStarting import in batches of ${batchSize}...\n`);

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      
      try {
        await db.insert(companies).values(batch);
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${imported}/${toImport.length} companies`);
      } catch (error: any) {
        errors++;
        console.error(`❌ Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        
        // Try importing one by one if batch fails
        console.log(`   Attempting individual imports for this batch...`);
        for (const company of batch) {
          try {
            await db.insert(companies).values([company]);
            imported++;
          } catch (err: any) {
            console.error(`   Failed: ${company.name} - ${err.message}`);
          }
        }
      }
    }

    console.log(`\n\n✅ Import Complete!`);
    console.log(`   Successfully imported: ${imported}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total companies in database now: ${existingCompanies.length + imported}`);

  } catch (error) {
    console.error("❌ Error importing companies:", error);
    process.exit(1);
  }
  process.exit(0);
}

importMissingCompanies();



