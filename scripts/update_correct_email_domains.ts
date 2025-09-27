import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { like, and, isNotNull, ne, eq } from 'drizzle-orm';
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
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain.includes('.') && domain.length > 3 ? domain : null;
  } catch (error) {
    return null;
  }
}

async function updateCorrectEmailDomains() {
  try {
    console.log('Updating email addresses to use correct website domains...\n');

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

    const updates: Array<{
      id: string;
      name: string;
      oldEmail: string;
      newEmail: string;
      domain: string;
    }> = [];

    for (const company of companiesWithFakeEmails) {
      const realDomain = extractDomainFromWebsite(company.website);
      
      if (realDomain) {
        const correctEmail = `info@${realDomain}`;
        
        if (company.contactEmail !== correctEmail) {
          updates.push({
            id: company.id,
            name: company.name,
            oldEmail: company.contactEmail,
            newEmail: correctEmail,
            domain: realDomain
          });
        }
      }
    }

    console.log(`Found ${updates.length} companies to update with correct email domains`);

    let updatedCount = 0;
    for (const update of updates) {
      try {
        await db.update(schema.companies)
          .set({ contactEmail: update.newEmail })
          .where(eq(schema.companies.id, update.id));

        console.log(`✓ ${update.name}: ${update.oldEmail} → ${update.newEmail}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Error updating ${update.name}:`, error);
      }
    }

    console.log('\n=== Email Domain Correction Summary ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`📊 Total processed: ${updates.length}`);

    // Show domain distribution
    const domainStats = {
      '.se': updates.filter(u => u.domain.endsWith('.se')).length,
      '.com': updates.filter(u => u.domain.endsWith('.com')).length,
      '.net': updates.filter(u => u.domain.endsWith('.net')).length,
      'other': updates.filter(u => !u.domain.endsWith('.se') && !u.domain.endsWith('.com') && !u.domain.endsWith('.net')).length
    };

    console.log('\n=== Updated Domain Types ===');
    console.log(`Swedish domains (.se): ${domainStats['.se']}`);
    console.log(`International domains (.com): ${domainStats['.com']}`);
    console.log(`Network domains (.net): ${domainStats['.net']}`);
    console.log(`Other domains: ${domainStats['other']}`);

    // Final verification
    const finalStats = await db.query.companies.findMany({
      columns: {
        contactEmail: true,
        website: true
      }
    });

    const emailStats = {
      total: finalStats.length,
      withEmails: finalStats.filter(c => c.contactEmail && c.contactEmail !== '').length,
      withWebsites: finalStats.filter(c => c.website && c.website !== '').length
    };

    console.log('\n=== Final Contact Data Status ===');
    console.log(`Total companies: ${emailStats.total}`);
    console.log(`Companies with emails: ${emailStats.withEmails}`);
    console.log(`Companies with websites: ${emailStats.withWebsites}`);

  } catch (error) {
    console.error('Error updating email domains:', error);
  } finally {
    await pool.end();
  }
}

updateCorrectEmailDomains();