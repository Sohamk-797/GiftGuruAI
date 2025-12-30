#!/usr/bin/env node
/**
 * SEO Static Page Generator
 * Generates static HTML files for all SEO URLs at build time
 * Run with: node scripts/generate-seo-pages.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderToString } from 'react-dom/server';
import React from 'react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import SEO configuration
import {
  generateAllSeoUrls,
  parseSlug,
  SEO_BUDGET_RANGES,
  RELATION_SLUG_MAP,
  OCCASION_SLUG_MAP,
} from '../src/types/seo.ts';

// Initialize Supabase client (optional for static generation)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('📡 Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found, using sample data only');
}

/**
 * Generate sample gifts for a given search intent
 * In production, this would query actual data or use AI
 */
async function generateGiftsForIntent(parsed) {
  const { relation, occasion, budget } = parsed;
  
  // Build a sample gift dataset
  // In production, you'd query your database or AI endpoint
  const sampleGifts = [
    {
      id: `gift-${Math.random()}`,
      title: `Personalized ${relation || 'Gift'} Item`,
      description: `A thoughtful ${occasion || 'special occasion'} gift that shows you care. Perfect for someone who appreciates quality and meaning.`,
      price_min: budget ? budget.min : 500,
      price_max: budget ? budget.max : 2000,
      match_score: 0.92,
      matched_tags: [relation, occasion, 'Thoughtful'].filter(Boolean),
      ai_rationale: `This gift combines personal touch with practical value, making it perfect for ${relation || 'your loved one'}.`,
      delivery_estimate: '3-5 business days',
      vendor: 'Trusted Indian Vendor',
      images: {
        thumb: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=320&h=200&fit=crop',
        small: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=480&h=300&fit=crop',
        regular: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&h=700&fit=crop',
        raw: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48',
      },
      buy_link: '#',
    },
    {
      id: `gift-${Math.random()}`,
      title: `Premium ${occasion || 'Occasion'} Experience`,
      description: `Create lasting memories with this unique experience gift. Ideal for ${relation || 'someone special'} who values experiences over material things.`,
      price_min: budget ? budget.min + 200 : 1000,
      price_max: budget ? budget.max : 5000,
      match_score: 0.88,
      matched_tags: [occasion, 'Experience', 'Premium'].filter(Boolean),
      ai_rationale: `Experiences create memories that last forever, making this an unforgettable gift.`,
      delivery_estimate: 'Instant digital delivery',
      vendor: 'Experience Provider',
      images: {
        thumb: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=320&h=200&fit=crop',
        small: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=480&h=300&fit=crop',
        regular: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&h=700&fit=crop',
        raw: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      },
      buy_link: '#',
    },
    {
      id: `gift-${Math.random()}`,
      title: `Handcrafted ${relation || 'Gift'} Collection`,
      description: `Support artisans while giving a unique, handmade gift. Each piece tells a story and celebrates Indian craftsmanship.`,
      price_min: budget ? budget.min + 100 : 800,
      price_max: budget ? Math.min(budget.max, budget.min + 1500) : 3000,
      match_score: 0.85,
      matched_tags: ['Handcrafted', 'Artisan', relation].filter(Boolean),
      ai_rationale: `Handmade gifts carry personal meaning and support local artisans.`,
      delivery_estimate: '5-7 business days',
      vendor: 'Artisan Collective',
      images: {
        thumb: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=320&h=200&fit=crop',
        small: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=480&h=300&fit=crop',
        regular: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=700&fit=crop',
        raw: 'https://images.unsplash.com/photo-1483985988355-763728e1935b',
      },
      buy_link: '#',
    },
  ];
  
  return sampleGifts;
}

/**
 * Generate HTML for a single SEO page
 */
