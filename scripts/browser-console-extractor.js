// Paste this into the browser console on Industritorget.se listing pages
// Then copy the output JSON and save it to industritorget-data.json

(function() {
  const companies = [];
  
  // Find all company listing blocks
  // Looking for elements that contain company information
  const selectors = [
    'div[class*="company"]',
    'div[class*="listing"]',
    'div[class*="result"]',
    'article',
    'section[class*="company"]'
  ];
  
  let containers = [];
  for (const selector of selectors) {
    containers = document.querySelectorAll(selector);
    if (containers.length > 10) break; // Found likely container
  }
  
  // If no specific containers found, search entire page
  if (containers.length === 0) {
    containers = document.querySelectorAll('div, article, section');
  }
  
  containers.forEach((container) => {
    const text = container.innerText || container.textContent;
    
    // Check if this looks like a company listing
    // Should have company name (with AB), address, phone, and possibly website
    if (!text || !text.includes('AB') || text.length < 20) return;
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract company name (usually first line or line with AB)
    const nameLine = lines.find(l => 
      l.includes('AB') && 
      l.length > 3 && 
      l.length < 100 &&
      !l.match(/^\d/)
    ) || lines[0];
    
    if (!nameLine || !nameLine.includes('AB')) return;
    
    const company = {
      name: nameLine.replace(/<[^>]*>/g, '').trim(),
      website: null,
      phone: null,
      address: null,
      city: null,
      postalCode: null
    };
    
    // Extract website - look for www. or domain patterns
    const websiteLine = lines.find(l => 
      (l.includes('www.') || 
       l.match(/[a-z0-9-]+\.[a-z]{2,}/i) ||
       l.includes('.se') || 
       l.includes('.com'))
    );
    
    if (websiteLine) {
      const websiteMatch = websiteLine.match(/(?:www\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/i);
      if (websiteMatch) {
        company.website = websiteMatch[1].toLowerCase().replace(/^www\./, '');
      }
    }
    
    // Extract phone - Swedish format: 08-123 45 67, 070-123 45 67, etc.
    const phoneLine = lines.find(l => 
      /(?:\+46|0)[\s-]?\d[\s-]?\d[\s-]?\d/.test(l)
    );
    
    if (phoneLine) {
      const phoneMatch = phoneLine.match(/(?:\+46|0)[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d?/);
      if (phoneMatch) {
        company.phone = phoneMatch[0].trim();
      }
    }
    
    // Extract postal code and city - format: "12345 City" or "123 45 City"
    const postalLine = lines.find(l => 
      /\d{3}\s*\d{2}\s+[A-ZÄÖÅ]/.test(l)
    );
    
    if (postalLine) {
      const postalMatch = postalLine.match(/(\d{3})\s*(\d{2})\s+(.+)/);
      if (postalMatch) {
        company.postalCode = postalMatch[1] + postalMatch[2];
        company.city = postalMatch[3].trim();
      }
    }
    
    // Extract address - usually before postal code
    const addressIndex = lines.findIndex(l => /\d{3}\s*\d{2}/.test(l));
    if (addressIndex > 0) {
      company.address = lines[addressIndex - 1];
    }
    
    // Only add if we have at least a name and one other field
    if (company.name && company.name.length > 3 && 
        (company.website || company.phone || company.address)) {
      companies.push(company);
    }
  });
  
  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const company of companies) {
    const key = company.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(company);
    }
  }
  
  console.log(`\nFound ${unique.length} companies:\n`);
  console.log(JSON.stringify(unique, null, 2));
  
  // Also create downloadable version
  const dataStr = JSON.stringify(unique, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'industritorget-data.json';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('\n✓ File downloaded! Save it as industritorget-data.json in your project root.');
  
  return unique;
})();



