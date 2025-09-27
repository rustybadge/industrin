import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, or } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Comprehensive mapping of Swedish cities to their correct regions (län)
const cityRegionMapping: Record<string, string> = {
  // Skåne län
  'Markaryd': 'Kronobergs län',
  'Halmstad': 'Halland',
  'Helsingborg': 'Skåne',
  'Malmö': 'Skåne',
  'Kristianstad': 'Skåne',
  'Landskrona': 'Skåne',
  'Lund': 'Skåne',
  'Trelleborg': 'Skåne',
  'Ystad': 'Skåne',
  'Ängelholm': 'Skåne',
  'Höganäs': 'Skåne',
  'Arlöv': 'Skåne',
  'Bjärnum': 'Skåne',
  'Eslöv': 'Skåne',
  'Klippan': 'Skåne',
  'Kävlinge': 'Skåne',
  'Limhamn': 'Skåne',
  'Lomma': 'Skåne',
  'Löddeköpinge': 'Skåne',
  'Osby': 'Skåne',
  'Perstorp': 'Skåne',
  'Simrishamn': 'Skåne',
  'Skurup': 'Skåne',
  'Staffanstorp': 'Skåne',
  'Svalöv': 'Skåne',
  'Svedala': 'Skåne',
  'Sölvesborg': 'Skåne',
  'Vellinge': 'Skåne',
  'Åstorp': 'Skåne',
  'Örkelljunga': 'Skåne',
  'Östra Ljungby': 'Skåne',
  'Bromölla': 'Skåne',
  'Båstad': 'Skåne',
  'Dösjebro': 'Skåne',
  'Finja': 'Skåne',
  'Fjälkinge': 'Skåne',
  'Knislinge': 'Skåne',
  'Mörarp': 'Skåne',
  'Mörrum': 'Skåne',
  'Skånes Fagerhult': 'Skåne',
  'Tollarp': 'Skåne',
  'Vallåkra': 'Skåne',

  // Uppsala län
  'Uppsala': 'Uppsala',
  'Enköping': 'Uppsala',
  'Tierp': 'Uppsala',
  'Älvkarleby': 'Uppsala',
  'Östhammar': 'Uppsala',
  'Heby': 'Uppsala',
  'Håbo': 'Uppsala',
  'Knivsta': 'Uppsala',
  'Alunda': 'Uppsala',
  'Björklinge': 'Uppsala',
  'Örbyhus': 'Uppsala',
  'Österbybruk': 'Uppsala',

  // Västmanland
  'Västerås': 'Västmanland',
  'Köping': 'Västmanland',
  'Fagersta': 'Västmanland',
  'Hallstahammar': 'Västmanland',
  'Kungsör': 'Västmanland',
  'Norberg': 'Västmanland',
  'Sala': 'Västmanland',
  'Arboga': 'Västmanland',
  'Surahammar': 'Västmanland',
  'Bålsta': 'Västmanland',
  'Virsbo': 'Västmanland',

  // Östergötland
  'Linköping': 'Östergötland',
  'Norrköping': 'Östergötland',
  'Motala': 'Östergötland',
  'Mjölby': 'Östergötland',
  'Finspång': 'Östergötland',
  'Katrineholm': 'Östergötland',
  'Vadstena': 'Östergötland',
  'Åtvidaberg': 'Östergötland',
  'Ödeshög': 'Östergötland',
  'Boxholm': 'Östergötland',
  'Kinda': 'Östergötland',
  'Valdemarsvik': 'Östergötland',
  'Vikingstad': 'Östergötland',
  'Borensberg': 'Östergötland',
  'Rimforsa': 'Östergötland',
  'Ringarum': 'Östergötland',
  'Skänninge': 'Östergötland',
  'Vikingstad': 'Östergötland',
  'Överum': 'Östergötland',

  // Västra Götaland
  'Göteborg': 'Västra Götaland',
  'Borås': 'Västra Götaland',
  'Trollhättan': 'Västra Götaland',
  'Uddevalla': 'Västra Götaland',
  'Mölndal': 'Västra Götaland',
  'Partille': 'Västra Götaland',
  'Alingsås': 'Västra Götaland',
  'Kungsbacka': 'Västra Götaland',
  'Lerum': 'Västra Götaland',
  'Stenungsund': 'Västra Götaland',
  'Öckerö': 'Västra Götaland',
  'Tjörn': 'Västra Götaland',
  'Orust': 'Västra Götaland',
  'Sotenäs': 'Västra Götaland',
  'Munkedal': 'Västra Götaland',
  'Tanum': 'Västra Götaland',
  'Dals-Ed': 'Västra Götaland',
  'Färgelanda': 'Västra Götaland',
  'Ale': 'Västra Götaland',
  'Lerum': 'Västra Götaland',
  'Vårgårda': 'Västra Götaland',
  'Bollebygd': 'Västra Götaland',
  'Grästorp': 'Västra Götaland',
  'Essunga': 'Västra Götaland',
  'Karlsborg': 'Västra Götaland',
  'Gullspång': 'Västra Götaland',
  'Tranemo': 'Västra Götaland',
  'Bengtsfors': 'Västra Götaland',
  'Mellerud': 'Västra Götaland',
  'Lilla Edet': 'Västra Götaland',
  'Mark': 'Västra Götaland',
  'Svenljunga': 'Västra Götaland',
  'Herrljunga': 'Västra Götaland',
  'Vara': 'Västra Götaland',
  'Götene': 'Västra Götaland',
  'Tibro': 'Västra Götaland',
  'Töreboda': 'Västra Götaland',
  'Mariestad': 'Västra Götaland',
  'Lidköping': 'Västra Götaland',
  'Skara': 'Västra Götaland',
  'Skövde': 'Västra Götaland',
  'Hjo': 'Västra Götaland',
  'Tidaholm': 'Västra Götaland',
  'Falköping': 'Västra Götaland',
  'Kvänum': 'Västra Götaland',
  'Vänersborg': 'Västra Götaland',
  'Kungälv': 'Västra Götaland',
  'Västra Frölunda': 'Västra Götaland',
  'Västrafrölunda': 'Västra Götaland',
  'Smögen': 'Västra Götaland',
  'Brämhult': 'Västra Götaland',
  'Härryda': 'Västra Götaland',

  // Kronobergs län
  'Växjö': 'Kronobergs län',
  'Ljungby': 'Kronobergs län',
  'Älmhult': 'Kronobergs län',
  'Tingsryd': 'Kronobergs län',
  'Alvesta': 'Kronobergs län',
  'Lessebo': 'Kronobergs län',
  'Uppvidinge': 'Kronobergs län',
  'Lammhult': 'Kronobergs län',
  'Markaryd': 'Kronobergs län',

  // Halland
  'Halmstad': 'Halland',
  'Varberg': 'Halland',
  'Kungsbacka': 'Halland',
  'Falkenberg': 'Halland',
  'Laholm': 'Halland',
  'Hylte': 'Halland',
  'Onsala': 'Halland',

  // Värmland
  'Karlstad': 'Värmland',
  'Arvika': 'Värmland',
  'Filipstad': 'Värmland',
  'Hammarö': 'Värmland',
  'Kil': 'Värmland',
  'Forshaga': 'Värmland',
  'Grums': 'Värmland',
  'Årjäng': 'Värmland',
  'Sunne': 'Värmland',
  'Torsby': 'Värmland',
  'Storfors': 'Värmland',
  'Hagfors': 'Värmland',
  'Munkfors': 'Värmland',
  'Kristinehamn': 'Värmland',
  'Degerfors': 'Värmland',

  // Add more mappings as needed for other regions...
};

