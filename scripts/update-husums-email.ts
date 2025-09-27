
import { db } from "../server/db";
import { companies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateHusumsEmail() {
  const companyId = 'Jvm8g0I_OEpcRDxxXQnld';
  const newEmail = 'conny@husumsmek.se';
  
  try {
    console.log('🔄 Updating email for Husums Mekaniska AB...');
    
    // First, get the current company data to verify
    const currentCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!currentCompany) {
      console.log(`❌ Company with ID ${companyId} not found`);
      return;
    }
    
    console.log(`📋 Current company: ${currentCompany.name}`);
    console.log(`📧 Current email: ${currentCompany.contactEmail}`);
    
    // Update the contact email
    await db
      .update(companies)
      .set({
        contactEmail: newEmail
      })
      .where(eq(companies.id, companyId));
    
    // Verify the update
    const updatedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (updatedCompany && updatedCompany.contactEmail === newEmail) {
      console.log(`✅ Successfully updated email for ${updatedCompany.name}`);
      console.log(`📧 New email: ${updatedCompany.contactEmail}`);
    } else {
      console.log(`❌ Failed to update company with ID ${companyId}`);
    }
  } catch (error) {
    console.error('💥 Error updating company email:', error);
  }
}

// Run the update
updateHusumsEmail()
  .then(() => {
    console.log("🎉 Email update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Email update failed:", error);
    process.exit(1);
  });
