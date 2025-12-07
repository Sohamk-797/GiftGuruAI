declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

async function fetchWithRetry(url: string, options: any = {}, retries = 2, backoff = 300) {
  let lastErr: any = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      // return even non-ok (caller will handle status), but let transient network errors retry
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise(r => setTimeout(r, backoff * (i + 1)));
      }
    }
  }
  throw lastErr;
}


interface GiftRequest {
  name?: string;
  age?: number;
  relation: string;
  occasion: string;
  budget_min: number;
  budget_max: number;
  hobbies: string[];
  personalities: string[];
  city?: string;
  offset?: number;
}

// Utility: deterministic search key for caching images
const createSearchKey = (title: string, tags: string[]): string =>
  `${title.toLowerCase()}_${tags.slice(0, 3).join('_').toLowerCase()}`.replace(/[^a-z0-9_]/g, '_');

// Fetch image from Unsplash with caching in DB
async function fetchGiftImage(
  supabaseAdmin: any,
  title: string,
  tags: string[]
): Promise<any> {
  const searchKey = createSearchKey(title, tags);

  try {
    // Check cache first
    const { data: cached, error: cacheError } = await supabaseAdmin
    .from('gift_image_cache')
    .select('image_urls, attribution')
    .eq('search_key', searchKey)
    .maybeSingle();

    if (cached && !cacheError) {
      console.log(`Cache hit for: ${searchKey}`);
      return cached.image_urls;
    }

    // Unsplash key from env (must be set in Supabase secrets)
    const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn('UNSPLASH_ACCESS_KEY not configured, using placeholder');
      return null;
    }

    const query = `${title} ${tags.join(' ')} India gift`;
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;

        const response = await fetchWithRetry(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    }, 2, 300);

    if (!response.ok) {
      console.error(`Unsplash API error: ${response.status}`);
      try {
        const errText = await response.text().catch(() => '');
        console.error('Unsplash error body:', errText.slice(0, 1000));
      } catch {}
      return null;
    }

    const unsplashData = await response.json().catch(err => {
      console.error('Error parsing Unsplash JSON:', err);
      return null;
    });

    if (unsplashData.results && unsplashData.results.length > 0) {
      const photo = unsplashData.results[0];
      const imageUrls = {
        raw: photo.urls.raw,
        regular: `${photo.urls.raw}&w=1200&h=700&fit=crop`,
        small: `${photo.urls.raw}&w=480&h=300&fit=crop`,
        thumb: `${photo.urls.raw}&w=320&h=200&fit=crop`,
      };

      const attribution = {
        photographer: photo.user?.name ?? null,
        photographer_url: photo.user?.links?.html ?? null,
        unsplash_url: photo.links?.html ?? null,
      };

      // Cache the result (service role key required)
      await supabaseAdmin
      .from('gift_image_cache')
      .insert({
        search_key: searchKey,
        image_urls: imageUrls,
        attribution: attribution,
      })
      .select()
      .maybeSingle();

      console.log(`Cached new image for: ${searchKey}`);
      return imageUrls;
    }

    return null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Fallback images by category (kept as before)
const categoryImages = {
  creative: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=480&h=300&fit=crop',
  tech: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=480&h=300&fit=crop',
  food: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=480&h=300&fit=crop',
  fashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=480&h=300&fit=crop',
  books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=480&h=300&fit=crop',
  default: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=480&h=300&fit=crop',
};

const getFallbackImage = (tags: string[]) => {
  const tagLower = tags?.[0]?.toLowerCase() || '';
  if (tagLower.includes('art') || tagLower.includes('creative') || tagLower.includes('painting')) {
    return categoryImages.creative;
  }
  if (tagLower.includes('tech') || tagLower.includes('gadget') || tagLower.includes('gaming')) {
    return categoryImages.tech;
  }
  if (tagLower.includes('food') || tagLower.includes('cooking') || tagLower.includes('wine')) {
    return categoryImages.food;
  }
  if (tagLower.includes('fashion') || tagLower.includes('jewelry') || tagLower.includes('style')) {
    return categoryImages.fashion;
  }
  if (tagLower.includes('book') || tagLower.includes('reading')) {
    return categoryImages.books;
  }
  return categoryImages.default;
};

// Validate JWT and extract user ID (same behavior as before)
async function validateAuthToken(authHeader: string | null, supabaseUrl: string, supabaseKey: string): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header');
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey,
      },
    });

    if (!response.ok) {
      console.error('JWT validation failed:', response.status);
      return null;
    }

    const userData = await response.json();
    return userData?.id ?? null;
  } catch (error) {
    console.error('Error validating JWT:', error);
    return null;
  }
}

