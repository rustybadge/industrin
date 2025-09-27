import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function checkCompanyData() {
  console.log("Checking company data for AB Eica-Bolaget...");
  
  const result = await db.select({ 
    name: companies.name, 
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    location: companies.location
  }).from(companies).where(eq(companies.name, 'AB Eica-Bolaget')).limit(1);
  
  if (result.length > 0) {
    console.log('\nDatabase data for AB Eica-Bolaget:');
    console.log(JSON.stringify(result[0], null, 2));
  } else {
    console.log('Company not found');
  }
  
  // Also check a few other companies to see the pattern
  console.log('\n\nChecking a few more companies:');
  const moreResults = await db.select({ 
    name: companies.name, 
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    location: companies.location
  }).from(companies).limit(5);
  
  moreResults.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`  Address: "${company.address}"`);
    console.log(`  Postal Code: "${company.postalCode}"`);
    console.log(`  City: "${company.city}"`);
    console.log(`  Location: "${company.location}"`);
  });
}

checkCompanyData().catch(console.error);
