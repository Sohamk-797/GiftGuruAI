# GiftGuru AI - Copilot Instructions

## Project Overview
**GiftGuru** is an AI-powered gift recommendation web app built with React, TypeScript, Vite, and Supabase. Users answer preference questions (recipient relation, occasion, budget, hobbies) to get personalized gift suggestions with images, prices, and AI rationale.

## Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript + Vite (dev server: `localhost:8080`)
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Routing**: React Router v6 with AnimatePresence for page transitions
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS with animations (Framer Motion)
- **Forms**: React Hook Form + Zod validation
- **Toast/Notifications**: Sonner + Radix Toast

### Backend Stack
- **Database**: Supabase PostgreSQL with RLS policies
- **Edge Functions**: Deno runtime at `supabase/functions/suggest-gifts/index.ts` (1251 lines)
- **Auth**: Supabase Auth (Google OAuth + email/password dual support)
- **AI Model**: Google Gemini 2.5 Flash Lite (`gemini-2.5-flash-lite`) for gift generation
- **Image Provider**: Unsplash API with database caching (`gift_image_cache` table)

### Key Data Flows
1. **Gift Suggestion Flow**: 
   - User submits preferences → `POST /suggest-gifts` edge function
   - Edge function builds AI prompt → Gemini API generates JSON array of gifts
   - **5-level JSON recovery** handles malformed responses (lines 650-750)
   - Results stored in `sessionStorage` key `giftguru:last_suggestions`
   - Detail pages read from sessionStorage (future: migrate to DB)
   
2. **Image Caching**: 
   - Edge function queries `gift_image_cache` table by search key
   - Cache key format: `{gift_title}_{tag1}_{tag2}_{tag3}` (normalized, lowercase, max 200 chars)
   - On miss: Unsplash API → cache result → return 4 sizes (thumb/small/regular/raw)
   
3. **Search History**: 
   - Tracked in `search_history` table with RLS policies
   - Users see own history + global (anonymized) trending searches
   - Auth session managed globally in `App.tsx` via `onAuthStateChange`

## Critical Patterns & Conventions

### Component Organization
- **Pages** (`src/pages/`): Route components - Home, GiftDetail, Auth, MyGifts, Index
- **Components** (`src/components/`): Feature components (BudgetSlider, HobbySelector, SearchHistory)
- **UI Primitives** (`src/components/ui/`): Shadcn auto-generated (never modify directly; use `npx shadcn-ui add`)
- **Path Alias**: `@/` resolves to `src/` (configured in `vite.config.ts`)

