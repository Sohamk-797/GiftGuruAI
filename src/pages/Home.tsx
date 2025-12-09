// src/pages/Home.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SearchHistory } from "@/components/SearchHistory";
import { Sparkles, Gift as GiftIcon, LogOut, User } from "lucide-react";
import { RELATIONS, OCCASIONS } from "@/types/gift";
import type { Database } from "@/integrations/supabase/types";

type SearchHistoryRow = Database['public']['Tables']['search_history']['Row'];

interface HomeProps {
  session: Session | null;
}

const Home = ({ session }: HomeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userHistory, setUserHistory] = useState<SearchHistoryRow[]>([]);
  const [globalHistory, setGlobalHistory] = useState<SearchHistoryRow[]>([]);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);
  const [loadingGlobalHistory, setLoadingGlobalHistory] = useState(false);
  const [metaSnippet, setMetaSnippet] = useState<string>("");
  const [metaInserted, setMetaInserted] = useState(false);
  const [insertingMeta, setInsertingMeta] = useState(false);

  const loadUserHistory = useCallback(async () => {
    setLoadingUserHistory(true);
    try {
      const sessionResp = await supabase.auth.getSession();
      const s = sessionResp?.data?.session;
      if (!s) {
        setUserHistory([]);
        return;
      }
      const userId = s.user.id;

      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading user history:", error);
        setUserHistory([]);
        return;
      }
      setUserHistory(Array.isArray(data) ? (data as SearchHistoryRow[]) : []);
    } catch (err) {
      console.error("Error loading user history:", err);
      setUserHistory([]);
    } finally {
      setLoadingUserHistory(false);
    }
  }, []);

  const loadGlobalHistory = useCallback(async () => {
    setLoadingGlobalHistory(true);
    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("id, user_id, name, relation, occasion, created_at, results")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading global history:", error);
        setGlobalHistory([]);
        return;
      }
      // Cast to SearchHistoryRow[] so state setter matches expected type
      setGlobalHistory(Array.isArray(data) ? (data as SearchHistoryRow[]) : []);
    } catch (err) {
      console.error("Error loading global history:", err);
      setGlobalHistory([]);
    } finally {
      setLoadingGlobalHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      navigate("/auth");
      return;
    }
    loadUserHistory();
    loadGlobalHistory();

    const subscription = supabase.auth.onAuthStateChange((event, sess) => {
      if (!sess) {
        navigate("/auth");
      }
    });

    return () => subscription.data?.subscription.unsubscribe();
  }, [session, navigate, loadUserHistory, loadGlobalHistory]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <DarkModeToggle />

      <div className="fixed top-4 right-20 z-50">
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/search")} variant="outline" size="sm" className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50">
            <GiftIcon className="mr-2 h-4 w-4" />
            New Search
          </Button>

          <Button onClick={() => navigate("/my-gifts")} variant="outline" size="sm" className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50">
            My Gifts
          </Button>
          
          <Button onClick={handleSignOut} variant="outline" size="icon" className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4 animate-float">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Welcome back</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            GiftGuru Home
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-3">
            Your hub for saved searches, quick starts, and verification tools for Google site ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <Card className="p-4 mt-4 max-w-3xl mx-auto w-full">
              <CardHeader>
                <CardTitle>Your account</CardTitle>
                <CardDescription>Signed in as</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-card/50 flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-medium">{session?.user?.user_metadata?.name || session?.user?.email}</div>
                    <div className="text-xs text-muted-foreground">Manage your account & saved searches</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button onClick={() => navigate("/my-gifts")}>My Gifts</Button>
                  <Button onClick={handleSignOut} variant="signout">Sign out</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 max-w-3xl mx-auto w-full">
              <CardHeader>
                <CardTitle>All recent searches</CardTitle>
                <CardDescription>Public recent searches for inspiration (latest 20)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {loadingGlobalHistory ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : globalHistory.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No recent searches yet.</div>
                  ) : (
                    globalHistory.map(item => (
                      <div key={item.id} className="border rounded-md p-2 bg-card/50 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{item.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{item.relation || item.occasion || "No details"}</div>
                          <div className="text-xs text-muted-foreground mt-1">{new Date(item.created_at || "").toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={() => {
                            if (item.results) {
                              sessionStorage.setItem("giftguru:last_suggestions", JSON.stringify(item.results));
                              navigate("/search");
                            } else {
                              toast({ title: "No results", description: "This search has no saved results to preview.", variant: "destructive" });
                            }
                          }}>Preview</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3">
                  <Button onClick={loadGlobalHistory} variant="outline" size="sm">Refresh</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="mt-6 flex justify-center items-center gap-6">
          <Button onClick={() => navigate("/privacy")} variant="link">Privacy Policy</Button>
          <Button onClick={() => navigate("/terms")} variant="link">Terms of Service</Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
