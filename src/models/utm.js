const fs = require('fs');
const path = require('path');

// Data directory and file paths
const dataDir = path.join(__dirname, '..', 'data');
const sourceFilePath = path.join(dataDir, 'utm-campiagn-source.csv');
const mediumFilePath = path.join(dataDir, 'utm-campiagn-medium.csv');
const typeFilePath = path.join(dataDir, 'utm-campiagn-type.csv');

// Parse CSV file into JSON array
function parseCsvFile(filePath) {
  try {
    const csvData = fs.readFileSync(filePath, 'utf8');
    const rows = csvData.trim().split('\n');
    
    // Get headers from first row
    const headers = rows[0].split(',');
    
    // Parse data rows
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      // Skip empty rows
      if (!rows[i].trim()) continue;
      
      // Handle potential commas in CSV values by proper parsing
      const values = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < rows[i].length; j++) {
        const char = rows[i][j];
        
        if (char === '"' && (j === 0 || rows[i][j - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);
      
      // Create object from headers and values
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      
      result.push(obj);
    }
    
    return result;
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    return [];
  }
}

// Get all UTM sources
function getSources() {
  return parseCsvFile(sourceFilePath);
}

// Get all UTM mediums
function getMediums() {
  return parseCsvFile(mediumFilePath);
}

// Get all UTM types
function getTypes() {
  return parseCsvFile(typeFilePath);
}

// Generate UTM URL
function generateUtmUrl(originalUrl, source, medium, campaignTypeAbbr, campaignCount) {
  try {
    const url = new URL(originalUrl);
    
    // Get current date in yyyymmdd format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Format campaign count as 3 digits
    const formattedCount = String(campaignCount).padStart(3, '0');
    
    // Add UTM parameters
    url.searchParams.append('utm_source', source);
    url.searchParams.append('utm_medium', medium);
    url.searchParams.append('utm_campaign', `${dateStr}_${campaignTypeAbbr}_${formattedCount}`);
    
    return url.toString();
  } catch (error) {
    console.error('Error generating UTM URL:', error);
    return originalUrl;
  }
}

// Function to update the count for a campaign type
function incrementTypeCount(typeId) {
  const types = getTypes();
  const typeIndex = types.findIndex(t => t.id == typeId);
  
  if (typeIndex >= 0) {
    // Increment the count
    types[typeIndex].count = parseInt(types[typeIndex].count || 0) + 1;
    
    // Save the updated counts back to the CSV file
    let csvContent = 'id,name,abbr,count\n';
    types.forEach(type => {
      csvContent += `${type.id},${type.name},${type.abbr},${type.count}\n`;
    });
    
    fs.writeFileSync(typeFilePath, csvContent);
    return types[typeIndex].count;
  }
  
  return null;
}

// Add this variable to track the next ID
let nextUtmUrlId = 0;

// Add this function to ensure no duplicate IDs are used
function repairUtmUrlsCsv() {
  const csvFilePath = path.join(dataDir, 'utm-urls.csv');
  
  if (fs.existsSync(csvFilePath)) {
    try {
      const csvData = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvData.trim().split('\n');
      
      if (rows.length <= 1) return; // Just header or empty file
      
      const fixedRows = [rows[0]]; // Keep header
      let nextId = 0;
      
      // Process each data row
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        // Check if row starts with a number ID
        const hasId = rows[i].match(/^\d+,/);
        
        if (hasId) {
          // Extract the ID
          const idMatch = rows[i].match(/^(\d+),/);
          const id = parseInt(idMatch[1], 10);
          // Update nextId to be one higher than the highest seen ID
          nextId = Math.max(nextId, id + 1);
          // Keep the row as is
          fixedRows.push(rows[i]);
        } else {
          // Add missing ID to the row
          fixedRows.push(`${nextId},${rows[i]}`);
          nextId++;
        }
      }
      
      // Update nextUtmUrlId to ensure new entries get correct IDs
      nextUtmUrlId = nextId;
      
      // Write fixed content back to file
      fs.writeFileSync(csvFilePath, fixedRows.join('\n'));
      console.log(`Repaired UTM URLs CSV file, next ID: ${nextUtmUrlId}`);
    } catch (error) {
      console.error('Error repairing UTM URLs CSV:', error);
    }
  }
}

// Initialize the next ID by reading existing UTM URLs
function initUtmUrlId() {
  const csvFilePath = path.join(dataDir, 'utm-urls.csv');
  
  if (fs.existsSync(csvFilePath)) {
    try {
      // Then repair the file for IDs
      repairUtmUrlsCsv();
      
      // Now read the repaired file
      const csvData = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvData.trim().split('\n');
      
      // Skip if only header exists or file is empty
      if (rows.length <= 1) return;
      
      // Find the maximum ID in the file
      let maxId = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',');
        if (columns.length > 0) {
          const id = parseInt(columns[0]);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
          }
        }
      }
      
      nextUtmUrlId = maxId + 1;
      console.log(`Initialized UTM URL ID counter to ${nextUtmUrlId}`);
    } catch (error) {
      console.error('Error initializing UTM URL ID:', error);
    }
  }
}

// Call initialization when module loads
initUtmUrlId();

// Modify the saveUtmUrl function to ensure proper line breaks
function saveUtmUrl(originalUrl, utmUrl, shortUrl, source, medium, typeAbbr, count) {
  const csvFilePath = path.join(dataDir, 'utm-urls.csv');
  
  // Create file with header if it doesn't exist
  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, 'id,originalUrl,utmUrl,shortUrl,source,medium,type,count,createdAt\n');
  } else {
    // Make sure the last character in the file is a newline
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    if (fileContent.length > 0 && !fileContent.endsWith('\n')) {
      fs.appendFileSync(csvFilePath, '\n');
    }
  }
  
  // Generate ID for this entry
  const id = nextUtmUrlId++;
  
  // Append the new URL to the file
  const now = new Date().toISOString();
  
  // Escape quotes in URLs if needed
  const escapedOriginalUrl = originalUrl.includes('"') ? `"${originalUrl.replace(/"/g, '""')}"` : `"${originalUrl}"`;
  const escapedUtmUrl = utmUrl.includes('"') ? `"${utmUrl.replace(/"/g, '""')}"` : `"${utmUrl}"`;
  const escapedShortUrl = shortUrl ? 
    (shortUrl.includes('"') ? `"${shortUrl.replace(/"/g, '""')}"` : `"${shortUrl}"`) : '';
  
  const line = `${id},${escapedOriginalUrl},${escapedUtmUrl},${escapedShortUrl},"${source}","${medium}","${typeAbbr}",${count},"${now}"\n`;
  
  fs.appendFileSync(csvFilePath, line);
  
  // Return the ID of the created entry
  return id;
}

module.exports = {
  getSources,
  getMediums,
  getTypes,
  generateUtmUrl,
  incrementTypeCount,
  saveUtmUrl
};