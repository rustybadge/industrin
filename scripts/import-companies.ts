import { readFileSync } from 'fs';
import { db } from '../server/db.js';
import { companies, type InsertCompany } from '../shared/schema.js';
import { nanoid } from 'nanoid';

interface CompanyImportData {
  name: string;
  slug?: string;
  description: string;
  categories: string[];
  region: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  country?: string;
}

// Map cities to Swedish regions
const cityToRegion: { [key: string]: string } = {
  // Stockholm region
  'Stockholm': 'Stockholm',
  'Nacka': 'Stockholm', 
  'Älvsjö': 'Stockholm',
  'Sollentuna': 'Stockholm',
  'Solna': 'Stockholm',
  
  // Västra Götaland
  'Göteborg': 'Västra Götaland',
  'Alingsås': 'Västra Götaland',
  'Borås': 'Västra Götaland',
  'Trollhättan': 'Västra Götaland',
  'Uddevalla': 'Västra Götaland',
  'Mölndal': 'Västra Götaland',
  'Partille': 'Västra Götaland',
  'Härryda': 'Västra Götaland',
  
  // Skåne
  'Malmö': 'Skåne',
  'Helsingborg': 'Skåne',
  'Lund': 'Skåne',
  'Kristianstad': 'Skåne',
  'Landskrona': 'Skåne',
  'Trelleborg': 'Skåne',
  'Höganäs': 'Skåne',
  'Arlöv': 'Skåne',
  'Bjärnum': 'Skåne',
  'Halmstad': 'Skåne',
  
  // Värmland
  'Karlstad': 'Värmland',
  'Hammarö': 'Värmland',
  
  // Västmanland
  'Västerås': 'Västmanland',
  'Bålsta': 'Västmanland',
  
  // Other regions
  'Mariestad': 'Västra Götaland',
  'Nässjö': 'Jönköpings län',
  'Skellefteå': 'Västerbotten',
  'Växjö': 'Kronobergs län',
  'Umeå': 'Västerbotten',
  'Horndal': 'Gävleborg',
  'Avesta': 'Dalarna',
  'Jönköping': 'Jönköpings län',
  'Blomstermåla': 'Kalmar län',
  'Lammhult': 'Kronobergs län',
  'Ekeby': 'Skåne',
  'Onsala': 'Halland',
  'Falun': 'Dalarna',
  'Gislaved': 'Jönköpings län',
  'Smögen': 'Västra Götaland',
  'Brämhult': 'Västra Götaland',
  'Värnamo': 'Jönköpings län',
  'Södertälje': 'Stockholm',
  'Urshult': 'Kronobergs län'
};

function mapCityToRegion(city: string): string {
  if (!city) return 'Övrigt';
  
  // Clean up city name
  const cleanCity = city.replace(/^\d+\s*/, '') // Remove postal codes
                       .replace(/\n.*/, '') // Remove line breaks and everything after
                       .trim();
  
  return cityToRegion[cleanCity] || 'Övrigt';
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function importCompanies(filePath: string) {
  try {
    console.log(`Reading companies from ${filePath}...`);
    
    const fileContent = readFileSync(filePath, 'utf-8');
    const companiesData: CompanyImportData[] = JSON.parse(fileContent);
    
    console.log(`Found ${companiesData.length} companies to import`);
    
    const companiesToInsert: InsertCompany[] = companiesData
      .filter(company => company.country === 'Sverige' || !company.country) // Only Swedish companies
      .map((company) => ({
        id: nanoid(),
        name: company.name,
        slug: company.slug || generateSlug(company.name),
        description: company.description || `${company.name} - industriföretag specialiserat inom service och reparationer.`,
        categories: company.categories.length > 0 ? company.categories : ['Service, Reparation & Underhåll'], // Default category if none provided
        region: company.region || mapCityToRegion(company.city || ''),
        location: `${company.city || ''}, Sverige`.trim().replace(/^,\s*/, '') || 'Sverige', // Required location field
        contactEmail: company.email || 'info@example.se', // Required email field with fallback
        phone: company.phone || '',
        website: company.website || '',
        address: company.address || '',
        postalCode: company.postalCode?.replace(/\n.*/, '') || '', // Clean postal codes
        city: company.city || '',
        logoUrl: company.logo || '',
      }));
    
    // Check for existing companies and filter out duplicates
    const existingSlugs = await db.select({ slug: companies.slug }).from(companies);
    const existingSlugSet = new Set(existingSlugs.map(c => c.slug));
    
    const newCompanies = companiesToInsert.filter(company => !existingSlugSet.has(company.slug));
    const duplicatesSkipped = companiesToInsert.length - newCompanies.length;
    
    if (duplicatesSkipped > 0) {
      console.log(`Skipping ${duplicatesSkipped} duplicate companies (already exist in database)`);
    }
    
    if (newCompanies.length === 0) {
      console.log('No new companies to import - all companies already exist in database');
      return;
    }
    
    console.log(`Importing ${newCompanies.length} new companies...`);
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < newCompanies.length; i += batchSize) {
      const batch = newCompanies.slice(i, i + batchSize);
      
      try {
        await db.insert(companies).values(batch);
        imported += batch.length;
        console.log(`Imported ${imported}/${newCompanies.length} new companies...`);
      } catch (error) {
        console.error(`Error importing batch ${i / batchSize + 1}:`, error);
        // Continue with next batch
      }
    }
    
    console.log(`✅ Successfully imported ${imported} companies!`);
    
    // Show summary of regions and categories
    const regions = [...new Set(companiesToInsert.map(c => c.region))];
    const allCategories = companiesToInsert.flatMap(c => c.categories);
    const categories = [...new Set(allCategories)];
    
    console.log(`\n📊 Import Summary:`);
    console.log(`Regions: ${regions.length} (${regions.join(', ')})`);
    console.log(`Categories: ${categories.length} (${categories.join(', ')})`);
    
  } catch (error) {
    console.error('❌ Error importing companies:', error);
    process.exit(1);
  }
}

// Run the import if file path is provided
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: tsx scripts/import-companies.ts <path-to-json-file>');
  process.exit(1);
}

importCompanies(filePath).then(() => {
  console.log('Import completed!');
  process.exit(0);
});