// Main handler: read secrets inside handler, lazy-load supabase client, run AI & DB logic
serve(async (req: Request) => {
  // Build CORS headers dynamically from env (or fallback)
    // Build CORS response by echoing request Origin when allowed.
  // Allowed origins come from environment variable FRONTEND_ALLOWED_ORIGINS (CSV) or VITE_FRONTEND_BASE_URL for backward compatibility.
  const envAllowed = (Deno.env.get('FRONTEND_ALLOWED_ORIGINS') || Deno.env.get('VITE_FRONTEND_BASE_URL') || 'http://localhost:8080');
    const allowedOrigins = envAllowed
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const requestOrigin = (req.headers.get('origin') || '').toLowerCase();

  // Decide response origin header: echo the request origin if allowed; otherwise fall back to first allowed origin or null.
  let responseOrigin: string | null = null;
  if (requestOrigin && allowedOrigins.some((a: string) => a.toLowerCase() === requestOrigin)) {
    responseOrigin = requestOrigin;
  } else if (allowedOrigins.length > 0) {

    // If you want stricter behavior, you can set responseOrigin = null to reject cross-origin requests.
    responseOrigin = allowedOrigins[0]; // fallback for back-compat
  }

  const corsHeadersBase: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Build final CORS headers object (only include Access-Control-Allow-Origin if we have a value)
  const corsHeaders: Record<string, string> = responseOrigin
    ? { 'Access-Control-Allow-Origin': responseOrigin, ...corsHeadersBase }
    : { ...corsHeadersBase };

  // OPTIONS preflight: respond with the resolved origin header so browser accepts it
  if (req.method === 'OPTIONS') {
    // If responseOrigin is null, respond 403 to preflight to make the problem explicit in logs.
    if (!responseOrigin) {
      console.warn('CORS preflight blocked. Request origin not allowed:', requestOrigin, 'Allowed:', allowedOrigins);
      return new Response(null, { status: 403, headers: corsHeaders });
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }


  try {
    let requestData: GiftRequest;
    try {
      requestData = await req.json();
    } catch (err) {
      console.error('Invalid JSON body received:', err);
      return new Response(JSON.stringify({
        error: 'Invalid JSON body. Ensure Content-Type: application/json and a valid JSON payload.',
        gifts: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const authHeader = req.headers.get('authorization');

    // --- Validate request body early to avoid runtime errors and give meaningful 400s ---
    const missingFields: string[] = [];
    if (!requestData.relation) missingFields.push('relation');
    if (!requestData.occasion) missingFields.push('occasion');
    if (typeof requestData.budget_min !== 'number') missingFields.push('budget_min');
    if (typeof requestData.budget_max !== 'number') missingFields.push('budget_max');
    if (!Array.isArray(requestData.hobbies) || requestData.hobbies.length === 0) missingFields.push('hobbies');
    if (!Array.isArray(requestData.personalities) || requestData.personalities.length === 0) missingFields.push('personalities');

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Bad request: missing or invalid fields: ${missingFields.join(', ')}`,
        gifts: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Read secrets inside the request handler (avoid boot-time issues)
    const AI_API_KEY = Deno.env.get('AI_API_KEY'); // Google API key (set as secret)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!AI_API_KEY) {
      console.error('AI_API_KEY not configured');
      throw new Error('AI_API_KEY is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    // Validate JWT and extract user ID
    const userId = await validateAuthToken(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in to generate gifts.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', userId);
    console.log('Generating gift suggestions for:', requestData);

    // Lazy import supabase client (avoids module-level import issues)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const offset = requestData.offset || 0;
    const isFirstBatch = offset === 0;

    // Build prompt (same content as original)
    const prompt = `You are a senior Indian gift curator and product recommender. Using the recipient attributes below, generate a compact JSON array of exactly ${isFirstBatch ? '9' : '6'} unique, high-quality gift objects and RETURN ONLY THAT ARRAY (no prose, no markdown, no code fences, no additional keys). This prompt is strict: the caller expects exactly ${isFirstBatch ? '9' : '6'} valid objects every response.

INPUT (use when present):
${requestData.name ? `Recipient Name: ${requestData.name}` : ''}
${requestData.age ? `Age: ${requestData.age} years old` : ''}
Relation: ${requestData.relation}
Occasion: ${requestData.occasion}
Budget (INR): ${requestData.budget_min} - ${requestData.budget_max}
Hobbies: ${(Array.isArray(requestData.hobbies) ? requestData.hobbies.join(', ') : '')}
Personality: ${(Array.isArray(requestData.personalities) ? requestData.personalities.join(', ') : '')}
${requestData.city ? `City: ${requestData.city}` : ''}

CORE TAG HANDLING (MUST FOLLOW EXACTLY):
- You MUST internally consider *every* hobby and *every* personality trait the user provided when reasoning about gifts. Treat the full list as evidence to influence category choice, scoring, and tag selection.
- Per gift: output exactly 3(minimum) - 6(average) - maximum possible matched_tags (Title Case). These must be chosen from or logically derived from the user's full supplied list when possible.
- Batch-level coverage: across the entire returned array of ${isFirstBatch ? '9' : '6'} gifts, attempt to cover as many distinct user-supplied hobbies/personality traits as reasonably possible. If the user supplied >8 tags, cluster similar tags and ensure each cluster is represented across different gifts.
- Tag derivation: you may map a supplied tag to a close variant for clarity (e.g., "Gardening / Indoor Plants" → "Indoor Gardening"). Prefer direct matches when available.

STRICT OUTPUT SCHEMA (ALL FIELDS REQUIRED; EXACT TYPES AND NAMES):
[
  {
    "title": "<string, 3-8 words, product-style>",
    "description": "<string, 2-3 sentences; explain why this suits the recipient and reference at least one hobby/personality or the occasion>",
    "price_min": <integer INR>,
    "price_max": <integer INR, >= price_min>,
    "match_score": <number between 0.00 and 1.00 with exactly two decimals>,
    "matched_tags": ["Tag1","Tag2","Tag3"],   // 3-5 short tags (Title Case)
    "ai_rationale": "<string, 1-2 sentences, emotionally framed and concise>",
    "delivery_estimate": "<string; working-day range, city-specific if city provided>",
    "vendor": "<string; prefer verified Indian vendors or realistic local vendor name>"
  }, ...
]

MANDATORY RULES (IMPLEMENT PRECISELY)
1) JSON-only / exact count: Output MUST be exactly a JSON array of ${isFirstBatch ? '9' : '6'} objects. No surrounding text, no extra keys, no comments.  
2) Types & formatting:
   - price_min / price_max: integer INR (no decimals). Round to nearest 10 or 50 (50 for >₹2,000 ranges).  
   - match_score: numeric, two decimals (0.00-1.00).  
   - matched_tags: 3-5 tags, Title Case.  
3) Budget enforcement:
   - Prefer price ranges inside [budget_min, budget_max]. If an ideal product slightly exceeds budget, clamp to nearest realistic integer within ±10% and set match_score <= 0.60 to reflect mismatch.  
4) Price sanity: price_min <= price_max; range widths should be realistic for item type.  
5) Match score policy (two decimals):
   - 0.70-1.00 = excellent fit  
   - 0.50-0.69 = good fit  
   - 0.30-0.49 = fair / padded or weaker fit  
   - <0.30 = aspirational (avoid unless necessary)  
   - Sort array by descending match_score.  
6) Tag constraints:
   - Each gift must include at least one tag directly matching (or clearly derived from) the supplied hobbies/personality traits.  
   - Across the whole batch, maximize coverage of distinct supplied tags/clusters.  
7) Diversity:
   - Ensure primary-category diversity among returned gifts (choose from Tech, Home & Decor, Experience, Food/Sweets, Fashion/Accessory, Books, Handicraft/Artisan, Hobby Kit, Wellness, Subscription/Service).  
   - Avoid same (primary category + vendor) duplicates. If unavoidable, ensure substantial subcategory differences and different price tiers.  
8) Padding requirement:
   - If you cannot find enough high-quality distinct items, you MUST still return exactly ${isFirstBatch ? '9' : '6'} objects by padding with deterministic fallback items derived from the complete set of supplied tags. Padded items must be valid per schema and have conservative match_score (0.30-0.60; prefer 0.45-0.55). Do NOT add an explicit fallback flag.  
