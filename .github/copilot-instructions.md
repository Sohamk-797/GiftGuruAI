# GiftGuru AI - Copilot Instructions

## Project Overview
**GiftGuru** is an AI-powered gift recommendation web app built with React, TypeScript, Vite, and Supabase. Users answer preference questions (recipient relation, occasion, budget, hobbies) to get personalized gift suggestions with images, prices, and AI rationale.

## Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS with animations (Framer Motion)
- **Forms**: React Hook Form + Zod validation
- **Toast/Notifications**: Sonner + Radix Toast

### Backend Stack
- **Database**: Supabase PostgreSQL
- **Edge Functions**: Deno (Supabase Functions at `supabase/functions/suggest-gifts/index.ts`)
- **Auth**: Supabase Auth (OAuth + email/password)
- **AI API**: Google API (Gemini or similar) for gift suggestions
- **Image Provider**: Unsplash API with caching

### Key Data Flows
1. **Gift Suggestion Flow**: User submits preferences (home → edge function) → AI generates suggestions → Results stored in `sessionStorage` → Detail pages fetch from session/DB
2. **Image Caching**: Edge function queries `gift_image_cache` table → if miss, fetches from Unsplash → caches result for future requests
3. **Search History**: Tracked in `search_history` table (user-specific + global for trending)

## Critical Patterns & Conventions

### Component Organization
- **Pages** (`src/pages/`): Full-page route components (Home, GiftDetail, Auth, MyGifts)
- **Components** (`src/components/`): Reusable UI components and features
- **UI Primitives** (`src/components/ui/`): Shadcn components (auto-generated, don't modify directly)

### Data Types
- Core gift data in `src/types/gift.ts`: `Gift` interface with `GiftImages`, `GiftRequest`
- Hobby/Personality options as exported constants (e.g., `HOBBY_CATEGORIES`, `RELATIONS`, `OCCASIONS`)
- Supabase types auto-generated to `src/integrations/supabase/types.ts` (don't commit changes)

### Supabase Integration
- Client setup at `src/integrations/supabase/client.ts` (auto-generated)
- RLS policies on `search_history` and other tables (check migrations)
- Edge Function authentication: uses SUPABASE_SERVICE_ROLE_KEY for admin operations

### Environment Variables
**Frontend** (Vite):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_FRONTEND_BASE_URL` (for share links and SEO, falls back to `window.location.origin` in dev)

**Backend** (Deno Edge Function secrets):
- `AI_API_KEY` (Google API)
- `UNSPLASH_ACCESS_KEY` (image provider)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `FRONTEND_ALLOWED_ORIGINS` (CORS, CSV format or single URL)

## Developer Workflows

### Local Development
```bash
npm install
npm run dev
# Runs Vite dev server on http://localhost:8080
# Supabase local setup (if needed): supabase start
```

### Build & Deployment
- **Build**: `npm run build` (production) or `npm run build:dev` (dev mode with sourcemaps)
- **Preview**: `npm run preview` (test production build locally)
- **Linting**: `npm run lint` (ESLint with React/Hooks rules)
- **Deployment**: Vercel (auto-deploy on push, see `vercel.json` config)

### Database Migrations
- Migrations in `supabase/migrations/` (timestamp-prefixed SQL files)
- Apply with: `supabase migration up` or auto-applied on Vercel deployments
- Check `20251205_fix_search_history_rls.sql` for RLS pattern examples

### Edge Function Development
- Located at `supabase/functions/suggest-gifts/index.ts` (Deno runtime)
- Handles: gift suggestion logic + image caching + AI API calls
- Deploy with: `supabase functions deploy` or auto via Vercel
- Type definitions in `supabase/functions/suggest-gifts/types.d.ts`

## Project-Specific Details

### Gift Detail Pages
- Route: `/gift/:id`
- Data source: `sessionStorage` key `giftguru:last_suggestions` (future: replace with DB)
- Share URLs built via `src/utils/shareUrl.ts` using `VITE_FRONTEND_BASE_URL`
- SEO tags (title, og:image, canonical) in `GiftDetail.tsx`

### Image Caching Strategy
- Cache key: `{gift_title}_{tag1}_{tag2}_{tag3}` (normalized, lowercase)
- Table schema: `gift_image_cache(id, search_key UNIQUE, image_urls JSONB, attribution JSONB, created_at, updated_at)`
- Sizes: thumb (320x200), small (480x300), regular (1200x700), raw (original)
- Cache hit → use cached URLs; miss → fetch from Unsplash → store in DB → return

### Authentication & Authorization
- Supabase Auth session managed globally in `App.tsx` (`useEffect` with `onAuthStateChange`)
- Protected routes redirect to `/` (Auth page) if no session
- Search history RLS: users see own history + global (anonymized) history
- Admin operations use SERVICE_ROLE_KEY in edge function

## Common Tasks

### Adding a New UI Component
1. Use `shadcn-ui` primitives from `src/components/ui/` (auto-generated)
2. Compose in feature components (e.g., `BudgetSlider`, `HobbySelector`)
3. Follow Tailwind classes + Framer Motion for animations

### Modifying Gift Suggestion Logic
1. Update edge function at `supabase/functions/suggest-gifts/index.ts`
2. Adjust AI prompt, filtering, or ranking logic in function body
3. Ensure CORS headers and error handling match pattern

### Updating Database Schema
1. Create timestamped migration in `supabase/migrations/`
2. Test locally: `supabase migration up`
3. Document any RLS changes (see `20251205_fix_search_history_rls.sql`)

### Debugging Tips
- Frontend: Use React DevTools, check console for Supabase errors
- Backend: Check edge function logs in Supabase dashboard or deploy output
- Common errors: See [DEBUGGING.md](DEBUGGING.md) for troubleshooting gift generation failures
- Cache issues: Delete rows from `gift_image_cache` to force refresh
- CORS errors: Verify `FRONTEND_ALLOWED_ORIGINS` env var matches frontend URL
- Auth issues: Validate JWT in `validateAuthToken` function (line ~150 in edge function)

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
