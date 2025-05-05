const articles = require('../models/articles');
const utm = require('../models/utm');
const urlShortener = require('../utils/urlShortener');
const fs = require('fs');
const path = require('path');

// Handle GET request for UTM data (sources, mediums, types)
function handleGetUtmData(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    sources: utm.getSources(),
    mediums: utm.getMediums(),
    types: utm.getTypes()
  }));
}

// Handle POST request to generate UTM URL
function handleGenerateUtmUrl(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const { 
        articleId, 
        sourceId, 
        mediumId,
        shouldShorten = false
      } = JSON.parse(body);
      
      // Find the article
      const allArticles = articles.getAll();
      const article = allArticles.find(a => a.id == articleId);
      
      if (!article) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Article not found' }));
        return;
      }
      
      // Use the article's UTM type
      if (!article.utm_type) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Article does not have a UTM type' }));
        return;
      }
      
      // Get source, medium and type details
      const sources = utm.getSources();
      const mediums = utm.getMediums();
      const types = utm.getTypes();
      
      const source = sources.find(s => s.id == sourceId);
      const medium = mediums.find(m => m.id == mediumId);
      const campaignType = types.find(t => t.id == article.utm_type);
      
      if (!source || !medium || !campaignType) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid source, medium, or campaign type' }));
        return;
      }
      
      // Increment the count for this campaign type
      const updatedCount = utm.incrementTypeCount(article.utm_type);
      
      if (updatedCount === null) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to update campaign count' }));
        return;
      }
      
      // Generate UTM URL
      const utmUrl = utm.generateUtmUrl(
        article.url, 
        source.name, 
        medium.name, 
        campaignType.abbr,
        updatedCount
      );
      
      // Save the URL to the CSV file (without shortUrl for now)
      const utmUrlId = utm.saveUtmUrl(
        article.url, 
        utmUrl, 
        null, 
        source.name, 
        medium.name, 
        campaignType.abbr, 
        updatedCount
      );
      
      // Return immediately if no URL shortening requested
      if (!shouldShorten) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          id: utmUrlId,
          originalUrl: article.url,
          utmUrl: utmUrl,
          shortUrl: null
        }));
        return;
      }
      
      // Shorten the URL using reurl.cc API
      urlShortener.shortenUrl(utmUrl)
        .then(shortUrl => {
          // Update the CSV record with the short URL
          const updatedUtmUrlId = utm.saveUtmUrl(
            article.url, 
            utmUrl, 
            shortUrl, 
            source.name, 
            medium.name, 
            campaignType.abbr, 
            updatedCount
          );
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            id: updatedUtmUrlId,
            originalUrl: article.url,
            utmUrl: utmUrl,
            shortUrl: shortUrl
          }));
        })
        .catch(error => {
          console.error('Error shortening URL:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            id: utmUrlId,
            originalUrl: article.url,
            utmUrl: utmUrl,
            shortUrl: null,
            error: 'Failed to shorten URL: ' + error.message
          }));
        });
    } catch (error) {
      console.error('Error handling UTM URL generation:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

// Handle GET request to retrieve UTM URLs from CSV
function handleGetUtmUrls(req, res) {
  const csvFilePath = path.join(__dirname, '..', 'data', 'utm-urls.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([]));
    return;
  }
  
  try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    let rows = csvData.trim().split('\n');
    
    // Validate CSV data and fix missing IDs if needed
    if (rows.length > 1) {
      const headers = rows[0].split(',');
      const fixedRows = [rows[0]]; // Keep header row
      let maxId = -1;
      
      // First pass: find maximum ID
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        // Extract just the ID from the beginning of the line (until first comma)
        const idMatch = rows[i].match(/^(\d+),/);
        if (idMatch) {
          const id = parseInt(idMatch[1], 10);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
            fixedRows.push(rows[i]); // Keep rows with valid IDs
          }
        }
      }
      
      // Second pass: fix rows without IDs
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        // Check if row doesn't have an ID
        if (!rows[i].match(/^\d+,/)) {
          maxId++;
          fixedRows.push(`${maxId},${rows[i]}`);
          
          // Also write the fixed content back to the file
          if (i === rows.length - 1) {
            fs.writeFileSync(csvFilePath, fixedRows.join('\n'));
          }
        }
      }
      
      // Use the fixed rows for processing
      rows = fixedRows;
    }
    
    // Convert CSV to JSON
    const result = [];
    if (rows.length > 1) {
      const headers = rows[0].split(',');
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        // Properly parse CSV line to handle quoted values with commas
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
          // Remove quotes from values if present
          let value = values[index] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"');
          }
          obj[header] = value;
        });
        
        result.push(obj);
      }
    }
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error reading UTM URLs:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load UTM URLs' }));
  }
}

module.exports = {
  handleGetUtmData,
  handleGenerateUtmUrl,
  handleGetUtmUrls
};