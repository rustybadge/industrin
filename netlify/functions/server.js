// Netlify serverless function to handle API routes
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { pgTable, text, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Configure Neon
neonConfig.webSocketConstructor = ws;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Company schema (simplified)
const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  description: text("description").notNull(),
  description_sv: text("description_sv"),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  services: text("services").array().default(sql`'{}'::text[]`),
  serviceområden: text("serviceområden").array().default(sql`'{}'::text[]`),
  specialties: text("specialties"),
  location: text("location").notNull(),
  region: text("region").notNull(),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Netlify serverless function handler
export const handler = async (event, context) => {
  try {
    const { httpMethod, path, queryStringParameters } = event;
    
    // Handle CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };
    
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }
    
    if (path === '/api/companies' && httpMethod === 'GET') {
      const companies_data = await db.select().from(companies);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(companies_data),
      };
    }
    
    if (path.startsWith('/api/companies/') && httpMethod === 'GET') {
      const slug = path.split('/').pop();
      const company = await db.select()
        .from(companies)
        .where(sql`${companies.slug} = ${slug}`)
        .limit(1);
      
      if (company.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Company not found' }),
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(company[0]),
      };
    }
    
    if (path === '/api/regions' && httpMethod === 'GET') {
      const regions = await db.select({ region: companies.region })
        .from(companies)
        .groupBy(companies.region);
      
      const regionList = regions.map(r => r.region).filter(r => r);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(regionList),
      };
    }
    
    if (path === '/api/categories' && httpMethod === 'GET') {
      const categories = await db.select({ categories: companies.categories })
        .from(companies);
      
      const categorySet = new Set();
      categories.forEach(c => {
        if (c.categories) {
          c.categories.forEach(cat => categorySet.add(cat));
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(Array.from(categorySet)),
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
    
  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
