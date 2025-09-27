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
  address?: string;
  postalCode?: string;
  city?: string;
}

async function updateContactInformation() {
  try {
    console.log('Updating contact information for researched companies...\n');

    // Contact updates based on web research
    const contactUpdates: ContactUpdate[] = [
      {
        name: 'UCB Sweden AB',
        website: 'https://www.unitedcastbar.com/locations/ucb-sweden-ab',
        address: 'Baravägen 7',
        postalCode: '613 41',
        city: 'Oxelösund'
      },
      {
        name: 'Pentronic AB',
        website: 'https://www.pentronic.se',
        phone: '+46 490-258500',
        address: 'Bergsliden 1',
        postalCode: '593 96',
        city: 'Västervik'
      },
      {
        name: 'VIMAB AB',
        website: 'https://www.vimab.se',
        phone: '+46 141-237750',
        address: 'Björnvägen 6',
        postalCode: '591 52',
        city: 'Motala'
      },
      {
        name: 'VMB Västerås Maskinbyggarcenter AB',
        website: 'https://vmb.se',
        phone: '+46 21-120899',
        address: 'Tallmätargatan 1C',
        postalCode: '721 34',
        city: 'Västerås'
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
          // Prepare update data - only update fields that are provided and currently empty
          const updateData: any = {};
          
          if (update.website && (!existingCompany.website || existingCompany.website === '')) {
            updateData.website = update.website;
          }
          
          if (update.phone && (!existingCompany.phone || existingCompany.phone === '')) {
            updateData.phone = update.phone;
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

    console.log('\n=== Contact Information Update Summary ===');
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
      for (const update of contactUpdates.slice(0, 3)) {
        const company = await db.query.companies.findFirst({
          where: eq(schema.companies.name, update.name)
        });
        
        if (company) {
          console.log(`${company.name} (${company.location})`);
          if (company.website) console.log(`  Website: ${company.website}`);
          if (company.phone) console.log(`  Phone: ${company.phone}`);
          if (company.address) console.log(`  Address: ${company.address}, ${company.postalCode} ${company.city}`);
          console.log('');
        }
      }
    }

  } catch (error) {
    console.error('Error updating contact information:', error);
  } finally {
    await pool.end();
  }
}

updateContactInformation();