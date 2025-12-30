// Supabase Edge Function: Custom Username/Password Auth with Auto-Signup
// Deno runtime - handles login with automatic user creation

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

interface AuthRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    token: string;
  };
  error?: string;
  created?: boolean; // Indicates if user was auto-created
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AuthRequest = await req.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Username validation: 3-30 chars, alphanumeric + underscore
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Username must be 3-30 characters (letters, numbers, underscore only)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password validation: min 6 chars
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize username (lowercase for case-insensitive lookup)
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('custom_auth_users')
      .select('*')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (lookupError) {
      console.error('Database lookup error:', lookupError);
      throw new Error('Authentication system error');
    }

    let userId: string;
    let supabaseUserId: string;
    let wasCreated = false;

    if (existingUser) {
      // USER EXISTS - Verify password
      const passwordMatch = await bcrypt.compare(password, existingUser.password_hash);

      if (!passwordMatch) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if account is active
      if (!existingUser.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: 'Account is disabled' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingUser.id;
      supabaseUserId = existingUser.supabase_user_id;

      // Update last login
      await supabase
        .from('custom_auth_users')
        .update({ 
          last_login_at: new Date().toISOString(),
          login_count: (existingUser.login_count || 0) + 1
        })
        .eq('id', userId);

    } else {
      // USER DOES NOT EXIST - Auto-create (auto-signup)
      
      // Hash password (bcrypt with 10 rounds)
      const passwordHash = await bcrypt.hash(password);

      // Create Supabase auth user first (for unified tracking)
      // We create a "dummy" email-based user in Supabase Auth
      const dummyEmail = `${normalizedUsername}@custom.giftguru.local`;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: dummyEmail,
        password: password, // Supabase will hash this separately
        email_confirm: true, // Auto-confirm
        user_metadata: {
          username: normalizedUsername,
          auth_type: 'custom',
          created_via: 'auto_signup'
        }
      });

      if (authError) {
        console.error('Supabase auth user creation error:', authError);
        throw new Error('Failed to create user account');
      }

      supabaseUserId = authData.user.id;

      // Create custom auth record
      const { data: customAuthData, error: customAuthError } = await supabase
        .from('custom_auth_users')
        .insert({
          username: normalizedUsername,
          password_hash: passwordHash,
          supabase_user_id: supabaseUserId,
          login_count: 1,
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();

      if (customAuthError) {
        console.error('Custom auth creation error:', customAuthError);
        
        // Clean up Supabase auth user if custom record failed
        await supabase.auth.admin.deleteUser(supabaseUserId);
        
        throw new Error('Failed to create authentication record');
      }

      userId = customAuthData.id;
      wasCreated = true;
    }

    // Generate JWT token for the user
    // Use Supabase's auth.signInWithPassword for the dummy email to get a valid session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: `${normalizedUsername}@custom.giftguru.local`,
      password: password
    });

    if (sessionError || !sessionData.session) {
      console.error('Session creation error:', sessionError);
      throw new Error('Failed to create session');
    }

    // Return success with user data and token
    const response: AuthResponse = {
      success: true,
      created: wasCreated,
      user: {
        id: supabaseUserId, // Return Supabase user ID for consistency
        username: normalizedUsername,
        token: sessionData.session.access_token
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: wasCreated ? 201 : 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Auth function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
