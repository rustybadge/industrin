import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq, isNotNull, and, gt, sql } from "drizzle-orm";

// Basic Swedish translations for common industrial terms
const translations: Record<string, string> = {
  // Company types and services
  "company": "företag",
  "services": "tjänster", 
  "solutions": "lösningar",
  "manufacturing": "tillverkning",
  "production": "produktion",
  "engineering": "teknik",
  "industrial": "industriell",
  "automation": "automation",
  "maintenance": "underhåll",
  "repair": "reparation",
  "service": "service",
  "installation": "installation",
  "consulting": "konsultering",
  "design": "design",
  "development": "utveckling",
  "quality": "kvalitet",
  "safety": "säkerhet",
  "efficiency": "effektivitet",
  "technology": "teknologi",
  "equipment": "utrustning",
  "machinery": "maskiner",
  "systems": "system",
  "components": "komponenter",
  "parts": "delar",
  "materials": "material",
  "steel": "stål",
  "metal": "metall",
  "welding": "svetsning",
  "cutting": "skärning",
  "machining": "bearbetning",
  "fabrication": "tillverkning",
  "assembly": "montering",
  "testing": "testning",
  "inspection": "inspektion",
  "certification": "certifiering",
  "training": "utbildning",
  "support": "support",
  "customer": "kund",
  "clients": "klienter",
  "industries": "branscher",
  "sectors": "sektorer",
  "markets": "marknader",
  "global": "global",
  "international": "internationell",
  "local": "lokal",
  "regional": "regional",
  "experience": "erfarenhet",
  "expertise": "expertis",
  "specialists": "specialister",
  "professionals": "professionella",
  "team": "team",
  "staff": "personal",
  "years": "år",
  "decades": "decennier",
  "established": "etablerat",
  "founded": "grundat",
  "leading": "ledande",
  "innovative": "innovativ",
  "reliable": "pålitlig",
  "trusted": "betrodd",
  "comprehensive": "omfattande",
  "complete": "komplett",
  "full": "full",
  "wide": "bred",
  "range": "utbud",
  "portfolio": "portfölj",
  "offering": "erbjudande",
  "provide": "tillhandahåller",
  "deliver": "levererar",
  "supply": "levererar",
  "offer": "erbjuder",
  "specialize": "specialiserar",
  "focus": "fokuserar",
  "dedicated": "dedikerat",
  "committed": "engagerat",
  "project": "projekt",
  "projects": "projekt",
  "custom": "anpassat",
  "customized": "anpassat",
  "tailored": "skräddarsytt",
  "bespoke": "skräddarsytt",
  "standard": "standard",
  "specialized": "specialiserat",
  "advanced": "avancerat",
  "modern": "modernt",
  "state-of-the-art": "toppmodern",
  "cutting-edge": "banbrytande",
  "high-quality": "högkvalitativ",
  "precision": "precision",
  "accurate": "noggrann",
  "efficient": "effektiv",
  "cost-effective": "kostnadseffektiv",
  "competitive": "konkurrenskraftig",
  "affordable": "prisvärd",
  "sustainable": "hållbar",
  "environmental": "miljömässig",
  "green": "grön",
  "energy": "energi",
  "power": "kraft",
  "electrical": "elektrisk",
  "mechanical": "mekanisk",
  "hydraulic": "hydraulisk",
  "pneumatic": "pneumatisk",
  "controls": "styrning",
  "software": "mjukvara",
  "hardware": "hårdvara",
  "digital": "digital",
  "smart": "smart",
  "intelligent": "intelligent",
  "connected": "uppkopplad",
  "Industry 4.0": "Industri 4.0",
  "IoT": "IoT",
  "data": "data",
  "analytics": "analys",
  "monitoring": "övervakning",
  "optimization": "optimering",
  "performance": "prestanda",
  "productivity": "produktivitet",
  "output": "produktion",
  "capacity": "kapacitet",
  "throughput": "genomströmning",
  "workflow": "arbetsflöde",
  "process": "process",
  "procedures": "procedurer",
  "methods": "metoder",
  "techniques": "tekniker",
  "approaches": "tillvägagångssätt",
  "strategies": "strategier",
  "practices": "praxis",
  "standards": "standarder",
  "regulations": "regleringar",
  "compliance": "efterlevnad",
  "requirements": "krav",
  "specifications": "specifikationer",
  "documentation": "dokumentation",
  "reports": "rapporter",
  "analysis": "analys",
  "assessment": "bedömning",
  "evaluation": "utvärdering",
  "audit": "revision",
  "review": "granskning",
  "improvement": "förbättring",
  "enhancement": "förbättring",
  "upgrade": "uppgradering",
  "modernization": "modernisering",
  "renovation": "renovering",
  "refurbishment": "renovering",
  "overhaul": "översyn",
  "maintenance": "underhåll",
  "servicing": "service",
  "repairs": "reparationer",
  "replacement": "ersättning",
  "spare parts": "reservdelar",
  "components": "komponenter",
  "accessories": "tillbehör",
  "tools": "verktyg",
  "instruments": "instrument",
  "devices": "enheter",
  "units": "enheter",
  "modules": "moduler",
  "packages": "paket",
  "kits": "kit",
  "sets": "set",
  "assemblies": "enheter",
  "sub-assemblies": "delenheter"
};

