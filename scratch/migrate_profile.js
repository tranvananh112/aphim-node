const fs = require('fs');
const html = fs.readFileSync('html_backups/profile.html', 'utf8');
const mainMatch = html.match(/<main id="profileMain"[^>]*>([\s\S]*?)<\/main>/i);
if (!mainMatch) { console.log('No main tag found'); process.exit(1); }
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
let extraStyles = '';
if (headMatch) {
  // Extract all <style> blocks from head
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/ig;
  let sMatch;
  while ((sMatch = styleRegex.exec(headMatch[1])) !== null) {
    if (!sMatch[0].includes('dropdown-blue-override') && !sMatch[0].includes('.footer-grid')) {
      extraStyles += sMatch[0] + '\n';
    }
  }
}
const ejsContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <%- include('partials/head') %>
    <link rel="stylesheet" href="/css/avatar-frames.css?v=15">
    <link rel="stylesheet" href="/css/pricing-premium.css?v=15">
    <link rel="stylesheet" href="/css/profile-shop.css?v=36">
    <link rel="stylesheet" href="/css/profile-progress.css?v=18">
    ${extraStyles}
</head>
<body class="bg-background-dark text-gray-100 font-display min-h-screen profile-page">
    <%- include('partials/header') %>

    ${mainMatch[0]}

    <%- include('partials/footer') %>
    <%- include('partials/chat') %>

    <script src="/js/profile.js?v=21"></script>
    <script src="/js/profile-progress.js"></script>
    <script src="/js/profile-shop.js"></script>
    <script src="/js/profile-promo.js"></script>
</body>
</html>`;
fs.writeFileSync('views/profile.ejs', ejsContent);
console.log('Successfully updated views/profile.ejs');
