import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { writeFileSync } from 'fs';

// Simple language detection (same as before)
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

async function exportNonSwedishCompanies() {
  try {
    console.log("Finding companies with non-Swedish descriptions...\n");
    
    // Get all companies
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      description: companies.description,
      description_sv: companies.description_sv,
      createdAt: companies.createdAt,
    }).from(companies)
    .orderBy(companies.name);
    
    const recentDate = new Date('2025-11-01');
    const newCompanies = allCompanies.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) >= recentDate;
    });
    
    console.log(`Checking ${newCompanies.length} newly imported companies...\n`);
    
    const issues: Array<{
      id: string;
      name: string;
      description: string;
      description_sv: string;
      language: string;
    }> = [];
    
    for (const company of newCompanies) {
      const descLang = detectLanguage(company.description || '');
      
      if (descLang !== 'swedish' && descLang !== 'unknown') {
        issues.push({
          id: company.id,
          name: company.name,
          description: company.description || '',
          description_sv: company.description_sv || '',
          language: descLang,
        });
      }
    }
    
    console.log(`Found ${issues.length} companies with non-Swedish descriptions\n`);
    
    // Export to CSV
    const csvHeader = 'id,name,description,description_sv,language\n';
    const csvRows = issues.map(issue => {
      const escapeCsv = (str: string) => {
        if (!str) return '';
        return `"${str.replace(/"/g, '""')}"`;
      };
      return `${issue.id},${escapeCsv(issue.name)},${escapeCsv(issue.description)},${escapeCsv(issue.description_sv)},${issue.language}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const filename = 'companies-needing-swedish-translation.csv';
    writeFileSync(filename, csvContent, 'utf-8');
    
    console.log(`✅ Exported ${issues.length} companies to: ${filename}`);
    console.log(`\n📋 Summary:`);
    console.log(`   Total checked: ${newCompanies.length}`);
    console.log(`   Need translation: ${issues.length}`);
    console.log(`   Already in Swedish: ${newCompanies.length - issues.length}`);
    
    // Show breakdown by language
    const langBreakdown: Record<string, number> = {};
    issues.forEach(issue => {
      langBreakdown[issue.language] = (langBreakdown[issue.language] || 0) + 1;
    });
    
    console.log(`\n   Language breakdown:`);
    Object.entries(langBreakdown).forEach(([lang, count]) => {
      console.log(`      ${lang}: ${count}`);
    });
    
  } catch (error) {
    console.error("Error exporting companies:", error);
    process.exit(1);
  }
  process.exit(0);
}

exportNonSwedishCompanies();