// Function to translate English text to Swedish
function translateToSwedish(text: string): string {
  let translatedText = text;
  
  // Replace common English terms with Swedish equivalents
  for (const [english, swedish] of Object.entries(translations)) {
    // Case-insensitive replacement, preserving original case
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedText = translatedText.replace(regex, (match) => {
      // Preserve capitalization pattern
      if (match[0] === match[0].toUpperCase()) {
        return swedish.charAt(0).toUpperCase() + swedish.slice(1);
      }
      return swedish;
    });
  }
  
  // Additional Swedish business language patterns
  translatedText = translatedText
    .replace(/\bWe are\b/gi, "Vi är")
    .replace(/\bWe provide\b/gi, "Vi tillhandahåller")
    .replace(/\bWe offer\b/gi, "Vi erbjuder")
    .replace(/\bWe specialize\b/gi, "Vi specialiserar oss")
    .replace(/\bWe deliver\b/gi, "Vi levererar")
    .replace(/\bWe supply\b/gi, "Vi levererar")
    .replace(/\bWe serve\b/gi, "Vi betjänar")
    .replace(/\bWe work with\b/gi, "Vi arbetar med")
    .replace(/\bWe focus on\b/gi, "Vi fokuserar på")
    .replace(/\bOur company\b/gi, "Vårt företag")
    .replace(/\bOur services\b/gi, "Våra tjänster")
    .replace(/\bOur solutions\b/gi, "Våra lösningar")
    .replace(/\bOur team\b/gi, "Vårt team")
    .replace(/\bOur experience\b/gi, "Vår erfarenhet")
    .replace(/\bOur expertise\b/gi, "Vår expertis")
    .replace(/\bWith over\b/gi, "Med över")
    .replace(/\byears of experience\b/gi, "års erfarenhet")
    .replace(/\bin the industry\b/gi, "inom branschen")
    .replace(/\bacross various industries\b/gi, "inom olika branscher")
    .replace(/\bthroughout Sweden\b/gi, "i hela Sverige")
    .replace(/\bacross Sweden\b/gi, "över hela Sverige")
    .replace(/\bContact us\b/gi, "Kontakta oss")
    .replace(/\bGet in touch\b/gi, "Hör av dig")
    .replace(/\bLearn more\b/gi, "Läs mer")
    .replace(/\bFind out more\b/gi, "Ta reda på mer");
    
  return translatedText;
}

async function translateDescriptions() {
  console.log("Starting description translation...");
  
  // Get companies with English descriptions (longer than 50 characters)
  const companiesWithDescriptions = await db
    .select()
    .from(companies)
    .where(
      and(
        isNotNull(companies.description),
        gt(sql`LENGTH(${companies.description})`, 50)
      )
    );
  
  console.log(`Found ${companiesWithDescriptions.length} companies with descriptions to translate`);
  
  let translatedCount = 0;
  
  for (const company of companiesWithDescriptions) {
    if (company.description) {
      // Check if description appears to be in English (contains common English words)
      const englishIndicators = /\b(the|and|or|of|in|to|for|with|we|our|is|are|have|has|been|will|can|may|should|would|could|company|services|solutions)\b/gi;
      
      if (englishIndicators.test(company.description)) {
        const translatedDescription = translateToSwedish(company.description);
        
        // Update the company with translated description
        await db
          .update(companies)
          .set({ description: translatedDescription })
          .where(eq(companies.id, company.id));
        
        translatedCount++;
        
        if (translatedCount % 10 === 0) {
          console.log(`Translated ${translatedCount} descriptions...`);
        }
      }
    }
  }
  
  console.log(`\nTranslation complete!`);
  console.log(`Total descriptions translated: ${translatedCount}`);
}

translateDescriptions().catch(console.error);