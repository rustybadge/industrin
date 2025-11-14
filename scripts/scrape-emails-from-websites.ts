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

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Patterns to exclude (fake/placeholder emails)
const FAKE_EMAIL_PATTERNS = [
  /example\.(com|net|org|se|co\.uk)/i,
  /test@/i,
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /placeholder@/i,
  /skeleton@/i,
  /your-email@/i,
  /email@example/i,
];

interface ScrapingResult {
  companyName: string;
  website: string;
  companyId: string;
  slug: string;
  foundEmails: string[];
  pagesChecked: string[];
  status: 'success' | 'no-emails' | 'error';
  errorMessage?: string;
}

function isValidEmail(email: string): boolean {
  // Check against fake patterns
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(email)) {
      return false;
    }
  }
  return true;
}

function extractEmailsFromHTML(html: string): string[] {
  const emails = new Set<string>();
  
  // Find all email addresses
  const matches = html.match(EMAIL_REGEX);
  if (matches) {
    for (const email of matches) {
      const cleanEmail = email.toLowerCase().trim();
      if (isValidEmail(cleanEmail)) {
        emails.add(cleanEmail);
      }
    }
  }
  
  // Also check mailto: links
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const mailtoMatches = html.match(mailtoRegex);
  if (mailtoMatches) {
    for (const match of mailtoMatches) {
      const email = match.replace(/mailto:/i, '').toLowerCase().trim();
      if (isValidEmail(email)) {
        emails.add(email);
      }
    }
  }
  
  return Array.from(emails);
}

async function fetchPage(url: string): Promise<{ html: string | null; status: number }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return { html: null, status: response.status };
    }
    
    const html = await response.text();
    return { html, status: response.status };
  } catch (error: any) {
    return { html: null, status: 0 };
  }
}

async function scrapeCompanyWebsite(companyName: string, website: string, companyId: string, slug: string): Promise<ScrapingResult> {
  const result: ScrapingResult = {
    companyName,
    website,
    companyId,
    slug,
    foundEmails: [],
    pagesChecked: [],
    status: 'no-emails',
  };

  try {
    // Normalize website URL
    let baseUrl = website.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const baseDomain = new URL(baseUrl).origin;
    
    // Pages to check (Swedish + English)
    const pagesToCheck = [
      '/contact',
      '/kontakt',
      '/kontakta-oss',
      '/contact-us',
      '/about',
      '/om-oss',
      '/about-us',
      '', // Homepage
    ];
    
    for (const page of pagesToCheck) {
      const url = `${baseUrl}${page}`;
      result.pagesChecked.push(url);
      
      console.log(`  Checking: ${url}`);
      
      const { html, status } = await fetchPage(url);
      
      if (html) {
        const emails = extractEmailsFromHTML(html);
        
        if (emails.length > 0) {
          result.foundEmails.push(...emails);
          result.status = 'success';
          console.log(`  ✓ Found ${emails.length} email(s)`);
        }
      } else if (status === 404) {
        // Page doesn't exist, continue
        continue;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Remove duplicates
    result.foundEmails = [...new Set(result.foundEmails)];
    
    if (result.foundEmails.length === 0) {
      result.status = 'no-emails';
    }
    
  } catch (error: any) {
    result.status = 'error';
    result.errorMessage = error.message || 'Unknown error';
    console.log(`  ✗ Error: ${result.errorMessage}`);
  }
  
  return result;
}

async function scrapeSampleCompanies() {
  try {
    console.log('=== Web Scraping Email Finder (Sample Test) ===\n');
    
    // Get a small sample (5 companies with websites)
    const companies = await db.query.companies.findMany({
      where: and(
        isNotNull(schema.companies.website),
        ne(schema.companies.website, '')
      ),
      columns: {
        id: true,
        name: true,
        website: true,
        slug: true,
        contactEmail: true
      },
      limit: 5, // Small sample for testing
      orderBy: (companies, { asc }) => [asc(companies.name)]
    });

    console.log(`Testing on ${companies.length} companies:\n`);

    const results: ScrapingResult[] = [];

    for (const company of companies) {
      console.log(`\n📍 ${company.name}`);
      console.log(`   Website: ${company.website}`);
      console.log(`   Current email: ${company.contactEmail || 'None'}`);
      
      const result = await scrapeCompanyWebsite(
        company.name,
        company.website!,
        company.id,
        company.slug
      );
      
      results.push(result);
      
      if (result.foundEmails.length > 0) {
        console.log(`   ✅ Found emails: ${result.foundEmails.join(', ')}`);
      } else {
        console.log(`   ❌ No emails found`);
      }
    }

    // Export results
    const csvLines = [
      'Company Name,Website,Found Emails,Pages Checked,Status,Error'
    ];

    for (const result of results) {
      const escapedName = result.companyName.replace(/"/g, '""');
      csvLines.push(
        `"${escapedName}","${result.website}","${result.foundEmails.join('; ')}","${result.pagesChecked.join('; ')}","${result.status}","${result.errorMessage || ''}"`
      );
    }

    const filename = `scraping-results-sample-${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvLines.join('\n'), 'utf-8');

    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const totalEmails = results.reduce((sum, r) => sum + r.foundEmails.length, 0);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Companies tested: ${companies.length}`);
    console.log(`Successfully found emails: ${successCount}`);
    console.log(`Total emails found: ${totalEmails}`);
    console.log(`Results saved to: ${filename}`);
    console.log('\n💡 If results look good, we can run this on all 256 companies!');

  } catch (error) {
    console.error('Error scraping websites:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

scrapeSampleCompanies();



