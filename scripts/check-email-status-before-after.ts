import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import * as fs from 'fs';
import * as path from 'path';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function checkEmailStatus() {
  try {
    console.log('=== Checking Current Email Status ===\n');

    // Get all companies currently in database
    const allCompanies = await db.query.companies.findMany({
      columns: {
        id: true,
        name: true,
        contactEmail: true,
        website: true,
        phone: true
      }
    });

    console.log(`Total companies in database: ${allCompanies.length}`);
    console.log(`Companies with email addresses: ${allCompanies.filter(c => c.contactEmail && c.contactEmail !== '').length}`);
    console.log(`Companies without email addresses: ${allCompanies.filter(c => !c.contactEmail || c.contactEmail === '').length}\n`);

    // Show companies that have emails (should be 0 if we removed all example.se)
    const companiesWithEmails = allCompanies.filter(c => c.contactEmail && c.contactEmail !== '');
    if (companiesWithEmails.length > 0) {
      console.log('=== Companies that STILL have emails ===');
      companiesWithEmails.slice(0, 20).forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}: ${company.contactEmail}`);
      });
    }

    // Check CSV files for original email data
    console.log('\n=== Checking CSV files for original email addresses ===');
    
    const csvFiles = [
      'companies_export.csv',
      'companies_for_translation.csv',
      'companies_for_translation_bilingual.csv'
    ];

    let csvEmailCount = 0;
    let csvEmails: Array<{name: string, email: string}> = [];

    for (const csvFile of csvFiles) {
      const csvPath = path.join(process.cwd(), csvFile);
      if (fs.existsSync(csvPath)) {
        console.log(`\nReading ${csvFile}...`);
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0]?.split(',').map(h => h.trim()) || [];
        
        // Find email column index
        const emailColIndex = headers.findIndex(h => 
          h.toLowerCase().includes('email') || 
          h.toLowerCase().includes('contact_email') ||
          h.toLowerCase().includes('e-mail')
        );

        if (emailColIndex === -1) {
          console.log(`  No email column found in ${csvFile}`);
          continue;
        }

        // Find name column index
        const nameColIndex = headers.findIndex(h => 
          h.toLowerCase().includes('name') && 
          !h.toLowerCase().includes('email')
        );

        // Parse CSV (basic parsing, may need adjustment)
        for (let i = 1; i < Math.min(lines.length, 100); i++) {
          const line = lines[i];
          if (!line || line.trim() === '') continue;
          
          // Basic CSV parsing (assuming comma-separated)
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (values[emailColIndex] && values[emailColIndex] !== '' && !values[emailColIndex].includes('example')) {
            const email = values[emailColIndex];
            const name = nameColIndex >= 0 ? values[nameColIndex] : 'Unknown';
            
            // Check if this email is NOT an example email
            if (!email.toLowerCase().includes('example')) {
              csvEmailCount++;
              if (csvEmails.length < 20) {
                csvEmails.push({ name, email });
              }
            }
          }
        }
      }
    }

    console.log(`\nFound ${csvEmailCount} potentially authentic emails in CSV files (excluding example emails)`);
    if (csvEmails.length > 0) {
      console.log('\nSample emails from CSV:');
      csvEmails.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.name}: ${entry.email}`);
      });
    }

    // Check companies with websites but no emails - these might have had authentic emails
    const companiesWithWebsitesButNoEmails = allCompanies.filter(c => 
      (c.website && c.website !== '') && 
      (!c.contactEmail || c.contactEmail === '')
    );

    console.log(`\n=== Companies with websites but NO email addresses ===`);
    console.log(`Total: ${companiesWithWebsitesButNoEmails.length}`);
    if (companiesWithWebsitesButNoEmails.length > 0) {
      console.log('\nFirst 10 examples:');
      companiesWithWebsitesButNoEmails.slice(0, 10).forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}: website: ${company.website}, email: ${company.contactEmail || 'NULL'}`);
      });
    }

    console.log('\n=== Analysis ===');
    console.log('If there were authentic emails before, they may have been:');
    console.log('1. Removed by a previous cleanup script');
    console.log('2. Never imported from the CSV files');
    console.log('3. Set to NULL during data migration');
    console.log('\nOur recent removal script ONLY removed emails with "example" in the domain.');
    console.log('This should NOT have affected any legitimate business emails.');

  } catch (error) {
    console.error('Error checking email status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkEmailStatus();



