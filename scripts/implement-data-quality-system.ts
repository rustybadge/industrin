import { db } from '../server/db';
import { companies } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Data quality scoring function (same as analysis)
function calculateDataQualityScore(company: any): {
  score: number;
  hasCompleteContact: boolean;
  hasPartialContact: boolean;
  qualityLevel: 'complete' | 'partial' | 'minimal';
  needsClaimOverlay: boolean;
} {
  const missingFields: string[] = [];
  let score = 0;
  
  // Essential fields (2 points each)
  if (company.name && company.name.trim()) score += 2;
  if (company.description && company.description.trim()) score += 2;
  if (company.categories && company.categories.length > 0) score += 2;
  if (company.region && company.region.trim()) score += 2;
  
  // Contact information (3 points each)
  const hasEmail = company.contactEmail && company.contactEmail.trim() && company.contactEmail !== 'info@example.se';
  const hasPhone = company.phone && company.phone.trim();
  const hasWebsite = company.website && company.website.trim();
  
  if (hasEmail) score += 3;
  if (hasPhone) score += 3;
  if (hasWebsite) score += 3;
  
  // Address information (1 point each)
  if (company.address && company.address.trim()) score += 1;
  if (company.city && company.city.trim()) score += 1;
  if (company.postalCode && company.postalCode.trim()) score += 1;
  
  // Determine quality levels
  const hasCompleteContact = hasEmail && hasPhone && hasWebsite;
  const hasPartialContact = hasEmail || hasPhone || hasWebsite;
  
  let qualityLevel: 'complete' | 'partial' | 'minimal';
  if (score >= 15) qualityLevel = 'complete';
  else if (score >= 10) qualityLevel = 'partial';
  else qualityLevel = 'minimal';
  
  // Companies need claim overlay if they have minimal data OR missing essential contact info
  const needsClaimOverlay = qualityLevel === 'minimal' || !hasPartialContact;
  
  return {
    score,
    hasCompleteContact,
    hasPartialContact,
    qualityLevel,
    needsClaimOverlay
  };
}

async function implementDataQualitySystem() {
  console.log('🚀 Implementing data quality system...');
  
  try {
    // Get all companies from database
    const dbCompanies = await db.select().from(companies);
    
    console.log(`📊 Processing ${dbCompanies.length} companies...`);
    
    let successCount = 0;
    let errorCount = 0;
    let completeCount = 0;
    let partialCount = 0;
    let minimalCount = 0;
    let claimOverlayCount = 0;
    
    for (const company of dbCompanies) {
      try {
        const quality = calculateDataQualityScore(company);
        
        // Update company with data quality information
        await db.update(companies)
          .set({
            // Set isVerified to true for companies with complete contact info
            isVerified: quality.hasCompleteContact,
            // Set isFeatured to true for high-quality companies (score >= 12)
            isFeatured: quality.score >= 12 && quality.hasPartialContact,
          })
          .where(eq(companies.id, company.id));
        
        // Count by quality level
        if (quality.qualityLevel === 'complete') completeCount++;
        else if (quality.qualityLevel === 'partial') partialCount++;
        else minimalCount++;
        
        if (quality.needsClaimOverlay) claimOverlayCount++;
        
        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Processed ${successCount} companies...`);
        }
      } catch (error) {
        console.error(`❌ Error updating company "${company.name}":`, error);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Data quality system implemented!');
    console.log('==================================');
    console.log(`✅ Successfully processed: ${successCount} companies`);
    console.log(`📊 Complete data: ${completeCount} companies`);
    console.log(`📊 Partial data: ${partialCount} companies`);
    console.log(`📊 Minimal data: ${minimalCount} companies`);
    console.log(`🔔 Companies needing claim overlay: ${claimOverlayCount}`);
    
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} companies`);
    }
    
    console.log('\n📋 SYSTEM IMPLEMENTATION SUMMARY:');
    console.log('=================================');
    console.log('✅ Companies with complete contact info → isVerified: true');
    console.log('✅ Companies with good data (score ≥12) → isFeatured: true');
    console.log('✅ Companies with minimal/no contact → need "Äger du detta företag?" overlay');
    console.log('✅ Database ready for A-Ö sorting by data quality');
    
    return { successCount, errorCount, completeCount, partialCount, minimalCount, claimOverlayCount };
  } catch (error) {
    console.error('❌ Error implementing data quality system:', error);
    throw error;
  }
}

// Run the implementation
implementDataQualitySystem()
  .then(({ successCount, completeCount, partialCount, minimalCount, claimOverlayCount }) => {
    console.log(`\n🚀 Data quality system setup completed!`);
    console.log(`📈 ${completeCount} companies ready for premium listing`);
    console.log(`📈 ${claimOverlayCount} companies need claim overlay`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Update frontend to sort by isVerified, then isFeatured, then A-Ö`);
    console.log(`   2. Show "Äger du detta företag?" overlay for companies with minimal data`);
    console.log(`   3. Prioritize companies with complete contact information`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to implement data quality system:', error);
    process.exit(1);
  });
