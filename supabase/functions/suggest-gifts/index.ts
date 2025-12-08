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

const createSearchKey = (title: any, tags: any[] = []): string => {
  const t = (title === null || title === undefined) ? '' : String(title).trim();
  // include up to 12 tags to avoid collisions while keeping key reasonable
  const safeTags = Array.isArray(tags)
    ? tags.map((x: any) => (x === null || x === undefined ? '' : String(x).trim())).filter(Boolean).slice(0, 12)
    : [];
  const tagStr = safeTags.join('_');
  // build key, lowercase and replace non-alphanum with underscore, and limit length to 200 chars
  const raw = `${t.toLowerCase()}_${tagStr.toLowerCase()}`;
  const cleaned = raw.replace(/[^a-z0-9_]/g, '_');
  return cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
};

// Fetch image from Unsplash with caching in DB
async function fetchGiftImage(
  supabaseAdmin: any,
  title: any,
  tags: any[] = []
): Promise<any> {
  // Coerce inputs to safe strings
  const safeTitle = (title === null || title === undefined) ? '' : String(title);
  const safeTags = Array.isArray(tags) ? tags.map((t: any) => (t === null || t === undefined) ? '' : String(t)) : [];
  const searchKey = createSearchKey(safeTitle, safeTags);

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
      const query = `${safeTitle} ${safeTags.join(' ')} India gift`.trim();
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

const getFallbackImage = (tags: any[] = []) => {
  const first = (Array.isArray(tags) && tags.length > 0) ? tags[0] : '';
  const tagLower = (first === null || first === undefined) ? '' : String(first).toLowerCase();
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
    // Build prompt (slightly adjusted - model should still produce JSON but server will enforce exact count & final scoring)
const prompt = `You are a senior Indian gift curator and product recommender. Using the recipient attributes below, generate a compact JSON array of unique, high-quality gift objects that follow the schema described. The model should return gift candidates (the model's match_score and matched_tags are suggestions). IMPORTANT: the server will compute final match_score using the full set of provided tags and will enforce the exact batch size (${isFirstBatch ? '9' : '6'}) before returning results to the client — so focus on producing high-quality candidate objects in the requested schema (no surrounding prose, no markdown, no code fences, no additional keys).

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
- Internally consider *every* hobby and *every* personality trait the user provided when reasoning about gifts. Treat the full list as evidence to influence category choice, scoring, and tag selection.
- Per gift: output 3-6 short matched_tags (Title Case). These are a concise summary; the server will still use the full input tags for final scoring.
- Batch-level coverage: across the returned array of ${isFirstBatch ? '9' : '6'} gifts, attempt to cover as many distinct user-supplied hobbies/personality clusters as reasonably possible.

STRICT OUTPUT SCHEMA (ALL FIELDS REQUIRED; EXACT TYPES AND NAMES):
[
  {
    "title": "<string, 3-8 words, product-style>",
    "description": "<string, 2-3 sentences; explain why this suits the recipient and reference at least one hobby/personality or the occasion>",
    "price_min": <integer INR>,
    "price_max": <integer INR, >= price_min>,
    "match_score": <number between 0.00 and 1.00 with two decimals>,   // MODEL-SUGGESTED only; server will recalc
    "matched_tags": ["Tag1","Tag2","Tag3"],   // 3-6 short tags (Title Case) — SERVER WILL ALSO USE ALL SUPPLIED TAGS
    "ai_rationale": "<string, 1-2 sentences, emotionally framed and concise>",
    "delivery_estimate": "<string; working-day range, city-specific if city provided>",
    "vendor": "<string; prefer verified Indian vendors or realistic local vendor name>"
  }, ...
]

MANDATORY RULES (IMPLEMENT PRECISELY)
1) JSON-only output: model should return a JSON array of candidate objects. The server will enforce exact count and final scores.
2) Types & formatting: price_min / price_max integers; match_score model-suggestion can be present but server will compute final match_score.
3) Budget enforcement & diversity: prefer price ranges inside [budget_min, budget_max]; ensure category diversity where possible.

Now produce the JSON array of candidate gifts (no prose).`;



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
    // 6) Normalize to array
if (!Array.isArray(parsed)) {
  parsed = [parsed];
}

aiGifts = parsed;

// -------------------- SERVER-SIDE NORMALIZATION, SCORING & ENFORCEMENT --------------------
// Ensure deterministic final results: normalize parsed gifts, compute server-side final match_score
// using all user-supplied tags, then sort/trim/pad to requiredCount before enrichment.

// Helper: basic tokenizer (lowercase, split on non-alphanum)
const tokenize = (s: any) => {
  const str = (s === null || s === undefined) ? '' : String(s);
  return str.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
};

const rawTagList: string[] = [
  ...(Array.isArray(requestData.hobbies) ? requestData.hobbies : []),
  ...(Array.isArray(requestData.personalities) ? requestData.personalities : []),
].map((t: any) => {
  // coerce to string and trim - avoid calling .trim on non-strings
  return t === null || t === undefined ? '' : String(t).trim();
}).filter((t: string) => t.length > 0);

// Deduplicate while preserving items as strings
const userTags = Array.from(new Set(rawTagList));


// Determine required count
const requiredCount = isFirstBatch ? 9 : 6;

// Normalize gifts into consistent shape (coerce types, trim strings)
const normalizeGift = (gRaw: any) => {
  const g = gRaw || {};

  const title = (g.title === null || g.title === undefined) ? '' : String(g.title).trim();
  const description = (g.description === null || g.description === undefined) ? '' : String(g.description).trim();

  const price_min = (g.price_min !== null && g.price_min !== undefined && !Number.isNaN(Number(g.price_min)))
    ? Math.max(0, Math.round(Number(g.price_min)))
    : null;
  const price_max = (g.price_max !== null && g.price_max !== undefined && !Number.isNaN(Number(g.price_max)))
    ? Math.max(0, Math.round(Number(g.price_max)))
    : null;

  // Robust match_score coercion:
  // Accept numbers, numeric strings ("0.85", "85%") and fall back to 0.
  let rawScore: any = g.match_score;
  if (rawScore === null || rawScore === undefined) rawScore = 0;
  // If it's a string containing a percent like "85%", remove % then parse.
  if (typeof rawScore === 'string' && rawScore.trim().endsWith('%')) {
    const cleaned = rawScore.trim().replace('%', '');
    rawScore = cleaned;
  }
  // Convert to number safely
  let match_score_num = Number(rawScore);
  if (!Number.isFinite(match_score_num)) {
    // try parsing floats from strings that may contain commas or stray chars
    const asStr = String(rawScore).replace(/[,₨₹\s]/g, '');
    match_score_num = Number(asStr);
  }
  if (!Number.isFinite(match_score_num)) match_score_num = 0;

  // If model gave percent-like (e.g., 85), normalize to 0..1
  if (match_score_num > 1) {
    if (match_score_num <= 100) match_score_num = match_score_num / 100;
    else match_score_num = match_score_num / 1000; // defensive
  }

  // Ensure in 0..1 and round to two decimals
  match_score_num = Math.max(0, Math.min(1, match_score_num));
  match_score_num = Math.round(match_score_num * 100) / 100;

  const matched_tags = Array.isArray(g.matched_tags)
    ? g.matched_tags.map((t: any) => (t === null || t === undefined) ? '' : String(t).trim()).filter(Boolean)
    : [];

  const ai_rationale = (g.ai_rationale === null || g.ai_rationale === undefined) ? '' : String(g.ai_rationale).trim();
  const vendor = (g.vendor === null || g.vendor === undefined) ? '' : String(g.vendor).trim();
  const delivery_estimate = (g.delivery_estimate === null || g.delivery_estimate === undefined) ? '' : String(g.delivery_estimate).trim();

  return {
    __raw: gRaw,
    title,
    description,
    price_min,
    price_max,
    match_score: match_score_num,
    matched_tags,
    ai_rationale,
    vendor,
    delivery_estimate,
  };
};

// Tag overlap score uses all userTags; returns 0..1
function tagOverlapScore(gift: any, userTagsArr: string[]) {
  if (!userTagsArr || userTagsArr.length === 0) return 0;
const giftText = [
  gift.title ?? '',
  gift.description ?? '',
  ...(Array.isArray(gift.matched_tags) ? gift.matched_tags : []),
].map((x: any) => (x === null || x === undefined) ? '' : String(x)).join(' ').toLowerCase();
  const giftTokens = new Set(tokenize(giftText));
  let hits = 0;
  for (const t of userTagsArr) {
    const tt = (t || '').toString().toLowerCase().trim();
    if (!tt) continue;
    // direct token match
    const ttTokens = tokenize(tt);
    let matched = false;
    for (const tok of ttTokens) {
      if (giftTokens.has(tok) || giftText.includes(tok)) {
        matched = true;
        break;
      }
    }
    if (matched) hits++;
  }
  return hits / userTagsArr.length; // fraction 0..1
}

// Budget proximity score: 0..1 (1 if gift within user budget)
function budgetScore(gift: any, budgetMin: number | undefined, budgetMax: number | undefined) {
  if (!budgetMin || !budgetMax || !gift.price_min || !gift.price_max) return 0.5; // neutral if missing
  // within budget if gift range overlaps with [budgetMin, budgetMax]
  const overlap = Math.max(0, Math.min(gift.price_max, budgetMax) - Math.max(gift.price_min, budgetMin));
  const giftWidth = Math.max(1, gift.price_max - gift.price_min);
  // proportion of gift price covered by budget
  const proportion = overlap / (giftWidth || 1);
  // if fully inside budget, return 1, else 0.5..0
  if (gift.price_min >= budgetMin && gift.price_max <= budgetMax) return 1.0;
  if (proportion > 0) return Math.max(0.3, 0.5 * proportion + 0.5 * 0.5); // somewhat gentle
  // no overlap
  return 0.25;
}

// Compute final score combining model suggestion and server deterministic signals
function computeFinalScore(gift: any, userTagsArr: string[], budgetMin: number | undefined, budgetMax: number | undefined) {
  const overlap = tagOverlapScore(gift, userTagsArr);            // 0..1
  const bScore = budgetScore(gift, budgetMin, budgetMax);       // 0..1
  // heuristic: hobby 0.35, personality 0.20 (but both appear in tags), occasion 0.15 (approx via description), budget 0.15, vendor/delivery 0.15
  // We'll combine overlap and budget with modelScore.
  const modelScore = Number.isFinite(Number(gift.match_score)) ? Number(gift.match_score) : 0;
  const serverComponent = Math.min(1, Math.max(0, (overlap * 0.8 + bScore * 0.2)));
  // Weighted blend: server 0.65, model 0.35 (server more authoritative)
  const final = Math.min(1, Math.max(0, serverComponent * 0.65 + modelScore * 0.35));
  // Apply small bonuses/penalties (approximate rules from prompt)
  let adjusted = final;
  // bonus when overlap is high and budget is good
  if (overlap >= 0.75 && bScore >= 0.9) adjusted = Math.min(1, adjusted + 0.08);
  // penalty if gift clearly outside budget
  if (bScore < 0.3) adjusted = Math.max(0, adjusted - 0.12);
  // floor padded items later at 0.30
  // round to two decimals
  adjusted = Math.round(adjusted * 100) / 100;
  return adjusted;
}

function generatePaddedItem(idx: number, userTagsArr: string[], budgetMin: number | undefined, budgetMax: number | undefined) {
  const tagSource = userTagsArr && userTagsArr.length ? userTagsArr : ['General'];
  // pick up to 3 tags for initial matched_tags deterministically
  const tagsForThis = [
    tagSource[idx % tagSource.length],
    tagSource[(idx + 1) % tagSource.length],
    tagSource[(idx + 2) % tagSource.length],
  ].filter(Boolean).map(t => String(t).trim()).slice(0, 3);

  const defaultMin = budgetMin && budgetMax ? Math.max(100, Math.round((budgetMin + budgetMax) / 3)) : 500;
  const defaultMax = budgetMin && budgetMax ? Math.max(defaultMin + 200, Math.round((budgetMin + budgetMax) / 2)) : defaultMin + 700;
  const priceMin = Math.max(100, Math.round(defaultMin));
  const priceMax = Math.max(priceMin, Math.round(defaultMax));
  const tagDisplay = tagsForThis.length ? tagsForThis.join(' ') : 'General';
  const title = `${tagDisplay} Gift Set`;
  const description = `A thoughtfully selected ${tagDisplay.toLowerCase()} gift that aligns with the recipient's interests. Suitable for the occasion and practical for everyday use.`;
  const matched_tags = tagsForThis.map((t:any) =>
    String(t).split(/[\s_-]+/).map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
  );
  const match_score = 0.45; // conservative padded score
  const ai_rationale = `Deterministic fallback derived from tags: ${matched_tags.join(', ') || '"General"'}.`;
  const vendor = 'Local Curated Vendor';
  const delivery_estimate = requestData.city ? `3-6 working days in ${requestData.city}` : '4-7 working days across India';
  return {
    __raw: null,
    title,
    description,
    price_min: priceMin,
    price_max: priceMax,
    match_score,
    matched_tags,
    ai_rationale,
    vendor,
    delivery_estimate,
  };
}

// Normalize parsed gifts
let normalized = aiGifts.map(normalizeGift);

// --- Augment matched_tags deterministically and compute final server-side match_score using ALL user tags ---
// helper: find best matching userTags for a gift (returns ordered array of user tags that appear in gift text)
function bestUserTagsForGift(gift: any, userTagsArr: string[]) {
  const giftText = [gift.title || '', gift.description || '', ...(Array.isArray(gift.matched_tags) ? gift.matched_tags : [])]
    .map((x:any) => (x === null || x === undefined) ? '' : String(x)).join(' ').toLowerCase();
  // compute simple relevance score per tag: token overlap + substring match
  const scores: { tag: string; score: number }[] = userTagsArr.map(t => {
    const tt = String(t).toLowerCase();
    const tokens = tt.split(/[^a-z0-9]+/).filter(Boolean);
    let s = 0;
    for (const tok of tokens) {
      if (giftText.includes(tok)) s += 1;
    }
    // small bump if exact tag substring present
    if (tt.length > 0 && giftText.includes(tt)) s += 0.5;
    return { tag: t, score: s };
  }).sort((a,b) => b.score - a.score);
  return scores.filter(x=>x.score>0).map(x=>x.tag);
}

// Ensure each gift has 3-6 matched_tags — pick best matches from userTags deterministically,
// falling back to deriving tags from title/description tokens if needed.
normalized = normalized.map(g => {
  // ensure matched_tags is array of strings (from model or empty)
  g.matched_tags = Array.isArray(g.matched_tags) ? g.matched_tags.map((t:any) => String(t).trim()).filter(Boolean) : [];

  // collect best tags for this gift from userTags
  const best = bestUserTagsForGift(g, userTags);

  // start with model-provided tags (if any) but map to userTags when possible
  const normalizedTags: string[] = [];
  // prefer tags that are both model-provided and exist in userTags (or substr match)
  for (const mt of g.matched_tags) {
    const mtLow = String(mt).toLowerCase();
    // find closest user tag
    const match = userTags.find(ut => String(ut).toLowerCase() === mtLow) || userTags.find(ut => String(ut).toLowerCase().includes(mtLow)) || null;
    normalizedTags.push(match ? String(match) : String(mt));
    if (normalizedTags.length >= 6) break;
  }

  // append best user tags not already present until we have at least 3 tags (or up to 6)
  for (const ut of best) {
    if (normalizedTags.length >= 6) break;
    if (!normalizedTags.map(x => x.toLowerCase()).includes(String(ut).toLowerCase())) normalizedTags.push(ut);
  }

  // if still <3, add first tokens from title/description (deterministic)
  if (normalizedTags.length < 3) {
    const titleTokens = String(g.title || '').split(/\s+/).map((t:any)=>String(t)).filter(Boolean);
    for (const tk of titleTokens) {
      if (normalizedTags.length >= 3) break;
      if (!normalizedTags.map(x=>x.toLowerCase()).includes(String(tk).toLowerCase())) normalizedTags.push(tk);
    }
  }

  // final trim to 3-6 items and Title Case them (simple capitalization)
  const finalTags = normalizedTags.slice(0, 6).map((t:any) => {
    const s = String(t).trim();
    return s.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  });

  g.matched_tags = finalTags;

  // compute final score using server logic
  const finalScore = computeFinalScore(g, userTags, requestData.budget_min, requestData.budget_max);
  g.match_score = finalScore;

  return g;
});

// --- Batch-level coverage: ensure distinct user tags are represented across gifts.
// Greedy: mark which userTags are already covered by gifts; if uncovered tags remain,
// try to insert them into gifts with lowest penalty (append to matched_tags until 5 tags)
(function enforceBatchCoverage(arr: any[], userTagsArr: string[]) {
  const covered = new Set<string>();
  for (const g of arr) {
    for (const t of (g.matched_tags || [])) covered.add(String(t).toLowerCase());
  }
  const uncovered = userTagsArr.filter(ut => !covered.has(String(ut).toLowerCase()));
  let gi = 0;
  for (const ut of uncovered) {
    if (gi >= arr.length) gi = 0;
    // try to append to gift where ut isn't present and matched_tags.length < 5
    // iterate a few times to find a candidate
    let assigned = false;
    for (let tries = 0; tries < arr.length && !assigned; tries++, gi = (gi + 1) % arr.length) {
      const gift = arr[gi];
      const lowerTags = (gift.matched_tags || []).map((x:any)=>String(x).toLowerCase());
      if (!lowerTags.includes(String(ut).toLowerCase()) && (gift.matched_tags || []).length < 5) {
        gift.matched_tags.push(String(ut).split(/[\s_-]+/).map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '));
        assigned = true;
      }
    }
    gi++;
  }
})(normalized, userTags);

// Sort by descending match_score
normalized.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

// Trim or pad to requiredCount deterministically
if (normalized.length > requiredCount) {
  normalized = normalized.slice(0, requiredCount);
} else if (normalized.length < requiredCount) {
  const toAdd = requiredCount - normalized.length;
  for (let i = 0; i < toAdd; i++) {
    const padded = generatePaddedItem(i + normalized.length, userTags, requestData.budget_min, requestData.budget_max);
    normalized.push(padded);
  }
}

(function augmentPaddedItems(arr: any[], userTagsArr: string[]) {
  // reuse helper bestUserTagsForGift (already defined above)
  for (const g of arr) {
    // if gift already has 3+ tags, skip
    if (Array.isArray(g.matched_tags) && g.matched_tags.length >= 3) continue;

    // build normalizedTags using same logic as earlier
    const existing = Array.isArray(g.matched_tags) ? g.matched_tags.map((t:any)=>String(t).trim()).filter(Boolean) : [];
    const best = bestUserTagsForGift(g, userTagsArr);

    const normalizedTags: string[] = [...existing];

    for (const ut of best) {
      if (normalizedTags.length >= 6) break;
      if (!normalizedTags.map(x => x.toLowerCase()).includes(String(ut).toLowerCase())) normalizedTags.push(ut);
    }

    if (normalizedTags.length < 3) {
      const titleTokens = String(g.title || '').split(/\s+/).map((t:any)=>String(t)).filter(Boolean);
      for (const tk of titleTokens) {
        if (normalizedTags.length >= 3) break;
        if (!normalizedTags.map(x=>x.toLowerCase()).includes(String(tk).toLowerCase())) normalizedTags.push(tk);
      }
    }

    g.matched_tags = normalizedTags.slice(0, 6).map((t:any) => {
      const s = String(t).trim();
      return s.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });
  }

  // re-run greedy batch coverage to distribute any remaining uncovered tags
  (function enforceBatchCoverageAgain(arr2: any[], userTags2: string[]) {
    const covered = new Set<string>();
    for (const g of arr2) {
      for (const t of (g.matched_tags || [])) covered.add(String(t).toLowerCase());
    }
    const uncovered = userTags2.filter(ut => !covered.has(String(ut).toLowerCase()));
    let gi = 0;
    for (const ut of uncovered) {
      if (gi >= arr2.length) gi = 0;
      let assigned = false;
      for (let tries = 0; tries < arr2.length && !assigned; tries++, gi = (gi + 1) % arr2.length) {
        const gift = arr2[gi];
        const lowerTags = (gift.matched_tags || []).map((x:any)=>String(x).toLowerCase());
        if (!lowerTags.includes(String(ut).toLowerCase()) && (gift.matched_tags || []).length < 5) {
          gift.matched_tags.push(String(ut).split(/[\s_-]+/).map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '));
          assigned = true;
        }
      }
      gi++;
    }
  })(arr, userTagsArr);

})(normalized, userTags);

// Ensure padded items have at least floor score 0.30
normalized = normalized.map((g: any) => {
  if (!Number.isFinite(g.match_score)) g.match_score = 0.30;
  if (g.match_score < 0.30) g.match_score = 0.30;
  // round to two decimals if not already
  g.match_score = Math.round(Number(g.match_score) * 100) / 100;
  return g;
});

// Replace aiGifts with normalized final array
aiGifts = normalized;

// Log if padding was used to aid debugging
try {
  const paddedCount = aiGifts.filter((g:any) => (g.__raw === null)).length;
  if (paddedCount > 0) console.log(`Used ${paddedCount} padded fallback gifts to reach required count (${requiredCount}).`);
} catch (e) {}

// -------------------- END normalization/scoring/enforcement --------------------



    // FRONTEND_BASE_URL for buy links
    const FRONTEND_BASE_URL = Deno.env.get('VITE_FRONTEND_BASE_URL') || 'https://example.com';

    // Enrich gifts with images, insert into DB and update buy_link
    const enrichedGifts = await Promise.all(
      aiGifts.map(async (gift: any) => {
        const imageUrls = await fetchGiftImage(supabaseAdmin, gift.title, userTags || gift.matched_tags || []);
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