async function fixRegionalClassifications() {
  try {
    console.log('Starting comprehensive regional classification fixes...\n');

    let totalUpdates = 0;
    const updateLog: string[] = [];

    // Process each city in our mapping
    for (const [city, correctRegion] of Object.entries(cityRegionMapping)) {
      try {
        // Find companies with this location that have incorrect region
        const incorrectlyClassified = await db.query.companies.findMany({
          where: and(
            eq(schema.companies.location, city),
            eq(schema.companies.region, 'Stockholm') // Most incorrect classifications seem to be Stockholm
          )
        });

        if (incorrectlyClassified.length > 0) {
          // Update all companies in this city to the correct region
          const result = await db.update(schema.companies)
            .set({ region: correctRegion })
            .where(and(
              eq(schema.companies.location, city),
              eq(schema.companies.region, 'Stockholm')
            ));

          console.log(`✓ Fixed ${incorrectlyClassified.length} companies in ${city}: Stockholm → ${correctRegion}`);
          updateLog.push(`${city}: ${incorrectlyClassified.length} companies moved from Stockholm to ${correctRegion}`);
          totalUpdates += incorrectlyClassified.length;
        }
      } catch (error) {
        console.error(`✗ Error updating ${city}:`, error);
      }
    }

    // Special cases for specific incorrect mappings we found
    const specialCases = [
      // Fix postal code prefixes that are clearly wrong
      { condition: { location: '017 Eringsboda' }, update: { region: 'Blekinge', location: 'Eringsboda' } },
      { condition: { location: '041 Liden' }, update: { region: 'Västernorrland', location: 'Liden' } },
      { condition: { location: '132 Huskvarna' }, update: { region: 'Jönköpings län', location: 'Huskvarna' } },
      { condition: { location: '236 Romakloster' }, update: { region: 'Gotland', location: 'Romakloster' } },
      { condition: { location: '510 Eskilstuna' }, update: { region: 'Södermanland', location: 'Eskilstuna' } },
      { condition: { location: '722 Södrasandby' }, update: { region: 'Skåne', location: 'Södra Sandby' } },
    ];

    for (const specialCase of specialCases) {
      try {
        const companies = await db.query.companies.findMany({
          where: and(
            eq(schema.companies.location, specialCase.condition.location),
            eq(schema.companies.region, 'Stockholm')
          )
        });

        if (companies.length > 0) {
          await db.update(schema.companies)
            .set({
              region: specialCase.update.region,
              location: specialCase.update.location
            })
            .where(and(
              eq(schema.companies.location, specialCase.condition.location),
              eq(schema.companies.region, 'Stockholm')
            ));

          console.log(`✓ Fixed special case: ${specialCase.condition.location} → ${specialCase.update.location}, ${specialCase.update.region}`);
          updateLog.push(`Special: ${specialCase.condition.location} → ${specialCase.update.location}, ${specialCase.update.region}`);
          totalUpdates += companies.length;
        }
      } catch (error) {
        console.error(`✗ Error updating special case ${specialCase.condition.location}:`, error);
      }
    }

    console.log('\n=== Regional Classification Fix Summary ===');
    console.log(`✓ Total companies updated: ${totalUpdates}`);
    console.log(`📊 Total mapping rules applied: ${Object.keys(cityRegionMapping).length + specialCases.length}`);

    if (updateLog.length > 0) {
      console.log('\n=== Detailed Update Log ===');
      updateLog.forEach(log => console.log(`  • ${log}`));
    }

    // Show current region distribution after fixes
    console.log('\n=== Current Region Distribution (after fixes) ===');
    const regionCounts = await db.query.companies.findMany({
      columns: {
        region: true
      }
    });

    const regionStats = regionCounts.reduce((acc, company) => {
      acc[company.region] = (acc[company.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(regionStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([region, count]) => {
        console.log(`  ${region}: ${count} companies`);
      });

  } catch (error) {
    console.error('Error fixing regional classifications:', error);
  } finally {
    await pool.end();
  }
}

fixRegionalClassifications();