9) Vendor & delivery rules:
   - Prefer verified Indian vendors (Amazon India, Flipkart, Myntra, Nykaa, Pepperfry, FabIndia, boAt, Chumbak, established D2C/local artisan). If unclear, use a realistic local vendor name (short). Do NOT invent URLs.  
   - Delivery estimates: if city provided, use metro buckets (Mumbai/Delhi/Bengaluru/Chennai/Hyderabad/Pune) => "1-3 working days in <City>"; Tier-2 => "3-5 working days in <City>"; if city absent => "4-7 working days across India". Use working-day ranges only.  
10) Safety & age: no illegal/unsafe items or age-inappropriate gifts (e.g., alcohol for minors). For elderly recipients prefer accessible/usability items unless hobbies indicate tech-savvy.  
11) No extra keys: strictly follow schema; do not output metadata.  
12) Deterministic formatting: Title 3-8 words; description 2-3 sentences referencing inputs; ai_rationale 1-2 sentences; matched_tags Title Case.  
13) If impossible: still return as many valid objects as possible up to ${isFirstBatch ? '9' : '6'}, but attempt to reach full count via padding.

EXAMPLE OF TAG-DISTRIBUTION (training only; DO NOT PRINT in final output)
- If user supplies 12 tags, cluster them into groups (e.g., Tech, Food, Home, Creative) and ensure each cluster is represented among the returned gifts. Each gift still outputs only 3-5 tags drawn from these clusters.

