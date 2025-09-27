
import { storage } from "./storage";

async function updateAsapConsultingDescription() {
  const companyId = 'xY71-smp6Nkhkwk0Mj8ub';
  const newDescriptionSv = "Asap Consulting and Trading AB är företaget som utför el-installationer mot industrin så som bagerier, tryckerier, lager, mekaniska verkstäder i Göteborg med omnejd.";
  
  try {
    const updatedCompany = await storage.updateCompany(companyId, {
      description_sv: newDescriptionSv
    });
    
    if (updatedCompany) {
      console.log(`Successfully updated company description for ${updatedCompany.name}`);
      console.log(`New Swedish description: ${updatedCompany.description_sv}`);
    } else {
      console.log(`Company with ID ${companyId} not found`);
    }
  } catch (error) {
    console.error('Error updating company description:', error);
  }
}

// Run the update
updateAsapConsultingDescription();
