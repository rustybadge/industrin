import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq, ilike, and } from "drizzle-orm";

// Comprehensive Swedish city/town to region (län) mapping
const cityToRegionMapping: Record<string, string> = {
  // Stockholm län
  "Stockholm": "Stockholm",
  "Sundbyberg": "Stockholm", 
  "Södertälje": "Stockholm",
  "SÖDERTÄLJE": "Stockholm",
  "Nacka": "Stockholm",
  "Huddinge": "Stockholm",
  "Solna": "Stockholm",
  "Täby": "Stockholm",
  "Vällingby": "Stockholm",
  "Tumba": "Stockholm",
  "Upplands Väsby": "Stockholm",
  "Märsta": "Stockholm",
  "Älvsjö": "Stockholm",
  "Haninge": "Stockholm",
  "Norsborg": "Stockholm",
  "Bromma": "Stockholm",
  "Tyresö": "Stockholm",
  "Vallentuna": "Stockholm",
  "Nynäshamn": "Stockholm",

  // Västra Götalands län
  "Göteborg": "Västra Götaland",
  "Göteborg/Mölndal": "Västra Götaland",
  "Borås": "Västra Götaland",
  "Mölndal": "Västra Götaland",
  "Trollhättan": "Västra Götaland",
  "Uddevalla": "Västra Götaland",
  "Skövde": "Västra Götaland",
  "Lerum": "Västra Götaland",
  "Alingsås": "Västra Götaland",
  "Kungsbacka": "Västra Götaland",
  "Partille": "Västra Götaland",
  "Stenungsund": "Västra Götaland",
  "Kungälv": "Västra Götaland",
  "Vänersborg": "Västra Götaland",
  "Mariestad": "Västra Götaland",
  "Lidköping": "Västra Götaland",
  "Strömstad": "Västra Götaland",
  "Åmål": "Västra Götaland",

  // Skåne län
  "Malmö": "Skåne",
  "Helsingborg": "Skåne",
  "Lund": "Skåne",
  "Kristianstad": "Skåne",
  "Landskrona": "Skåne",
  "Trelleborg": "Skåne",
  "Ängelholm": "Skåne",
  "Ystad": "Skåne",
  "Eslöv": "Skåne",
  "Hässleholm": "Skåne",
  "Klippan": "Skåne",
  "Höganäs": "Skåne",
  "Staffanstorp": "Skåne",
  "Svalöv": "Skåne",
  "Lomma": "Skåne",

  // Östergötlands län
  "Linköping": "Östergötland",
  "Norrköping": "Östergötland",
  "Finspång": "Östergötland",
  "Söderköping": "Östergötland",
  "Motala": "Östergötland",
  "Vadstena": "Östergötland",
  "Mjölby": "Östergötland",
  "Åtvidaberg": "Östergötland",

  // Jönköpings län
  "Jönköping": "Jönköpings län",
  "Värnamo": "Jönköpings län",
  "Tranås": "Jönköpings län",
  "Huskvarna": "Jönköpings län",
  "Gislaved": "Jönköpings län",
  "Vaggeryd": "Jönköpings län",

  // Kronobergs län  
  "Växjö": "Kronobergs län",
  "Ljungby": "Kronobergs län",
  "Älmhult": "Kronobergs län",
  "Markaryd": "Kronobergs län",

  // Kalmar län
  "Kalmar": "Kalmar län",
  "Västervik": "Kalmar län",
  "Oskarshamn": "Kalmar län",
  "Nybro": "Kalmar län",
  "Emmaboda": "Kalmar län",

  // Hallands län
  "Halmstad": "Halland",
  "Laholm": "Halland",

  // Värmlands län
  "Karlstad": "Värmland",
  "Kristinehamn": "Värmland",
  "Arvika": "Värmland",
  "Säffle": "Värmland",
  "Hammarö": "Värmland",
  "Sunne": "Värmland",

  // Örebro län
  "Örebro": "Örebro län",
  "Karlskoga": "Örebro län",
  "Kumla": "Örebro län",
  "Askersund": "Örebro län",
  "Lindesberg": "Örebro län",

  // Västmanlands län
  "Västerås": "Västmanland",
  "Köping": "Västmanland",
  "Sala": "Västmanland",
  "Fagersta": "Västmanland",
  "Bålsta": "Västmanland",

  // Dalarnas län
  "Falun": "Dalarna",
  "Borlänge": "Dalarna",
  "Avesta": "Dalarna",
  "Ludvika": "Dalarna",
  "Säter": "Dalarna",
  "Hedemora": "Dalarna",
  "Sandviken": "Dalarna",

  // Gävleborgs län
  "Gävle": "Gävleborg",
  "Sandviken": "Gävleborg",
  "Söderhamn": "Gävleborg",
  "Bollnäs": "Gävleborg",
  "Hudiksvall": "Gävleborg",
  "Ljusdal": "Gävleborg",

  // Västernorrlands län
  "Sundsvall": "Västernorrland",
  "Timrå": "Västernorrland",
  "Härnösand": "Västernorrland",
  "Kramfors": "Västernorrland",
  "Sollefteå": "Västernorrland",
  "Örnsköldsvik": "Västernorrland",

  // Jämtlands län
  "Östersund": "Jämtland",
  "Åre": "Jämtland",
  "Krokom": "Jämtland",

  // Västerbottens län
  "Umeå": "Västerbotten",
  "Skellefteå": "Västerbotten",
  "Lycksele": "Västerbotten",
  "Vilhelmina": "Västerbotten",

  // Norrbottens län
  "Luleå": "Norrbotten",
  "Kiruna": "Norrbotten",
  "Boden": "Norrbotten",
  "Piteå": "Norrbotten",
  "Kalix": "Norrbotten",
  "Haparanda": "Norrbotten",

  // Uppsala län
  "Uppsala": "Uppsala",
  "Enköping": "Uppsala",
  "Håbo": "Uppsala",

  // Södermanlands län
  "Eskilstuna": "Södermanland",
  "Katrineholm": "Södermanland",
  "Nyköping": "Södermanland",
  "Strängnäs": "Södermanland",

  // Gotlands län
  "Visby": "Gotland",

  // Blekinge län
  "Karlskrona": "Blekinge",
  "Karlshamn": "Blekinge",
  "Ronneby": "Blekinge",
  "Sölvesborg": "Blekinge",
};

