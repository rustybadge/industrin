import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql, isNotNull, isNull, or, and, eq } from "drizzle-orm";

async function analyzeDataQuality() {
  console.log("Analyzing detailed data quality for scroll wall implementation...\n");

  // Get all companies
  const allCompanies = await db.select({
    id: companies.id,
    name: companies.name,
    description: companies.description,
    description_sv: companies.description_sv,
    contactEmail: companies.contactEmail,
    phone: companies.phone,
    website: companies.website,
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    serviceområden: companies.serviceområden,
    categories: companies.categories,
    isVerified: companies.isVerified,
    isFeatured: companies.isFeatured,
  }).from(companies);

  console.log(`Total companies: ${allCompanies.length}\n`);

  // Define data quality criteria
  const qualityChecks = {
    hasDescription: (company: any) => {
      const desc = company.description_sv || company.description;
      return desc && desc.length >= 50;
    },
    hasContactEmail: (company: any) => company.contactEmail && company.contactEmail.trim() !== '',
    hasPhone: (company: any) => company.phone && company.phone.trim() !== '',
    hasWebsite: (company: any) => company.website && company.website.trim() !== '',
    hasAddress: (company: any) => company.address && company.address.trim() !== '',
    hasServiceområden: (company: any) => 
      company.serviceområden && Array.isArray(company.serviceområden) && company.serviceområden.length > 0,
    hasCategories: (company: any) => 
      company.categories && Array.isArray(company.categories) && company.categories.length > 0,
  };

  // Calculate quality scores
  let excellentQuality = 0;  // 6-7 fields complete
  let goodQuality = 0;       // 4-5 fields complete
  let poorQuality = 0;       // 2-3 fields complete
  let veryPoorQuality = 0;   // 0-1 fields complete

  const qualityBreakdown = {
    excellent: [] as any[],
    good: [] as any[],
    poor: [] as any[],
    veryPoor: [] as any[],
  };

  allCompanies.forEach(company => {
    const checks = Object.values(qualityChecks).map(check => check(company));
    const score = checks.filter(Boolean).length;
    
    if (score >= 6) {
      excellentQuality++;
      qualityBreakdown.excellent.push(company);
    } else if (score >= 4) {
      goodQuality++;
      qualityBreakdown.good.push(company);
    } else if (score >= 2) {
      poorQuality++;
      qualityBreakdown.poor.push(company);
    } else {
      veryPoorQuality++;
      qualityBreakdown.veryPoor.push(company);
    }
  });

  console.log("📊 DATA QUALITY BREAKDOWN:");
  console.log(`Excellent (6-7 fields): ${excellentQuality} companies (${(excellentQuality/allCompanies.length*100).toFixed(1)}%)`);
  console.log(`Good (4-5 fields): ${goodQuality} companies (${(goodQuality/allCompanies.length*100).toFixed(1)}%)`);
  console.log(`Poor (2-3 fields): ${poorQuality} companies (${(poorQuality/allCompanies.length*100).toFixed(1)}%)`);
  console.log(`Very Poor (0-1 fields): ${veryPoorQuality} companies (${(veryPoorQuality/allCompanies.length*100).toFixed(1)}%)\n`);

  console.log("🎯 COMPANIES NEEDING SCROLL WALL (Very Poor + Poor Quality):");
  console.log(`Total: ${veryPoorQuality + poorQuality} companies\n`);

  // Show examples of very poor quality companies (these need scroll wall)
  console.log("📋 EXAMPLES OF VERY POOR QUALITY COMPANIES (need scroll wall):");
  qualityBreakdown.veryPoor.slice(0, 10).forEach((company, index) => {
    const checks = Object.entries(qualityChecks).map(([key, check]) => ({ key, result: check(company) }));
    const completedFields = checks.filter(c => c.result).map(c => c.key);
    const missingFields = checks.filter(c => !c.result).map(c => c.key);
    
    console.log(`\n${index + 1}. ${company.name}`);
    console.log(`   ✅ Complete: ${completedFields.join(', ') || 'None'}`);
    console.log(`   ❌ Missing: ${missingFields.join(', ') || 'All fields'}`);
  });

  console.log("\n📋 EXAMPLES OF POOR QUALITY COMPANIES (might need scroll wall):");
  qualityBreakdown.poor.slice(0, 5).forEach((company, index) => {
    const checks = Object.entries(qualityChecks).map(([key, check]) => ({ key, result: check(company) }));
    const completedFields = checks.filter(c => c.result).map(c => c.key);
    
    console.log(`\n${index + 1}. ${company.name}`);
    console.log(`   ✅ Complete: ${completedFields.join(', ') || 'None'}`);
  });

  // Field completion statistics
  console.log("\n📈 FIELD COMPLETION STATISTICS:");
  Object.entries(qualityChecks).forEach(([field, check]) => {
    const completed = allCompanies.filter(check).length;
    const percentage = (completed / allCompanies.length * 100).toFixed(1);
    console.log(`${field}: ${completed}/${allCompanies.length} (${percentage}%)`);
  });

  // Recommendations for scroll wall threshold
  console.log("\n💡 RECOMMENDATIONS:");
  console.log(`- Apply scroll wall to companies with ≤3 complete fields (${poorQuality + veryPoorQuality} companies)`);
  console.log(`- This represents ${((poorQuality + veryPoorQuality)/allCompanies.length*100).toFixed(1)}% of all companies`);
  console.log(`- Focus on improving: ${Object.keys(qualityChecks).filter(key => {
    const completed = allCompanies.filter(qualityChecks[key as keyof typeof qualityChecks]).length;
    return completed / allCompanies.length < 0.7;
  }).join(', ')}`);

  return {
    totalCompanies: allCompanies.length,
    veryPoorQuality,
    poorQuality,
    goodQuality,
    excellentQuality,
    scrollWallCandidates: poorQuality + veryPoorQuality,
    qualityBreakdown
  };
}

analyzeDataQuality().catch(console.error);
