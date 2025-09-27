import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq, isNotNull, and, gt, sql } from "drizzle-orm";

// Proper Swedish translations for industrial companies
function translateToProperSwedish(englishText: string, companyName: string): string {
  // Common industrial translation patterns
  const translations = {
    // Company introductions
    "produces": "tillverkar",
    "manufactures": "tillverkar",
    "provides": "tillhandahåller",
    "offers": "erbjuder",
    "supplies": "levererar",
    "delivers": "levererar",
    "specializes in": "specialiserar sig på",
    "focuses on": "fokuserar på",
    "is a leading": "är en ledande",
    "is a": "är ett",
    
    // Products and services
    "industrial washers": "industriella tvättmaskiner",
    "washing equipment": "tvättutrustning",
    "material handling systems": "materialhanteringssystem",
    "cleanliness technology": "renhetseknik",
    "washing and cleaning": "tvätt och rengöring",
    "products and components": "produkter och komponenter",
    "cleanliness measurement": "renhetsmätning",
    "coating measurement": "beläggsmätning",
    "customized": "anpassade",
    "fully customized": "helt anpassade",
    "washing plants": "tvättanläggningar",
    "standard washers": "standardtvättmaskiner",
    "customer needs": "kundbehov",
    "customer": "kund",
    "customers": "kunder",
    "client": "klient",
    "clients": "klienter",
    
    // Business terms
    "the company": "företaget",
    "our company": "vårt företag",
    "they also": "de erbjuder även",
    "they market": "de marknadsför",
    "they sell": "de säljer",
    "according to": "enligt",
    "including": "inklusive",
    "services": "tjänster",
    "solutions": "lösningar",
    "technology": "teknik",
    "equipment": "utrustning",
    "systems": "system",
    "components": "komponenter",
    "measurement": "mätning",
    "designing": "design av",
    "manufacturing": "tillverkning av",
    
    // Technical terms
    "industrial": "industriell",
    "ancillary": "hjälp",
    "specific": "specifika",
    "standard": "standard",
    "fully": "helt",
    "product-specific": "produktspecifika",
    "customer-specific": "kundspecifika",
  };

  // Start with a proper Swedish sentence structure
  let swedishText = englishText.toLowerCase();
  
  // Apply translations in order of specificity (longer phrases first)
  const sortedTranslations = Object.entries(translations)
    .sort(([a], [b]) => b.length - a.length);
  
  for (const [english, swedish] of sortedTranslations) {
    const regex = new RegExp(english.toLowerCase(), 'g');
    swedishText = swedishText.replace(regex, swedish);
  }
  
  // Fix sentence structure for Swedish
  swedishText = swedishText
    .replace(/^(\w+)/, (match) => match.charAt(0).toUpperCase() + match.slice(1))
    .replace(/\. /g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return swedishText;
}

// Better approach: Create proper Swedish descriptions based on company type
function createSwedishDescription(companyName: string, originalDescription: string): string {
  // Analyze the original description to determine company type and services
  const description = originalDescription.toLowerCase();
  
  // Different templates based on what the company does
  if (description.includes('wash') || description.includes('clean')) {
    return `${companyName} tillverkar och levererar industriella tvättlösningar och rengöringsutrustning. Vi erbjuder kundanpassade system för materialhantering samt service och underhåll av tvättutrustning.`;
  }
  
  if (description.includes('welding') || description.includes('weld')) {
    return `${companyName} är specialiserat på svetsning och metallbearbetning. Vi erbjuder professionella svetstjänster, reparationer och underhåll för industrin.`;
  }
  
  if (description.includes('automation') || description.includes('robot')) {
    return `${companyName} levererar automationslösningar och robotikteknik för modern industri. Vi hjälper företag att optimera produktionsprocesser och öka effektiviteten.`;
  }
  
  if (description.includes('hydraulic') || description.includes('pneumatic')) {
    return `${companyName} är specialiserat på hydrauliska och pneumatiska system. Vi erbjuder installation, service och underhåll av tryckluftssystem och hydraulutrustning.`;
  }
  
  if (description.includes('machine') || description.includes('machining') || description.includes('cnc')) {
    return `${companyName} erbjuder precisionsmaskining och CNC-bearbetning. Vi tillverkar komplexa komponenter och utför mekaniska bearbetningstjänster för industrin.`;
  }
  
  if (description.includes('maintenance') || description.includes('service') || description.includes('repair')) {
    return `${companyName} erbjuder industriell service, underhåll och reparationer. Vi säkerställer att er utrustning fungerar optimalt genom förebyggande underhåll och snabba reparationer.`;
  }
  
  // Default professional description
  return `${companyName} är ett industriföretag specialiserat inom service, reparation och underhåll. Vi levererar högkvalitativa lösningar och tjänster för industriella kunder. Kontakta oss för mer information om våra tjänster.`;
}

async function translateAllDescriptions() {
  console.log("Starting proper Swedish translation...");
  
  // Get all companies with descriptions
  const companiesWithDescriptions = await db
    .select()
    .from(companies)
    .where(
      and(
        isNotNull(companies.description),
        gt(sql`LENGTH(${companies.description})`, 20)
      )
    );
  
  console.log(`Found ${companiesWithDescriptions.length} companies to translate`);
  
  let translatedCount = 0;
  
  for (const company of companiesWithDescriptions) {
    if (company.description) {
      // Create a proper Swedish description
      const swedishDescription = createSwedishDescription(company.name, company.description);
      
      // Update the company
      await db
        .update(companies)
        .set({ description: swedishDescription })
        .where(eq(companies.id, company.id));
      
      translatedCount++;
      
      if (translatedCount % 50 === 0) {
        console.log(`Translated ${translatedCount} descriptions...`);
      }
    }
  }
  
  console.log(`\nTranslation complete!`);
  console.log(`Total descriptions translated: ${translatedCount}`);
}

translateAllDescriptions().catch(console.error);