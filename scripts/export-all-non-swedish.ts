import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { writeFileSync } from 'fs';

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

async function exportAllNonSwedish() {
  try {
    console.log("Finding all companies that need Swedish descriptions...\n");
    
    // Get all companies
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      description: companies.description,
      description_sv: companies.description_sv,
    }).from(companies)
    .orderBy(companies.name);
    
    const needTranslation: Array<{
      id: string;
      name: string;
      description: string;
      description_sv: string;
      language: string;
      reason: string;
    }> = [];
    
    for (const company of allCompanies) {
      // Check description_sv first, then description
      const textToCheck = company.description_sv || company.description || '';
      const lang = detectLanguage(textToCheck);
      
      if (lang !== 'swedish') {
        let reason = '';
        if (lang === 'unknown' || !textToCheck) {
          reason = 'missing';
        } else if (lang === 'english') {
          reason = 'english';
        } else if (lang === 'mixed') {
          reason = 'mixed';
        }
        
        needTranslation.push({
          id: company.id,
          name: company.name,
          description: company.description || '',
          description_sv: company.description_sv || '',
          language: lang,
          reason: reason,
        });
      }
    }
    
    console.log(`Found ${needTranslation.length} companies that need Swedish descriptions\n`);
    
    // Group by reason
    const byReason: Record<string, number> = {};
    needTranslation.forEach(company => {
      byReason[company.reason] = (byReason[company.reason] || 0) + 1;
    });
    
    console.log(`Breakdown:`);
    Object.entries(byReason).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count}`);
    });
    
    // Export to CSV
    const csvHeader = 'id,name,description,description_sv,language,reason\n';
    const csvRows = needTranslation.map(company => {
      const escapeCsv = (str: string) => {
        if (!str) return '';
        return `"${str.replace(/"/g, '""')}"`;
      };
      return `${company.id},${escapeCsv(company.name)},${escapeCsv(company.description)},${escapeCsv(company.description_sv)},${company.language},${company.reason}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const filename = 'all-companies-needing-swedish-translation.csv';
    writeFileSync(filename, csvContent, 'utf-8');
    
    console.log(`\n✅ Exported ${needTranslation.length} companies to: ${filename}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Add Swedish translations to the 'description_sv' column`);
    console.log(`   2. Run: DATABASE_URL="..." npx tsx scripts/update-swedish-descriptions.ts ${filename}`);
    
  } catch (error) {
    console.error("Error exporting companies:", error);
    process.exit(1);
  }
  process.exit(0);
}

exportAllNonSwedish();



