import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function finalUpdateCorrect() {
  console.log("Processing final JSON with correct schema...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${jsonData.length} companies from JSON file`);
  
  let updatedCount = 0;
  let processedCount = 0;
  
  for (const companyData of jsonData) {
    if (!companyData.name || companyData.name.trim() === '') {
      continue;
    }
    
    processedCount++;
    
    try {
      // Find existing company by name
      const existingCompanies = await db
        .select()
        .from(companies)
        .where(eq(companies.name, companyData.name));
      
      if (existingCompanies.length > 0) {
        const existing = existingCompanies[0];
        const updateData: any = {};
        
        // Update description if current is empty and new data exists
        if (companyData.description && companyData.description.trim() !== '' && 
            (!existing.description || existing.description.trim() === '')) {
          updateData.description = companyData.description.trim();
        }
        
        // Update website if current is empty and new data exists
        if (companyData.website && companyData.website.trim() !== '' && 
            companyData.website !== 'unavailable' &&
            (!existing.website || existing.website.trim() === '')) {
          let website = companyData.website.trim();
          // Clean up website URLs
          if (website.startsWith('http://') || website.startsWith('https://')) {
            website = website.replace(/^https?:\/\//, '');
          }
          updateData.website = website;
        }
        
        // Update phone if current is empty and new data exists  
        if (companyData.phone && companyData.phone.trim() !== '' && 
            companyData.phone !== 'not available' &&
            (!existing.phone || existing.phone.trim() === '')) {
          updateData.phone = companyData.phone.trim();
        }
        
        // Update contact email if current is empty and new data exists
        if (companyData.email && companyData.email.trim() !== '' && 
            companyData.email !== 'not available' &&
            (!existing.contactEmail || existing.contactEmail.trim() === '')) {
          updateData.contactEmail = companyData.email.trim();
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.id, existing.id));
          
          updatedCount++;
          console.log(`✓ Updated ${companyData.name} (${Object.keys(updateData).join(', ')})`);
        }
      }
      
      if (processedCount % 50 === 0) {
        console.log(`Processed ${processedCount} companies, updated ${updatedCount}...`);
      }
      
    } catch (error) {
      console.error(`Error processing ${companyData.name}:`, error.message);
    }
  }
  
  console.log(`\nCompleted!`);
  console.log(`Total processed: ${processedCount}`);
  console.log(`Total updated: ${updatedCount}`);
  
  // Final statistics
  const stats = await db
    .select()
    .from(companies);
  
  const withDescriptions = stats.filter(s => s.description && s.description.trim() !== '').length;
  const withWebsites = stats.filter(s => s.website && s.website.trim() !== '').length;
  const withPhones = stats.filter(s => s.phone && s.phone.trim() !== '').length;
  const withEmails = stats.filter(s => s.contactEmail && s.contactEmail.trim() !== '').length;
  
  console.log(`\nFinal database stats:`);
  console.log(`Total companies: ${stats.length}`);
  console.log(`With descriptions: ${withDescriptions}`);
  console.log(`With websites: ${withWebsites}`);
  console.log(`With phone numbers: ${withPhones}`);
  console.log(`With email addresses: ${withEmails}`);
}

finalUpdateCorrect().catch(console.error);