### Data Types & Constants
- Core types in `src/types/gift.ts`: `Gift`, `GiftImages`, `GiftRequest`
- Exported constants: `HOBBY_CATEGORIES`, `RELATIONS`, `OCCASIONS`, `PERSONALITY_TRAITS`
- Supabase types: `src/integrations/supabase/types.ts` (auto-generated, don't edit or commit)
- Edge function types: `supabase/functions/suggest-gifts/types.d.ts`

### Supabase Integration
- **Client**: `src/integrations/supabase/client.ts` (auto-generated, don't edit)
- **RLS Policies**: User-scoped policies on `favorites`, `search_history`, `gifts` tables
  - Users see only their own data via `auth.uid() = user_id` checks
  - See `20251205_fix_search_history_rls.sql` for pattern examples
- **Edge Function Auth**: 
  - Frontend sends JWT in `Authorization` header
  - Edge function validates via `validateAuthToken()` helper (~line 150)
  - Admin operations use `SUPABASE_SERVICE_ROLE_KEY` for RLS bypass
- **SECURITY DEFINER Warning**: Never use `SECURITY DEFINER` on views; it breaks RLS (see migration `20251230_fix_security_definer_view.sql`)

### Environment Variables
**Frontend** (`.env` with `VITE_` prefix):
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhb...
VITE_FRONTEND_BASE_URL=https://gift-guru-ai.vercel.app  # For share URLs; falls back to window.location.origin
```

**Backend** (Supabase Edge Function secrets - set in Dashboard → Functions → Settings):
```bash
AI_API_KEY=AIzaSyC...           # Google Gemini API key (REQUIRED)
UNSPLASH_ACCESS_KEY=...         # Unsplash API key (REQUIRED)
SUPABASE_URL=https://...        # Auto-injected by Supabase
SUPABASE_SERVICE_ROLE_KEY=...   # Auto-injected (admin bypass)
SUPABASE_ANON_KEY=...           # Auto-injected (public client)
FRONTEND_ALLOWED_ORIGINS=https://gift-guru-ai.vercel.app,http://localhost:8080  # CORS (CSV or single URL)
```

## Developer Workflows

### Local Development
```bash
npm install
npm run dev  # Vite dev server on http://localhost:8080
# Supabase local (optional): supabase start
```

**Critical**: Set `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before running dev server.

### Build & Deployment
```bash
npm run build         # Production build (minified, no sourcemaps)
npm run build:dev     # Dev build (with sourcemaps for debugging)
npm run preview       # Test production build locally (port 4173)
npm run lint          # ESLint with React/Hooks rules
```

**Deployment**: Vercel auto-deploys on push. Config in `vercel.json`:
- Static build via `@vercel/static-build`
- SPA routing: all routes → `/index.html`
- Asset caching: `max-age=31536000` for `assets/`, `favicon.ico`, etc.

### Database Migrations
```bash
# Create migration
supabase migration new <description>

# Apply migrations locally
supabase migration up

# Migrations auto-applied on Vercel deployment
```

**Pattern**: See `20251205_fix_search_history_rls.sql` for user-scoped RLS policies. Always test RLS with `auth.uid()` in policies, never use public policies for user data.

### Edge Function Development
**Location**: `supabase/functions/suggest-gifts/index.ts` (1251 lines, Deno runtime)

**Key responsibilities**:
1. **AI gift generation** (Gemini API with 5-level JSON recovery, lines 650-750)
2. **Image caching** (`fetchGiftImage()` function with Unsplash integration)
3. **Auth validation** (`validateAuthToken()` helper, ~line 150)
4. **CORS handling** (stored in outer scope, reused in error responses)

**Deploy**:
```bash
supabase functions deploy suggest-gifts
# Or auto-deploy via Vercel
```

**Testing locally**:
```bash
# Start Supabase locally
supabase start

# Serve edge function with secrets from .env.local
supabase functions serve suggest-gifts --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/suggest-gifts \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"relation":"Friend","occasion":"Birthday","budget_min":500,"budget_max":2000,"hobbies":["Reading","Cooking"],"personalities":["Thoughtful","Creative"]}'
```

## Project-Specific Details

### Gift Detail Pages
- **Route**: `/gift/:id`
- **Data Source**: `sessionStorage` key `giftguru:last_suggestions` (array of Gift objects)
  - ⚠️ **IMPORTANT**: This is temporary storage. Future: migrate to `gifts` table in DB
  - Data set in `Home.tsx` and `Index.tsx` after successful AI response
- **Share URLs**: Built via `src/utils/shareUrl.ts`
  - Uses `VITE_FRONTEND_BASE_URL` env var (production) or `window.location.origin` (dev)
  - Format: `{baseUrl}/gift/{giftId}`
- **SEO Tags**: `<Helmet>` component adds dynamic title, og:image, canonical URL in `GiftDetail.tsx`

### Image Caching Strategy
**Cache Key Logic** (in `supabase/functions/suggest-gifts/index.ts`, line ~35):
```typescript
createSearchKey(title, tags) {
  // Format: "title_tag1_tag2_..._tag12"
  // Normalized: lowercase, non-alphanum → underscore, max 200 chars
  // Example: "wireless_headphones_tech_music_gadget"
}
```

**Table Schema**: `gift_image_cache`
- `search_key` (TEXT, UNIQUE): normalized search key
- `image_urls` (JSONB): `{ raw, regular, small, thumb }` with Unsplash URLs
- `attribution` (JSONB): `{ photographer, photographer_url, unsplash_url }`
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Flow**:
1. Check cache by `search_key`
2. Cache hit → return `image_urls`
3. Cache miss → query Unsplash API → store result → return

**Image Sizes**:
- `thumb`: 320x200 (gift cards in list view)
- `small`: 480x300 (thumbnails)
- `regular`: 1200x700 (detail pages)
- `raw`: Original URL (for maximum quality)

### Authentication & Authorization
**Global Auth State**: Managed in `App.tsx` via `useEffect` with `supabase.auth.onAuthStateChange()`
- Session persisted across page reloads
- Protected routes redirect to `/auth` if no session
- Uses `Navigate` component from React Router v6

**Dual Auth Support**:
1. **Email/Password**: Validation in `Auth.tsx` (min 6 chars, email format, password match)
2. **Google OAuth**: One-click sign-in via `supabase.auth.signInWithOAuth({ provider: 'google' })`

**RLS Policies** (User-Scoped):
- `search_history`: Users see own history (`auth.uid() = user_id`)
  - **Exception**: Global trending uses separate query without user filter
- `favorites`: Users can only favorite/unfavorite own gifts
- `gifts`: Users can only read/write own gifts (future feature)

**Admin Operations**: Edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for:
- Writing to `gift_image_cache` (shared cache)
- Reading/writing `search_history` (for analytics)

### Favorites System
**Implementation**: `src/lib/favorites.ts` exports:
- `fetchFavoriteGiftIds()`: Returns array of `gift_id` strings for current user
- `toggleFavoriteForUser(giftId, currentlyFavorited)`: Insert/delete favorite row
  - Idempotent: duplicate inserts treated as success (error code `23505`)
  - Returns `true` if favorited, `false` if unfavorited

**Usage Pattern**:
```tsx
const favoriteIds = await fetchFavoriteGiftIds();
const isFavorited = favoriteIds.includes(gift.id);
const newState = await toggleFavoriteForUser(gift.id, isFavorited);
```

## Common Tasks

### Adding a New UI Component
1. **Use shadcn-ui CLI**: `npx shadcn-ui add <component-name>`
   - Never manually edit files in `src/components/ui/`
   - Components auto-generated with proper Tailwind + Radix primitives
2. **Compose feature components**: Import UI primitives into feature components
   - Example: `BudgetSlider` uses `<Slider>` from `@/components/ui/slider`
3. **Styling**: Use Tailwind utility classes + Framer Motion for animations
   - Global styles in `src/index.css` and `src/App.css`

### Modifying Gift Suggestion Logic
**Location**: `supabase/functions/suggest-gifts/index.ts`

**AI Prompt Engineering** (lines 320-450):
- Prompt instructs Gemini to return JSON array of gifts
- Constraints: budget, hobbies, personalities, occasion, relation
- Schema enforcement: `title`, `description`, `price_min`, `price_max`, `match_score`, `matched_tags`, `ai_rationale`, `delivery_estimate`, `vendor`

**JSON Recovery** (lines 650-750, 5 levels):
1. Direct `JSON.parse()`
2. Extract between `[` and `]` (greedy)
3. Extract from markdown fences (```json...```)
4. Extract individual `{...}` objects, repair trailing commas
5. Manual object assembly (last resort)

**CORS Headers**: Stored in outer scope (`corsHeaders`) to reuse in error responses
- Pattern: Build once from `req.headers.get('origin')`, validate against `FRONTEND_ALLOWED_ORIGINS`

### Updating Database Schema
**Migration Pattern**:
```bash
# Create timestamped migration
supabase migration new fix_something

# Write SQL in supabase/migrations/<timestamp>_fix_something.sql
# Example: Add column, create index, update RLS policy

# Test locally
supabase migration up

# Deploy (auto via Vercel or manual)
supabase db push
```

**RLS Policy Pattern** (from `20251205_fix_search_history_rls.sql`):
```sql
-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- User-scoped SELECT
CREATE POLICY "Users can select their own rows"
  ON my_table FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- User-scoped INSERT with CHECK
CREATE POLICY "Users can insert their own rows"
  ON my_table FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Debugging Tips
**Frontend**:
- React DevTools for component state/props
- Console errors for Supabase client issues
- Network tab for edge function responses

**Backend**:
- Supabase Dashboard → Edge Functions → `suggest-gifts` → Logs
- Check for: `AI_API_KEY not configured`, `Unauthorized`, Gemini API errors

**Common Issues**:
1. **CORS errors**: Verify `FRONTEND_ALLOWED_ORIGINS` matches frontend URL (CSV list or single URL)
2. **Auth errors**: Check JWT validation in `validateAuthToken()` (~line 150)
3. **Cache issues**: Delete stale rows from `gift_image_cache` table
4. **AI response failures**: See [DEBUGGING.md](DEBUGGING.md) for Gemini-specific troubleshooting

**Recent Fixes** (Dec 30, 2025):
- ✅ Gemini MAX_TOKENS error: Increased `maxOutputTokens` from 2048 → 8192 (accounts for 1500-2000 "thoughts tokens")
- ✅ CORS error on exceptions: Store `corsHeaders` in outer scope to reuse in catch blocks

## Security Issues & Recent Fixes

### SECURITY DEFINER View Issue (FIXED in 20251230)
- **Issue**: `user_favourite_gifts` view was created with SECURITY DEFINER, enforcing view creator's permissions instead of querying user's
- **Fix**: Migration `20251230_fix_security_definer_view.sql` recreates view WITHOUT SECURITY DEFINER
- **Pattern**: All future views should omit SECURITY DEFINER to respect user RLS

### Leaked Password Protection (Manual Fix Required)
- **Issue**: Supabase Auth password checking against HaveIBeenPwned.org is disabled
- **Fix**: Enable in Supabase Dashboard → Authentication → Providers → Email → "Protect password from leaked compromises"
- **Impact**: Users can set easily-compromised passwords; enabling prevents this

## Key Files Reference
- [App.tsx](src/App.tsx) - Router setup, session state, page transitions
- [Home.tsx](src/pages/Home.tsx) - Main gift search interface
- [GiftDetail.tsx](src/pages/GiftDetail.tsx) - Individual gift page + sharing
- [suggest-gifts edge function](supabase/functions/suggest-gifts/index.ts) - Core AI logic (1247 lines, complex scoring + image caching)
- [gift types](src/types/gift.ts) - Core data structures
- [Supabase migrations](supabase/migrations/) - Database schema
- [Debugging Guide](DEBUGGING.md) - Common errors, testing, performance tips