FEW-SHOT EXAMPLES (format training only; DO NOT output these examples in your final response — they exist here to teach structure):
Example output (small demonstration of shape):
[
  {
    "title": "Handwoven Khadi Shawl",
    "description": "Soft handwoven khadi shawl with a subtle zari border — warm and breathable for evening gatherings, ideal for someone who values artisanal textiles.",
    "price_min": 1499,
    "price_max": 1999,
    "match_score": 0.88,
    "matched_tags": ["Handicraft", "Traditional", "Comfort"],
    "ai_rationale": "A culturally resonant, practical gift for someone who appreciates handcrafted fabrics and understated elegance.",
    "delivery_estimate": "3-5 working days in Pune",
    "vendor": "FabIndia"
  },
  {
    "title": "Artisanal Mithai Box",
    "description": "Assorted handcrafted Indian sweets in premium packaging — perfect for festive celebrations and sharing with family.",
    "price_min": 599,
    "price_max": 899,
    "match_score": 0.76,
    "matched_tags": ["Food", "Festive", "SweetTooth"],
    "ai_rationale": "A crowd-pleasing, culturally appropriate gift ideal for festivals and family gatherings.",
    "delivery_estimate": "2-4 working days in Pune",
    "vendor": "Local Sweets Co"
  },
  {
    "title": "Luxurious Sandalwood Gift Hamper",
    "description": "An elegant hamper featuring pure Mysore sandalwood soap, fragrance oil, and incense sticks — perfect for someone who appreciates timeless Indian aromas. The rich scent profile makes it suitable for calm evenings and traditional celebrations.",
    "price_min": 899,
    "price_max": 1299,
    "match_score": 0.85,
    "matched_tags": ["Aromatic", "Traditional", "Wellness"],
    "ai_rationale": "A culturally rooted and soothing gift ideal for those who enjoy calm, fragrant spaces.",
    "delivery_estimate": "3-5 working days across India",
    "vendor": "Mysore Heritage"
  },
  {
    "title": "Minimalist Leather Card Holder",
    "description": "A premium hand-stitched leather card holder designed for sleek carry and quick access. Ideal for minimalists who prefer compact, clutter-free essentials over bulky wallets.",
    "price_min": 699,
    "price_max": 999,
    "match_score": 0.83,
    "matched_tags": ["Minimalist", "Fashion", "Organized"],
    "ai_rationale": "A practical and stylish everyday accessory suitable for professionals and students alike.",
    "delivery_estimate": "2-4 working days across India",
    "vendor": "Urban Hide"
  },
  {
    "title": "Terracotta Hand-Painted Planter",
    "description": "A beautifully hand-painted terracotta planter crafted by local artisans, offering a vibrant touch to indoor or balcony spaces. Ideal for plant lovers who appreciate earthy, rustic decor.",
    "price_min": 499,
    "price_max": 799,
    "match_score": 0.80,
    "matched_tags": ["Gardening", "Artisan", "Decor"],
    "ai_rationale": "Perfect for someone who enjoys nurturing plants and loves handcrafted traditional art.",
    "delivery_estimate": "3-6 working days in Hyderabad",
    "vendor": "ClayCraft India"
  },
  {
    "title": "Handcrafted Copper Water Bottle",
    "description": "A premium hammered-finish copper bottle known for its Ayurvedic benefits and elegant aesthetic. Ideal for health-conscious individuals who enjoy traditional Indian wellness practices.",
    "price_min": 999,
    "price_max": 1499,
    "match_score": 0.86,
    "matched_tags": ["Wellness", "Ayurveda", "Sustainable"],
    "ai_rationale": "A thoughtful blend of tradition and health, perfect for daily hydration with wellness benefits.",
    "delivery_estimate": "2-4 working days across India",
    "vendor": "CopperVeda"
  },
  {
    "title": "DIY Scented Candle-Making Kit",
    "description": "A complete beginner-friendly kit with wax, essential oils, wicks, and jars for creating personalized candles. Excellent for creative personalities who enjoy hands-on hobbies.",
    "price_min": 799,
    "price_max": 1199,
    "match_score": 0.82,
    "matched_tags": ["Creative", "DIY", "HomeFragrance"],
    "ai_rationale": "A fun and expressive DIY activity perfect for the creatively inclined.",
    "delivery_estimate": "3-5 working days across India",
    "vendor": "Craftology"
  },
  {
    "title": "Luxury Kashmiri Dry Fruits Box",
    "description": "A premium assortment of Kashmiri walnuts, almonds, and dried berries in elegant packaging. Ideal for food enthusiasts who enjoy high-quality, health-oriented snacks.",
    "price_min": 1299,
    "price_max": 1699,
    "match_score": 0.84,
    "matched_tags": ["Foodie", "Healthy", "Premium"],
    "ai_rationale": "A festive and nutritious delight suited for gifting on special occasions or celebrations.",
    "delivery_estimate": "2-4 working days across India",
    "vendor": "Kashmir Naturals"
  },
  {
    "title": "Handcrafted Mandala Wall Art",
    "description": "A detailed, hand-drawn mandala artwork framed in polished wood — perfect to elevate bedroom or study aesthetics. Great for individuals who appreciate calm, mindful, and artistic designs.",
    "price_min": 899,
    "price_max": 1399,
    "match_score": 0.87,
    "matched_tags": ["Artistic", "Mindful", "Decor"],
    "ai_rationale": "A serene and artistic gift ideal for someone who values meaningful, handcrafted decor.",
    "delivery_estimate": "3-6 working days in Delhi",
    "vendor": "ArtNest Studio"
  },
  {
    "title": "Bluetooth Neckband With Deep Bass",
    "description": "A lightweight ergonomic neckband featuring deep bass, long battery life, and fast charging — perfect for music lovers and on-the-go listeners.",
    "price_min": 999,
    "price_max": 1499,
    "match_score": 0.89,
    "matched_tags": ["Music", "Tech", "Lifestyle"],
    "ai_rationale": "Ideal for daily commutes and workouts, especially for someone who loves music everywhere they go.",
    "delivery_estimate": "2-4 working days across India",
    "vendor": "boAt"
  },
  {
    "title": "Premium Herbal Tea Selection",
    "description": "A curated box of organic herbal teas including chamomile, tulsi, and rose blends — perfect for health-conscious individuals who enjoy calming evening rituals.",
    "price_min": 699,
    "price_max": 1099,
    "match_score": 0.81,
    "matched_tags": ["TeaLover", "Wellness", "Soothing"],
    "ai_rationale": "A relaxing and wellness-first gift suitable for someone who enjoys mindful, calming beverages.",
    "delivery_estimate": "3-5 working days across India",
    "vendor": "TeaCulture Co"
  },
  {
    "title": "Hardcover Journal With Custom Name",
    "description": "A premium matte-finish hardcover journal embossed with the recipient's name — ideal for writers, students, or professionals who enjoy organized reflection.",
    "price_min": 499,
    "price_max": 899,
    "match_score": 0.83,
    "matched_tags": ["Writing", "Personalized", "Organized"],
    "ai_rationale": "A thoughtful and personal gift for someone who loves writing or maintaining daily notes.",
    "delivery_estimate": "3-6 working days in Mumbai",
    "vendor": "InkPress"
  }
]

