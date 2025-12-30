import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion, Variants } from "framer-motion";
import Index from "./pages/Index";
import GiftDetail from "./pages/GiftDetail";
import Auth from "./pages/Auth";
import MyGifts from "./pages/MyGifts";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Home from "./pages/Home";
import SeoPageRouter from "./pages/SeoPageRouter";

const queryClient = new QueryClient();

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -15,
    scale: 0.98,
  },
};

const AnimatedRoutes = ({ session }: { session: Session | null }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={{
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="min-h-screen"
      >
        <Routes location={location}>
          <Route
            path="/"
            element={session ? <Navigate to="/home" replace /> : <Auth />}
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home session={session} />} />
          <Route path="/search" element={<Index session={session} />} />
          <Route path="/my-gifts" element={<MyGifts />} />
          <Route path="/gift/:id" element={<GiftDetail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* SEO Pages - Match all programmatic SEO URLs */}
          <Route path="/gifts-for-:slug" element={<SeoPageRouter />} />
          <Route path="/:occasion-gifts" element={<SeoPageRouter />} />
          <Route path="/:occasion-gifts-for-:relation" element={<SeoPageRouter />} />
          <Route path="/:slug" element={<SeoPageRouter />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes session={session} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
