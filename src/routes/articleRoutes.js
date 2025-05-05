const articles = require('../models/articles');

// Handle GET request for all articles
function handleGetArticles(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(articles.getAll()));
}

// Handle POST request to add a new article
function handleAddArticle(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const { title, url, utm_type } = JSON.parse(body);
      
      if (!title || !url || !utm_type) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Title, URL and UTM Type are required' }));
        return;
      }
      
      const newArticle = articles.add(title, url, utm_type);
      
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(newArticle));
    } catch (error) {
      console.error('Error adding article:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request format' }));
    }
  });
}

// Generate widget HTML
function handleWidgetRequest(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  
  const allArticles = articles.getAll();
  
  // Generate dropdown HTML
  let dropdownHtml = `
    <select id="article-dropdown">
      <option value="">Select an article</option>
      ${allArticles.map(article => `<option value="${article.id}">${article.title}</option>`).join('')}
    </select>
    <script>
      document.getElementById('article-dropdown').addEventListener('change', function() {
        const id = this.value;
        if (id) {
          const article = ${JSON.stringify(allArticles)}.find(a => a.id == id);
          if (article) window.open(article.url, '_blank');
        }
      });
    </script>
  `;
  
  res.end(dropdownHtml);
}

module.exports = {
  handleGetArticles,
  handleAddArticle,
  handleWidgetRequest
};