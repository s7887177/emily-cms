const http = require('http');
const fs = require('fs');
const path = require('path');
const articleRoutes = require('./routes/articleRoutes');
const utmRoutes = require('./routes/utmRoutes');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${hostname}:${port}`);
  const pathname = parsedUrl.pathname;

  // Handle static file serving
  if (pathname === '/styles.css') {
    const filePath = path.join(__dirname, 'public', 'styles.css');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/css');
      res.end(data);
    });
    return;
  }

  if (pathname === '/script.js') {
    const filePath = path.join(__dirname, 'public', 'script.js');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/javascript');
      res.end(data);
    });
    return;
  }

  // Article API endpoints
  if (pathname === '/api/articles' && req.method === 'GET') {
    articleRoutes.handleGetArticles(req, res);
    return;
  }

  if (pathname === '/api/articles' && req.method === 'POST') {
    articleRoutes.handleAddArticle(req, res);
    return;
  }

  if (pathname === '/api/widget') {
    articleRoutes.handleWidgetRequest(req, res);
    return;
  }
  
  // UTM API endpoints
  if (pathname === '/api/utm/data' && req.method === 'GET') {
    utmRoutes.handleGetUtmData(req, res);
    return;
  }
  
  if (pathname === '/api/utm/generate' && req.method === 'POST') {
    utmRoutes.handleGenerateUtmUrl(req, res);
    return;
  }

  if (pathname === '/api/utm/urls' && req.method === 'GET') {
    utmRoutes.handleGetUtmUrls(req, res);
    return;
  }

  // Default: serve main HTML page
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Error loading page');
      return;
    }
    res.end(data);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});