async function fixRegions() {
  console.log("Starting region mapping fix...");
  
  let totalFixed = 0;
  
  for (const [city, correctRegion] of Object.entries(cityToRegionMapping)) {
    // Check if location contains the city name (case insensitive)
    const companiesWithCity = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.region, 'Övrigt'),
          ilike(companies.location, `%${city}%`)
        )
      );
      
    if (companiesWithCity.length > 0) {
      // Update these companies
      await db
        .update(companies)
        .set({ region: correctRegion })
        .where(
          and(
            eq(companies.region, 'Övrigt'),
            ilike(companies.location, `%${city}%`)
          )
        );
      
      totalFixed += companiesWithCity.length;
      console.log(`Fixed ${companiesWithCity.length} companies for ${city} -> ${correctRegion}`);
    }
  }
  
  const remainingOvrigt = await db.query.companies.findMany({
    where: eq(companies.region, 'Övrigt')
  });
  
  console.log(`\nMapping complete!`);
  console.log(`Total companies fixed: ${totalFixed}`);
  console.log(`Remaining "Övrigt" companies: ${remainingOvrigt.length}`);
  
  // Show some examples of remaining Övrigt companies
  if (remainingOvrigt.length > 0) {
    console.log(`\nFirst 10 remaining "Övrigt" companies:`);
    remainingOvrigt.slice(0, 10).forEach(company => {
      console.log(`- ${company.name}: ${company.location}`);
    });
  }
}

fixRegions().catch(console.error);