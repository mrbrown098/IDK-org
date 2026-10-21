// Where the API lives. On localhost the API runs separately on port 5000.
// When the site and the API are served from the same address (the Vercel
// deployment), an empty string means "same address".
window.IDK_CONFIG = {
  API_URL: ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:5000' : ''
};
