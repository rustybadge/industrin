import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

interface TranslationData {
  id: string;
  name: string;
  description?: string;
  description_sv?: string;
  language?: string;
}

async function updateSwedishDescriptions(csvFilePath: string = 'companies-needing-swedish-translation.csv') {
  try {
    console.log(`Reading translations from ${csvFilePath}...\n`);
    
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    const records: TranslationData[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true
    });

    console.log(`Found ${records.length} companies in CSV\n`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    let errors = 0;
    const updateLog: string[] = [];

    for (const record of records) {
      try {
        // Skip if no ID
        if (!record.id || !record.id.trim()) {
          console.log(`⏭ Skipping row - no ID provided`);
          skipped++;
          continue;
        }

        // Skip if no Swedish descriptions provided
        if ((!record.description_sv || record.description_sv.trim() === '') &&
            (!record.description || record.description.trim() === '')) {
          console.log(`⏭ Skipping ${record.name || record.id} - no descriptions provided`);
          skipped++;
          continue;
        }

        // Find company by ID
        const existingCompany = await db.query.companies.findFirst({
          where: eq(companies.id, record.id)
        });

        if (!existingCompany) {
          console.log(`⚠ Company not found: ${record.name || 'Unknown'} (ID: ${record.id})`);
          notFound++;
          continue;
        }

        // Prepare update data
        const updateData: {
          description?: string;
          description_sv?: string;
        } = {};

        // Use description_sv if provided, otherwise use description if it's in Swedish
        if (record.description_sv && record.description_sv.trim() !== '') {
          updateData.description_sv = record.description_sv.trim();
          // If description is also provided and different, update it too
          if (record.description && record.description.trim() !== '' && 
              record.description.trim() !== record.description_sv.trim()) {
            updateData.description = record.description.trim();
          } else {
            // If no separate description, use description_sv for both
            updateData.description = record.description_sv.trim();
          }
        } else if (record.description && record.description.trim() !== '') {
          // Only description provided - assume it's Swedish translation
          updateData.description = record.description.trim();
          updateData.description_sv = record.description.trim();
        }

        // Update the company
        if (Object.keys(updateData).length > 0) {
          await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.id, record.id));

          updated++;
          updateLog.push(`✅ Updated: ${existingCompany.name}`);
          
          if (updated % 10 === 0) {
            console.log(`   Progress: ${updated}/${records.length} updated...`);
          }
        } else {
          skipped++;
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating ${record.name || record.id}:`, error.message);
      }
    }

    console.log(`\n\n📊 Update Summary:`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ⏭ Skipped: ${skipped}`);
    console.log(`   ⚠ Not found: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${records.length}`);

    // Show sample of updated companies
    if (updateLog.length > 0) {
      console.log(`\n\n📋 Sample of updated companies (first 10):`);
      updateLog.slice(0, 10).forEach(log => console.log(`   ${log}`));
    }

  } catch (error: any) {
    console.error("❌ Error updating descriptions:", error.message);
    console.error("\n💡 Make sure the CSV file exists and has the correct format:");
    console.error("   Columns: id, name, description, description_sv, language");
    console.error("   The id column should match company IDs in the database");
    process.exit(1);
  }
  process.exit(0);
}

// Get CSV file path from command line argument or use default
const csvFilePath = process.argv[2] || 'companies-needing-swedish-translation.csv';

console.log(`\n🇸🇪 Updating Swedish descriptions from CSV...\n`);
updateSwedishDescriptions(csvFilePath);



