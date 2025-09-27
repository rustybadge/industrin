import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql, isNotNull } from "drizzle-orm";

async function checkDescriptions() {
  console.log("Checking current descriptions in database...");
  
  const result = await db.select({ 
    name: companies.name, 
    description: companies.description 
  }).from(companies).limit(5);
  
  console.log('\nCurrent descriptions in database:');
  result.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`${company.description.substring(0, 200)}...`);
  });
  
  // Check if we have Swedish descriptions
  const swedishResult = await db.select({ 
    name: companies.name, 
    description_sv: companies.description_sv 
  }).from(companies).where(isNotNull(companies.description_sv)).limit(5);
  
  console.log('\n\nSwedish descriptions in database:');
  swedishResult.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`${company.description_sv?.substring(0, 200)}...`);
  });
}

checkDescriptions().catch(console.error);
