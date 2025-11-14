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

async function exportCompaniesWithWebsites() {
  try {
    console.log('=== Exporting Companies with Websites ===\n');

    // Get all companies with website addresses
    const companiesWithWebsites = await db.query.companies.findMany({
      where: and(
        isNotNull(schema.companies.website),
        ne(schema.companies.website, '')
      ),
      columns: {
        id: true,
        name: true,
        website: true,
        slug: true,
        contactEmail: true,
        phone: true
      },
      orderBy: (companies, { asc }) => [asc(companies.name)]
    });

    console.log(`Found ${companiesWithWebsites.length} companies with website addresses\n`);

    if (companiesWithWebsites.length === 0) {
      console.log('⚠️  No companies have website addresses in the database.');
      return;
    }

    // Generate CSV: Company Name, Website, ID (for reference), Slug (for reference)
    const csvLines = [
      'Company Name,Website,Company ID,Slug,Current Email,Current Phone'
    ];

    for (const company of companiesWithWebsites) {
      // Ensure website has http/https prefix for Clay AI
      let website = company.website || '';
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }
      
      // Escape quotes in company names
      const escapedName = (company.name || '').replace(/"/g, '""');
      
      csvLines.push(
        `"${escapedName}","${website}","${company.id || ''}","${company.slug || ''}","${company.contactEmail || ''}","${company.phone || ''}"`
      );
    }

    const csvContent = csvLines.join('\n');
    const filename = `companies-with-websites-${new Date().toISOString().split('T')[0]}.csv`;
    
    fs.writeFileSync(filename, csvContent, 'utf-8');

    console.log(`✅ Exported ${companiesWithWebsites.length} companies to: ${filename}\n`);
    console.log('📋 CSV Columns:');
    console.log('   - Company Name: The company name');
    console.log('   - Website: Full URL (with https://) ready for Clay AI');
    console.log('   - Company ID: Database ID (for reference/updates)');
    console.log('   - Slug: URL slug (for reference/updates)');
    console.log('   - Current Email: Existing email if any (for comparison)');
    console.log('   - Current Phone: Existing phone if any (for reference)');
    console.log('\n💡 Next Steps:');
    console.log('   1. Import this CSV into Clay AI');
    console.log('   2. Use Clay AI to find email addresses from the websites');
    console.log('   3. Export the results from Clay AI');
    console.log('   4. Use the Company ID or Slug to update the database with new emails\n');

  } catch (error) {
    console.error('Error exporting companies:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

exportCompaniesWithWebsites();



