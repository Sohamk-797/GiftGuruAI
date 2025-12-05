// global.d.ts
// ambient declarations for Deno remote imports used by the Supabase Edge function
// Put this file in your project root (where tsconfig.json is), or in supabase/functions/... and ensure tsconfig includes it.

declare const Deno: any;

// Minimal declaration for Deno std serve used in the function
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  // serve is a convenience wrapper in Deno std; keep the type minimal for editor
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: any
  ): void;
}

// Minimal supabase-js client declaration for the runtime import via esm.sh
declare module "https://esm.sh/@supabase/supabase-js@2.7.1" {
  export function createClient(url: string, key: string, opts?: any): any;
  // `any` catches other exported types used at runtime; if you want stronger types, install @supabase/supabase-js in your workspace
  export const SupabaseClient: any;
  export default createClient;
}
