const fs = require('fs');
const path = 'index.html'; // Path to your HTML file
const date = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
let html = fs.readFileSync(path, 'utf8');
html = html.replace(
  /<span id="lastUpdated">.*?<\/span>/,
  `<span id="lastUpdated">${date}</span>`
);
fs.writeFileSync(path, html);
