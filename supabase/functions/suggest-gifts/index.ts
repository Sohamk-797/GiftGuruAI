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
  const FRONTEND_ORIGIN = Deno.env.get('VITE_FRONTEND_BASE_URL') || 'http://localhost:8080';
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    // Preflight response
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
    const prompt = `You are an expert Indian gift curator. Generate ${isFirstBatch ? '9' : '6'} ${isFirstBatch ? '' : 'DIFFERENT'} personalized gift recommendations based on:

${requestData.name ? `Recipient Name: ${requestData.name}` : ''}
${requestData.age ? `Age: ${requestData.age} years old` : ''}
Relation: ${requestData.relation}
Occasion: ${requestData.occasion}
Budget: ₹${requestData.budget_min} - ₹${requestData.budget_max}
Hobbies: ${(Array.isArray(requestData.hobbies) ? requestData.hobbies.join(', ') : '')}
Personality: ${(Array.isArray(requestData.personalities) ? requestData.personalities.join(', ') : '')}
${requestData.city ? `City: ${requestData.city}` : ''}

For each gift, provide:
1. Title (creative, specific product name)
2. Description (2-3 sentences)
3. Price range (within budget)
4. Match score (0-1, how well it fits)
5. A compelling 1-2 sentence rationale explaining why this gift is perfect
6. 3-5 relevant tags from the hobbies/personality
7. Estimated delivery time
8. Vendor name (real or realistic Indian vendors)

Focus on:
- Hyper-local Indian context and culture
- Age-appropriate recommendations
- Emotional intelligence and personalization
- Mix of trending and timeless items
- Diverse price points within budget
- Quality over quantity
${!isFirstBatch ? '- IMPORTANT: Generate COMPLETELY DIFFERENT gifts than previous suggestions. Explore different categories, price points, and themes.' : ''}

Return ONLY a valid JSON array of ${isFirstBatch ? '9' : '6'} gifts with this structure:
[{
  "title": "Handcrafted Jute Planter Set",
  "description": "Eco-friendly jute planters...",
  "price_min": 1200,
  "price_max": 1800,
  "match_score": 0.92,
  "matched_tags": ["Gardening", "Minimalist", "Eco-friendly"],
  "ai_rationale": "Perfect for a nature-loving minimalist who adores indoor plants.",
  "delivery_estimate": "2-4 days in Mumbai",
  "vendor": "GreenCraft India"
}]`;

    // Use Google Gemini (Generative Language API)
    // Model and endpoint
    const modelId = 'gemini-2.5-flash';
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;

  // Build a helper to send Gemini requests (allows retries with different generationConfig)
async function sendGeminiRequest(generationConfig: any) {
  const body = {
    contents: [
      {
        role: 'model',
        parts: [
          {
            text:
              'You are an expert Indian gift curator with deep knowledge of Indian culture, occasions, and gift-giving traditions. You provide personalized, thoughtful gift recommendations.',
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

  // Log a compact, non-sensitive preview of request shape
  try {
    console.log('Gemini request preview:', {
      contents_count: Array.isArray(body.contents) ? body.contents.length : 0,
      generationConfig,
    });
  } catch (e) {}

  const resp = await fetchWithRetry(geminiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': AI_API_KEY,
    },
    body: JSON.stringify(body),
  }, 2, 400);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('Gemini API error:', resp.status, errText.slice(0, 2000));
    throw new Error(`AI API error: ${resp.status} ${errText}`);
  }

  // Try to parse JSON; if parse fails return both parsed (if any) and raw text
  let parsed: any = null;
  let rawText = '';
  try {
    parsed = await resp.json();
  } catch (err) {
    try { rawText = await resp.text(); } catch (e) { rawText = ''; }
    console.error('Failed to parse Gemini response JSON:', err, 'raw (truncated):', rawText.slice(0,2000));
    throw new Error('Failed to parse AI response JSON. See logs for raw output.');
  }
  return parsed;
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

    // Parse final JSON from giftsText
    // Parse final JSON from giftsText with a resilient heuristic (look for JSON array anywhere)
    let aiGifts: any[] = [];
    const textToParse = (giftsText || '').trim();
    const tryParse = (txt: string) => {
      try {
        return JSON.parse(txt);
      } catch (e) {
        return null;
      }
    };

    let parsed = tryParse(textToParse);
    if (!parsed) {
      // Try to extract first JSON array ([...] ) substring
      const arrMatch = textToParse.match(/\[([\s\S]*?)\]/m);
      if (arrMatch) {
        const arrText = arrMatch[0];
        parsed = tryParse(arrText);
      }
    }

    // As a last resort, try to extract a JSON object array style across fenced blocks
    if (!parsed) {
      const fenceMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/m);
      if (fenceMatch) {
        parsed = tryParse(fenceMatch[1]);
      }
    }

    if (!parsed) {
      console.error('Failed to parse AI response as JSON. Raw content (first 5000 chars):', textToParse.slice(0, 5000));
      throw new Error('AI returned malformed JSON. Check function logs for the raw AI output and retry.');
    }

    if (!Array.isArray(parsed)) {
      console.warn('Parsed AI output is not an array; attempting to coerce into array.');
      parsed = Array.isArray(parsed) ? parsed : [parsed];
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

  } catch (error) {
    console.error('Error in suggest-gifts function:', error);
    // Ensure we return CORS headers on error as well
    const FRONTEND_ORIGIN = Deno.env.get('VITE_FRONTEND_BASE_URL') || 'http://localhost:8080';
    const corsHeaders = {
      'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Credentials': 'true',
    };
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      gifts: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
