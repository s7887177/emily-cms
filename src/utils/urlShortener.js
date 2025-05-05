const fs = require('fs');
const path = require('path');
const https = require('https');

// Load API key from the secret folder
function getApiKey() {
  try {
    const secretFilePath = path.join(__dirname, '..', '..', 'secret', 'reurl-config.json');
    const secretData = JSON.parse(fs.readFileSync(secretFilePath, 'utf8'));
    return secretData.apiKey;
  } catch (error) {
    console.error('Error loading reurl.cc API key:', error);
    return null;
  }
}

// Shorten URL using reurl.cc API
async function shortenUrl(longUrl) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not found');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.reurl.cc',
      path: '/shorten',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'reurl-api-key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk.toString(); // Convert Buffer to string
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          // Check for the correct response structure based on the API example
          if (response.res === "success" && response.short_url) {
            resolve(response.short_url);
          } else {
            reject(new Error('Failed to shorten URL: ' + (response.message || 'Unknown error')));
          }
        } catch (error) {
          reject(new Error('Error parsing response from reurl.cc API: ' + error.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('Error making request to reurl.cc API: ' + error.message));
    });

    // Format request according to the API documentation
    req.write(JSON.stringify({
      url: longUrl,
      // You can also pass UTM parameters directly if needed
      // utm_source: "your_source" 
    }));
    
    req.end();
  });
}

module.exports = {
  shortenUrl
};