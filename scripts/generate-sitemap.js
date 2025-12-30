#!/usr/bin/env node
/**
 * Sitemap Generator
 * Generates sitemap.xml for all SEO URLs
 * Run with: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAllSeoUrls } from '../src/types/seo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://gift-guru-ai.vercel.app';

/**
 * Generate sitemap.xml
 */
function generateSitemap() {
  console.log('🗺️  Generating sitemap.xml...');
  
  // Get all SEO URLs
  const seoUrls = generateAllSeoUrls();
  
  // Static pages
  const staticPages = [
    { url: '', priority: 1.0, changefreq: 'daily' }, // Homepage
    { url: 'auth', priority: 0.8, changefreq: 'weekly' },
    { url: 'privacy', priority: 0.3, changefreq: 'monthly' },
    { url: 'terms', priority: 0.3, changefreq: 'monthly' },
  ];
  
  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add static pages
  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  // Add SEO pages
  for (const slug of seoUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/${slug}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  
  // Write to public directory
  const outputPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');
  
  console.log(`✅ Sitemap generated with ${staticPages.length + seoUrls.length} URLs`);
  console.log(`   📁 Output: ${outputPath}`);
  
  return outputPath;
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap();
}

export { generateSitemap };
