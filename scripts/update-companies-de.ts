import { db } from "../server/db";
import { companies } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface UpdateCompanyData {
  name: string;
  slug: string;
  description: string;
  categories: string[];
  region: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
}

async function updateCompaniesDE() {
  try {
    console.log("🔄 Starting D-E company data update process...");
    
    // Read the cleaned D-E updates JSON file
    const jsonPath = path.join(process.cwd(), "attached_assets/updates_DE_cleaned.json");
    const jsonData = fs.readFileSync(jsonPath, "utf-8");
    const updatedCompanies: UpdateCompanyData[] = JSON.parse(jsonData);
    
    console.log(`📊 Found ${updatedCompanies.length} companies to update`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const companyUpdate of updatedCompanies) {
      try {
        // Find existing company by slug
        const existingCompany = await db
          .select()
          .from(companies)
          .where(eq(companies.slug, companyUpdate.slug))
          .limit(1);
        
        if (existingCompany.length === 0) {
          console.log(`⚠️  Company not found: ${companyUpdate.name} (${companyUpdate.slug})`);
          notFoundCount++;
          continue;
        }
        
        // Prepare update data - only update fields that have new data
        const updateData: any = {};
        
        // Update description if provided and not empty
        if (companyUpdate.description && companyUpdate.description.trim() !== "") {
          updateData.description = companyUpdate.description.trim();
        }
        
        // Update website if provided and not empty
        if (companyUpdate.website && companyUpdate.website.trim() !== "") {
          let website = companyUpdate.website.trim();
          // Clean website URL - remove protocol if present
          if (website.startsWith("http://") || website.startsWith("https://")) {
            website = website.replace(/^https?:\/\//, "");
          }
          updateData.website = website;
        }
        
        // Update phone if provided and not empty
        if (companyUpdate.phone && 
            companyUpdate.phone.trim() !== "" && 
            companyUpdate.phone.toLowerCase() !== "not available") {
          updateData.phone = companyUpdate.phone.trim();
        }
        
        // Update email if provided and not empty and not "not available"
        if (companyUpdate.email && 
            companyUpdate.email.trim() !== "" && 
            companyUpdate.email.toLowerCase() !== "not available") {
          updateData.contactEmail = companyUpdate.email.trim();
        }
        
        // Only update if there's actually data to update
        if (Object.keys(updateData).length > 0) {
          await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.slug, companyUpdate.slug));
          
          const updatedFields = Object.keys(updateData).join(", ");
          console.log(`✅ Updated: ${companyUpdate.name} (${updatedFields})`);
          updatedCount++;
        } else {
          console.log(`⏭️  No new data for: ${companyUpdate.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating ${companyUpdate.name}:`, error);
      }
    }
    
    console.log(`\n📈 Update Summary:`);
    console.log(`✅ Successfully updated: ${updatedCount} companies`);
    console.log(`⚠️  Companies not found: ${notFoundCount}`);
    console.log(`📝 Total companies processed: ${updatedCompanies.length}`);
    
  } catch (error) {
    console.error("❌ Failed to update companies:", error);
    process.exit(1);
  }
}

// Run the update
updateCompaniesDE()
  .then(() => {
    console.log("🎉 D-E company update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 D-E company update failed:", error);
    process.exit(1);
  });