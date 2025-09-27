import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface ContactUpdate {
  name: string;
  website?: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

async function updateContactInformationBatch2() {
  try {
    console.log('Updating contact information for priority companies (Batch 2)...\n');

    // Verified contact updates from web research
    const contactUpdates: ContactUpdate[] = [
      {
        name: 'AB Västerviks Industriverktyg',
        website: 'https://www.vasterviks-industriverktyg.se',
        phone: '+46 490-10449',
        contactEmail: 'info@vasterviks-industriverktyg.se'
      },
      {
        name: 'ALGOLAN Maskin AB',
        phone: '+46 270-14395',
        address: 'Norra Hamngatan 41',
        postalCode: '826 37',
        city: 'Söderhamn'
      },
      {
        name: 'Johsjö Industri AB',
        website: 'https://www.johsjo.se',
        phone: '+46 11-31 26 30',
        contactEmail: 'info@johsjo.se',
        address: 'Zinkgatan 2',
        postalCode: '602 23',
        city: 'Norrköping'
      }
    ];

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateLog: string[] = [];

    for (const update of contactUpdates) {
      try {
        // Find existing company by name
        const existingCompany = await db.query.companies.findFirst({
          where: eq(schema.companies.name, update.name)
        });

        if (existingCompany) {
          // Prepare update data - only update fields that are provided and currently empty/null
          const updateData: any = {};
          
          if (update.website && (!existingCompany.website || existingCompany.website === '')) {
            updateData.website = update.website;
          }
          
          if (update.phone && (!existingCompany.phone || existingCompany.phone === '')) {
            updateData.phone = update.phone;
          }
          
          if (update.contactEmail && (!existingCompany.contactEmail || existingCompany.contactEmail === '')) {
            updateData.contactEmail = update.contactEmail;
          }
          
          if (update.address && (!existingCompany.address || existingCompany.address === '')) {
            updateData.address = update.address;
          }
          
          if (update.postalCode && (!existingCompany.postalCode || existingCompany.postalCode === '')) {
            updateData.postalCode = update.postalCode;
          }
          
          if (update.city && (!existingCompany.city || existingCompany.city === '')) {
            updateData.city = update.city;
          }

          // Only update if we have data to update
          if (Object.keys(updateData).length > 0) {
            await db.update(schema.companies)
              .set(updateData)
              .where(eq(schema.companies.name, update.name));

            console.log(`✓ Updated: ${update.name}`);
            const updatedFields = Object.keys(updateData).join(', ');
            updateLog.push(`${update.name} - Updated: ${updatedFields}`);
            updatedCount++;
          } else {
            console.log(`⏭ Skipped ${update.name} - all fields already populated`);
          }
        } else {
          console.log(`✗ Not found in database: ${update.name}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${update.name}:`, error);
      }
    }

    console.log('\n=== Contact Information Update Summary (Batch 2) ===');
    console.log(`✓ Companies updated: ${updatedCount}`);
    console.log(`✗ Companies not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${contactUpdates.length}`);

    if (updateLog.length > 0) {
      console.log('\n=== Update Log ===');
      updateLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show verification of updated companies
    if (updatedCount > 0) {
      console.log('\n=== Verification - Updated Contact Information ===');
      for (const update of contactUpdates) {
        const company = await db.query.companies.findFirst({
          where: eq(schema.companies.name, update.name)
        });
        
        if (company) {
          console.log(`${company.name} (${company.location})`);
          if (company.website) console.log(`  Website: ${company.website}`);
          if (company.phone) console.log(`  Phone: ${company.phone}`);
          if (company.contactEmail) console.log(`  Email: ${company.contactEmail}`);
          if (company.address) console.log(`  Address: ${company.address}, ${company.postalCode} ${company.city}`);
          console.log('');
        }
      }
    }

    // Show updated contact data statistics
    const stats = await db.query.companies.findMany({
      columns: {
        contactEmail: true,
        website: true,
        phone: true
      }
    });

    const contactStats = {
      total: stats.length,
      withEmails: stats.filter(c => c.contactEmail && c.contactEmail !== '').length,
      withWebsites: stats.filter(c => c.website && c.website !== '').length,
      withPhones: stats.filter(c => c.phone && c.phone !== '').length
    };

    console.log('\n=== Updated Contact Data Coverage ===');
    console.log(`Total companies: ${contactStats.total}`);
    console.log(`Companies with emails: ${contactStats.withEmails}`);
    console.log(`Companies with websites: ${contactStats.withWebsites}`);
    console.log(`Companies with phones: ${contactStats.withPhones}`);

  } catch (error) {
    console.error('Error updating contact information:', error);
  } finally {
    await pool.end();
  }
}

updateContactInformationBatch2();