async function generatePageHtml(slug, parsed, gifts) {
  // In a real implementation, you'd use React SSR here
  // For now, we'll generate a simplified HTML structure
  
  const title = generateTitle(parsed);
  const description = generateMetaDescription(parsed);
  const h1 = generateH1(parsed);
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://gift-guru-ai.vercel.app/${slug}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="https://gift-guru-ai.vercel.app/${slug}">
  <meta property="og:type" content="website">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": title,
      "numberOfItems": gifts.length,
      "itemListElement": gifts.map((gift, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": gift.title,
          "description": gift.description,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": gift.price_min,
            "availability": "https://schema.org/InStock"
          }
        }
      }))
    })}
  </script>
  
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; margin-bottom: 20px; }
    .gift-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
    .gift-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .gift-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
    .gift-title { font-size: 18px; font-weight: 600; margin: 15px 0 10px; }
    .gift-description { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
    .gift-price { color: #2563eb; font-weight: 700; font-size: 16px; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
    .cta-button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <nav><a href="/">Home</a> / ${escapeHtml(title)}</nav>
  
  <h1>${escapeHtml(h1)}</h1>
  <p>${escapeHtml(generateIntro(parsed))}</p>
  
  <a href="/auth" class="cta-button">Get Personalized Recommendations</a>
  
  <h2>Top Gift Ideas</h2>
  <div class="gift-grid">
    ${gifts.map(gift => `
      <div class="gift-card">
        <img src="${gift.images.regular}" alt="${escapeHtml(gift.title)}" loading="lazy">
        <div class="gift-title">${escapeHtml(gift.title)}</div>
        <div class="gift-description">${escapeHtml(gift.description)}</div>
        <div class="gift-price">₹${gift.price_min.toLocaleString('en-IN')} - ₹${gift.price_max.toLocaleString('en-IN')}</div>
        ${gift.ai_rationale ? `<p style="font-size: 12px; color: #9ca3af; font-style: italic;">"${escapeHtml(gift.ai_rationale)}"</p>` : ''}
      </div>
    `).join('')}
  </div>
  
  <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; text-align: center; margin-top: 40px;">
    <h2>Get Your Perfect Gift Recommendation</h2>
    <p>Answer a few questions and let our AI find the perfect match based on personality and interests.</p>
    <a href="/auth" class="cta-button">Start Finding Gifts Now</a>
  </div>
  
  <!-- Hydration script to load React app -->
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
  `.trim();
  
  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function generateTitle(parsed) {
  const { relation, occasion, budget } = parsed;
  let parts = [];
  if (occasion) parts.push(occasion);
  parts.push('Gifts');
  if (relation) parts.push(`for ${relation}`);
  if (budget) parts.push(budget.display);
  return `${parts.join(' ')} | AI-Powered Gift Ideas - GiftGuru`;
}

function generateMetaDescription(parsed) {
  const { relation, occasion, budget } = parsed;
  let desc = `Discover perfect ${occasion ? occasion.toLowerCase() + ' ' : ''}gifts`;
  if (relation) desc += ` for your ${relation.toLowerCase()}`;
  if (budget) desc += ` within ${budget.display}`;
  desc += `. AI-curated recommendations based on personality and interests.`;
  return desc;
}

function generateH1(parsed) {
  const { relation, occasion, budget } = parsed;
  let h1 = '';
  if (occasion && relation) {
    h1 = `Best ${occasion} Gifts for ${relation}`;
  } else if (relation) {
    h1 = `Thoughtful Gifts for ${relation}`;
  } else if (occasion) {
    h1 = `Perfect ${occasion} Gift Ideas`;
  } else {
    h1 = 'Unique Gift Ideas';
  }
  if (budget) h1 += ` ${budget.display}`;
  return h1;
}

function generateIntro(parsed) {
  const { relation, occasion, budget } = parsed;
  let intro = `Finding the perfect ${occasion ? occasion.toLowerCase() + ' ' : ''}gift`;
  if (relation) intro += ` for your ${relation.toLowerCase()}`;
  intro += ` can be challenging. Our AI-powered recommendations help you discover thoughtful gifts`;
  if (budget) intro += ` within your ${budget.display} budget`;
  intro += `.`;
  return intro;
}

/**
 * Main generation function
 */
async function generateAllPages() {
  console.log('🚀 Starting SEO page generation...');
  
  // Get all URLs to generate
  const urls = generateAllSeoUrls();
  console.log(`📄 Generating ${urls.length} SEO pages...`);
  
  // Create output directory
  const outputDir = path.join(__dirname, '../dist/seo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let generated = 0;
  let failed = 0;
  
  for (const slug of urls) {
    try {
      // Parse slug
      const parsed = parseSlug(slug);
      if (!parsed) {
        console.warn(`⚠️  Failed to parse slug: ${slug}`);
        failed++;
        continue;
      }
      
      // Generate gifts
      const gifts = await generateGiftsForIntent(parsed);
      
      // Generate HTML
      const html = await generatePageHtml(slug, parsed, gifts);
      
      // Write file
      const filePath = path.join(outputDir, `${slug}.html`);
      fs.writeFileSync(filePath, html, 'utf-8');
      
      generated++;
      
      if (generated % 100 === 0) {
        console.log(`✅ Generated ${generated}/${urls.length} pages...`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${slug}:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n✨ Generation complete!`);
  console.log(`   ✅ ${generated} pages generated`);
  console.log(`   ❌ ${failed} pages failed`);
  console.log(`   📁 Output: ${outputDir}`);
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllPages().catch(console.error);
}

export { generateAllPages, generatePageHtml, generateGiftsForIntent };
