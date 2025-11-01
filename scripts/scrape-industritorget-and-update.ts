import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, isNull, or, ne } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import * as fs from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface IndustritorgetCompany {
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .replace(/[^\w\såäöÅÄÖ]/g, '') // Remove special chars except Swedish letters
    .replace(/\s+(ab|ltd|aktiebolag|limited)$/i, ''); // Remove company suffixes
}

function fuzzyMatch(name1: string, name2: string): boolean {
  const n1 = normalizeCompanyName(name1);
  const n2 = normalizeCompanyName(name2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Common words to ignore when matching (too generic)
  const commonWords = new Set([
    'ab', 'ab', 'och', 'i', 'o', 'service', 'servis', 'industri', 'industri',
    'maskin', 'verkstad', 'mekanisk', 'mekaniska', 'teknik', 'teknisk',
    'produktion', 'production', 'sweden', 'sverige', 'group', 'grupp'
  ]);
  
  // Extract core words (remove common suffixes and connectives)
  const words1 = n1.split(/\s+/)
    .filter(w => w.length > 2 && !commonWords.has(w.toLowerCase()))
    .filter(w => w.length >= 3); // Minimum 3 characters
  
  const words2 = n2.split(/\s+/)
    .filter(w => w.length > 2 && !commonWords.has(w.toLowerCase()))
    .filter(w => w.length >= 3); // Minimum 3 characters
  
  // Must have at least one meaningful unique word
  if (words1.length === 0 || words2.length === 0) return false;
  
  // Check if significant words overlap
  const matchingWords = words1.filter(w1 => words2.some(w2 => {
    // Exact word match (most reliable)
    if (w1.toLowerCase() === w2.toLowerCase()) return true;
    // One word contains the other (for variations like "Gnosjö" vs "Gnosjo")
    // But only if both are substantial (at least 4 chars)
    if (w1.length >= 4 && w2.length >= 4) {
      const lower1 = w1.toLowerCase();
      const lower2 = w2.toLowerCase();
      // Check if one contains the other (allowing for slight variations)
      if (lower1.includes(lower2) || lower2.includes(lower1)) {
        // But require at least 75% of the shorter word to be in the longer
        const shorter = lower1.length < lower2.length ? lower1 : lower2;
        const longer = lower1.length >= lower2.length ? lower1 : lower2;
        return longer.includes(shorter) && (shorter.length / longer.length) >= 0.75;
      }
    }
    return false;
  }));
  
  // For very short names (1-2 unique words), require exact match or very high similarity
  if (words1.length <= 2 || words2.length <= 2) {
    if (matchingWords.length === 0) return false;
    // For short names, ALL meaningful words must match
    const similarity = matchingWords.length / Math.min(words1.length, words2.length);
    return similarity >= 1.0; // 100% - all words must match
  }
  
  // For longer names, require at least 2 matching words AND they must be substantial
  if (matchingWords.length < 2) return false;
  
  // Also check that matching words are not too short (avoid false positives)
  const substantialMatches = matchingWords.filter(w => w.length >= 4);
  if (substantialMatches.length < 1) return false; // At least one substantial match
  
  // Additional check: the matching words should represent a significant portion
  const matchRatio = matchingWords.length / Math.min(words1.length, words2.length);
  if (matchRatio < 0.5) return false; // At least 50% of words must match
  
  // CRITICAL: If one name has unique words that don't appear in the other, reject the match
  // This prevents "Nilsson Larsson X" from matching "EU X" just because "X" matches
  const uniqueWords1 = words1.filter(w1 => !words2.some(w2 => {
    return w1.toLowerCase() === w2.toLowerCase() || 
           (w1.length >= 4 && w2.length >= 4 && (w1.includes(w2) || w2.includes(w1)));
  }));
  const uniqueWords2 = words2.filter(w2 => !words1.some(w1 => {
    return w1.toLowerCase() === w2.toLowerCase() || 
           (w1.length >= 4 && w2.length >= 4 && (w1.includes(w2) || w2.includes(w1)));
  }));
  
  // If both have substantial unique words (proper nouns, distinctive terms), it's likely not a match
  const substantialUnique1 = uniqueWords1.filter(w => w.length >= 4);
  const substantialUnique2 = uniqueWords2.filter(w => w.length >= 4);
  
  // If both sides have 1+ substantial unique words that are proper nouns (capitalized), reject
  // This catches cases like "Nilsson" (unique) vs "EU" (unique)
  const properNounUnique1 = substantialUnique1.filter(w => /^[A-ZÄÖÅ]/.test(w));
  const properNounUnique2 = substantialUnique2.filter(w => /^[A-ZÄÖÅ]/.test(w));
  
  if (properNounUnique1.length >= 1 && properNounUnique2.length >= 1) {
    return false; // Both have proper noun unique words - different companies
  }
  
  // If one side has 2+ substantial unique words, it's likely a different company
  if (substantialUnique1.length >= 2 || substantialUnique2.length >= 2) {
    return false;
  }
  
  return true;
}

function extractWebsite(text: string): string | null {
  // Match patterns like "www.example.se", "example.se", "https://example.se"
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/g,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      let website = match[0];
      // Remove protocol if present
      website = website.replace(/^https?:\/\//, '');
      // Remove www. if present (we'll store without it)
      website = website.replace(/^www\./, '');
      // Basic validation
      if (website.length > 3 && website.includes('.')) {
        return website.toLowerCase();
      }
    }
  }
  return null;
}

