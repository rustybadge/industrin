import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

async function findMissingCompanies() {
  console.log("Finding companies in JSON that need updates...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  let missingFromDb = 0;
  let needsDescriptionUpdate = 0;
  let needsWebsiteUpdate = 0;
  let needsPhoneUpdate = 0;
  let needsEmailUpdate = 0;
  
  // Get all existing company names from database
  const allDbCompanies = await db.select({ name: companies.name }).from(companies);
  const dbCompanyNames = new Set(allDbCompanies.map(c => c.name));
  
  console.log(`Database has ${dbCompanyNames.size} companies`);
  console.log(`JSON has ${jsonData.length} companies`);
  
  for (const companyData of jsonData) {
    if (!companyData.name || companyData.name.trim() === '') continue;
    
    if (!dbCompanyNames.has(companyData.name)) {
      missingFromDb++;
      console.log(`Missing from DB: ${companyData.name}`);
      continue;
    }
    
    // Check if this company needs updates
    const existing = await db
      .select()
      .from(companies) 
      .where(eq(companies.name, companyData.name));
    
    if (existing.length > 0) {
      const dbCompany = existing[0];
      
      if (companyData.description && companyData.description.trim() !== '' && 
          (!dbCompany.description || dbCompany.description.trim() === '')) {
        needsDescriptionUpdate++;
      }
      
      if (companyData.website && companyData.website.trim() !== '' && 
          companyData.website !== 'unavailable' &&
          (!dbCompany.website || dbCompany.website.trim() === '')) {
        needsWebsiteUpdate++;
      }
      
      if (companyData.phone && companyData.phone.trim() !== '' && 
          companyData.phone !== 'not available' &&
          (!dbCompany.phone || dbCompany.phone.trim() === '')) {
        needsPhoneUpdate++;
      }
      
      if (companyData.email && companyData.email.trim() !== '' && 
          companyData.email !== 'not available' &&
          (!dbCompany.contactEmail || dbCompany.contactEmail.trim() === '')) {
        needsEmailUpdate++;
      }
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`Companies missing from database: ${missingFromDb}`);
  console.log(`Companies needing description updates: ${needsDescriptionUpdate}`);
  console.log(`Companies needing website updates: ${needsWebsiteUpdate}`);
  console.log(`Companies needing phone updates: ${needsPhoneUpdate}`);
  console.log(`Companies needing email updates: ${needsEmailUpdate}`);
  
  // Show companies with empty descriptions that could be filled
  console.log(`\nChecking for empty descriptions that could be filled...`);
  const emptyDescriptions = await db
    .select({ name: companies.name, description: companies.description })
    .from(companies)
    .limit(10);
    
  let emptyCount = 0;
  for (const company of emptyDescriptions) {
    if (!company.description || company.description.trim() === '') {
      emptyCount++;
      console.log(`Empty description: ${company.name}`);
    }
  }
  console.log(`Found ${emptyCount} companies with empty descriptions (showing first 10)`);
}

findMissingCompanies().catch(console.error);