INTERNAL (do not print) GUIDANCE TO FOLLOW WHILE DECIDING SCORES:
- +0.20 if multiple strong signals align (hobby + personality + occasion + budget).  
- -0.15 if candidate is outside budget but still chosen (clamp price and lower match_score).
- -0.10 for marginally weaker cultural fit.  
- Floor match_score at 0.30 for padded items unless totally aspirational.

GENERATION TIPS (for best compliance):
- Use a deterministic, lower creativity setting: favor factual and structured outputs.  
- Ensure numeric formatting (integers for prices; two decimals for scores).  
- If uncertain about a vendor, choose a local-sounding vendor name rather than fabricating major-brand details.

Now produce ONLY the JSON array of exactly ${isFirstBatch ? '9' : '6'} gift objects that follow all rules above, prioritize tag coverage, and order by match_score descending.`;


  // Use Google Gemini (Generative Language API)
  // Model and endpoint
  const modelId = 'gemini-2.5-flash';
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;

  // Build a helper to send Gemini requests (allows retries with different generationConfig)
  // Find code and replace with:
  async function sendGeminiRequest(generationConfig: any) {
    const body = {
      contents: [
        {
          role: 'model',
          parts: [
            {
              text: `You are an expert Indian gift curator and product-recommendation specialist. Before reading the user's prompt, adopt these internal rules and reasoning heuristics — they are for your internal decision-making only and must NOT be printed. After reading the user's prompt, follow them exactly when producing the JSON array the user requested.
              A. REQUIRED MINDSET
              - Treat every provided hobby and every provided personality trait as mandatory evidence to inform gift selection, categories, and scoring. Do not ignore any supplied tag; instead, weigh them and use them to diversify and justify suggestions.
              - Aim for culturally-appropriate, age-appropriate, and budget-aware recommendations that feel practical and locally plausible for India.

              B. TAG HANDLING (explicit, testable)
              1. Internal use: ingest the full list of user-provided hobbies + personality traits and build clusters (groups of related tags).
              2. Per gift: output exactly 3(minimum) - 6(average) - maximum possible matched_tags chosen from or logically derived from the user's supplied tags (Title Case). Prefer direct matches; allow tight derivations only when necessary (e.g., "Gardening / Indoor Plants" → "Indoor Gardening").
              3. Batch coverage: across the full array, maximize coverage of distinct supplied tags/clusters so the batch collectively reflects the user's entire input set. Avoid concentrating on only 1-2 tags when many were provided.
              4. If user supplied >8 tags: create 3-5 clusters and ensure at least one gift represents each cluster (subject to budget/occasion constraints).

              C. MATCH SCORE & SCORING HEURISTICS (deterministic)
              - match_score is 0.00-1.00 with two decimals.
              - Compute score from weighted signals (rough guideline, apply deterministically):
                • Hobby alignment: 0.30  
                • Personality alignment: 0.20  
                • Occasion/cultural fit: 0.15  
                • Budget fit (within preferred range): 0.15  
                • Delivery feasibility & vendor realism: 0.10  
                • Novelty / category diversity benefit: 0.10  
              - Add a +0.20 bonus when multiple strong signals align (e.g., hobby + personality + occasion + budget). Subtract -0.15 for budget miss (clamped item), -0.10 for weak cultural fit. Floor padded items at 0.30.
              - Use two decimals (round to nearest hundredth). Order final array by descending match_score.

              D. BUDGET & PRICING RULES
              - Prefer price_min/price_max inside [budget_min, budget_max]. Round prices to nearest 10 or 50 rupees (use 50 when >₹2,000).
              - If ideal item slightly exceeds budget, clamp to nearest realistic integer within ±10% of budget and set match_score ≤ 0.60 to reflect mismatch.
              - Ensure price_min ≤ price_max and that the range width is realistic for the product category.

              E. DIVERSITY, CATEGORIES & PADDING
              - Ensure primary-category diversity across the array. Primary categories to use internally: Tech, Home & Decor, Experience, Food/Sweets, Fashion/Accessory, Books, Handicraft/Artisan, Hobby Kit, Wellness, Subscription/Service.
              - Do not output two gifts that share the same (primary category + vendor) unless they are substantively different in subcategory and price tier.
              - If fewer than required valid items can be found, deterministically pad the array (still returning exact count) with fallback items derived from the full tag set. Padded items must be schema-valid and use conservative match_score (0.30-0.60, prefer 0.45-0.55). Do not include a fallback flag.

              F. VENDOR & DELIVERY POLICY
              - Prefer verified Indian vendors where plausible (examples: Amazon India, Flipkart, Myntra, Nykaa, Pepperfry, FabIndia, boAt, Chumbak). If uncertain, provide a short realistic local vendor name; do NOT invent URLs.
              - Delivery estimates:
                • If city provided: metro (Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Pune) → "1-3 working days in <City>"; Tier-2 → "3-5 working days in <City>".
                • If city not provided: "4-7 working days across India".
              - Use working-day ranges only.

              G. SAFETY & AGE APPROPRIATENESS
              - Do NOT recommend weapons, illegal items, or anything age-inappropriate (e.g., alcohol for minors).
              - For elderly recipients prefer accessible/usability items unless hobbies indicate tech-savvy.

              H. OUTPUT HYGIENE (MUST FOLLOW)
              - Produce ONLY the JSON array requested by the user's prompt — no prose, no metadata, no explanation, no comments.
              - Strict schema: every object must include exactly the keys: title (string), description (string), price_min (int), price_max (int), match_score (number, two decimals), matched_tags (array of 3-5 strings), ai_rationale (string), delivery_estimate (string), vendor (string). No extra keys.
              - Formatting: Title 3-8 words; description 2-3 sentences referencing at least one provided hobby/personality/occasion; ai_rationale 1-2 sentences emotionally framed; matched_tags Title Case; prices integers; match_score two decimals.
              - Sort the array by match_score descending.

              I. FAILURE MODES & RECOVERY (internal)
              - If unable to create the exact required count with high-quality items, generate deterministic padded items as described in E.
              - If a provided tag cannot be matched to any reasonable gift, map it to a close semantic cluster rather than dropping it entirely.

              J. INTERNAL LOGIC EXAMPLES (do not print)
              - If user gives 12 tags, group into clusters like [Tech], [Food/Drink], [Home], [Creative], then ensure each cluster appears in at least one gift; each gift should still show only 3-5 tags selected from its cluster(s).

              Now read the user prompt (which follows) and generate the JSON array strictly following these internal rules and output hygiene constraints.`

            },
          ],
        },
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };

    // Basic request preview log (non-sensitive)
    try {
      console.log('Gemini request preview:', {
        contents_count: Array.isArray(body.contents) ? body.contents.length : 0,
        generationConfig,
      });
    } catch (e) {}

    // Retry strategy for transient errors (429, 503)
    const maxAttempts = 4;
    const baseMs = 400; // initial backoff
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const resp = await fetchWithRetry(geminiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': AI_API_KEY,
          },
          body: JSON.stringify(body),
        }, 1, 200); // fetchWithRetry will retry once per call (keeps this quick)

        // If non-ok, capture text for diagnostics.
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`Gemini API error (attempt ${attempt + 1}):`, resp.status, errText.slice(0, 2000));

          // If the error is transient (rate-limited/overloaded), retry with backoff + jitter.
          if (resp.status === 429 || resp.status === 503) {
            // If last attempt, throw enriched error
            if (attempt === maxAttempts - 1) {
              const e: any = new Error(`AI API error: ${resp.status}`);
              e.code = 'ai_api_unavailable';
              e.status = resp.status;
              e.details = errText.slice(0, 2000);
              throw e;
            }
            // backoff with jitter
            const jitter = Math.floor(Math.random() * 200);
            const wait = baseMs * Math.pow(2, attempt) + jitter;
            console.warn(`Transient Gemini error ${resp.status}. retrying in ${wait}ms (attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          } else {
            // Non-retryable HTTP error — attach details and throw
            const e: any = new Error(`AI API error: ${resp.status}`);
            e.code = 'ai_api_error';
            e.status = resp.status;
            e.details = errText.slice(0, 2000);
            throw e;
          }
        }

        // Try to parse JSON response
        let parsed: any = null;
        try {
          parsed = await resp.json();
        } catch (err) {
          const rawText = await resp.text().catch(() => '');
          console.error('Failed to parse Gemini response JSON:', err, 'raw (truncated):', rawText.slice(0,2000));
          const e: any = new Error('Failed to parse AI response JSON.');
          e.code = 'ai_parse_error';
          e.details = rawText.slice(0, 2000);
          throw e;
        }

        // Got parsed response — return it
        return parsed;

      } catch (err) {
        // If this was our explicitly thrown ai_api_unavailable or ai_parse_error, bubble it up
        if ((err as any)?.code && ['ai_api_unavailable','ai_api_error','ai_parse_error'].includes((err as any).code)) {
          throw err;
        }
        // For other runtime/network errors, decide whether to retry
        if (attempt === maxAttempts - 1) {
          const e: any = new Error('AI request failed after retries.');
          e.code = (err as any)?.code || 'ai_request_failed';
          e.details = (err as any)?.message || String(err);
          throw e;
        }
        const jitter = Math.floor(Math.random() * 200);
        const wait = baseMs * Math.pow(2, attempt) + jitter;
        console.warn(`Network/Fetch error to Gemini (attempt ${attempt + 1}). Retrying in ${wait}ms.`, err);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
    }

    // Defensive fallback (should not reach here)
    const e: any = new Error('AI request failed (fatal).');
    e.code = 'ai_request_failed_fatal';
    throw e;
  }

