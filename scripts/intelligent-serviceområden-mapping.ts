import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Available serviceområden from the user's list
const availableServiceområden = [
  "Avlopps- & pumpservice",
  "Fastighetsdrift & underhåll", 
  "Industriservice & felsökning",
  "Kompressor- & tryckluftservice",
  "Maskininstallation & flytt",
  "Mekaniskt underhåll & reparation",
  "Måleri & ytbehandling",
  "Robot- & automationsservice",
  "Entreprenadmaskiner – service & reparation",
  "Travers- & lyftutrustning service",
  "Reservdelar & komponentbyten",
  "Allmän maskinservice"
];

function mapCompanyToServiceområden(company: any): string[] {
  const serviceområden: Set<string> = new Set();
  const categories = company.categories || [];
  const name = company.name.toLowerCase();
  const description = (company.description || '').toLowerCase();
  
  // Category-based mapping
  for (const category of categories) {
    const cat = category.toLowerCase();
    
    if (cat.includes('svetsning')) {
      serviceområden.add("Mekaniskt underhåll & reparation");
    }
    if (cat.includes('hydraulik')) {
      serviceområden.add("Travers- & lyftutrustning service");
    }
    if (cat.includes('automation') || cat.includes('robotik')) {
      serviceområden.add("Robot- & automationsservice");
    }
    if (cat.includes('cnc') || cat.includes('metallbearbetning') || cat.includes('precisionsdelar')) {
      serviceområden.add("Allmän maskinservice");
    }
    if (cat.includes('lyftutrustning') || cat.includes('kransystem')) {
      serviceområden.add("Travers- & lyftutrustning service");
    }
    if (cat.includes('service')) {
      serviceområden.add("Industriservice & felsökning");
    }
  }
  
  // Name-based mapping
  if (name.includes('pump')) {
    serviceområden.add("Avlopps- & pumpservice");
  }
  if (name.includes('kompressor') || name.includes('tryckluft')) {
    serviceområden.add("Kompressor- & tryckluftservice");
  }
  if (name.includes('måleri') || name.includes('ytbehandling') || name.includes('lackering')) {
    serviceområden.add("Måleri & ytbehandling");
  }
  if (name.includes('fastighe')) {
    serviceområden.add("Fastighetsdrift & underhåll");
  }
  if (name.includes('installation') || name.includes('flytt') || name.includes('montage')) {
    serviceområden.add("Maskininstallation & flytt");
  }
  if (name.includes('entreprenad') || name.includes('grävmaskin') || name.includes('hjullastare')) {
    serviceområden.add("Entreprenadmaskiner – service & reparation");
  }
  if (name.includes('reservdel') || name.includes('komponent')) {
    serviceområden.add("Reservdelar & komponentbyten");
  }
  
  // Description-based mapping (if available)
  if (description.includes('pump')) {
    serviceområden.add("Avlopps- & pumpservice");
  }
  if (description.includes('fastighe')) {
    serviceområden.add("Fastighetsdrift & underhåll");
  }
  if (description.includes('robot') || description.includes('automation')) {
    serviceområden.add("Robot- & automationsservice");
  }
  
  // Fallback logic - ensure every company gets at least one serviceområde
  if (serviceområden.size === 0) {
    // Default based on most common categories
    if (categories.some(cat => cat.toLowerCase().includes('service'))) {
      serviceområden.add("Industriservice & felsökning");
    } else {
      serviceområden.add("Allmän maskinservice");
    }
  }
  
  // Limit to 3 serviceområden max
  return Array.from(serviceområden).slice(0, 3);
}

async function applyIntelligentMapping() {
  try {
    console.log("🔍 Analyzing companies for intelligent serviceområden mapping...");
    
    // Get all companies
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies to analyze`);
    
    let mappingPreview: any[] = [];
    let updateCount = 0;
    
    for (const company of allCompanies) {
      const suggestedServiceområden = mapCompanyToServiceområden(company);
      
      // Store preview data
      mappingPreview.push({
        name: company.name,
        categories: company.categories,
        suggested: suggestedServiceområden
      });
      
      // Update company with suggested serviceområden
      await db
        .update(companies)
        .set({ serviceområden: suggestedServiceområden })
        .where(eq(companies.id, company.id));
      
      updateCount++;
      
      if (updateCount % 100 === 0) {
        console.log(`✅ Processed ${updateCount}/${allCompanies.length} companies...`);
      }
    }
    
    console.log(`\n✅ Successfully mapped serviceområden for ${updateCount} companies!`);
    
    // Show sample mappings
    console.log("\n📊 Sample mappings:");
    mappingPreview.slice(0, 10).forEach(item => {
      console.log(`${item.name}:`);
      console.log(`  Categories: ${item.categories.join(', ')}`);
      console.log(`  Mapped to: ${item.suggested.join(', ')}`);
      console.log('');
    });
    
    // Show distribution
    const allMappedServiceområden = mappingPreview.flatMap(item => item.suggested);
    const distribution = availableServiceområden.map(service => ({
      service,
      count: allMappedServiceområden.filter(s => s === service).length
    })).sort((a, b) => b.count - a.count);
    
    console.log("📈 Serviceområden distribution:");
    distribution.forEach(item => {
      console.log(`  ${item.service}: ${item.count} companies`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying intelligent mapping:", error);
    process.exit(1);
  }
}

applyIntelligentMapping();