import fs from 'fs';

async function directSqlUpdate() {
  console.log("Processing JSON with direct SQL approach...");
  
  const jsonPath = 'attached_assets/updated_swedish_companies_final_1753622184586.json';
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${jsonData.length} companies from JSON file`);
  
  // Sample some companies to see what data we have
  console.log("\nSample companies:");
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const company = jsonData[i];
    console.log(`${i + 1}. ${company.name}`);
    console.log(`   Description: ${company.description ? 'YES' : 'NO'}`);
    console.log(`   Website: ${company.website || 'NO'}`);
    console.log(`   Phone: ${company.phone || 'NO'}`);
    console.log(`   Email: ${company.email || 'NO'}`);
    console.log('');
  }
  
  // Count companies with each type of data
  let withDescriptions = 0;
  let withWebsites = 0;
  let withPhones = 0;
  let withEmails = 0;
  
  for (const company of jsonData) {
    if (company.description && company.description.trim() !== '') withDescriptions++;
    if (company.website && company.website.trim() !== '' && company.website !== 'unavailable') withWebsites++;
    if (company.phone && company.phone.trim() !== '' && company.phone !== 'not available') withPhones++;
    if (company.email && company.email.trim() !== '' && company.email !== 'not available') withEmails++;
  }
  
  console.log(`Companies in JSON with:`);
  console.log(`Descriptions: ${withDescriptions}`);
  console.log(`Websites: ${withWebsites}`);
  console.log(`Phone numbers: ${withPhones}`);
  console.log(`Email addresses: ${withEmails}`);
}

directSqlUpdate().catch(console.error);