// Primary attempt: generous token allowance but conservative start
let geminiData: any = null;
try {
  geminiData = await sendGeminiRequest({ temperature: 0.7, maxOutputTokens: 2048 });

  // If model got truncated (MAX_TOKENS) and produced no text, retry once with larger maxOutputTokens
  const candidate = Array.isArray(geminiData?.candidates) && geminiData.candidates.length > 0 ? geminiData.candidates[0] : null;
  const finishReason = candidate?.finishReason ?? candidate?.finish_reason ?? null;
  const hasContentText = (() => {
    try {
      const cont = candidate?.content ?? candidate?.content;
      if (!cont) return false;
      // search for parts text
      if (Array.isArray(cont)) {
        for (const item of cont) {
          if (item?.parts && Array.isArray(item.parts) && item.parts[0]?.text) return true;
          if (item?.text) return true;
        }
      } else if (cont?.parts && Array.isArray(cont.parts) && cont.parts[0]?.text) {
        return true;
      } else if (typeof cont?.text === 'string') {
        return true;
      }
      return false;
    } catch (e) { return false; }
  })();

  if ((finishReason === 'MAX_TOKENS' || finishReason === 'max_tokens') && !hasContentText) {
    console.warn('Gemini response was truncated (MAX_TOKENS) and returned no text — retrying with larger maxOutputTokens (4096).');
    // Retry once with a larger allowance
    geminiData = await sendGeminiRequest({ temperature: 0.7, maxOutputTokens: 4096 });
  }
} catch (err) {
  // Bubble up with clear logs
  console.error('Error calling Gemini:', err);
  throw err;
}

