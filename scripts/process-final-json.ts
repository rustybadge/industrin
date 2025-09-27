import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function processFinalJsonUpdate() {
  console.log("Processing final JSON file for company updates...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    return;
  }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${jsonData.length} companies from JSON file`);
  
  let updated = 0;
  let added = 0;
  let skipped = 0;
  
  for (const companyData of jsonData) {
    try {
      // Skip companies without name
      if (!companyData.name || companyData.name.trim() === '') {
        skipped++;
        continue;
      }
      
      // Check if company exists
      const existingCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.name, companyData.name))
        .limit(1);
      
      // Prepare update data - only use non-empty values
      const updateData: any = {};
      
      if (companyData.description && companyData.description.trim() !== '') {
        updateData.description = companyData.description.trim();
      }
      
      if (companyData.website && companyData.website.trim() !== '' && companyData.website !== 'unavailable') {
        // Clean up website URLs
        let website = companyData.website.trim();
        if (website.startsWith('http://') || website.startsWith('https://')) {
          website = website.replace(/^https?:\/\//, '');
        }
        updateData.website = website;
      }
      
      if (companyData.phone && companyData.phone.trim() !== '' && companyData.phone !== 'not available') {
        updateData.phone = companyData.phone.trim();
      }
      
      if (companyData.email && companyData.email.trim() !== '' && companyData.email !== 'not available') {
        updateData.email = companyData.email.trim();
      }
      
      if (existingCompany.length > 0) {
        // Update existing company - only update fields that are currently empty or if new data is better
        const existing = existingCompany[0];
        const finalUpdate: any = {};
        
        // Update description if current is empty or new one is longer/better
        if (updateData.description && 
            (!existing.description || existing.description.trim() === '' || 
             updateData.description.length > existing.description.length)) {
          finalUpdate.description = updateData.description;
        }
        
        // Update website if current is empty
        if (updateData.website && (!existing.website || existing.website.trim() === '')) {
          finalUpdate.website = updateData.website;
        }
        
        // Update phone if current is empty
        if (updateData.phone && (!existing.phone || existing.phone.trim() === '')) {
          finalUpdate.phone = updateData.phone;
        }
        
        // Update email if current is empty
        if (updateData.email && (!existing.email || existing.email.trim() === '')) {
          finalUpdate.email = updateData.email;
        }
        
        // Only update if there are changes
        if (Object.keys(finalUpdate).length > 0) {
          await db
            .update(companies)
            .set(finalUpdate)
            .where(eq(companies.id, existing.id));
          
          updated++;
          
          if (updated % 50 === 0) {
            console.log(`Updated ${updated} companies...`);
          }
        }
      } else {
        // This is a new company - we could add it, but since the user said "update existing"
        // we'll skip new companies for now
        skipped++;
      }
      
    } catch (error) {
      console.error(`Error processing company ${companyData.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`\nProcessing complete!`);
  console.log(`Companies updated: ${updated}`);
  console.log(`Companies skipped: ${skipped}`);
  
  // Show some statistics
  const stats = await db.select({
    total: companies.id,
    hasDescription: companies.description,
    hasWebsite: companies.website,
    hasPhone: companies.phone,
    hasEmail: companies.email
  }).from(companies);
  
  const totalCompanies = stats.length;
  const withDescriptions = stats.filter(s => s.hasDescription && s.hasDescription.trim() !== '').length;
  const withWebsites = stats.filter(s => s.hasWebsite && s.hasWebsite.trim() !== '').length;
  const withPhones = stats.filter(s => s.hasPhone && s.hasPhone.trim() !== '').length;
  const withEmails = stats.filter(s => s.hasEmail && s.hasEmail.trim() !== '').length;
  
  console.log(`\nDatabase statistics:`);
  console.log(`Total companies: ${totalCompanies}`);
  console.log(`With descriptions: ${withDescriptions}`);
  console.log(`With websites: ${withWebsites}`);
  console.log(`With phone numbers: ${withPhones}`);
  console.log(`With email addresses: ${withEmails}`);
}

processFinalJsonUpdate().catch(console.error);