import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull, ne, or, and } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import * as fs from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface CompanyOutreach {
  name: string;
  slug: string;
  profileUrl: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  contactMethod: string; // "email", "website", "phone", "none"
  claimUrl: string;
}

async function exportCompaniesForOutreach() {
  try {
    console.log('=== Exporting Companies for Outreach ===\n');

    const allCompanies = await db.query.companies.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        website: true,
        phone: true,
        contactEmail: true,
        city: true,
        region: true
      },
      orderBy: (companies, { asc }) => [asc(companies.name)]
    });

    console.log(`Found ${allCompanies.length} companies in database\n`);

    const outreachData: CompanyOutreach[] = allCompanies.map(company => {
      const hasEmail = !!(company.contactEmail && company.contactEmail !== '');
      const hasWebsite = !!(company.website && company.website !== '');
      const hasPhone = !!(company.phone && company.phone !== '');
      
      let contactMethod = 'none';
      if (hasEmail) contactMethod = 'email';
      else if (hasWebsite) contactMethod = 'website';
      else if (hasPhone) contactMethod = 'phone';

      return {
        name: company.name,
        slug: company.slug,
        profileUrl: `https://industrin.net/companies/${company.slug}`,
        website: company.website || null,
        phone: company.phone || null,
        email: company.contactEmail || null,
        city: company.city || null,
        region: company.region || null,
        hasWebsite,
        hasPhone,
        hasEmail,
        contactMethod,
        claimUrl: `https://industrin.net/ansokkontroll/${company.slug}`
      };
    });

    // Generate CSV
    const csvLines = [
      // Header
      'Company Name,Slug,Profile URL,Website,Phone,Email,City,Region,Has Website,Has Phone,Has Email,Contact Method,Claim URL'
    ];

    for (const company of outreachData) {
      const escapeCSV = (str: string | null) => {
        if (!str) return '';
        return `"${str.replace(/"/g, '""')}"`;
      };

      csvLines.push([
        escapeCSV(company.name),
        escapeCSV(company.slug),
        escapeCSV(company.profileUrl),
        escapeCSV(company.website),
        escapeCSV(company.phone),
        escapeCSV(company.email),
        escapeCSV(company.city),
        escapeCSV(company.region),
        company.hasWebsite ? 'Yes' : 'No',
        company.hasPhone ? 'Yes' : 'No',
        company.hasEmail ? 'Yes' : 'No',
        company.contactMethod,
        escapeCSV(company.claimUrl)
      ].join(','));
    }

    const csvContent = csvLines.join('\n');
    const csvFile = 'companies-outreach-list.csv';
    fs.writeFileSync(csvFile, csvContent, 'utf-8');

    // Generate statistics
    const stats = {
      total: outreachData.length,
      withEmail: outreachData.filter(c => c.hasEmail).length,
      withWebsite: outreachData.filter(c => c.hasWebsite).length,
      withPhone: outreachData.filter(c => c.hasPhone).length,
      withAnyContact: outreachData.filter(c => c.contactMethod !== 'none').length,
      withNoContact: outreachData.filter(c => c.contactMethod === 'none').length
    };

    console.log('=== Statistics ===');
    console.log(`Total companies: ${stats.total}`);
    console.log(`Companies with email: ${stats.withEmail}`);
    console.log(`Companies with website: ${stats.withWebsite}`);
    console.log(`Companies with phone: ${stats.withPhone}`);
    console.log(`Companies with any contact info: ${stats.withAnyContact}`);
    console.log(`Companies with no contact info: ${stats.withNoContact}\n`);

    // Generate prioritized lists
    console.log('=== Prioritized Outreach Lists ===\n');

    // Companies with emails (best for email outreach)
    const emailCompanies = outreachData.filter(c => c.hasEmail).slice(0, 10);
    if (emailCompanies.length > 0) {
      console.log(`Top priority: ${stats.withEmail} companies with EMAIL addresses`);
      console.log('Sample (first 5):');
      emailCompanies.slice(0, 5).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} - ${c.email}`);
      });
      console.log('');
    }

    // Companies with websites (can extract emails or use contact forms)
    const websiteCompanies = outreachData.filter(c => c.hasWebsite && !c.hasEmail).slice(0, 10);
    if (websiteCompanies.length > 0) {
      console.log(`Second priority: ${websiteCompanies.length} companies with WEBSITES (but no email)`);
      console.log('Sample (first 5):');
      websiteCompanies.slice(0, 5).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} - ${c.website}`);
      });
      console.log('');
    }

    // Companies with only phone (call them)
    const phoneOnlyCompanies = outreachData.filter(c => c.hasPhone && !c.hasWebsite && !c.hasEmail).slice(0, 10);
    if (phoneOnlyCompanies.length > 0) {
      console.log(`Third priority: ${phoneOnlyCompanies.length} companies with only PHONE numbers`);
      console.log('Sample (first 5):');
      phoneOnlyCompanies.slice(0, 5).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} - ${c.phone}`);
      });
      console.log('');
    }

    console.log(`\n✓ Exported to: ${csvFile}`);
    console.log(`\nThis CSV contains all ${stats.total} companies ready for outreach.`);
    console.log('You can import it into Google Sheets, Excel, or your email marketing tool.\n');

    // Also create separate lists by priority
    const emailList = outreachData.filter(c => c.hasEmail);
    const websiteList = outreachData.filter(c => c.hasWebsite && !c.hasEmail);
    const phoneOnlyList = outreachData.filter(c => c.hasPhone && !c.hasWebsite && !c.hasEmail);

    if (emailList.length > 0) {
      const emailCSV = [
        'Company Name,Email,Profile URL,Claim URL'
      ];
      for (const company of emailList) {
        emailCSV.push(`"${company.name}","${company.email}","${company.profileUrl}","${company.claimUrl}"`);
      }
      fs.writeFileSync('companies-with-emails.csv', emailCSV.join('\n'), 'utf-8');
      console.log(`✓ Created: companies-with-emails.csv (${emailList.length} companies)`);
    }

    if (websiteList.length > 0) {
      const websiteCSV = [
        'Company Name,Website,Profile URL,Claim URL'
      ];
      for (const company of websiteList) {
        websiteCSV.push(`"${company.name}","${company.website}","${company.profileUrl}","${company.claimUrl}"`);
      }
      fs.writeFileSync('companies-with-websites.csv', websiteCSV.join('\n'), 'utf-8');
      console.log(`✓ Created: companies-with-websites.csv (${websiteList.length} companies)`);
    }

    if (phoneOnlyList.length > 0) {
      const phoneCSV = [
        'Company Name,Phone,City,Profile URL,Claim URL'
      ];
      for (const company of phoneOnlyList) {
        phoneCSV.push(`"${company.name}","${company.phone}","${company.city || ''}","${company.profileUrl}","${company.claimUrl}"`);
      }
      fs.writeFileSync('companies-phone-only.csv', phoneCSV.join('\n'), 'utf-8');
      console.log(`✓ Created: companies-phone-only.csv (${phoneOnlyList.length} companies)`);
    }

  } catch (error) {
    console.error('Error exporting companies:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

exportCompaniesForOutreach();



