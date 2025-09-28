// Netlify serverless function to handle API routes
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to verify admin authentication
const verifyAdminAuth = (event) => {
  const token = event.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { error: 'No token provided', statusCode: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { admin: decoded };
  } catch (error) {
    return { error: 'Invalid token', statusCode: 401 };
  }
};

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
      const url = new URL(`https://example.com${path}${event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''}`);
      const search = url.searchParams.get('search');
      const region = url.searchParams.get('region');
      const categories = url.searchParams.get('categories');
      const limit = url.searchParams.get('limit');
      
      // Build the WHERE clause based on filters
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;
      
      if (search) {
        const searchTerms = search.split(/\s+/);
        const searchConditions = [];
        
        // Search synonyms mapping
        const getSearchSynonyms = (term) => {
          const synonymMap = {
            'göteborg': ['göteborgs', 'västra götaland', 'goteborg', 'goteborgs'],
            'goteborg': ['göteborg', 'göteborgs', 'västra götaland'],
            'stockholm': ['stockholms', 'stockholms län'],
            'malmö': ['malmös', 'skåne', 'malmo'],
            'malmo': ['malmö', 'malmös', 'skåne'],
            'skåne': ['malmö', 'skåne län', 'skane'],
            'västra': ['västra götaland', 'göteborg', 'vastra'],
            'vastra': ['västra', 'västra götaland', 'göteborg'],
            'götaland': ['västra götaland', 'göteborg', 'gotaland'],
            'gotaland': ['götaland', 'västra götaland', 'göteborg'],
          };
          return synonymMap[term.toLowerCase()] || [];
        };
        
        for (const term of searchTerms) {
          const synonyms = getSearchSynonyms(term);
          const allTerms = [term, ...synonyms];
          const termConditions = [];
          
          for (const searchTerm of allTerms) {
            termConditions.push(`(
              name ILIKE $${paramIndex} OR
              description ILIKE $${paramIndex} OR
              description_sv ILIKE $${paramIndex} OR
              categories::text ILIKE $${paramIndex} OR
              city ILIKE $${paramIndex} OR
              region ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${searchTerm}%`);
            paramIndex++;
          }
          
          if (termConditions.length > 1) {
            searchConditions.push(`(${termConditions.join(' OR ')})`);
          } else {
            searchConditions.push(termConditions[0]);
          }
        }
        
        if (searchConditions.length > 1) {
          whereConditions.push(`(${searchConditions.join(' AND ')})`);
        } else {
          whereConditions.push(searchConditions[0]);
        }
      }
      
      if (region && region !== 'Alla regioner') {
        whereConditions.push(`region = $${paramIndex}`);
        queryParams.push(region);
        paramIndex++;
      }
      
      if (categories) {
        const categoryArray = categories.split(',');
        const categoryConditions = categoryArray.map(() => `categories::text ILIKE $${paramIndex++}`);
        whereConditions.push(`(${categoryConditions.join(' OR ')})`);
        categoryArray.forEach(cat => queryParams.push(`%${cat}%`));
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const limitClause = limit ? `LIMIT ${parseInt(limit)}` : '';
      
      const query = `SELECT * FROM companies ${whereClause} ORDER BY name ${limitClause}`;
      const result = await pool.query(query, queryParams);
      
      // Map database column names to frontend expected format
      const mappedCompanies = result.rows.map(company => ({
        ...company,
        postalCode: company.postal_code,
        contactEmail: company.contact_email,
        isFeatured: company.is_featured,
        isVerified: company.is_verified,
        createdAt: company.created_at,
        logoUrl: company.logo_url,
        descriptionSv: company.description_sv,
        serviceområden: company.serviceområden,
      })).map(company => {
        // Remove the original snake_case fields
        delete company.postal_code;
        delete company.contact_email;
        delete company.is_featured;
        delete company.is_verified;
        delete company.created_at;
        delete company.logo_url;
        delete company.description_sv;
        delete company.serviceområden;
        return company;
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mappedCompanies),
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
      
      // Map database column names to frontend expected format
      const company = result.rows[0];
      const mappedCompany = {
        ...company,
        postalCode: company.postal_code,
        contactEmail: company.contact_email,
        isFeatured: company.is_featured,
        isVerified: company.is_verified,
        createdAt: company.created_at,
        logoUrl: company.logo_url,
        descriptionSv: company.description_sv,
        serviceområden: company.serviceområden,
      };
      
      // Remove the original snake_case fields
      delete mappedCompany.postal_code;
      delete mappedCompany.contact_email;
      delete mappedCompany.is_featured;
      delete mappedCompany.is_verified;
      delete mappedCompany.created_at;
      delete mappedCompany.logo_url;
      delete mappedCompany.description_sv;
      delete mappedCompany.serviceområden;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mappedCompany),
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

    // ===== QUOTE REQUESTS =====
    
    // Create quote request
    if (path === '/api/quote-requests' && httpMethod === 'POST') {
      try {
        const data = JSON.parse(event.body || '{}');
        
        // Verify company exists
        const companyResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [data.companyId]);
        if (companyResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Company not found' }),
          };
        }

        const company = companyResult.rows[0];
        
        // Insert quote request
        const result = await pool.query(`
          INSERT INTO quote_requests (
            company_id, name, email, phone, company_name, 
            service_type, message, urgency, preferred_contact, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        `, [
          data.companyId,
          data.name,
          data.email,
          data.phone || null,
          data.company || null,
          data.serviceType || null,
          data.message || null,
          data.urgency || 'planerad',
          data.preferredContact || 'email'
        ]);

        console.log(`Quote request submitted for ${company.name}:`, result.rows[0]);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      } catch (error) {
        console.error('Error creating quote request:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to create quote request' }),
        };
      }
    }

    // ===== GENERAL QUOTE REQUESTS =====
    
    // Create general quote request (multiple companies)
    if (path === '/api/general-quote-requests' && httpMethod === 'POST') {
      try {
        // Parse multipart form data
        const contentType = event.headers['content-type'] || '';
        let data = {};
        let files = [];
        
        if (contentType.includes('multipart/form-data')) {
          // For now, we'll handle this as JSON with file references
          // In production, you'd want to use a proper multipart parser
          data = JSON.parse(event.body || '{}');
        } else {
          data = JSON.parse(event.body || '{}');
        }
        
        // Insert general quote request
        const result = await pool.query(`
          INSERT INTO general_quote_requests (
            description, service_type, urgency, name, email, phone, 
            company_name, preferred_contact, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `, [
          data.description,
          data.serviceType,
          data.urgency,
          data.name,
          data.email,
          data.phone || null,
          data.company || null,
          data.preferredContact || 'email'
        ]);

        console.log(`General quote request submitted:`, result.rows[0]);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      } catch (error) {
        console.error('Error creating general quote request:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to create general quote request' }),
        };
      }
    }

    // ===== CLAIM REQUESTS =====
    
    // Create claim request for specific company
    if (path.startsWith('/api/companies/') && path.endsWith('/claim') && httpMethod === 'POST') {
      try {
        const companyId = path.split('/')[3];
        const data = JSON.parse(event.body || '{}');
        
        // Verify company exists
        const companyResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [companyId]);
        if (companyResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Company not found' }),
          };
        }

        const company = companyResult.rows[0];
        
        // Insert claim request
        const result = await pool.query(`
          INSERT INTO claim_requests (
            company_id, name, email, phone, message, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `, [
          companyId,
          data.name,
          data.email,
          data.phone || null,
          data.message || null
        ]);

        console.log(`Claim request submitted for ${company.name}:`, result.rows[0]);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      } catch (error) {
        console.error('Error creating claim request:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to create claim request' }),
        };
      }
    }

    // ===== ADMIN ROUTES =====

    // Admin login
    if (path === '/api/admin/login' && httpMethod === 'POST') {
      const { username, password } = JSON.parse(event.body || '{}');

      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username and password are required' }),
        };
      }

      // Get user from database
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userResult.rows.length === 0) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid credentials' }),
        };
      }

      const user = userResult.rows[0];

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid credentials' }),
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          isSuperAdmin: user.is_super_admin 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          admin: {
            id: user.id,
            username: user.username,
            role: user.role,
            isSuperAdmin: user.is_super_admin,
          },
          token,
        }),
      };
    }

    // Verify admin token
    if (path === '/api/admin/verify' && httpMethod === 'GET') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(authResult.admin),
      };
    }

    // Get admin dashboard stats
    if (path === '/api/admin/stats' && httpMethod === 'GET') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      // Get total companies
      const companiesResult = await pool.query('SELECT COUNT(*) as count FROM companies');
      const totalCompanies = parseInt(companiesResult.rows[0].count);

      // Get claim requests by status
      const claimsResult = await pool.query('SELECT status, COUNT(*) as count FROM claim_requests GROUP BY status');
      const claimsByStatus = {};
      claimsResult.rows.forEach(row => {
        claimsByStatus[row.status] = parseInt(row.count);
      });

      const stats = {
        totalCompanies,
        pendingClaims: claimsByStatus.pending || 0,
        approvedClaims: claimsByStatus.approved || 0,
        rejectedClaims: claimsByStatus.rejected || 0,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats),
      };
    }

    // Get all claim requests
    if (path === '/api/admin/claim-requests' && httpMethod === 'GET') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      const result = await pool.query(`
        SELECT cr.*, c.name as company_name, c.slug as company_slug
        FROM claim_requests cr
        JOIN companies c ON cr.company_id = c.id
        ORDER BY cr.submitted_at DESC
      `);

      const claimRequests = result.rows.map(row => ({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        status: row.status,
        submittedAt: row.submitted_at,
        company: {
          name: row.company_name,
          slug: row.company_slug,
        },
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(claimRequests),
      };
    }

    // Approve claim request
    if (path.startsWith('/api/admin/claim-requests/') && path.endsWith('/approve') && httpMethod === 'POST') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      const claimId = path.split('/')[4];
      const { reviewNotes } = JSON.parse(event.body || '{}');

      await pool.query(
        'UPDATE claim_requests SET status = $1, reviewed_at = NOW(), reviewed_by = $2, review_notes = $3 WHERE id = $4',
        ['approved', authResult.admin.id, reviewNotes, claimId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Claim request approved' }),
      };
    }

    // Reject claim request
    if (path.startsWith('/api/admin/claim-requests/') && path.endsWith('/reject') && httpMethod === 'POST') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      const claimId = path.split('/')[4];
      const { reviewNotes } = JSON.parse(event.body || '{}');

      await pool.query(
        'UPDATE claim_requests SET status = $1, reviewed_at = NOW(), reviewed_by = $2, review_notes = $3 WHERE id = $4',
        ['rejected', authResult.admin.id, reviewNotes, claimId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Claim request rejected' }),
      };
    }

    // Change admin password
    if (path === '/api/admin/change-password' && httpMethod === 'POST') {
      const authResult = verifyAdminAuth(event);
      if (authResult.error) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ message: authResult.error }),
        };
      }

      const { currentPassword, newPassword } = JSON.parse(event.body || '{}');

      if (!currentPassword || !newPassword) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Current password and new password are required' }),
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'New password must be at least 8 characters long' }),
        };
      }

      // Get current user
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [authResult.admin.id]);
      if (userResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'User not found' }),
        };
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Current password is incorrect' }),
        };
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, authResult.admin.id]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Password updated successfully' }),
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
