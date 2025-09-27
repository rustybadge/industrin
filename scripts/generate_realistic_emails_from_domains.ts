import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNull, and, isNotNull, ne } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

function extractDomainFromWebsite(website: string): string | null {
  try {
    // Clean up the website URL
    let url = website.trim();
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    
    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    // Basic validation - ensure it looks like a real domain
    if (domain.includes('.') && domain.length > 3 && !domain.includes(' ')) {
      return domain;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function generateRealisticEmailsFromDomains() {
  try {
    console.log('Finding companies with NULL emails but genuine website domains...\n');

    // Find companies with NULL email but valid website
    const companiesWithWebsitesNoEmail = await db.query.companies.findMany({
      where: and(
        isNull(schema.companies.contactEmail),
        isNotNull(schema.companies.website),
        ne(schema.companies.website, '')
      ),
      columns: {
        id: true,
        name: true,
        website: true,
        location: true
      }
    });

    console.log(`Found ${companiesWithWebsitesNoEmail.length} companies with websites but no email`);

    const proposedEmails: Array<{
      name: string;
      location: string;
      website: string;
      domain: string;
      proposedEmail: string;
    }> = [];

    let validDomainCount = 0;

    for (const company of companiesWithWebsitesNoEmail) {
      const domain = extractDomainFromWebsite(company.website);
      
      if (domain) {
        const proposedEmail = `info@${domain}`;
        proposedEmails.push({
          name: company.name,
          location: company.location,
          website: company.website,
          domain: domain,
          proposedEmail: proposedEmail
        });
        validDomainCount++;
      }
    }

    console.log(`\n${validDomainCount} companies have valid domains for email generation`);
    
    console.log('\n=== Sample Proposed Email Addresses ===');
    proposedEmails.slice(0, 10).forEach(company => {
      console.log(`• ${company.name} (${company.location})`);
      console.log(`  Website: ${company.website}`);
      console.log(`  Proposed email: ${company.proposedEmail}`);
      console.log('');
    });

    if (proposedEmails.length > 10) {
      console.log(`... and ${proposedEmails.length - 10} more companies`);
    }

    console.log('\n=== Domain Analysis ===');
    const domainTypes = {
      '.se': proposedEmails.filter(c => c.domain.endsWith('.se')).length,
      '.com': proposedEmails.filter(c => c.domain.endsWith('.com')).length,
      '.net': proposedEmails.filter(c => c.domain.endsWith('.net')).length,
      'other': proposedEmails.filter(c => !c.domain.endsWith('.se') && !c.domain.endsWith('.com') && !c.domain.endsWith('.net')).length
    };

    console.log(`Swedish domains (.se): ${domainTypes['.se']}`);
    console.log(`International domains (.com): ${domainTypes['.com']}`);
    console.log(`Network domains (.net): ${domainTypes['.net']}`);
    console.log(`Other domains: ${domainTypes['other']}`);

    console.log('\n=== Ready to Apply ===');
    console.log(`Would update ${proposedEmails.length} companies with realistic email addresses`);
    console.log('These emails use actual company domains, making them much more likely to be correct');

    return proposedEmails;

  } catch (error) {
    console.error('Error generating realistic emails:', error);
  } finally {
    await pool.end();
  }
}

generateRealisticEmailsFromDomains();