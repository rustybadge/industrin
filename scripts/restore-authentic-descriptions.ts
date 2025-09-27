import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function restoreAuthenticDescriptions() {
  console.log("Restoring authentic company descriptions from JSON files...");
  
  // Load all JSON files with authentic descriptions
  const jsonFiles = [
    'attached_assets/updated_companies_1753576575725.json',
    'attached_assets/updatesDEF_1753610235640.json',
    'attached_assets/updates_DE_1753603871283.json',
    'attached_assets/swedish_companies_1753564688991.json'
  ];
  
  let restoredCount = 0;
  
  for (const filePath of jsonFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`Processing ${filePath}...`);
      
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      for (const companyData of jsonData) {
        if (companyData.description && companyData.description.trim() !== '') {
          // Find company by name or slug
          const existingCompany = await db
            .select()
            .from(companies)
            .where(eq(companies.name, companyData.name))
            .limit(1);
          
          if (existingCompany.length > 0) {
            // Update with authentic description
            await db
              .update(companies)
              .set({ 
                description: companyData.description,
                website: companyData.website || existingCompany[0].website,
                phone: companyData.phone || existingCompany[0].phone,
                email: companyData.email || existingCompany[0].email
              })
              .where(eq(companies.id, existingCompany[0].id));
            
            restoredCount++;
            
            if (restoredCount % 10 === 0) {
              console.log(`Restored ${restoredCount} authentic descriptions...`);
            }
          }
        }
      }
    }
  }
  
  console.log(`\nRestoration complete!`);
  console.log(`Total authentic descriptions restored: ${restoredCount}`);
}

restoreAuthenticDescriptions().catch(console.error);