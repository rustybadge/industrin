import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Swedish translations for common industrial terms
const translations: Record<string, string> = {
  "Family-owned": "Familjeägt",
  "founded in": "grundat",
  "Specializes in": "Specialiserar sig på",
  "steel glass partitions": "stålglaspartier",
  "fire doors": "branddörrar",
  "sliding glass partitions": "skjutande glaspartier",
  "glass facades": "glasfasader",
  "industrial windows": "industrifönster",
  "forging": "smide",
  "glass jobs": "glasarbeten",
  "Manufactures": "Tillverkar",
  "products": "produkter",
  "entrepreneurs": "entreprenörer",
  "installers": "installatörer",
  "power lines": "kraftledningar",
  "fiber optics": "fiberoptik",
  "telecommunications": "telekommunikation",
  "Located in": "Beläget i",
  "specializing in": "specialiserat på",
  "equipment": "utrustning",
  "power": "kraft",
  "fiber": "fiber",
  "telecom installations": "telecominstallationer",
  "produces": "tillverkar",
  "customer": "kund",
  "product-specific": "produktspecifika",
  "industrial washers": "industritvättar",
  "washing equipment": "tvättutrustning",
  "ancillary": "hjälp",
  "material handling": "materialhantering",
  "systems": "system",
  "market": "marknadsför",
  "sell": "säljer",
  "standard": "standard",
  "according to": "enligt",
  "needs": "behov",
  "offers": "erbjuder",
  "cleanliness technology": "renhetsteknik",
  "services": "tjänster",
  "including": "inklusive",
  "washing": "tvätt",
  "cleaning": "rengöring",
  "components": "komponenter",
  "measurement": "mätning",
  "coating": "beläggning",
  "designing": "design",
  "manufacturing": "tillverkning",
  "fully tailored": "helt skräddarsydda",
  "industrial washing plants": "industritvättanläggningar",
  "Performs": "Utför",
  "assembly": "montering",
  "welding": "svetsning",
  "industry": "industri",
  "construction": "byggnation",
  "activities": "aktiviteter",
  "maintenance work": "underhållsarbete",
  "sheet metal work": "plåtarbete",
  "building sheet metal": "byggplåt",
  "steel buildings": "stålbyggnader",
  "assembly services": "monteringsservice",
  "Modern": "Modern",
  "sheet metal processing": "plåtbearbetning",
  "company": "företag",
  "located": "beläget",
  "Offers": "Erbjuder",
  "everything from": "allt från",
  "roofing": "takläggning",
  "complete": "kompletta",
  "sheet metal solutions": "plåtlösningar",
  "large": "stora",
  "modern machinery park": "moderna maskinpark",
  "traditional workshop": "traditionell verkstad",
  "employees": "anställda",
  "main production focus": "huvudproduktionsfokus",
  "contract manufacturing": "kontrakts tillverkning",
  "repair assignments": "reparationsuppdrag",
  "emphasis": "tonvikt",
  "cutting processing": "skärbearbetning",
  "comprehensive approach": "helhetsansats",
  "construction": "konstruktion",
  "fully assembled": "fullt monterade",
  "shot blasting": "kuggningsbehandling",
  "stress relief annealing": "spänningslindring",
  "painting": "målning",
  "turning": "svarvning",
  "carousel turning": "karusellsvarvning",
  "CNC milling": "CNC-fräsning",
  "involved in": "involverad i",
  "real estate": "fastigheter",
  "architectural engineering": "arkitekturell teknik",
  "electronic equipment": "elektronisk utrustning",
  "cast materials": "gjutmaterial",
  "aluminum": "aluminium",
  "iron": "järn",
  "steel forgings": "stålsmide"
};

function translateToSwedish(englishText: string): string {
  if (!englishText || englishText.trim() === '') {
    return '';
  }

  let swedishText = englishText;
  
  // Apply translations
  for (const [english, swedish] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    swedishText = swedishText.replace(regex, swedish);
  }
  
  // Fix common sentence structures
  swedishText = swedishText.replace(/\./g, '. ');
  swedishText = swedishText.replace(/\s+/g, ' ');
  swedishText = swedishText.trim();
  
  return swedishText;
}

async function translateDescriptions() {
  console.log("Translating company descriptions from English to Swedish...");
  
  const companies_data = await db.select({
    id: companies.id,
    name: companies.name,
    description: companies.description
  }).from(companies);
  
  let translated = 0;
  let skipped = 0;
  
  for (const company of companies_data) {
    if (company.description && company.description.trim() !== '' && company.description !== '...') {
      const swedishDescription = translateToSwedish(company.description);
      
      if (swedishDescription !== company.description) {
        await db
          .update(companies)
          .set({ 
            description: swedishDescription,
            description_sv: swedishDescription 
          })
          .where(eq(companies.id, company.id));
        
        translated++;
        console.log(`✓ Translated: ${company.name}`);
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\nTranslation complete:`);
  console.log(`- Translated: ${translated} companies`);
  console.log(`- Skipped: ${skipped} companies`);
  console.log(`- Total: ${companies_data.length} companies`);
}

translateDescriptions().catch(console.error);
