
import { storage } from "../server/storage";

async function updateBRMontageEmail() {
  const companyId = 'kHp0BF-MS6TfaBbxWw3ef';
  const newEmail = 'info@brmontageservice.se';
  
  try {
    console.log('🔄 Updating email for AB BR Montageservice...');
    
    // First, get the current company data to verify
    const currentCompany = await storage.getCompanyById(companyId);
    if (!currentCompany) {
      console.log(`❌ Company with ID ${companyId} not found`);
      return;
    }
    
    console.log(`📋 Current company: ${currentCompany.name}`);
    console.log(`📧 Current email: ${currentCompany.contactEmail}`);
    
    // Update the contact email
    const updatedCompany = await storage.updateCompany(companyId, {
      contactEmail: newEmail
    });
    
    if (updatedCompany) {
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
updateBRMontageEmail()
  .then(() => {
    console.log("🎉 Email update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Email update failed:", error);
    process.exit(1);
  });
