import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function debugUpdate() {
  console.log("Debugging the update process...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Check first few companies
  for (let i = 0; i < 3; i++) {
    const companyData = jsonData[i];
    console.log(`\n=== ${companyData.name} ===`);
    
    // Get existing data from database
    const existing = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyData.name));
    
    if (existing.length > 0) {
      const db_company = existing[0];
      console.log(`Database:
        Description: "${db_company.description?.substring(0, 50)}..."
        Website: "${db_company.website}"
        Phone: "${db_company.phone}"
        Email: "${db_company.contactEmail}"`);
      
      console.log(`JSON:
        Description: "${companyData.description?.substring(0, 50)}..."
        Website: "${companyData.website}"
        Phone: "${companyData.phone}"
        Email: "${companyData.email}"`);
      
      // Check what would be updated
      console.log(`Would update:`);
      if (!db_company.description || db_company.description.trim() === '') {
        console.log(`  - Description: YES`);
      } else {
        console.log(`  - Description: NO (already has: "${db_company.description.substring(0, 30)}...")`);
      }
      
      if (!db_company.website || db_company.website.trim() === '') {
        console.log(`  - Website: YES`);
      } else {
        console.log(`  - Website: NO (already has: "${db_company.website}")`);
      }
      
      if (!db_company.phone || db_company.phone.trim() === '') {
        console.log(`  - Phone: YES`);
      } else {
        console.log(`  - Phone: NO (already has: "${db_company.phone}")`);
      }
      
      if (!db_company.contactEmail || db_company.contactEmail.trim() === '') {
        console.log(`  - Email: YES`);
      } else {
        console.log(`  - Email: NO (already has: "${db_company.contactEmail}")`);
      }
    } else {
      console.log(`NOT FOUND in database!`);
    }
  }
}

debugUpdate().catch(console.error);