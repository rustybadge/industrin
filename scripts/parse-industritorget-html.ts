import * as fs from 'fs';
import * as path from 'path';

interface IndustritorgetCompany {
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

function parseIndustritorgetHTML(html: string): IndustritorgetCompany[] {
  const companies: IndustritorgetCompany[] = [];
  
  // Pattern to find company blocks - looking for the structure from the search results
  // Each company appears to be in a block with name, address, phone, website
  
  // Try to find company names (they appear as links or headings)
  const namePattern = /<a[^>]*>([^<]*AB[^<]*)<\/a>/gi;
  const nameMatches = Array.from(html.matchAll(namePattern));
  
  // Alternative: Look for the structure pattern
  // From the HTML, companies seem to follow a pattern like:
  // Company Name<br>Address<br>Phone<br>Website
  
  // Split by company blocks (this is a simplified approach)
  // Looking for patterns like: <strong>Company Name</strong> or links with AB
  
  // More sophisticated parsing based on the actual structure
  const companyBlocks = html.split(/<div[^>]*class[^>]*company[^>]*>/i);
  
  // If that doesn't work, try splitting by known patterns
  // From search results: companies have "Skicka e-post" which might be a marker
  
  for (const block of html.split(/Skicka e-post/gi)) {
    const company: Partial<IndustritorgetCompany> = {
      name: null,
      website: null,
      phone: null,
      address: null,
      city: null,
      postalCode: null
    };
    
    // Extract website - look for www. or http:// patterns
    const websiteMatch = block.match(/(?:www\.|https?:\/\/)?([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/);
    if (websiteMatch && websiteMatch[1]) {
      company.website = websiteMatch[1].toLowerCase().replace(/^www\./, '');
    }
    
    // Extract phone - Swedish phone patterns: 08-123 45 67, 070-123 45 67, etc.
    const phoneMatch = block.match(/(?:\+46|0)[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d/);
    if (phoneMatch) {
      company.phone = phoneMatch[0].trim();
    }
    
    // Extract address and postal code
    const postalCodeMatch = block.match(/(\d{3})\s*(\d{2})\s*([A-ZÄÖÅ][a-zäöå]+)/);
    if (postalCodeMatch) {
      company.postalCode = postalCodeMatch[1] + postalCodeMatch[2];
      company.city = postalCodeMatch[3];
    }
    
    // Extract company name - look for bold, links, or headings
    const nameMatch = block.match(/(?:<[^>]*>)?([A-ZÄÖÅ][^<]*AB[^<]*)(?:<\/[^>]*>)?/);
    if (nameMatch) {
      company.name = nameMatch[1].trim().replace(/<[^>]*>/g, '');
      
      if (company.name && company.name.length > 2) {
        companies.push(company as IndustritorgetCompany);
      }
    }
  }
  
  return companies.filter(c => c.name && c.name.length > 2);
}

async function main() {
  const htmlFile = process.argv[2] || 'industritorget.html';
  const outputFile = process.argv[3] || 'industritorget-data.json';
  
  console.log('=== Industritorget HTML Parser ===\n');
  
  if (!fs.existsSync(htmlFile)) {
    console.error(`HTML file not found: ${htmlFile}`);
    console.log('\nTo use this script:');
    console.log('1. Visit the Industritorget.se listing pages');
    console.log('2. Save the HTML (File > Save Page As > HTML)');
    console.log('3. Run: npx tsx scripts/parse-industritorget-html.ts <html-file> [output-json]\n');
    console.log('Or combine all pages into one HTML file.\n');
    return;
  }
  
  console.log(`Reading HTML from: ${htmlFile}`);
  const html = fs.readFileSync(htmlFile, 'utf-8');
  
  console.log('Parsing HTML...');
  const companies = parseIndustritorgetHTML(html);
  
  console.log(`\nFound ${companies.length} companies`);
  
  // Save to JSON
  fs.writeFileSync(outputFile, JSON.stringify(companies, null, 2));
  console.log(`\n✓ Saved to: ${outputFile}`);
  console.log(`\nNext step: Run the update script:`);
  console.log(`  npx tsx scripts/scrape-industritorget-and-update.ts ${outputFile}\n`);
  
  // Show sample
  if (companies.length > 0) {
    console.log('Sample (first 5 companies):');
    companies.slice(0, 5).forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log(`   Phone: ${company.phone || 'N/A'}`);
      console.log(`   Address: ${company.address || 'N/A'}`);
    });
  }
}

main();



