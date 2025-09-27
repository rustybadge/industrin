import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, and, isNotNull, ne } from 'drizzle-orm';
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
    
    return domain.includes('.') && domain.length > 3 ? domain : null;
  } catch (error) {
    return null;
  }
}

async function findMismatchedEmailDomains() {
  try {
    console.log('Finding companies with fake email domains that don\'t match their real websites...\n');

    // Find companies with fake .se emails but real websites
    const companiesWithFakeEmails = await db.query.companies.findMany({
      where: and(
        like(schema.companies.contactEmail, 'info@%.se'),
        isNotNull(schema.companies.website),
        ne(schema.companies.website, '')
      ),
      columns: {
        id: true,
        name: true,
        contactEmail: true,
        website: true,
        location: true
      }
    });

    console.log(`Found ${companiesWithFakeEmails.length} companies with .se email addresses and websites`);

    const mismatchedCompanies: Array<{
      name: string;
      location: string;
      currentEmail: string;
      website: string;
      correctEmail: string;
      domain: string;
    }> = [];

    for (const company of companiesWithFakeEmails) {
      const realDomain = extractDomainFromWebsite(company.website);
      
      if (realDomain) {
        const correctEmail = `info@${realDomain}`;
        
        // Check if current email doesn't match the real domain
        if (company.contactEmail !== correctEmail) {
          mismatchedCompanies.push({
            name: company.name,
            location: company.location,
            currentEmail: company.contactEmail,
            website: company.website,
            correctEmail: correctEmail,
            domain: realDomain
          });
        }
      }
    }

    console.log(`\n${mismatchedCompanies.length} companies have email domains that don't match their websites`);
    
    console.log('\n=== Examples of Mismatched Email Domains ===');
    mismatchedCompanies.slice(0, 10).forEach(company => {
      console.log(`• ${company.name} (${company.location})`);
      console.log(`  Website: ${company.website}`);
      console.log(`  Current (wrong): ${company.currentEmail}`);
      console.log(`  Should be: ${company.correctEmail}`);
      console.log('');
    });

    if (mismatchedCompanies.length > 10) {
      console.log(`... and ${mismatchedCompanies.length - 10} more companies with mismatched domains`);
    }

    console.log('\n=== Domain Distribution ===');
    const domainTypes = {
      '.se': mismatchedCompanies.filter(c => c.domain.endsWith('.se')).length,
      '.com': mismatchedCompanies.filter(c => c.domain.endsWith('.com')).length,
      '.net': mismatchedCompanies.filter(c => c.domain.endsWith('.net')).length,
      'other': mismatchedCompanies.filter(c => !c.domain.endsWith('.se') && !c.domain.endsWith('.com') && !c.domain.endsWith('.net')).length
    };

    console.log(`Real Swedish domains (.se): ${domainTypes['.se']}`);
    console.log(`Real International domains (.com): ${domainTypes['.com']}`);
    console.log(`Real Network domains (.net): ${domainTypes['.net']}`);
    console.log(`Other real domains: ${domainTypes['other']}`);

    console.log('\n=== Summary ===');
    console.log(`${mismatchedCompanies.length} companies need email domain corrections`);
    console.log('These corrections will use actual company domains instead of generated fake ones');
    
    return mismatchedCompanies;

  } catch (error) {
    console.error('Error finding mismatched email domains:', error);
  } finally {
    await pool.end();
  }
}

findMismatchedEmailDomains();