import fs from "fs";

// Read and fix the JSON
const jsonData = fs.readFileSync("attached_assets/updatesDEF_1753610235640.json", "utf-8");

// Remove trailing comma and extra spaces before closing bracket
const fixedJson = jsonData.replace(/,\s*\]\s*$/, ']');

try {
  // Parse to validate
  const parsed = JSON.parse(fixedJson);
  
  // Write cleaned version
  fs.writeFileSync("attached_assets/updatesDEF_cleaned.json", JSON.stringify(parsed, null, 2));
  console.log(`✅ JSON fixed and saved! Found ${parsed.length} companies`);
  
} catch (error) {
  console.error("❌ JSON still has errors:", error);
}