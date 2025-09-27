import { readFileSync, writeFileSync } from 'fs';
import { db } from '../server/db';
import { companies } from '../shared/schema';

interface CompanyData {
  name: string;
  slug: string;
  description: string;
  description_sv?: string;
  categories: string[];
  services?: string[];
  serviceområden?: string[];
  specialties?: string;
  location: string;
  region: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
}

// Data quality scoring function
function calculateDataQualityScore(company: CompanyData): {
  score: number;
  hasCompleteContact: boolean;
  hasPartialContact: boolean;
  missingFields: string[];
  qualityLevel: 'complete' | 'partial' | 'minimal';
} {
  const missingFields: string[] = [];
  let score = 0;
  
  // Essential fields (2 points each)
  if (company.name && company.name.trim()) score += 2;
  else missingFields.push('name');
  
  if (company.description && company.description.trim()) score += 2;
  else missingFields.push('description');
  
  if (company.categories && company.categories.length > 0) score += 2;
  else missingFields.push('categories');
  
  if (company.region && company.region.trim()) score += 2;
  else missingFields.push('region');
  
  // Contact information (3 points each)
  if (company.contactEmail && company.contactEmail.trim() && company.contactEmail !== 'info@example.se') {
    score += 3;
  } else {
    missingFields.push('contactEmail');
  }
  
  if (company.phone && company.phone.trim()) score += 3;
  else missingFields.push('phone');
  
  if (company.website && company.website.trim()) score += 3;
  else missingFields.push('website');
  
  // Address information (1 point each)
  if (company.address && company.address.trim()) score += 1;
  else missingFields.push('address');
  
  if (company.city && company.city.trim()) score += 1;
  else missingFields.push('city');
  
  if (company.postalCode && company.postalCode.trim()) score += 1;
  else missingFields.push('postalCode');
  
  // Determine quality levels
  const hasCompleteContact = !missingFields.includes('contactEmail') && 
                            !missingFields.includes('phone') && 
                            !missingFields.includes('website');
  
  const hasPartialContact = !missingFields.includes('contactEmail') || 
                           !missingFields.includes('phone') || 
                           !missingFields.includes('website');
  
  let qualityLevel: 'complete' | 'partial' | 'minimal';
  if (score >= 15) qualityLevel = 'complete';
  else if (score >= 10) qualityLevel = 'partial';
  else qualityLevel = 'minimal';
  
  return {
    score,
    hasCompleteContact,
    hasPartialContact,
    missingFields,
    qualityLevel
  };
}

async function analyzeDataQuality() {
  console.log('🔍 Analyzing company data quality...');
  
  try {
    // Get all companies from database
    const dbCompanies = await db.select().from(companies);
    
    console.log(`📊 Analyzing ${dbCompanies.length} companies...`);
    
    const analysis = {
      total: dbCompanies.length,
      complete: 0,
      partial: 0,
      minimal: 0,
      withCompleteContact: 0,
      withPartialContact: 0,
      withNoContact: 0,
      companiesByQuality: [] as Array<{
        name: string;
        slug: string;
        qualityLevel: string;
        score: number;
        hasCompleteContact: boolean;
        missingFields: string[];
      }>
    };
    
    for (const company of dbCompanies) {
      const quality = calculateDataQualityScore(company);
      
      // Count by quality level
      if (quality.qualityLevel === 'complete') analysis.complete++;
      else if (quality.qualityLevel === 'partial') analysis.partial++;
      else analysis.minimal++;
      
      // Count by contact information
      if (quality.hasCompleteContact) analysis.withCompleteContact++;
      else if (quality.hasPartialContact) analysis.withPartialContact++;
      else analysis.withNoContact++;
      
      // Store company details for sorting
      analysis.companiesByQuality.push({
        name: company.name,
        slug: company.slug,
        qualityLevel: quality.qualityLevel,
        score: quality.score,
        hasCompleteContact: quality.hasCompleteContact,
        missingFields: quality.missingFields
      });
    }
    
    // Sort companies by quality (complete first, then by score)
    analysis.companiesByQuality.sort((a, b) => {
      if (a.hasCompleteContact !== b.hasCompleteContact) {
        return a.hasCompleteContact ? -1 : 1;
      }
      return b.score - a.score;
    });
    
    // Display results
    console.log('\n📈 DATA QUALITY ANALYSIS RESULTS:');
    console.log('================================');
    console.log(`Total companies: ${analysis.total}`);
    console.log(`Complete data (score ≥15): ${analysis.complete}`);
    console.log(`Partial data (score 10-14): ${analysis.partial}`);
    console.log(`Minimal data (score <10): ${analysis.minimal}`);
    console.log('');
    console.log('Contact Information:');
    console.log(`With complete contact info: ${analysis.withCompleteContact}`);
    console.log(`With partial contact info: ${analysis.withPartialContact}`);
    console.log(`With no contact info: ${analysis.withNoContact}`);
    
    console.log('\n🏆 TOP 10 COMPANIES (by data quality):');
    console.log('=====================================');
    analysis.companiesByQuality.slice(0, 10).forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} (${company.qualityLevel}, score: ${company.score})`);
      if (company.missingFields.length > 0) {
        console.log(`   Missing: ${company.missingFields.join(', ')}`);
      }
    });
    
    console.log('\n⚠️  COMPANIES NEEDING ATTENTION (bottom 10):');
    console.log('==========================================');
    analysis.companiesByQuality.slice(-10).forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} (${company.qualityLevel}, score: ${company.score})`);
      console.log(`   Missing: ${company.missingFields.join(', ')}`);
    });
    
    // Save detailed report
    const report = {
      summary: {
        total: analysis.total,
        complete: analysis.complete,
        partial: analysis.partial,
        minimal: analysis.minimal,
        withCompleteContact: analysis.withCompleteContact,
        withPartialContact: analysis.withPartialContact,
        withNoContact: analysis.withNoContact
      },
      companiesByQuality: analysis.companiesByQuality
    };
    
    writeFileSync('./data-quality-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to: data-quality-report.json');
    
    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing data quality:', error);
    throw error;
  }
}

// Run the analysis
analyzeDataQuality()
  .then((analysis) => {
    console.log('\n🎉 Data quality analysis completed!');
    console.log(`📊 Found ${analysis.withCompleteContact} companies with complete contact information`);
    console.log(`📊 Found ${analysis.withNoContact} companies needing "Äger du detta företag?" overlay`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to analyze data quality:', error);
    process.exit(1);
  });