async function scrapeIndustritorget(): Promise<IndustritorgetCompany[]> {
  console.log('⚠️  This script requires manual web scraping.');
  console.log('Due to limitations, you\'ll need to:');
  console.log('1. Visit the Industritorget.se pages (there are multiple pages)');
  console.log('2. Copy the HTML or use a browser extension to extract data');
  console.log('3. Save it to a JSON file\n');
  
  console.log('Alternatively, I can create a script that processes HTML you provide.\n');
  
  // For now, return empty array - user will need to provide data
  return [];
}

async function processProvidedData(jsonFilePath: string) {
  console.log(`Reading data from ${jsonFilePath}...\n`);
  
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`File not found: ${jsonFilePath}`);
    console.log('\nCreating a template file for you to fill in...\n');
    
    const template: IndustritorgetCompany[] = [
      {
        name: "Example Company AB",
        website: "example.se",
        phone: "08-123 45 67",
        address: "Example Street 1",
        city: "Stockholm",
        postalCode: "12345"
      }
    ];
    
    fs.writeFileSync(jsonFilePath, JSON.stringify(template, null, 2));
    console.log(`✓ Created template file: ${jsonFilePath}`);
    console.log('Please fill in the data and run the script again.\n');
    return [];
  }
  
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  let parsedData = JSON.parse(fileContent);
  
  // Handle both flat array and grouped by filename formats
  let data: IndustritorgetCompany[] = [];
  
  if (Array.isArray(parsedData)) {
    // Already a flat array
    data = parsedData;
  } else if (typeof parsedData === 'object') {
    // Grouped by filename - flatten it
    console.log('Detected grouped format, flattening...');
    for (const [filename, companies] of Object.entries(parsedData)) {
      if (Array.isArray(companies)) {
        data.push(...companies);
      }
    }
  } else {
    throw new Error('Invalid JSON format: expected array or object');
  }
  
  console.log(`Loaded ${data.length} companies from ${jsonFilePath}\n`);
  return data;
}

