const fs = require('fs');
const path = require('path');

// Data directory and file path
const dataDir = path.join(__dirname, '..', 'data');
const csvFilePath = path.join(dataDir, 'articles.csv');

// In-memory storage for articles
let articles = [];
let nextId = 0;

// Initialize the storage
function init() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing articles from CSV if it exists
  if (fs.existsSync(csvFilePath)) {
    try {
      const csvData = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvData.trim().split('\n');
      
      // Skip header row
      if (rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue; // Skip empty rows
          
          const columns = parseCSVLine(rows[i]);
          if (columns && columns.length >= 5) {
            const id = parseInt(columns[0]);
            const title = columns[1];
            const utm_type = columns[2] || null;
            const url = columns[3];
            const createdAt = new Date(columns[4]);
            
            articles.push({ id, title, utm_type, url, createdAt });
            
            // Update nextId to be one higher than the highest id
            nextId = Math.max(nextId, id + 1);
          }
        }
      }
      console.log(`Loaded ${articles.length} articles from CSV file`);
    } catch (error) {
      // Initialize empty file with header
      fs.writeFileSync(csvFilePath, 'id,title,utm_type,url,createdAt\n');
    }
  } else {
    // Initialize empty file with header
    fs.writeFileSync(csvFilePath, 'id,title,utm_type,url,createdAt\n');
  }
}

// Helper function to properly parse CSV lines with quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last column
  result.push(current);
  
  // Remove surrounding quotes
  return result.map(value => {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.substring(1, value.length - 1).replace(/""/g, '"');
    }
    return value;
  });
}

// Save articles to CSV
function saveArticlesToCsv() {
  let csvContent = 'id,title,utm_type,url,createdAt\n';
  
  articles.forEach(article => {
    // Escape quotes in fields
    const title = article.title.includes('"') ? `"${article.title.replace(/"/g, '""')}"` : `"${article.title}"`;
    const url = article.url.includes('"') ? `"${article.url.replace(/"/g, '""')}"` : `"${article.url}"`;
    const utm_type = article.utm_type ? 
      (article.utm_type.includes('"') ? `"${article.utm_type.replace(/"/g, '""')}"` : `"${article.utm_type}"`) : '';
    
    csvContent += `${article.id},${title},${utm_type},${url},${article.createdAt.toISOString()}\n`;
  });
  
  fs.writeFileSync(csvFilePath, csvContent);
  console.log(`Saved ${articles.length} articles to CSV file`);
}

// Get all articles
function getAll() {
  return articles;
}

// Add a new article
function add(title, url, utm_type = null) {
  const newArticle = { 
    id: nextId++, 
    title, 
    utm_type,
    url, 
    createdAt: new Date() 
  };
  
  articles.push(newArticle);
  saveArticlesToCsv();
  
  return newArticle;
}

// Initialize on module load
init();

module.exports = {
  getAll,
  add
};