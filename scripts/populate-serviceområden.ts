import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Sample data to populate some companies with serviceområden for testing
const companyServiceMapping = [
  {
    slug: "3a--byggdelen-ab",
    serviceområden: ["Fastighetsdrift & underhåll", "Mekaniskt underhåll & reparation"]
  },
  {
    slug: "ab-swecast",
    serviceområden: ["Industriservice & felsökning", "Allmän maskinservice"]
  },
  {
    slug: "abb-motion",
    serviceområden: ["Robot- & automationsservice", "Industriservice & felsökning"]
  }
];

async function populateServiceområden() {
  try {
    console.log("Populating serviceområden for sample companies...");
    
    for (const mapping of companyServiceMapping) {
      const result = await db
        .update(companies)
        .set({ serviceområden: mapping.serviceområden })
        .where(eq(companies.slug, mapping.slug))
        .returning({ name: companies.name, serviceområden: companies.serviceområden });
      
      if (result.length > 0) {
        console.log(`✅ Updated ${result[0].name} with serviceområden: ${result[0].serviceområden?.join(', ')}`);
      } else {
        console.log(`⚠️  Company with slug '${mapping.slug}' not found`);
      }
    }
    
    console.log("✅ Sample serviceområden population complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error populating serviceområden:", error);
    process.exit(1);
  }
}

populateServiceområden();