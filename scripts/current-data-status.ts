import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull, ne, and, or, isNull, eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function currentDataStatus() {
  try {
    console.log('=== Current Database Status ===\n');

    const allCompanies = await db.query.companies.findMany({
      columns: {
        name: true,
        contactEmail: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        postalCode: true
      }
    });

    const stats = {
      total: allCompanies.length,
      withEmails: allCompanies.filter(c => c.contactEmail && c.contactEmail !== '').length,
      withoutEmails: allCompanies.filter(c => !c.contactEmail || c.contactEmail === '').length,
      withWebsites: allCompanies.filter(c => c.website && c.website !== '').length,
      withoutWebsites: allCompanies.filter(c => !c.website || c.website === '').length,
      withPhones: allCompanies.filter(c => c.phone && c.phone !== '').length,
      withoutPhones: allCompanies.filter(c => !c.phone || c.phone === '').length,
      withAddress: allCompanies.filter(c => (c.address && c.address !== '') || (c.postalCode && c.city)).length,
      withoutAddress: allCompanies.filter(c => (!c.address || c.address === '') && (!c.postalCode || !c.city)).length,
      // Companies with websites but no emails (could potentially generate emails)
      withWebsiteNoEmail: allCompanies.filter(c => 
        (c.website && c.website !== '') && (!c.contactEmail || c.contactEmail === '')
      ).length
    };

    console.log(`Total companies: ${stats.total}\n`);
    
    console.log('📧 Email Addresses:');
    console.log(`   With emails: ${stats.withEmails}`);
    console.log(`   Without emails: ${stats.withoutEmails} (will show "E-postadress saknas")`);
    console.log(`   Companies with websites but no email: ${stats.withWebsiteNoEmail}`);
    
    console.log('\n🌐 Websites:');
    console.log(`   With websites: ${stats.withWebsites}`);
    console.log(`   Without websites: ${stats.withoutWebsites}`);
    
    console.log('\n📞 Phone Numbers:');
    console.log(`   With phones: ${stats.withPhones}`);
    console.log(`   Without phones: ${stats.withoutPhones}`);
    
    console.log('\n📍 Addresses:');
    console.log(`   With addresses: ${stats.withAddress}`);
    console.log(`   Without addresses: ${stats.withoutAddress}`);

    console.log('\n=== Recommendation ===');
    console.log('Current state: All companies show "E-postadress saknas" which is honest and correct.');
    console.log('Next step: Focus on getting companies to claim their profiles.');
    console.log(`There are ${stats.withWebsiteNoEmail} companies with websites - these are good candidates`);
    console.log('for companies to claim, as they have an online presence.\n');

    console.log('=== Action Items ===');
    console.log('1. ✅ UI shows "E-postadress saknas" for missing emails (DONE)');
    console.log('2. ⏳ Encourage companies to claim profiles via "Äger du detta företag?" button');
    console.log('3. ⏳ Consider outreach to companies with websites (they have online presence)');
    console.log('4. ⏳ Monitor claim requests and help companies update their information');

  } catch (error) {
    console.error('Error checking data status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

currentDataStatus();