async function matchAndUpdate(industritorgetCompanies: IndustritorgetCompany[], isDryRun: boolean = false) {
  console.log('=== Matching and Updating Companies ===\n');
  
  // Get all companies from our database
  const ourCompanies = await db.query.companies.findMany({
    columns: {
      id: true,
      name: true,
      website: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      contactEmail: true
    }
  });
  
  console.log(`Companies in our database: ${ourCompanies.length}`);
  console.log(`Companies from Industritorget: ${industritorgetCompanies.length}\n`);
  
  let matchedCount = 0;
  let updatedCount = 0;
  const matches: Array<{
    our: string;
    their: string;
    updates: string[];
    updateData: any;
    companyId: string;
  }> = [];
  
  // Track which database companies have been matched to avoid duplicates
  const matchedCompanyIds = new Set<string>();
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved to database\n');
  }
  
  for (const indCompany of industritorgetCompanies) {
    // Find matching company in our database (that hasn't been matched yet)
    // Try exact match first, then fuzzy
    let match = ourCompanies.find(ourCompany => 
      !matchedCompanyIds.has(ourCompany.id) && 
      normalizeCompanyName(ourCompany.name) === normalizeCompanyName(indCompany.name)
    );
    
    // Only do fuzzy matching if exact match failed
    if (!match) {
      match = ourCompanies.find(ourCompany => 
        !matchedCompanyIds.has(ourCompany.id) && 
        fuzzyMatch(ourCompany.name, indCompany.name)
      );
    }
    
    if (match) {
      matchedCount++;
      matchedCompanyIds.add(match.id); // Mark this company as matched
      const updates: string[] = [];
      const updateData: Partial<typeof schema.companies.$inferInsert> = {};
      
      // Check what needs updating
      if (indCompany.website && (!match.website || match.website === '')) {
        updateData.website = indCompany.website;
        updates.push(`website: ${indCompany.website}`);
      }
      
      if (indCompany.phone && (!match.phone || match.phone === '')) {
        updateData.phone = indCompany.phone;
        updates.push(`phone: ${indCompany.phone}`);
      }
      
      if (indCompany.address && (!match.address || match.address === '')) {
        updateData.address = indCompany.address;
        updates.push(`address: ${indCompany.address}`);
      }
      
      if (indCompany.city && (!match.city || match.city === '')) {
        updateData.city = indCompany.city;
        updates.push(`city: ${indCompany.city}`);
      }
      
      if (indCompany.postalCode && (!match.postalCode || match.postalCode === '')) {
        updateData.postalCode = indCompany.postalCode;
        updates.push(`postalCode: ${indCompany.postalCode}`);
      }
      
      // Note: Email addresses from Industritorget - but we're being careful
      // Only add if we have a source and it's not a placeholder
      // Actually, let's skip emails for now since we just removed all placeholder emails
      // The user can decide later if they want to add emails from Industritorget
      
      if (Object.keys(updateData).length > 0) {
        updatedCount++;
        matches.push({
          our: match.name,
          their: indCompany.name,
          updates: updates,
          updateData: updateData,
          companyId: match.id
        });
        
        // Only actually update if not dry-run
        if (!isDryRun) {
          await db.update(schema.companies)
            .set(updateData)
            .where(eq(schema.companies.id, match.id));
        }
      }
    }
  }
  
  console.log(`\n=== Results ===`);
  console.log(`Matched companies: ${matchedCount}`);
  if (isDryRun) {
    console.log(`Would update companies: ${updatedCount} (DRY RUN - no changes made)\n`);
  } else {
    console.log(`Updated companies: ${updatedCount}\n`);
  }
  
  if (matches.length > 0) {
    console.log('Sample updates (first 20):');
    matches.slice(0, 20).forEach((match, index) => {
      console.log(`${index + 1}. ${match.our} ← ${match.their}`);
      console.log(`   Updates: ${match.updates.join(', ')}`);
    });
    if (matches.length > 20) {
      console.log(`... and ${matches.length - 20} more`);
    }
  }
  
  return { matchedCount, updatedCount, matches };
}

async function main() {
  try {
    const jsonFile = process.argv[2] || 'industritorget-data.json';
    const isDryRun = process.argv.includes('--dry-run');
    
    console.log('=== Industritorget Data Scraper & Updater ===\n');
    
    let industritorgetCompanies: IndustritorgetCompany[];
    
    if (process.argv.includes('--create-template')) {
      await processProvidedData(jsonFile);
      return;
    }
    
    // Try to read from JSON file
    if (fs.existsSync(jsonFile)) {
      industritorgetCompanies = await processProvidedData(jsonFile);
    } else {
      console.log(`No data file found: ${jsonFile}`);
      console.log('Run with --create-template to create a template file.\n');
      console.log('To extract data from Industritorget.se:');
      console.log('1. Use a browser extension like "Web Scraper" or "Data Miner"');
      console.log('2. Or copy HTML from the pages and parse it');
      console.log('3. Save as JSON with structure:');
      console.log('   [{ "name": "Company AB", "website": "company.se", ... }]');
      return;
    }
    
    if (industritorgetCompanies.length === 0) {
      console.log('No data to process. Exiting.');
      return;
    }
    
    // Match and update
    const result = await matchAndUpdate(industritorgetCompanies, isDryRun);
    
    // Final stats
    const finalStats = await db.query.companies.findMany({
      columns: {
        website: true,
        phone: true
      }
    });
    
    console.log('\n=== Final Statistics ===');
    console.log(`Companies with websites: ${finalStats.filter(c => c.website && c.website !== '').length}`);
    console.log(`Companies with phone numbers: ${finalStats.filter(c => c.phone && c.phone !== '').length}`);
    
    if (isDryRun) {
      console.log('\n💡 To apply these changes, run without --dry-run flag:');
      console.log(`   DATABASE_URL="..." npx tsx scripts/scrape-industritorget-and-update.ts master_companies.json`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main();

