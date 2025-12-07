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
    const prompt = `You are an expert Indian gift curator and product recommender. Using the recipient attributes below, generate a compact JSON array of ${isFirstBatch ? '9' : '6'} unique, high-quality gift objects that STRICTLY follow the schema and rules. Output ONLY the JSON array (no prose, no markdown, no code fences, no extra keys).
      Input (use exactly when present):
      ${requestData.name ? `Recipient Name: ${requestData.name}` : ''}
      ${requestData.age ? `Age: ${requestData.age} years old` : ''}
      Relation: ${requestData.relation}
      Occasion: ${requestData.occasion}
      Budget (INR): ${requestData.budget_min} - ${requestData.budget_max}
      Hobbies: ${(Array.isArray(requestData.hobbies) ? requestData.hobbies.join(', ') : '')}
      Personality: ${(Array.isArray(requestData.personalities) ? requestData.personalities.join(', ') : '')}
      ${requestData.city ? `City: ${requestData.city}` : ''}

      REQUIRED OUTPUT SCHEMA (ALL KEYS REQUIRED; strict types):
      {
        "title": "<string, 3-8 words, product-style>",
        "description": "<string, 2-3 sentences; mention why it suits the recipient>",
        "price_min": <integer INR>,
        "price_max": <integer INR>,
        "match_score": <number between 0.00 and 1.00 with exactly two decimals>,
        "matched_tags": ["Tag1", "Tag2", "Tag3"],  // 3-5 short tags (Title Case)
        "ai_rationale": "<string, 1-2 sentences, emotionally framed>",
        "delivery_estimate": "<string; working-day range, city-specific if city provided>",
        "vendor": "<string; prefer verified Indian vendor or realistic local vendor name>"
      }

      DETAILED RULES (follow precisely):
      A. JSON-only & types:
        - Output MUST be exactly a JSON array. Do not print anything else.
        - price_min and price_max MUST be integers (no decimals).
        - match_score MUST be numeric with two decimal places (e.g., 0.92).
        - matched_tags MUST contain 3-5 strings; at least one tag should match a provided hobby or personality trait when possible.
        - Do NOT add extra keys; keep exact key names and types.

      B. Budget & rounding:
        - Prefer price_min/price_max within the requested [budget_min, budget_max].
        - If an ideal product slightly exceeds the budget, clamp to the nearest realistic value within ±10% of the budget and set match_score <= 0.60 to reflect the mismatch.
        - Round prices to the nearest 10 or 50 rupees (e.g., 1490, 1500, 1999).

      C. Price consistency:
        - price_min <= price_max.
        - Keep ranges realistic: width should reflect the product (e.g., a product bundle might have wider range).

      D. Match score (deterministic guidance):
        - Use two-decimal values:
          - 0.70-1.00 = excellent fit
          - 0.50-0.69 = good fit
          - 0.30-0.49 = fair
          - <0.30 = weak / aspirational
        - Prefer higher scores for items that: match hobbies, match personality, fit budget, are age-appropriate, and are culturally appropriate for the occasion.
        - ORDER the array by descending match_score (highest first).

      E. Diversity & de-duplication:
        - Ensure each item is categorically distinct: define category internally (e.g., Experience, Tech, Apparel, Home & Decor, Books, Food/Sweets, Handicraft).
        - No two items should share the same primary category and vendor. If forced, differentiate by substantial subcategory and price.
        - If ${isFirstBatch ? 'this is the first batch' : 'this is not the first batch'}, ensure items explore different categories and price tiers. For follow-up batches, produce COMPLETELY DIFFERENT categories and themes.

      F. Vendor rules:
        - Prefer verified Indian vendors when feasible: Amazon India, Flipkart, Myntra, Nykaa, Pepperfry, Chumbak, BoAt, Fabindia, local artisan collectives, or well-known D2C brands.
        - If you cannot identify a verified vendor, provide a realistic local/small-business vendor name and append (local) implicitly by choosing the name — do NOT add a separate field.
        - Do NOT invent a precise purchase URL. Keep vendor field as a short name only.

      G. Delivery estimate:
        - If city is provided, use city-aware buckets: within metro (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune): "1-3 working days in <City>"; Tier-2 cities: "3-5 working days in <City>"; pan-India: "4-7 working days across India".
        - Use working-day ranges only (no exact dates).

      H. Cultural & age appropriateness:
        - For festival/occasion (Diwali, Raksha Bandhan, Wedding, Birthday), prefer culturally-aligned gifts (traditional crafts, sweets, experiences) when appropriate.
        - Do not recommend age-inappropriate items (e.g., alcohol for minors, hazardous items).
        - For elderly recipients, prefer accessibility/usability unless hobbies explicitly indicate tech-savvy.

      I. Safety & disallowed:
        - Do NOT recommend weapons, illegal substances, or unsafe items.
        - If constrained inputs force such results, omit them and choose alternatives.

      J. Formatting & determinism:
        - Titles: 3-8 words, concise.
        - Description: 2-3 sentences, mention recipient trait/hobby and why this fits.
        - ai_rationale: 1-2 sentences, emotional/personalized.
        - matched_tags: Title Case short tags.
        - Always return as many items as requested (${isFirstBatch ? '9' : '6'}). If constraints prevent the full count, return the maximum valid items (non-empty array) but try to meet the requested count.

      K. Internal reasoning (do not output):
        - Internally decide a primary "category" for each gift to enforce diversity; do not output the category field.

      Now produce ONLY the JSON array of ${isFirstBatch ? '9' : '6'} gift objects that strictly follow the schema and rules above.`;

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
              text: `You are an expert Indian gift curator and product-recommendation specialist with deep knowledge of Indian culture, regional gifting norms, age-appropriate preferences, local vendors, and realistic price ranges across India. Your role is to generate highly personalized, variety-balanced, hyper-local gift suggestions using the recipient's attributes (name, age, relation, city), hobbies, personality traits, occasion, and budget.
                Follow these core principles when generating gifts:

                • Focus on strict personalization — every suggestion must directly relate to the user's inputs (hobbies, personality, age, relation, city).  
                • Use culturally aligned and occasion-appropriate Indian gifting traditions for festivals, birthdays, weddings, professional events, and regional contexts.  
                • Enforce the budget strictly: choose realistic INR price ranges, integer values only, rounded to nearest 10/50. If the ideal item slightly exceeds the budget, clamp values sensibly and reduce match_score.  
                • Ensure age-appropriateness — avoid unsafe, illegal, or maturity-inappropriate items.  
                • Maintain strong diversity between gifts: avoid duplicates, near-duplicates, or items from the same category or vendor unless substantially different.  
                • Prefer verified Indian vendors (Amazon India, Flipkart, Myntra, Nykaa, Pepperfry, Chumbak, Fabindia, BoAt, local artisans, D2C brands). When unsure, create a short, realistic local vendor name.  
                • Delivery estimates must be realistic: city-specific when possible (“2-4 working days in Mumbai”), otherwise pan-India ranges.  
                • Match score must reflect true fit (0.00-1.00, two decimals) based on alignment with hobbies, personality, age, culture, and budget.  
                • Keep all output fields concise, cleanly structured, and free of explanation.  
                • Do not output anything except the JSON that the user prompt requests.

                Act like a seasoned Indian gifting expert who applies cultural intelligence, lifestyle understanding, local delivery knowledge, and product-market awareness to produce accurate, practical, emotionally thoughtful gift recommendations.`
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
