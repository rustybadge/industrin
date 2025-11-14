import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull, ne, and } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import * as fs from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function simpleEmailOutreach() {
  try {
    console.log('=== Simple Email Outreach List ===\n');

    // Get only companies with email addresses
    const companiesWithEmails = await db.query.companies.findMany({
      where: and(
        isNotNull(schema.companies.contactEmail),
        ne(schema.companies.contactEmail, '')
      ),
      columns: {
        name: true,
        slug: true,
        contactEmail: true
      },
      orderBy: (companies, { asc }) => [asc(companies.name)]
    });

    console.log(`Found ${companiesWithEmails.length} companies with email addresses\n`);

    if (companiesWithEmails.length === 0) {
      console.log('⚠️  No companies have email addresses in the database currently.');
      console.log('Once companies add their email addresses (or you add them), run this script again.\n');
      return;
    }

    // Generate simple CSV: Company Name, Email, Claim URL
    const csvLines = [
      'Company Name,Email,Claim URL'
    ];

    for (const company of companiesWithEmails) {
      const claimUrl = `https://industrin.net/ansokkontroll/${company.slug}`;
      csvLines.push(`"${company.name}","${company.contactEmail}","${claimUrl}"`);
    }

    const csvContent = csvLines.join('\n');
    fs.writeFileSync('companies-for-email-outreach.csv', csvContent, 'utf-8');

    console.log(`✓ Created: companies-for-email-outreach.csv`);
    console.log(`\nThis file contains ${companiesWithEmails.length} companies ready for email outreach.`);
    console.log('You can import it into your email tool (Gmail, Mailchimp, etc.)\n');

    // Show sample
    console.log('Sample (first 5 companies):');
    companiesWithEmails.slice(0, 5).forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} - ${company.contactEmail}`);
      console.log(`   Claim: https://industrin.net/ansokkontroll/${company.slug}`);
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

simpleEmailOutreach();



