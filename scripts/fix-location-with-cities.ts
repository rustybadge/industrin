import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function fixLocationWithCities() {
  console.log("Updating location field to use city names when available...");
  
  // Update location field to use city when location is "Sverige" but city exists
  const result = await db.execute(sql`
    UPDATE companies 
    SET location = city
    WHERE location = 'Sverige' AND city IS NOT NULL AND city != ''
  `);
  
  console.log(`Updated ${result.rowCount} companies to show city instead of "Sverige"`);
  
  // Check remaining companies with "Sverige"
  const remaining = await db.execute(sql`
    SELECT COUNT(*) as count FROM companies WHERE location = 'Sverige'
  `);
  
  console.log(`Companies still showing "Sverige": ${remaining.rows[0].count}`);
  
  // Show a few examples
  console.log('\nChecking updated companies:');
  const examples = await db.select({
    name: companies.name,
    city: companies.city,
    location: companies.location
  }).from(companies).where(sql`city IS NOT NULL AND city != ''`).limit(5);
  
  examples.forEach(company => {
    console.log(`${company.name}: ${company.location}`);
  });
}

fixLocationWithCities().catch(console.error);