// Log a truncated view of the model response for debugging
try {
  const truncated = JSON.stringify(geminiData).slice(0, 1000);
  console.log('Gemini response (truncated):', truncated);
} catch (e) {
  console.log('Gemini response: [unserializable]');
}

// Robust extraction of text from several possible Gemini response shapes:
let giftsText: string | null = null;


    // 1) Modern shape: geminiData.candidates[0].content -> array of content items with parts
    try {
      const candidates = geminiData?.candidates;
      if (Array.isArray(candidates) && candidates.length > 0) {
        const firstCandidate = candidates[0];
        const candidateContent = firstCandidate.content;
        if (Array.isArray(candidateContent) && candidateContent.length > 0) {
          for (const contentItem of candidateContent) {
            if (contentItem?.parts && Array.isArray(contentItem.parts) && contentItem.parts.length > 0) {
              const partText = contentItem.parts[0]?.text;
              if (partText) {
                giftsText = partText;
                break;
              }
            }
          }
        } else if (candidateContent?.parts?.length) {
          giftsText = candidateContent.parts[0]?.text ?? null;
        }
      }
    } catch (e) {
      console.warn('Error extracting from candidates shape', e);
    }

    // 2) Alternative shape: geminiData?.output?.[0]?.content...
    if (!giftsText) {
      try {
        const output = geminiData?.output;
        if (Array.isArray(output) && output.length > 0) {
          for (const outItem of output) {
            const cont = outItem?.content;
            if (Array.isArray(cont) && cont.length > 0) {
              for (const c of cont) {
                if (c?.text) { giftsText = c.text; break; }
                if (c?.parts && Array.isArray(c.parts) && c.parts.length > 0 && c.parts[0]?.text) {
                  giftsText = c.parts[0].text; break;
                }
              }
            }
            if (giftsText) break;
          }
        }
      } catch (e) {
        console.warn('Error extracting from output shape', e);
      }
    }

    // 3) Fallback: other fields
    if (!giftsText) {
      giftsText = geminiData?.candidates?.[0]?.output_text
        || geminiData?.candidates?.[0]?.text
        || geminiData?.text
        || geminiData?.generated_text
        || null;
    }

    if (!giftsText) {
      console.error('AI response missing expected content shape:', JSON.stringify(geminiData).slice(0, 1000));
      throw new Error('AI returned unexpected response shape (no text) — check logs for raw output.');
    }

    // If the model returned JSON in fence blocks or markdown, strip fences
    if (typeof giftsText === 'string') {
      if (giftsText.includes('```json')) {
        const parts = giftsText.split('```json');
        if (parts.length > 1) giftsText = parts[1].split('```')[0];
      } else if (giftsText.includes('```')) {
        const parts = giftsText.split('```');
        if (parts.length > 1) giftsText = parts[1].split('```')[0];
      }
    }

    let aiGifts: any[] = [];
    const textToParse = (giftsText || '').trim();

    const tryParse = (txt: string | null) => {
      if (!txt) return null;
      try {
        return JSON.parse(txt);
      } catch (e) {
        return null;
      }
    };

    // 1) Try direct parse first
    let parsed = tryParse(textToParse);

    // 2) If that fails, try greedy substring between first '[' and last ']' (captures longest array)
    if (!parsed) {
      const firstIdx = textToParse.indexOf('[');
      const lastIdx = textToParse.lastIndexOf(']');
      if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx) {
        const arrText = textToParse.slice(firstIdx, lastIdx + 1);
        parsed = tryParse(arrText);
      }
    }

    // 3) If still failing, try to extract JSON from fenced blocks (```json ... ```), prefer the last fenced block
    if (!parsed) {
      const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      let match;
      let lastFenceContent: string | null = null;
      while ((match = fenceRegex.exec(textToParse)) !== null) {
        if (match[1]) lastFenceContent = match[1];
      }
      if (lastFenceContent) {
        // try parsing the fenced content directly
        parsed = tryParse(lastFenceContent.trim());
        // if fenced content still contains surrounding text, try greedy array inside it
        if (!parsed) {
          const fFirst = lastFenceContent.indexOf('[');
          const fLast = lastFenceContent.lastIndexOf(']');
          if (fFirst !== -1 && fLast !== -1 && fLast > fFirst) {
            const arrText = lastFenceContent.slice(fFirst, fLast + 1);
            parsed = tryParse(arrText);
          }
        }
      }
    }

    // 4) As a last attempt: extract individual top-level object blocks `{ ... }` and parse each, collecting valid objects.
    //    This recovers partial results when the array is truncated or commas are missing.
    if (!parsed) {
      const objRegex = /{[\s\S]*?}/g;
      const objs: any[] = [];
      const raw = textToParse;
      let m;
      while ((m = objRegex.exec(raw)) !== null) {
        const objText = m[0];
        const p = tryParse(objText);
        if (p && typeof p === 'object') {
          objs.push(p);
        } else {
          // try to repair few common issues: trailing commas inside object -> remove `,(\s*[}\]])`
          try {
            const repaired = objText.replace(/,(\s*[}\]])/g, '$1'); // remove trailing commas before } or ]
            const rp = tryParse(repaired);
            if (rp && typeof rp === 'object') objs.push(rp);
          } catch (ignored) {}
        }
      }
      if (objs.length > 0) {
        parsed = objs;
      }
    }

    // 5) If still null => give a helpful error
    if (!parsed) {
      console.error('Failed to parse AI response as JSON. Raw content (first 8000 chars):', textToParse.slice(0, 8000));
      // Attach the raw text to error.details already handled by outer catch; throw a descriptive error.
      const err: any = new Error('AI returned malformed or truncated JSON. Check function logs for raw AI output.');
      err.code = 'ai_malformed_json';
      err.details = textToParse.slice(0, 8000);
      throw err;
    }

    // 6) Normalize to array
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    aiGifts = parsed;


    // FRONTEND_BASE_URL for buy links
    const FRONTEND_BASE_URL = Deno.env.get('VITE_FRONTEND_BASE_URL') || 'https://example.com';

    // Enrich gifts with images, insert into DB and update buy_link
    const enrichedGifts = await Promise.all(
      aiGifts.map(async (gift: any) => {
        const imageUrls = await fetchGiftImage(supabaseAdmin, gift.title, gift.matched_tags || []);
        const images = imageUrls || {
          raw: getFallbackImage(gift.matched_tags || []),
          regular: getFallbackImage(gift.matched_tags || []),
          small: getFallbackImage(gift.matched_tags || []),
          thumb: getFallbackImage(gift.matched_tags || []),
        };

        const { data: savedGift, error: insertError } = await supabaseAdmin
        .from('gifts')
        .insert({
          user_id: userId,
          title: gift.title,
          description: gift.description,
          price_min: gift.price_min,
          price_max: gift.price_max,
          match_score: gift.match_score,
          matched_tags: gift.matched_tags,
          ai_rationale: gift.ai_rationale,
          delivery_estimate: gift.delivery_estimate,
          vendor: gift.vendor,
          images: images,
          buy_link: '',
          is_public: false,
        })
        .select()
        .maybeSingle();

        if (insertError) {
          console.error('Error inserting gift:', JSON.stringify(insertError));
          // Return a helpful error for this one failed gift rather than throwing raw DB error
          throw new Error('Database insert error while saving gift. Check logs for db error details.');
        }

        if (!savedGift || !savedGift.id) {
          console.error('Insert returned no savedGift:', savedGift);
          throw new Error('Database did not return the saved gift ID after insert.');
        }


        const buyLink = `${FRONTEND_BASE_URL}/gift/${savedGift.id}`;
        const { error: updateError } = await supabaseAdmin
          .from('gifts')
          .update({ buy_link: buyLink })
          .eq('id', savedGift.id);

        if (updateError) {
          console.error('Error updating buy_link:', updateError);
        }

        return {
          id: savedGift.id,
          title: savedGift.title,
          description: savedGift.description,
          price_min: savedGift.price_min,
          price_max: savedGift.price_max,
          match_score: savedGift.match_score,
          matched_tags: savedGift.matched_tags,
          ai_rationale: savedGift.ai_rationale,
          delivery_estimate: savedGift.delivery_estimate,
          vendor: savedGift.vendor,
          images: savedGift.images,
          buy_link: buyLink,
        };
      })
    );

    console.log(`Saved ${enrichedGifts.length} gifts for user ${userId}`);

    return new Response(JSON.stringify({ gifts: enrichedGifts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  // Find code and replace with:
  } catch (error) {
    // Detailed logging for debugging
    console.error('Error in suggest-gifts function:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      details: (error as any)?.details,
    });

    // Resolve allowed origin like earlier
    const envAllowed = (Deno.env.get('FRONTEND_ALLOWED_ORIGINS') || Deno.env.get('VITE_FRONTEND_BASE_URL') || 'http://localhost:8080');
    const allowedOrigins = envAllowed
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const requestOrigin = (req.headers.get('origin') || '').toLowerCase();
    const responseOrigin = requestOrigin && allowedOrigins.some((a: string) => a.toLowerCase() === requestOrigin) ? requestOrigin : (allowedOrigins[0] || null);

    const errorCorsHeaders: Record<string, string> = responseOrigin
      ? { 'Access-Control-Allow-Origin': responseOrigin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Credentials': 'true' }
      : { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Credentials': 'true' };

    // Build structured error response
    const code = (error as any)?.code || 'internal_error';
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = (error as any)?.details;

    const respBody: any = {
      error: {
        code,
        message,
      },
      gifts: []
    };
    if (details) respBody.error.details = details;

    return new Response(JSON.stringify(respBody), {
      status: 500,
      headers: { ...errorCorsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
