import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql, count, isNotNull } from "drizzle-orm";

// Simple language detection
function detectLanguage(text: string): 'swedish' | 'english' | 'mixed' | 'unknown' {
  if (!text || text.trim().length === 0) return 'unknown';
  
  const lowerText = text.toLowerCase();
  
  const swedishWords = ['och', 'är', 'för', 'på', 'av', 'med', 'grundades', 'specialiserat', 'specialiserade', 'företag', 'tillverkar', 'erbjuder', 'service', 'industri', 'reparation', 'svetsning'];
  const englishWords = ['the', 'and', 'for', 'are', 'company', 'founded', 'specialized', 'specializes', 'manufactures', 'offers', 'services', 'industry', 'repair', 'repairs', 'welding'];
  
  let swedishCount = 0;
  let englishCount = 0;
  
  for (const word of swedishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) swedishCount += matches.length;
  }
  
  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) englishCount += matches.length;
  }
  
  const swedishChars = (lowerText.match(/[åäö]/g) || []).length;
  const swedishScore = swedishCount + (swedishChars * 2);
  const englishScore = englishCount;
  
  if (swedishScore === 0 && englishScore === 0) return 'unknown';
  if (swedishScore > englishScore * 1.5) return 'swedish';
  if (englishScore > swedishScore * 1.5) return 'english';
  return 'mixed';
}

async function checkSwedishCount() {
  try {
    // Get total companies
    const totalResult = await db.select({ count: count() }).from(companies);
    const total = totalResult[0].count;
    
    // Get companies with description_sv populated
    const withDescriptionSv = await db.select({
      count: count()
    }).from(companies)
    .where(isNotNull(companies.description_sv));
    const withSv = withDescriptionSv[0].count;
    
    // Get all companies and check their descriptions
    const allCompanies = await db.select({
      description: companies.description,
      description_sv: companies.description_sv,
    }).from(companies);
    
    let swedishCount = 0;
    let englishCount = 0;
    let mixedCount = 0;
    let unknownCount = 0;
    
    for (const company of allCompanies) {
      // Check description_sv first, then description
      const textToCheck = company.description_sv || company.description || '';
      const lang = detectLanguage(textToCheck);
      
      if (lang === 'swedish') swedishCount++;
      else if (lang === 'english') englishCount++;
      else if (lang === 'mixed') mixedCount++;
      else unknownCount++;
    }
    
    console.log(`\n📊 Company Description Status:\n`);
    console.log(`   Total companies: ${total}`);
    console.log(`   Companies with description_sv field: ${withSv}`);
    console.log(`\n   Language breakdown (based on content):`);
    console.log(`      Swedish: ${swedishCount} (${((swedishCount / total) * 100).toFixed(1)}%)`);
    console.log(`      English: ${englishCount} (${((englishCount / total) * 100).toFixed(1)}%)`);
    console.log(`      Mixed: ${mixedCount} (${((mixedCount / total) * 100).toFixed(1)}%)`);
    console.log(`      Unknown/Empty: ${unknownCount} (${((unknownCount / total) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error("Error checking descriptions:", error);
  }
  process.exit(0);
}

checkSwedishCount();



