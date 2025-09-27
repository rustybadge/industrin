import XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel file
const workbook = XLSX.readFile('attached_assets/U-END-Companies_with_Descriptions_eng_swe_1753821710495.xlsx');

// Get the first worksheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('Number of companies found:', jsonData.length);
console.log('Column headers:', Object.keys(jsonData[0] || {}));
console.log('First few rows:');
console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));

// Save to JSON file for processing
fs.writeFileSync('attached_assets/excel_companies.json', JSON.stringify(jsonData, null, 2));
console.log('Data saved to excel_companies.json');