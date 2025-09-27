import fs from "fs";

// Read the original JSON file
const originalData = fs.readFileSync("attached_assets/updated_companies_1753576575725.json", "utf-8");

// Manual fix for the JSON structure issues
let fixedJson = originalData
  // Fix missing closing brace for Andreas Risne Maskinservice entry
  .replace(
    `    "website": "https://www.armaskinservice.se/",
    "logo": ""

,`,
    `    "website": "https://www.armaskinservice.se/",
    "logo": ""
  },`
  )
  // Fix missing closing brace for Aröds Mekaniska Verkstad entry  
  .replace(
    `    "website": "https://www.arodsmek.se/",
    "logo": ""
  }


,`,
    `    "website": "https://www.arodsmek.se/",
    "logo": ""
  },`
  )
  // Fix missing closing brace for Askalon AB entry
  .replace(
    `    "website": "https://www.askalon.com/en",
    "logo": ""
  }


,`,
    `    "website": "https://www.askalon.com/en",
    "logo": ""
  },`
  )
  // Fix missing closing brace for Atlas Copco entry
  .replace(
    `    "website": "https://www.atlascopco.com/",
    "logo": ""
  }


,`,
    `    "website": "https://www.atlascopco.com/",
    "logo": ""
  },`
  )
  // Fix missing closing brace for Avesta Verkstäder AB entry
  .replace(
    `    "website": "https://avab.info/",
    "logo": ""
  }


,`,
    `    "website": "https://avab.info/",
    "logo": ""
  },`
  )
  // Fix missing closing brace for Axelssons Industri entry
  .replace(
    `    "website": "https://www.lengpac.se/en/home/",
    "logo": ""
  }


,`,
    `    "website": "https://www.lengpac.se/en/home/",
    "logo": ""
  },`
  )
  // Remove multiple commas and fix stray commas
  .replace(/,+/g, ',')
  .replace(/,(\s*[\]\}])/g, '$1')
  // Clean up extra whitespace
  .replace(/\n\n+/g, '\n')
  .trim();

// Make sure we end with proper JSON array closing
if (!fixedJson.endsWith(']')) {
  // Remove any trailing comma and add closing bracket
  fixedJson = fixedJson.replace(/,\s*$/, '') + '\n]';
}

try {
  // Try to parse the fixed JSON
  const parsed = JSON.parse(fixedJson);
  
  // Write the cleaned and properly formatted JSON
  fs.writeFileSync("attached_assets/cleaned_companies.json", JSON.stringify(parsed, null, 2));
  console.log("✅ JSON cleaned and saved successfully!");
  console.log(`📊 Found ${parsed.length} companies to update`);
  
} catch (error) {
  console.error("❌ JSON still has errors:", error);
  // Show the area around the error
  console.log("Problematic area:");
  console.log(fixedJson.substring(11600, 11700));
}