import { neon } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
const neonConfig = {
  webSocketConstructor: ws,
};

const sql = neon(process.env.DATABASE_URL!, neonConfig);

async function migrateGeneralQuoteRequests() {
  try {
    console.log('Creating general_quote_requests table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS general_quote_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        description TEXT NOT NULL,
        service_type TEXT NOT NULL,
        urgency TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company_name TEXT,
        preferred_contact TEXT NOT NULL,
        files JSONB,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    console.log('✅ general_quote_requests table created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating general_quote_requests table:', error);
    throw error;
  }
}

// Run migration
migrateGeneralQuoteRequests()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
