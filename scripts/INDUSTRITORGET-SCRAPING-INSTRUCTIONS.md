# How to Extract Data from Industritorget.se and Update Your Database

## Overview
This will help you extract company names and website addresses from [Industritorget.se](https://www.industritorget.se/f%C3%B6retag/lista/service+reparation+underh%c3%a5ll/sverige/47/4020/1/60/3078/#result) and match them with companies in your database.

## Method 1: Browser Console (Easiest)

1. Visit the Industritorget.se listing page
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste and run this JavaScript:

```javascript
const companies = [];
document.querySelectorAll('div').forEach(div => {
  const text = div.innerText;
  if (text.includes('AB') && text.includes('Skicka e-post')) {
    const lines = text.split('\n').filter(l => l.trim());
    const name = lines.find(l => l.includes('AB'));
    const website = lines.find(l => l.includes('www.') || l.includes('.se') || l.includes('.com'));
    const phone = lines.find(l => /^0\d/.test(l) || /^\d{2,3}-\d/.test(l));
    const address = lines.find(l => /^\d/.test(l) && l.includes(' '));
    const postal = lines.find(l => /^\d{3}\s*\d{2}/.test(l));
    
    if (name) {
      companies.push({
        name: name.trim(),
        website: website ? website.replace(/^www\./, '').trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        postalCode: postal ? postal.match(/\d{5}/)?.[0] : null,
        city: postal ? postal.replace(/\d{5}\s*/, '').trim() : null
      });
    }
  }
});

console.log(JSON.stringify(companies, null, 2));
// Copy the output and save to industritorget-data.json
```

5. Copy the JSON output
6. Save it to `industritorget-data.json` in your project root

## Method 2: Manual CSV Creation

1. Create a CSV file with columns: name, website, phone, address, postalCode, city
2. Visit each page of the listing (there are ~18 pages with 60 companies each)
3. Manually copy the data
4. Convert CSV to JSON using any online tool or this script

## Method 3: Browser Extension

Use a browser extension like:
- "Web Scraper" (Chrome/Firefox)
- "Data Miner" (Chrome)
- "Scraper" (Chrome)

Set up selectors for:
- Company name
- Website
- Phone
- Address
- Postal code & City

## Running the Update Script

Once you have the JSON file:

```bash
DATABASE_URL="your-database-url" npx tsx scripts/scrape-industritorget-and-update.ts industritorget-data.json
```

This will:
1. Load companies from your JSON file
2. Match them with companies in your database (fuzzy matching)
3. Update missing website, phone, and address information

## Notes

- The script uses fuzzy matching to handle name variations (e.g., "AB Name" vs "Name AB")
- It only updates fields that are currently empty/null
- It won't overwrite existing data



