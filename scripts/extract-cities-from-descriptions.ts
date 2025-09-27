import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq, isNull } from "drizzle-orm";

// Common Swedish cities to extract from descriptions
const swedishCities = [
  'Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping', 'Västerås', 'Örebro', 'Norrköping',
  'Helsingborg', 'Jönköping', 'Umeå', 'Lund', 'Borås', 'Sundsvall', 'Gävle', 'Växjö',
  'Halmstad', 'Karlstad', 'Östersund', 'Trollhättan', 'Luleå', 'Borlänge', 'Kristianstad',
  'Falun', 'Kalmar', 'Huddinge', 'Nyköping', 'Mölndal', 'Södertälje', 'Skellefteå',
  'Karlskrona', 'Eskilstuna', 'Sundbyberg', 'Sollentuna', 'Hässleholm', 'Västerås',
  'Upplands Väsby', 'Lidingö', 'Täby', 'Ängelholm', 'Örnsköldsvik', 'Varberg',
  'Uddevalla', 'Trelleborg', 'Landskrona', 'Kungsbacka', 'Motala', 'Falköping',
  'Arvika', 'Värnamo', 'Kumla', 'Karlskoga', 'Sandviken', 'Köping', 'Katrineholm',
  'Höganäs', 'Mjölby', 'Härnösand', 'Torslanda', 'Tumba', 'Partille', 'Kungsängen',
  'Vallentuna', 'Nacka', 'Sigtuna', 'Bromma', 'Spånga', 'Kista', 'Solna', 'Danderyd',
  'Tyresö', 'Värmdö', 'Österåker', 'Norrtälje', 'Södertälje', 'Nynäshamn', 'Haninge',
  'Huddinge', 'Botkyrka', 'Salem', 'Ekerö', 'Upplands-Bro', 'Vaxholm', 'Österåker'
];

function extractCityFromDescription(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toLowerCase();
  
  // Look for patterns like "i [city]", "från [city]", "baserad i [city]"
  for (const city of swedishCities) {
    const cityLower = city.toLowerCase();
    
    // Check for various patterns where city appears
    if (desc.includes(`i ${cityLower}`) || 
        desc.includes(`från ${cityLower}`) || 
        desc.includes(`baserad i ${cityLower}`) ||
        desc.includes(`grundat ${cityLower}`) ||
        desc.includes(`${cityLower} och`) ||
        desc.includes(`${cityLower},`) ||
        desc.includes(`${cityLower}.`) ||
        desc.includes(`${cityLower} `) ||
        desc.includes(`${cityLower}`)) {
      return city;
    }
  }
  
  return null;
}

async function extractCitiesFromDescriptions() {
  console.log("Extracting city names from Swedish descriptions...");
  
  // Get companies with null city but Swedish descriptions
  const companiesToUpdate = await db.select({
    id: companies.id,
    name: companies.name,
    description: companies.description,
    description_sv: companies.description_sv
  }).from(companies).where(isNull(companies.city));
  
  console.log(`Found ${companiesToUpdate.length} companies with missing city data`);
  
  let updated = 0;
  
  for (const company of companiesToUpdate) {
    const description = company.description_sv || company.description;
    const extractedCity = extractCityFromDescription(description);
    
    if (extractedCity) {
      await db.update(companies)
        .set({ city: extractedCity })
        .where(eq(companies.id, company.id));
      
      updated++;
      console.log(`✓ ${company.name} -> ${extractedCity}`);
    }
  }
  
  console.log(`\nExtraction complete:`);
  console.log(`- Updated: ${updated} companies with extracted city names`);
  console.log(`- Remaining: ${companiesToUpdate.length - updated} companies without city data`);
}

extractCitiesFromDescriptions().catch(console.error);
