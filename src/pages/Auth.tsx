import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Gift, Sparkles, ArrowRight, Heart, Star, Zap, User, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Smart recommendations based on personality & hobbies",
  },
  {
    icon: Heart,
    title: "Personalized",
    description: "Gifts tailored to your recipient's unique interests",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get perfect gift ideas in seconds",
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/search");
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: "Welcome to GiftGuru!",
          description: "You're all set to find perfect gifts.",
        });
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!username) {
      newErrors.username = "Username is required";
    } else if (!usernameRegex.test(username)) {
      newErrors.username = "Username must be 3-20 characters (letters, numbers, underscore only)";
    }
    
    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    // Confirm password validation (only for signup)
    if (isSignUp) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUsernameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Convert username to synthetic email format
      const syntheticEmail = `${username.toLowerCase()}@giftguru.app`;
      
      if (isSignUp) {
        // Sign up with username (converted to synthetic email)
        const { data, error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            data: {
              username: username,
              display_name: username,
            },
            emailRedirectTo: `${window.location.origin}/home`,
          },
        });
        
        if (error) throw error;
        
        if (data.user) {
          toast({
            title: "Account created!",
            description: `Welcome, ${username}! You can now sign in.`,
          });
          // Switch to sign in mode
          setIsSignUp(false);
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        // Sign in with username (converted to synthetic email)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });
        
        if (error) throw error;
        
        if (data.session) {
          const displayName = data.user.user_metadata?.username || username;
          toast({
            title: "Welcome back!",
            description: `Good to see you, ${displayName}!`,
          });
          navigate("/home");
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific Supabase errors
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid username or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please verify your account before signing in.";
      } else if (error.message.includes("User already registered")) {
        errorMessage = "This username is already taken. Please choose another.";
      }
      
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectUrl = `/home`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Unable to sign in with Google. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <DarkModeToggle />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Gift Finder</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
          >
            GiftGuru
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Find a gift they'll actually love — powered by AI
          </motion.p>
          <Button className="mt-3" onClick={() => navigate("/privacy")} variant="link">Privacy Policy</Button>
          <Button onClick={() => navigate("/terms")} variant="link">Terms of Service</Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              className="flex flex-col items-center text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="max-w-md mx-auto shadow-2xl border-2 bg-card/80 backdrop-blur-md">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4 shadow-glow"
              >
                <Gift className="h-8 w-8 text-primary-foreground" />
              </motion.div>
              <CardTitle className="text-2xl">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
              <CardDescription>
                {isSignUp 
                  ? "Sign up to save your gift suggestions and access them anytime"
                  : "Sign in to continue finding perfect gifts"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username/Password Form */}
              <form onSubmit={handleUsernameAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors({ ...errors, username: undefined });
                    }}
                    className={errors.username ? "border-destructive" : ""}
                    disabled={loading}
                    autoComplete="username"
                  />
                  {errors.username && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.username}
                    </div>
                  )}
                  {!errors.username && isSignUp && (
                    <p className="text-xs text-muted-foreground">
                      3-20 characters, letters, numbers, and underscore only
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={errors.password ? "border-destructive pr-10" : "pr-10"}
                      disabled={loading}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </div>
                  )}
                  {!errors.password && isSignUp && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters
                    </p>
                  )}
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                        }}
                        className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                      {isSignUp ? "Creating account..." : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-card hover:bg-muted text-foreground border-2 border-border shadow-sm btn-hover-lift h-12"
                size="lg"
                type="button"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </>
                )}
              </Button>

              {/* Toggle Sign Up/Sign In */}
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  disabled={loading}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="text-center text-xs text-muted-foreground pt-2">
                <p>
                  By {isSignUp ? "signing up" : "signing in"}, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-8 text-center text-sm text-muted-foreground max-w-2xl mx-auto"
        >
          <p className="flex items-center justify-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Your gift suggestions are private and saved to your account
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
