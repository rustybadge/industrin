import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function simpleJsonUpdate() {
  console.log("Processing final JSON file with simple approach...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${jsonData.length} companies from JSON file`);
  
  let updated = 0;
  let processed = 0;
  
  for (const companyData of jsonData) {
    if (!companyData.name || companyData.name.trim() === '') {
      continue;
    }
    
    processed++;
    
    try {
      // Find existing company
      const existing = await db
        .select()
        .from(companies)
        .where(eq(companies.name, companyData.name));
      
      if (existing.length > 0) {
        const company = existing[0];
        const updateObj: any = {};
        
        // Only update if the field is currently empty and new data exists
        if (companyData.description && companyData.description.trim() !== '' && 
            (!company.description || company.description.trim() === '')) {
          updateObj.description = companyData.description.trim();
        }
        
        if (companyData.website && companyData.website.trim() !== '' && companyData.website !== 'unavailable' &&
            (!company.website || company.website.trim() === '')) {
          let website = companyData.website.trim();
          if (website.startsWith('http://') || website.startsWith('https://')) {
            website = website.replace(/^https?:\/\//, '');
          }
          updateObj.website = website;
        }
        
        if (companyData.phone && companyData.phone.trim() !== '' && companyData.phone !== 'not available' &&
            (!company.phone || company.phone.trim() === '')) {
          updateObj.phone = companyData.phone.trim();
        }
        
        if (companyData.email && companyData.email.trim() !== '' && companyData.email !== 'not available' &&
            (!company.email || company.email.trim() === '')) {
          updateObj.email = companyData.email.trim();
        }
        
        // Update if there are changes
        if (Object.keys(updateObj).length > 0) {
          await db
            .update(companies)
            .set(updateObj)
            .where(eq(companies.id, company.id));
          
          updated++;
        }
      }
      
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} companies, updated ${updated}...`);
      }
      
    } catch (error) {
      console.error(`Error with ${companyData.name}:`, error.message);
    }
  }
  
  console.log(`\nCompleted! Processed ${processed} companies, updated ${updated}`);
}

simpleJsonUpdate().catch(console.error);