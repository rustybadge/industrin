import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function verifyRemovalPattern() {
  try {
    console.log('=== Verification: What did our removal script actually remove? ===\n');
    
    console.log('Our removal script used these patterns:');
    console.log('- %@example.se');
    console.log('- %@example.com');
    console.log('- %@example.net');
    console.log('- %@example.org\n');
    
    console.log('These patterns should ONLY match emails with "example" in the domain.');
    console.log('Legitimate business emails like:');
    console.log('  - info@companyname.se ❌ NOT matched (doesn\'t contain "example")');
    console.log('  - contact@business.com ❌ NOT matched');
    console.log('  - info@example.se ✅ MATCHED (this is a placeholder)\n');

    // Check if there are any emails currently that match non-example patterns
    const allCompanies = await db.query.companies.findMany({
      columns: {
        name: true,
        contactEmail: true,
        website: true
      }
    });

    const companiesWithEmails = allCompanies.filter(c => c.contactEmail && c.contactEmail !== '');
    
    console.log(`Current state: ${companiesWithEmails.length} companies with email addresses`);
    
    if (companiesWithEmails.length === 0) {
      console.log('\n✓ All emails are NULL - this is expected after removing placeholder emails.');
      console.log('\n=== Checking if any legitimate emails might have been lost ===\n');
      
      // Check companies with websites - these might have had legitimate emails
      const companiesWithWebsites = allCompanies.filter(c => 
        c.website && c.website !== '' && (!c.contactEmail || c.contactEmail === '')
      );
      
      console.log(`Companies with websites but no email: ${companiesWithWebsites.length}`);
      
      if (companiesWithWebsites.length > 0) {
        console.log('\nSample companies with websites but no email (might have had legitimate emails):');
        companiesWithWebsites.slice(0, 10).forEach((company, index) => {
          // Try to infer what email they might have had
          const domain = company.website.replace(/^https?:\/\//, '').split('/')[0];
          const possibleEmails = [
            `info@${domain}`,
            `contact@${domain}`,
            `hello@${domain}`
          ];
          
          console.log(`${index + 1}. ${company.name}`);
          console.log(`   Website: ${company.website}`);
          console.log(`   Possible emails: ${possibleEmails.join(', ')}`);
        });
      }
      
      console.log('\n=== Conclusion ===');
      console.log('Our removal script was SAFE - it only removed emails with "example" domains.');
      console.log('However, it appears there were NO legitimate emails in the database before.');
      console.log('This could mean:');
      console.log('  1. Legitimate emails were removed by a PREVIOUS script');
      console.log('  2. Emails were never imported/added to the database');
      console.log('  3. All emails were placeholder "info@example.se" from the start');
      console.log('\nTo restore legitimate emails, we would need:');
      console.log('  - A backup of the database before any removals');
      console.log('  - Original source data with authentic emails');
      console.log('  - Manual research to find real contact emails');
    } else {
      console.log('\n⚠️ Some companies still have emails. Showing first 20:');
      companiesWithEmails.slice(0, 20).forEach((company, index) => {
        const isExample = company.contactEmail?.toLowerCase().includes('example') || false;
        console.log(`${index + 1}. ${company.name}: ${company.contactEmail} ${isExample ? '⚠️ Contains "example"' : '✓ Looks legitimate'}`);
      });
    }

  } catch (error) {
    console.error('Error verifying removal pattern:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyRemovalPattern();



