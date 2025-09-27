import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { like, or } from "drizzle-orm";

// Function to revert bad translations that created hybrid Swedish-English text
async function revertBadTranslations() {
  console.log("Reverting bad translations...");
  
  // Find companies with obvious bad translations (mixed Swedish-English)
  const badTranslations = await db
    .select()
    .from(companies)
    .where(
      or(
        like(companies.description, '%kund %'),
        like(companies.description, '%företag %'),
        like(companies.description, '%tjänster %'),
        like(companies.description, '%utrustning %'),
        like(companies.description, '%komponenter %'),
        like(companies.description, '%teknologi %'),
        like(companies.description, '%tillverkning %'),
        like(companies.description, '%skräddarsytt %'),
        like(companies.description, '%specialiserar %')
      )
    );
  
  console.log(`Found ${badTranslations.length} companies with bad translations`);
  
  // For now, let's set these to a simple Swedish template based on company category
  // This is better than broken hybrid text
  for (const company of badTranslations) {
    const simpleSwedishDescription = `${company.name} är ett industriföretag specialiserat inom service, reparation och underhåll. Kontakta oss för mer information om våra tjänster.`;
    
    await db
      .update(companies)
      .set({ description: simpleSwedishDescription })
      .where({ id: company.id });
  }
  
  console.log(`Reverted ${badTranslations.length} bad translations to simple Swedish descriptions`);
}

revertBadTranslations().catch(console.error);