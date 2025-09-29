// Simple script to generate sitemap
// Run with: node generate-sitemap.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static sitemap with placeholders for dynamic content
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages -->
  <url>
    <loc>https://omnipply.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>https://omnipply.com/features</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://omnipply.com/dashboard</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>https://omnipply.com/profile</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>https://omnipply.com/my-submissions</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <!-- 
  TODO: Add dynamic URLs for:
  - Organizations: /org/[slug]
  - Coalitions: /coalitions/[slug] 
  - Programs: /programs/[id] and /programs/[id]/apply
  
  You can generate these by querying your database and adding them to this sitemap.
  -->
</urlset>`;

// Write to public directory
const publicDir = path.join(__dirname, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

fs.writeFileSync(sitemapPath, sitemap);
console.log('Sitemap generated successfully at:', sitemapPath);
console.log('\nNext steps:');
console.log('1. Add your dynamic URLs (orgs, coalitions, programs) to the sitemap');
console.log('2. Submit your sitemap to Google Search Console');
console.log('3. Update the lastmod dates when you make changes');
