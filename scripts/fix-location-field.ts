import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function fixLocationField() {
  console.log("Fixing location field for all companies...");
  
  // Update location field by combining address, postal code, and city
  const result = await db.execute(sql`
    UPDATE companies 
    SET location = CASE 
      WHEN address IS NOT NULL AND postal_code IS NOT NULL AND city IS NOT NULL 
      THEN address || ', ' || postal_code || ' ' || city
      WHEN address IS NOT NULL AND city IS NOT NULL 
      THEN address || ', ' || city
      WHEN address IS NOT NULL 
      THEN address
      WHEN city IS NOT NULL 
      THEN city
      ELSE 'Sverige'
    END
    WHERE location = '' OR location IS NULL
  `);
  
  console.log(`Updated ${result.rowCount} companies`);
  
  // Check a few examples
  console.log('\nChecking updated data:');
  const examples = await db.select({
    name: companies.name,
    address: companies.address,
    postalCode: companies.postalCode,
    city: companies.city,
    location: companies.location
  }).from(companies).limit(5);
  
  examples.forEach(company => {
    console.log(`\n${company.name}:`);
    console.log(`  Location: "${company.location}"`);
  });
}

fixLocationField().catch(console.error);
