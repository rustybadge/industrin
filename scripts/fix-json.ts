import fs from "fs";

// Read the JSON file
const jsonData = fs.readFileSync("attached_assets/updated_companies_1753576575725.json", "utf-8");

// Clean up the JSON by removing extra commas and line breaks
let cleanedJson = jsonData
  // Remove trailing commas before closing brackets/braces
  .replace(/,(\s*[}\]])/g, '$1')
  // Remove leading commas
  .replace(/(\[\s*),/g, '$1')
  // Remove multiple commas
  .replace(/,+/g, ',')
  // Clean up extra whitespace and newlines around commas
  .replace(/,\s*\n\s*\n\s*,/g, ',')
  // Fix any stray commas after opening brackets
  .replace(/(\[|\{)\s*,/g, '$1')
  // Remove commas before closing brackets
  .replace(/,\s*(\]|\})/g, '$1');

try {
  // Try to parse the cleaned JSON
  const parsed = JSON.parse(cleanedJson);
  
  // Write the cleaned and properly formatted JSON
  fs.writeFileSync("attached_assets/cleaned_companies.json", JSON.stringify(parsed, null, 2));
  console.log("✅ JSON cleaned and saved successfully!");
  console.log(`📊 Found ${parsed.length} companies`);
  
} catch (error) {
  console.error("❌ JSON still has errors:", error);
  // Write the partially cleaned version for manual inspection
  fs.writeFileSync("attached_assets/partially_cleaned.json", cleanedJson);
  console.log("💾 Partially cleaned JSON saved for inspection");
}