import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { isNotNull, ne, and } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

function isLikelyFakeEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  
  // Common fake/placeholder domains
  const fakeDomains = [
    'example.com',
    'example.se',
    'example.net',
    'example.org',
    'test.com',
    'test.se',
    'placeholder.com',
    'placeholder.se',
    'fake.com',
    'fake.se',
    'dummy.com',
    'dummy.se',
    'sample.com',
    'sample.se',
    'noreply.com',
    'noreply.se',
  ];

  // Check if email contains a fake domain
  for (const domain of fakeDomains) {
    if (lowerEmail.includes(domain)) {
      return true;
    }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /@test\./i,
    /@temp\./i,
    /@example\./i,
    /@placeholder\./i,
    /@fake\./i,
    /@dummy\./i,
    /@sample\./i,
    /^test@/i,
    /^fake@/i,
    /^dummy@/i,
    /^example@/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(lowerEmail)) {
      return true;
    }
  }

  return false;
}

function getEmailDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

async function analyzeEmailAuthenticity() {
  try {
    console.log('Analyzing email address authenticity...\n');

    const allCompanies = await db.query.companies.findMany({
      columns: {
        id: true,
        name: true,
        contactEmail: true,
        website: true
      }
    });

    const stats = {
      total: allCompanies.length,
      withEmails: 0,
      withoutEmails: 0,
      likelyAuthentic: 0,
      likelyFake: 0,
      emails: [] as Array<{ company: string; email: string; domain: string; isFake: boolean }>
    };

    for (const company of allCompanies) {
      if (!company.contactEmail || company.contactEmail.trim() === '') {
        stats.withoutEmails++;
        continue;
      }

      stats.withEmails++;
      const domain = getEmailDomain(company.contactEmail) || '';
      const isFake = isLikelyFakeEmail(company.contactEmail);

      if (isFake) {
        stats.likelyFake++;
      } else {
        stats.likelyAuthentic++;
      }

      stats.emails.push({
        company: company.name,
        email: company.contactEmail,
        domain: domain,
        isFake: isFake
      });
    }

    console.log('=== Email Authenticity Analysis ===\n');
    console.log(`Total companies: ${stats.total}`);
    console.log(`Companies with email addresses: ${stats.withEmails}`);
    console.log(`Companies without email addresses: ${stats.withoutEmails}`);
    console.log(`\nLikely AUTHENTIC emails: ${stats.likelyAuthentic}`);
    console.log(`Likely FAKE/PLACEHOLDER emails: ${stats.likelyFake}\n`);

    if (stats.likelyFake > 0) {
      console.log('=== Likely Fake/Placeholder Emails (first 20) ===');
      const fakeEmails = stats.emails.filter(e => e.isFake).slice(0, 20);
      fakeEmails.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.company}: ${entry.email} (${entry.domain})`);
      });
      if (stats.likelyFake > 20) {
        console.log(`... and ${stats.likelyFake - 20} more`);
      }
    }

    if (stats.likelyAuthentic > 0) {
      console.log('\n=== Likely Authentic Emails (first 20) ===');
      const authenticEmails = stats.emails.filter(e => !e.isFake).slice(0, 20);
      authenticEmails.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.company}: ${entry.email} (${entry.domain})`);
      });
      if (stats.likelyAuthentic > 20) {
        console.log(`... and ${stats.likelyAuthentic - 20} more`);
      }
    }

    // Domain frequency analysis for authentic emails
    const authenticDomains = stats.emails
      .filter(e => !e.isFake)
      .map(e => e.domain)
      .filter(d => d && d !== '');

    const domainFrequency: Record<string, number> = {};
    for (const domain of authenticDomains) {
      domainFrequency[domain] = (domainFrequency[domain] || 0) + 1;
    }

    const topDomains = Object.entries(domainFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topDomains.length > 0) {
      console.log('\n=== Top 10 Email Domains (Authentic Emails) ===');
      topDomains.forEach(([domain, count], index) => {
        console.log(`${index + 1}. ${domain}: ${count} companies`);
      });
    }

    console.log('\n=== Summary ===');
    const authenticPercentage = stats.withEmails > 0 
      ? ((stats.likelyAuthentic / stats.withEmails) * 100).toFixed(1)
      : '0.0';
    const fakePercentage = stats.withEmails > 0
      ? ((stats.likelyFake / stats.withEmails) * 100).toFixed(1)
      : '0.0';
    
    console.log(`Authentic: ${stats.likelyAuthentic} (${authenticPercentage}% of emails)`);
    console.log(`Fake/Placeholder: ${stats.likelyFake} (${fakePercentage}% of emails)`);
    console.log(`Missing: ${stats.withoutEmails} (${((stats.withoutEmails / stats.total) * 100).toFixed(1)}% of total)`);

  } catch (error) {
    console.error('Error analyzing email authenticity:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeEmailAuthenticity();



