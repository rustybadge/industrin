import fs from "fs";

// Read and fix the JSON
const jsonData = fs.readFileSync("attached_assets/updates_DE_1753603871283.json", "utf-8");

// Remove trailing comma before closing bracket
const fixedJson = jsonData.replace(/,(\s*\])$/, '$1');

try {
  // Parse to validate
  const parsed = JSON.parse(fixedJson);
  
  // Write cleaned version
  fs.writeFileSync("attached_assets/updates_DE_cleaned.json", JSON.stringify(parsed, null, 2));
  console.log(`✅ JSON fixed and saved! Found ${parsed.length} companies`);
  
} catch (error) {
  console.error("❌ JSON still has errors:", error);
}