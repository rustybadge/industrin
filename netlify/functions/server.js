// Netlify serverless function to handle API routes
import { Pool } from '@neondatabase/serverless';

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
    
    // Database connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    if (path === '/api/companies' && httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM companies ORDER BY name');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }
    
    if (path.startsWith('/api/companies/') && httpMethod === 'GET') {
      const slug = path.split('/').pop();
      const result = await pool.query('SELECT * FROM companies WHERE slug = $1', [slug]);
      
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Company not found' }),
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }
    
    if (path === '/api/regions' && httpMethod === 'GET') {
      const result = await pool.query('SELECT DISTINCT region FROM companies WHERE region IS NOT NULL AND region != \'\' ORDER BY region');
      const regions = result.rows.map(row => row.region);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(regions),
      };
    }
    
    if (path === '/api/categories' && httpMethod === 'GET') {
      const result = await pool.query('SELECT DISTINCT unnest(categories) as category FROM companies WHERE categories IS NOT NULL ORDER BY category');
      const categories = result.rows.map(row => row.category);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categories),
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
