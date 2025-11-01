import * as fs from 'fs';
import * as path from 'path';

interface IndustritorgetCompany {
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  source?: string; // Optional: track which file/page it came from
}

/**
 * Combines multiple JSON files from Industritorget scraping into a single flat array
 * 
 * Usage:
 *   npx tsx scripts/combine-industritorget-files.ts [input-dir] [output-file]
 * 
 * Example:
 *   npx tsx scripts/combine-industritorget-files.ts ./scraped-data industritorget-data.json
 */
async function combineFiles() {
  const inputDir = process.argv[2] || './scraped-data';
  const outputFile = process.argv[3] || 'industritorget-data.json';
  
  console.log('=== Combining Industritorget JSON Files ===\n');
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Directory not found: ${inputDir}`);
    console.log('\nUsage:');
    console.log('  npx tsx scripts/combine-industritorget-files.ts [input-dir] [output-file]');
    console.log('\nExample:');
    console.log('  npx tsx scripts/combine-industritorget-files.ts ./scraped-data industritorget-data.json');
    return;
  }
  
  const allCompanies: IndustritorgetCompany[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  
  // Read all JSON files in the directory
  const files = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.json'))
    .sort();
  
  console.log(`Found ${files.length} JSON files in ${inputDir}\n`);
  
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    console.log(`Reading ${file}...`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const companies: IndustritorgetCompany[] = JSON.parse(content);
      
      if (!Array.isArray(companies)) {
        console.log(`  ⚠️  Skipping ${file} - not an array`);
        continue;
      }
      
      let added = 0;
      for (const company of companies) {
        // Normalize company name for deduplication
        const key = (company.name || '').toLowerCase().trim();
        
        if (!key || key.length < 3) {
          continue; // Skip invalid entries
        }
        
        // Add source tracking if not present
        if (!company.source) {
          company.source = file;
        }
        
        // Check for duplicates (same company name)
        if (seen.has(key)) {
          duplicateCount++;
          continue;
        }
        
        seen.add(key);
        allCompanies.push(company);
        added++;
      }
      
      console.log(`  ✓ Added ${added} companies from ${file}`);
      
    } catch (error) {
      console.error(`  ✗ Error reading ${file}:`, error);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total companies: ${allCompanies.length}`);
  console.log(`Duplicates skipped: ${duplicateCount}`);
  console.log(`Files processed: ${files.length}`);
  
  // Save combined file
  fs.writeFileSync(outputFile, JSON.stringify(allCompanies, null, 2));
  console.log(`\n✓ Saved combined data to: ${outputFile}`);
  
  // Show sample
  if (allCompanies.length > 0) {
    console.log('\nSample (first 3 companies):');
    allCompanies.slice(0, 3).forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log(`   Phone: ${company.phone || 'N/A'}`);
      console.log(`   Source: ${company.source || 'N/A'}`);
    });
  }
  
  console.log(`\nNext step: Run the update script:`);
  console.log(`  DATABASE_URL="..." npx tsx scripts/scrape-industritorget-and-update.ts ${outputFile}`);
}

combineFiles();

