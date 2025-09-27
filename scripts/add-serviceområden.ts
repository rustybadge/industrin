import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";

const serviceområden = [
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

async function addServiceområden() {
  try {
    console.log("Adding serviceområden field to all companies...");
    
    // Update all companies to have an empty serviceområden array initially
    const result = await db
      .update(companies)
      .set({ serviceområden: [] })
      .returning({ id: companies.id, name: companies.name });
    
    console.log(`✅ Successfully updated ${result.length} companies with serviceområden field`);
    console.log(`Available serviceområden: ${serviceområden.join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding serviceområden:", error);
    process.exit(1);
  }
}

addServiceområden();