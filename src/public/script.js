document.addEventListener('DOMContentLoaded', () => {
  const articleForm = document.getElementById('article-form');
  const articleList = document.getElementById('article-list');
  const widgetPreview = document.getElementById('widget-preview');
  const utmForm = document.getElementById('utm-form');
  const utmArticleSelect = document.getElementById('utm-article');
  const utmSourceSelect = document.getElementById('utm-source');
  const utmMediumSelect = document.getElementById('utm-medium');
  const utmResult = document.getElementById('utm-result');
  const utmFullUrl = document.getElementById('utm-full-url');
  const utmShortUrl = document.getElementById('utm-short-url');
  const shortUrlContainer = document.getElementById('short-url-container');

  // Load articles on page load
  fetchArticles();

  // Load UTM data
  fetchUtmData();

  // Fetch UTM type data and populate the dropdown in add article form
  async function populateUtmTypeDropdown() {
    try {
      const response = await fetch('/api/utm/data');
      const data = await response.json();
      
      const utmTypeSelect = document.getElementById('utm_type');
      if (utmTypeSelect) {
        utmTypeSelect.innerHTML = `
          <option value="">Select a type</option>
          ${data.types.map(type => `<option value="${type.id}">${type.name}</option>`).join('')}
        `;
      }
    } catch (error) {
      console.error('Error fetching UTM types:', error);
    }
  }

  // Call the function to populate the dropdown when page loads
  populateUtmTypeDropdown();

  // Handle form submission
  articleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const url = document.getElementById('url').value.trim();
    const utm_type = document.getElementById('utm_type').value.trim();

    if (!title || !url || !utm_type) {
      alert('Title, URL and UTM Type are required');
      return;
    }

    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, url, utm_type })
      });

      if (response.ok) {
        document.getElementById('title').value = '';
        document.getElementById('url').value = '';
        document.getElementById('utm_type').value = '';
        fetchArticles();
      } else {
        const error = await response.json();
        alert('Error adding article: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding article:', error);
      alert('Error adding article: ' + error.message);
    }
  });

  // Update the UTM form submission function
  utmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const articleId = utmArticleSelect.value;
    const sourceId = utmSourceSelect.value;
    const mediumId = utmMediumSelect.value;
    const shouldShorten = document.getElementById('shorten-url')?.checked || false;

    // Update validation
    if (!articleId || !sourceId || !mediumId) {
      alert('Please fill out all required fields');
      return;
    }

    try {
      const response = await fetch('/api/utm/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articleId,
          sourceId,
          mediumId,
          shouldShorten
        })
      });

      if (response.ok) {
        const data = await response.json();

        utmFullUrl.value = data.utmUrl;

        if (data.shortUrl) {
          utmShortUrl.value = data.shortUrl;
          shortUrlContainer.classList.remove('hidden');
        } else {
          shortUrlContainer.classList.add('hidden');
        }

        utmResult.classList.remove('hidden');
      } else {
        const error = await response.json();
        alert('Error generating UTM URL: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating UTM URL:', error);
      alert('Error generating UTM URL: ' + error.message);
    }
  });

  // Add click event listeners for copy buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-button')) {
      const targetId = e.target.dataset.target;
      const inputElement = document.getElementById(targetId);

      if (inputElement) {
        inputElement.select();
        document.execCommand('copy');

        // Visual feedback
        const originalText = e.target.textContent;
        e.target.textContent = 'Copied!';
        setTimeout(() => {
          e.target.textContent = originalText;
        }, 2000);
      }
    }
  });

  // Fetch articles from the server
  async function fetchArticles() {
    try {
      const response = await fetch('/api/articles');
      const articles = await response.json();
      
      // Get UTM types for name lookup
      const utmDataResponse = await fetch('/api/utm/data');
      const utmData = await utmDataResponse.json();
      const utmTypes = utmData.types;

      // Update article list display
      if (articles.length === 0) {
        articleList.innerHTML = '<p>No articles yet.</p>';
      } else {
        articleList.innerHTML = articles.map(article => {
          const utmTypeObj = utmTypes.find(type => type.id === article.utm_type);
          const utmTypeName = utmTypeObj ? utmTypeObj.name : article.utm_type;
          
          return `
          <div class="article-item">
            <h3>${article.id}: ${article.title}</h3>
            <p><a href="${article.url}" target="_blank">${article.url}</a></p>
            <p>UTM Type: ${utmTypeName}</p>
            <small>Added on: ${new Date(article.createdAt).toLocaleString()}</small>
          </div>
        `}).join('');
      }

      // Update article dropdown in UTM form
      utmArticleSelect.innerHTML = `
        <option value="">Select an article</option>
        ${articles.map(article => `<option value="${article.id}">${article.title}</option>`).join('')}
      `;

      // Update widget preview
      updateWidgetPreview();
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  }

  // Fetch UTM data (sources, mediums)
  async function fetchUtmData() {
    try {
      const response = await fetch('/api/utm/data');
      const data = await response.json();

      // Update source dropdown - use name instead of description
      utmSourceSelect.innerHTML = `
        <option value="">Select a source</option>
        ${data.sources.map(source => `<option value="${source.id}">${source.name}</option>`).join('')}
      `;

      // Update medium dropdown - now using name instead of description
      utmMediumSelect.innerHTML = `
        <option value="">Select a medium</option>
        ${data.mediums.map(medium => `<option value="${medium.id}">${medium.name}</option>`).join('')}
      `;
    } catch (error) {
      console.error('Error fetching UTM data:', error);
    }
  }

  // Update widget preview
  async function updateWidgetPreview() {
    try {
      const response = await fetch('/api/widget');
      const widgetHtml = await response.text();
      widgetPreview.innerHTML = widgetHtml;
    } catch (error) {
      console.error('Error updating widget preview:', error);
    }
  }

  // Update the fetchUtmUrls function to display the ID
  async function fetchUtmUrls() {
    try {
      const response = await fetch('/api/utm/urls');
      if (!response.ok) {
        throw new Error('Failed to load UTM URLs');
      }

      const data = await response.json();
      const utmUrlsList = document.getElementById('utm-urls-list');

      if (data.length === 0) {
        utmUrlsList.innerHTML = '<p>No UTM URLs yet.</p>';
        return;
      }

      // Sort by creation date (newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      utmUrlsList.innerHTML = `
        <table class="utm-urls-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>URL</th>
              <th>Short URL</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(url => `
              <tr>
                <td>${url.id}</td>
                <td>${new Date(url.createdAt).toLocaleDateString()}</td>
                <td>
                  <a href="${url.utmUrl}" target="_blank" title="${url.utmUrl}">
                    ${truncateText(url.utmUrl, 40)}
                  </a>
                  <button class="copy-button small" data-text="${url.utmUrl}">Copy</button>
                </td>
                <td>
                  ${url.shortUrl ? `
                    <a href="${url.shortUrl}" target="_blank">${url.shortUrl}</a>
                    <button class="copy-button small" data-text="${url.shortUrl}">Copy</button>
                  ` : '-'}
                </td>
                <td>${url.source} / ${url.medium} / ${url.type}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Add event listeners for the copy buttons
      document.querySelectorAll('.copy-button[data-text]').forEach(button => {
        button.addEventListener('click', function() {
          const text = this.getAttribute('data-text');
          navigator.clipboard.writeText(text).then(() => {
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            setTimeout(() => {
              this.textContent = originalText;
            }, 2000);
          });
        });
      });
    } catch (error) {
      console.error('Error fetching UTM URLs:', error);
      document.getElementById('utm-urls-list').innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
  }

  // Helper function to truncate text with ellipsis
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Add event listeners
  document.getElementById('refresh-utm-urls').addEventListener('click', fetchUtmUrls);

  // Load UTM URLs on page load
  fetchUtmUrls();
});
