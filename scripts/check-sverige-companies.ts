import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function checkSverigeCompanies() {
  console.log('Checking companies showing "Sverige" instead of city...');
  
  const result = await db.select({ 
    name: companies.name, 
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    location: companies.location
  }).from(companies).where(eq(companies.location, 'Sverige')).limit(10);
  
  console.log(`Found ${result.length} companies with location = "Sverige"`);
  
  result.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`  Address: "${company.address}"`);
    console.log(`  Postal Code: "${company.postalCode}"`);
    console.log(`  City: "${company.city}"`);
    console.log(`  Location: "${company.location}"`);
  });
  
  // Also check companies with empty city but other data
  console.log('\n\nChecking companies with empty city but other address data:');
  const emptyCityResult = await db.select({ 
    name: companies.name, 
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    location: companies.location
  }).from(companies).where(eq(companies.city, '')).limit(5);
  
  emptyCityResult.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`  Address: "${company.address}"`);
    console.log(`  Postal Code: "${company.postalCode}"`);
    console.log(`  City: "${company.city}"`);
    console.log(`  Location: "${company.location}"`);
  });
}

checkSverigeCompanies().catch(console.error);
