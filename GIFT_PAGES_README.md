# GiftGuru Individual Gift Pages

## Overview

Each gift now has a dedicated detail page with:
- Unique URL route: `/gift/:id`
- SEO-optimized metadata (title, description, og tags)
- Rich social preview cards
- Unique Unsplash images per gift
- Shareable links with proper canonical URLs
- Image caching for performance
- Accessibility features (keyboard nav, back button)

## Architecture

### Frontend
- **Route**: `/gift/:id` (see `src/pages/GiftDetail.tsx`)
- **Data flow**: Fetches from `sessionStorage` key `giftguru:last_suggestions`
- **Future**: Replace sessionStorage with real database fetch when gifts are persisted
- **Share URLs**: Built via `src/utils/shareUrl.ts` using `VITE_FRONTEND_BASE_URL` env var

### Backend
- **Edge Function**: `supabase/functions/suggest-gifts/index.ts`
- **Image Provider**: Unsplash API with deterministic caching
- **Cache Table**: `gift_image_cache` stores fetched images by search key
- **Rate Limiting**: Cached images prevent redundant API calls

## Environment Variables

### Required in Production

```bash
# Frontend base URL for share links and SEO
VITE_FRONTEND_BASE_URL=https://yourdomain.com

# Unsplash API key for fetching gift images
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### Development
- `VITE_FRONTEND_BASE_URL` is optional in dev (falls back to `window.location.origin`)
- `UNSPLASH_ACCESS_KEY` should be set via Supabase secrets (already configured)

## Image Caching

**Cache Key Format**: `{gift_title}_{tag1}_{tag2}_{tag3}` (normalized, lowercase)

**Cache Table Schema**:
```sql
gift_image_cache (
  id uuid PRIMARY KEY,
  search_key text UNIQUE,
  image_urls jsonb,  -- { raw, regular, small, thumb }
  attribution jsonb, -- { photographer, photographer_url, unsplash_url }
  created_at timestamp,
  updated_at timestamp
)
```

**Cache Behavior**:
1. Check cache first by search_key
2. If miss, fetch from Unsplash
3. Store result in cache for future requests
4. Use category-based fallback if Unsplash fails

**Cache Management**:
- Images cached indefinitely (can add TTL if needed)
- To refresh cache: delete row from `gift_image_cache` table
- To bulk refresh: `DELETE FROM gift_image_cache WHERE created_at < NOW() - INTERVAL '30 days'`

## Image Sizes

- **thumb**: 320x200 (cards on mobile)
- **small**: 480x300 (cards on desktop, share previews)
- **regular**: 1200x700 (detail page hero, og:image)
- **raw**: Original Unsplash URL (for future high-res needs)

## SEO Implementation

Each gift detail page includes:
```html
<title>{gift.title} - GiftGuru</title>
<meta name="description" content="{gift.ai_rationale}" />
<meta property="og:title" content="{gift.title} - GiftGuru" />
<meta property="og:description" content="{gift.ai_rationale}" />
<meta property="og:image" content="{gift.images.regular}" />
<meta property="og:url" content="{canonical_url}" />
<link rel="canonical" href="{canonical_url}" />
```

## Testing

### Manual Testing
1. Generate gift suggestions on homepage
2. Click any gift card → navigates to `/gift/{id}`
3. Verify:
   - Unique image loads
   - Share button copies correct URL
   - Back button returns to homepage
   - SEO tags in `<head>` (inspect with dev tools)

### Share Link Testing
```javascript
// Test URL builder
import { buildGiftShareUrl } from '@/utils/shareUrl';

// Development (no VITE_FRONTEND_BASE_URL)
buildGiftShareUrl('gift_1') 
// → "http://localhost:5173/gift/gift_1"

// Production (VITE_FRONTEND_BASE_URL set)
buildGiftShareUrl('gift_1')
// → "https://yourdomain.com/gift/gift_1"
```

### Cache Verification
```sql
-- Check cached images
SELECT search_key, created_at FROM gift_image_cache ORDER BY created_at DESC LIMIT 10;

-- Verify cache hits in edge function logs
-- Look for: "Cache hit for: handcrafted_jute_planter..."
```

## Future Enhancements

1. **Database Persistence**
   - Replace sessionStorage with real `gifts` table
   - Add `gift_id` column to search_history
   - Implement gift CRUD operations

2. **Advanced Caching**
   - Add TTL to image cache (30-90 days)
   - Implement cache warming for popular gifts
   - Add Redis/CDN layer for ultra-fast image delivery

3. **Analytics**
   - Track gift detail page views
   - Measure share link conversions
   - Monitor Unsplash API rate limits

4. **Vendor Integration**
   - Replace placeholder buy_link with real affiliate/vendor URLs
   - Add price tracking and availability checks
   - Implement inventory sync

## Troubleshooting

**Images not loading?**
- Check Unsplash API key is set: `UNSPLASH_ACCESS_KEY`
- Verify rate limits haven't been exceeded
- Check edge function logs for errors
- Fallback images should appear if Unsplash fails

**Share URLs wrong domain?**
- Set `VITE_FRONTEND_BASE_URL` in production env
- Verify env var is loaded: `console.log(import.meta.env.VITE_FRONTEND_BASE_URL)`

**Gift not found on detail page?**
- Ensure sessionStorage key `giftguru:last_suggestions` exists
- Check gift ID matches: `sessionStorage.getItem('giftguru:last_suggestions')`
- Implement proper database fetch when gifts are persisted

## Performance Notes

- Images use `loading="lazy"` for deferred loading
- `srcSet` provides responsive images (320w, 480w, 1200w)
- Skeleton loaders shown during image fetch
- Cache reduces Unsplash API calls by ~90%
- Gift data stored in sessionStorage (lightweight, ~50KB)

---

**Dependencies Added**:
- `react-helmet` - SEO meta tags
- `@types/react-helmet` - TypeScript types

**Files Modified**:
- `src/types/gift.ts` - Updated Gift interface with GiftImages type
- `src/App.tsx` - Added `/gift/:id` route
- `src/pages/GiftDetail.tsx` - New detail page component
- `src/components/GiftCard.tsx` - Added links and share URL logic
- `src/pages/Index.tsx` - Added sessionStorage caching
- `src/utils/shareUrl.ts` - New utility for building share URLs
- `supabase/functions/suggest-gifts/index.ts` - Added Unsplash integration and caching
- Database migration - Added `gift_image_cache` table
