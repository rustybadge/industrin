import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql, lt } from "drizzle-orm";

// Common Swedish words and patterns
const swedishWords = [
  'och', 'är', 'för', 'på', 'av', 'med', 'det', 'som', 'en', 'den',
  'grundades', 'specialiserat', 'specialiserade', 'företag', 'tillverkar',
  'erbjuder', 'service', 'industri', 'reparation', 'reparationer', 'svetsning',
  'maskin', 'verkstad', 'mekaniska', 'sverige', 'stockholm', 'göteborg',
  'än', 'eller', 'om', 'till', 'från', 'i', 'de', 'har', 'kan', 'ska',
  'man', 'var', 'vid', 'efter', 'över', 'under', 'ännu', 'samt', 'än'
];

// Common English words
const englishWords = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
  'did', 'does', 'company', 'founded', 'specialized', 'specializes', 'manufactures',
  'offers', 'services', 'industry', 'repair', 'repairs', 'welding', 'machine',
  'workshop', 'mechanical', 'sweden'
];

function detectLanguage(text: string): 'swedish' | 'english' | 'mixed' | 'unknown' {
  if (!text || text.trim().length === 0) return 'unknown';
  
  const lowerText = text.toLowerCase();
  
  let swedishCount = 0;
  let englishCount = 0;
  
  // Check for Swedish words
  for (const word of swedishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      swedishCount += matches.length;
    }
  }
  
  // Check for English words
  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      englishCount += matches.length;
    }
  }
  
  // Check for Swedish-specific characters
  const swedishChars = (lowerText.match(/[åäö]/g) || []).length;
  
  // Check for common Swedish patterns
  const swedishPatterns = [
    /\bgrundades\s+\d{4}\s+i\b/gi,
    /\bär\s+specialiserat\b/gi,
    /\btillverkar\b/gi,
    /\berbjuder\b/gi,
  ];
  let swedishPatternMatches = 0;
  for (const pattern of swedishPatterns) {
    if (pattern.test(text)) swedishPatternMatches++;
  }
  
  // Check for English patterns
  const englishPatterns = [
    /\bfounded\s+in\s+\d{4}\b/gi,
    /\bis\s+specialized\b/gi,
    /\bmanufactures\b/gi,
    /\boffers\b/gi,
  ];
  let englishPatternMatches = 0;
  for (const pattern of englishPatterns) {
    if (pattern.test(text)) englishPatternMatches++;
  }
  
  // Scoring
  const swedishScore = swedishCount + (swedishChars * 2) + (swedishPatternMatches * 3);
  const englishScore = englishCount + (englishPatternMatches * 3);
  
  if (swedishScore === 0 && englishScore === 0) return 'unknown';
  if (swedishScore > englishScore * 1.5) return 'swedish';
  if (englishScore > swedishScore * 1.5) return 'english';
  return 'mixed';
}

async function checkSwedishDescriptions() {
  try {
    console.log("Checking descriptions in newly imported companies...\n");
    
    // Get companies imported after the original batch (created after Sep 27, 2025)
    // Or we can check all companies and identify which ones might be issues
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      description: companies.description,
      description_sv: companies.description_sv,
      createdAt: companies.createdAt,
    }).from(companies)
    .orderBy(companies.createdAt);
    
    console.log(`Total companies: ${allCompanies.length}\n`);
    
    // Companies created recently (likely the newly imported ones)
    const recentDate = new Date('2025-11-01');
    const newCompanies = allCompanies.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) >= recentDate;
    });
    
    console.log(`Newly imported companies (after Nov 1, 2025): ${newCompanies.length}\n`);
    
    // Check each company
    const issues: Array<{
      name: string;
      id: string;
      descriptionLang: string;
      description_svLang: string;
      description: string;
      description_sv: string;
    }> = [];
    
    let swedishCount = 0;
    let englishCount = 0;
    let mixedCount = 0;
    let unknownCount = 0;
    
    for (const company of newCompanies) {
      const descLang = detectLanguage(company.description || '');
      const descSvLang = detectLanguage(company.description_sv || '');
      
      if (descLang === 'swedish') swedishCount++;
      else if (descLang === 'english') englishCount++;
      else if (descLang === 'mixed') mixedCount++;
      else unknownCount++;
      
      // Flag issues: description should be Swedish, description_sv should be Swedish
      if (descLang !== 'swedish' && descLang !== 'unknown') {
        issues.push({
          name: company.name,
          id: company.id,
          descriptionLang: descLang,
          description_svLang: descSvLang,
          description: (company.description || '').substring(0, 100),
          description_sv: (company.description_sv || '').substring(0, 100),
        });
      } else if (company.description_sv && descSvLang !== 'swedish' && descSvLang !== 'unknown') {
        issues.push({
          name: company.name,
          id: company.id,
          descriptionLang: descLang,
          description_svLang: descSvLang,
          description: (company.description || '').substring(0, 100),
          description_sv: (company.description_sv || '').substring(0, 100),
        });
      }
    }
    
    console.log(`\n📊 Language Detection Results:`);
    console.log(`   Swedish descriptions: ${swedishCount}`);
    console.log(`   English descriptions: ${englishCount}`);
    console.log(`   Mixed descriptions: ${mixedCount}`);
    console.log(`   Unknown/Empty: ${unknownCount}`);
    
    if (issues.length > 0) {
      console.log(`\n⚠️  Found ${issues.length} companies with potential non-Swedish descriptions:\n`);
      
      issues.slice(0, 20).forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.name}`);
        console.log(`   ID: ${issue.id}`);
        console.log(`   Description language: ${issue.descriptionLang}`);
        console.log(`   Description SV language: ${issue.description_svLang}`);
        console.log(`   Description: ${issue.description}...`);
        if (issue.description_sv) {
          console.log(`   Description SV: ${issue.description_sv}...`);
        }
        console.log('');
      });
      
      if (issues.length > 20) {
        console.log(`   ... and ${issues.length - 20} more companies with issues\n`);
      }
      
      // Export to CSV for review
      console.log(`\n💾 You may want to review these ${issues.length} companies.`);
    } else {
      console.log(`\n✅ All descriptions appear to be in Swedish!`);
    }
    
    // Also check if description and description_sv are the same (might indicate both were set from one field)
    let sameDescriptions = 0;
    for (const company of newCompanies) {
      if (company.description && company.description_sv && 
          company.description.trim() === company.description_sv.trim()) {
        sameDescriptions++;
      }
    }
    
    if (sameDescriptions > 0) {
      console.log(`\n📝 Note: ${sameDescriptions} companies have identical description and description_sv fields`);
      console.log(`   This might mean both fields were set from the same source.`);
    }
    
  } catch (error) {
    console.error("Error checking descriptions:", error);
    process.exit(1);
  }
  process.exit(0);
}

checkSwedishDescriptions();



