import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNull, or, eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function identifyMissingContactData() {
  try {
    console.log('Analyzing missing contact data...\n');

    // Find companies missing websites
    const companiesWithoutWebsites = await db.query.companies.findMany({
      where: or(
        isNull(schema.companies.website),
        eq(schema.companies.website, '')
      ),
      columns: {
        name: true,
        location: true,
        categories: true
      },
      limit: 20
    });

    console.log('=== Companies Missing Websites (Sample) ===');
    companiesWithoutWebsites.forEach(company => {
      console.log(`• ${company.name} (${company.location}) - ${company.categories.slice(0, 2).join(', ')}`);
    });

    // Find companies missing phone numbers
    const companiesWithoutPhones = await db.query.companies.findMany({
      where: or(
        isNull(schema.companies.phone),
        eq(schema.companies.phone, '')
      ),
      columns: {
        name: true,
        location: true,
        categories: true
      },
      limit: 15
    });

    console.log('\n=== Companies Missing Phone Numbers (Sample) ===');
    companiesWithoutPhones.forEach(company => {
      console.log(`• ${company.name} (${company.location}) - ${company.categories.slice(0, 2).join(', ')}`);
    });

    // Priority companies (major industrial players)
    const priorityCompanies = await db.query.companies.findMany({
      where: or(
        isNull(schema.companies.website),
        eq(schema.companies.website, '')
      ),
      columns: {
        name: true,
        location: true,
        categories: true
      }
    });

    const majorIndustrialCompanies = priorityCompanies.filter(company => 
      company.name.includes('AB') && (
        company.name.includes('Industri') ||
        company.name.includes('Teknik') ||
        company.name.includes('Service') ||
        company.name.includes('Automation') ||
        company.name.includes('Maskin')
      )
    ).slice(0, 10);

    console.log('\n=== Priority Companies for Contact Data Collection ===');
    majorIndustrialCompanies.forEach(company => {
      console.log(`• ${company.name} (${company.location}) - ${company.categories.slice(0, 2).join(', ')}`);
    });

    console.log('\n=== Recommendations ===');
    console.log('1. Start with priority companies (major industrial players)');
    console.log('2. Focus on companies with complete descriptions but missing contact data');
    console.log('3. Use systematic web research to find official websites');
    console.log('4. Extract phone numbers and email addresses from company websites');
    console.log('5. Create batch update scripts for efficient data population');

  } catch (error) {
    console.error('Error analyzing missing contact data:', error);
  } finally {
    await pool.end();
  }
}

identifyMissingContactData();