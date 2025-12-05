import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HobbySelector } from "@/components/HobbySelector";
import { PersonalitySelector } from "@/components/PersonalitySelector";
import { BudgetSlider } from "@/components/BudgetSlider";
import { GiftCard } from "@/components/GiftCard";
import { Gift, GiftRequest, RELATIONS, OCCASIONS, INDIAN_CITIES } from "@/types/gift";
import { Sparkles, ArrowRight, Gift as GiftIcon, Edit, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { SearchHistory } from "@/components/SearchHistory";
import type { Database } from "@/integrations/supabase/types";

type SearchHistoryRow = Database['public']['Tables']['search_history']['Row'];

interface IndexProps {
  session: Session | null;
}

const Index = ({ session }: IndexProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRow[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<GiftRequest>({
    name: "",
    age: undefined,
    relation: "",
    occasion: "",
    budget_min: 500,
    budget_max: 5000,
    hobbies: [],
    personalities: [],
    city: "",
  });

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

    const loadSearchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading search history (db error):', error);
        setSearchHistory([]);
        return;
      }

      // data can be null; ensure array
      setSearchHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading search history:', error);
      setSearchHistory([]);
    }
  };

    const saveSearch = async (results: Gift[]) => {
    // Do not save empty result sets
    if (!Array.isArray(results) || results.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('search_history')
        .insert({
          name: formData.name,
          age: formData.age,
          relation: formData.relation,
          occasion: formData.occasion,
          budget_min: formData.budget_min,
          budget_max: formData.budget_max,
          hobbies: formData.hobbies,
          personalities: formData.personalities,
          city: formData.city,
          results: results as any,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error saving search (db error):', error);
        return;
      }

      if (data && data.id) {
        setCurrentSearchId(data.id);
        loadSearchHistory();
      } else {
        // Insert succeeded but returned no row — still refresh list
        loadSearchHistory();
      }
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };


  const loadSearch = (item: SearchHistoryRow) => {
    setFormData({
      name: item.name || "",
      age: item.age || undefined,
      relation: item.relation,
      occasion: item.occasion,
      budget_min: item.budget_min,
      budget_max: item.budget_max,
      hobbies: item.hobbies,
      personalities: item.personalities,
      city: item.city || "",
    });
    setCurrentSearchId(item.id);
    if (item.results && Array.isArray(item.results) && item.results.length > 0) {
      setGifts(item.results as unknown as Gift[]);
      setStep(5);
    } else {
      setStep(1);
    }
    toast({
      title: "Search loaded",
      description: "Previous search has been loaded. You can edit and search again.",
    });
  };

  const deleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      loadSearchHistory();
      toast({
        title: "Search deleted",
        description: "Search history item removed.",
      });
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        title: "Error",
        description: "Failed to delete search history.",
        variant: "destructive",
      });
    }
  };

  const canProceed = () => {
  if (step === 1) return !!formData.name && typeof formData.age === 'number' && !!formData.relation && !!formData.occasion;
  if (step === 2) return Array.isArray(formData.hobbies) && formData.hobbies.length >= 3;
  if (step === 3) return Array.isArray(formData.personalities) && formData.personalities.length >= 2;
  return true;
};


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setGifts([]);
    setStep(1);
    navigate("/");
  };

    const getSuggestions = async (append = false) => {
    if (!session) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to generate gift suggestions.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Prevent duplicate requests
    if (loading) return;

    setLoading(true);
    try {
      // Forward user's JWT (access_token) to the Edge Function
      const authHeader = session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
            // supabase.functions.invoke accepts headers in the options object
      // Make sure we send a JSON string body — Edge function expects valid JSON
      const requestBody = JSON.stringify({ ...formData, offset: append ? gifts.length : 0 });

      const { data, error } = await supabase.functions.invoke('suggest-gifts', {
        body: requestBody,
        headers: { ...authHeader, 'Content-Type': 'application/json' },
      });

      // The Supabase client may surface errors in `error` or via non-2xx responses.
      if (error) throw error;

      // Normalize function response: some SDKs return parsed objects, others raw strings
      let payload: any = data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (parseErr) {
          // If parse fails, just warn and keep payload as-is; we'll treat missing gifts gracefully below
          console.warn('Failed to parse function response string', parseErr);
        }
      }
      const newGifts = (payload && payload.gifts) ? payload.gifts : [];

      if (append) {
        setGifts(prev => {
          const updated = [...prev, ...newGifts];
          sessionStorage.setItem("giftguru:last_suggestions", JSON.stringify(updated));
          return updated;
        });
      } else {
        setGifts(newGifts);
        sessionStorage.setItem("giftguru:last_suggestions", JSON.stringify(newGifts));
        // Save search only when we actually got result(s)
        await saveSearch(newGifts);
      }

      setStep(5);

      if (!append && newGifts.length > 0) {
        toast({
          title: "Perfect matches found!",
          description: `We found ${newGifts.length} great gift options for you.`,
        });
      } else if (!append && newGifts.length === 0) {
        toast({
          title: "No matches",
          description: "No exact matches found — we returned alternatives.",
        });
      }
        } catch (error: any) {
      console.error('Error getting suggestions:', error);

      // Prefer server-provided structured error message when available.
      let message = 'Failed to get gift suggestions. Please try again.';
      try {
        // Supabase SDK sometimes puts server response in error.data or error.message
        if (error?.data) {
          const serverData = typeof error.data === 'string' ? (() => { try { return JSON.parse(error.data); } catch { return null; } })() : error.data;
          if (serverData?.error?.message) {
            message = serverData.error.message;
            if (serverData.error.details) message += ` — ${serverData.error.details}`;
          } else if (serverData?.error) {
            message = typeof serverData.error === 'string' ? serverData.error : JSON.stringify(serverData.error);
          } else if (serverData?.message) {
            message = serverData.message;
          }
        } else if (error?.message && typeof error.message === 'string') {
          message = error.message;
        } else if (error?.status) {
          message = `Server Error: ${error.status}`;
        }
      } catch (e) {
        // fallback
        message = error?.message || message;
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Redirect to auth if not signed in
  useEffect(() => {
    if (!session && step !== 1) {
      navigate("/auth");
    }
  }, [session, step, navigate]);

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <DarkModeToggle />
      
      {/* User menu */}
      <div className="fixed top-4 right-20 z-50">
        {session ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/my-gifts")}
              variant="outline"
              size="sm"
              className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50"
            >
              <GiftIcon className="mr-2 h-4 w-4" />
              My Gifts
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="icon"
              className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="sm"
            className="btn-hover-lift bg-card/80 backdrop-blur-md border-border/50"
          >
            <User className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>
      
      {/* Hero Section */}
      {step === 1 && (
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4 animate-float">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Gift Finder</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GiftGuru
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find a gift they'll actually love — fast
            </p>
          </div>

          <Card className="max-w-2xl mx-auto shadow-2xl border-2 animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <GiftIcon className="h-6 w-6 text-primary" />
                Let's start with the basics
              </CardTitle>
              <CardDescription>
                Tell us about the person and occasion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Person's name *</Label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter their name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relation">Who is this gift for? *</Label>
                <Select value={formData.relation} onValueChange={(value) => setFormData({ ...formData, relation: value })}>
                  <SelectTrigger id="relation">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map((relation) => (
                      <SelectItem key={relation} value={relation}>
                        {relation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occasion">What's the occasion? *</Label>
                <Select value={formData.occasion} onValueChange={(value) => setFormData({ ...formData, occasion: value })}>
                  <SelectTrigger id="occasion">
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map((occasion) => (
                      <SelectItem key={occasion} value={occasion}>
                        {occasion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <input
                  id="age"
                  type="number"
                  placeholder="Enter age"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  min="1"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                  <SelectTrigger id="city">
                    <SelectValue placeholder="Select city for delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canProceed()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8">
            <SearchHistory
              history={searchHistory}
              onLoadSearch={loadSearch}
              onDeleteSearch={deleteSearch}
            />
          </div>
        </div>
      )}

      {/* Hobbies Step */}
      {step === 2 && (
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <Card className="max-w-4xl mx-auto shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl">What are their hobbies?</CardTitle>
              <CardDescription>
                Pick at least 3 hobbies — the more specific, the better the match
                {formData.hobbies.length > 0 && (
                  <span className="ml-2 text-primary font-semibold">
                    ({formData.hobbies.length} selected)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <HobbySelector
                selectedHobbies={formData.hobbies}
                onChange={(hobbies) => setFormData({ ...formData, hobbies })}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceed()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personality Step */}
      {step === 3 && (
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <Card className="max-w-4xl mx-auto shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Describe their personality</CardTitle>
              <CardDescription>
                Pick at least 2 traits that best describe them
                {formData.personalities.length > 0 && (
                  <span className="ml-2 text-primary font-semibold">
                    ({formData.personalities.length} selected)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PersonalitySelector
                selectedTraits={formData.personalities}
                onChange={(personalities) => setFormData({ ...formData, personalities })}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!canProceed()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Step */}
      {step === 4 && (
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <Card className="max-w-2xl mx-auto shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl">What's your budget?</CardTitle>
              <CardDescription>
                Set your price range for the perfect gift
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BudgetSlider
                min={100}
                max={5000}
                value={[formData.budget_min, formData.budget_max]}
                onChange={(value) => setFormData({ ...formData, budget_min: value[0], budget_max: value[1] })}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={() => getSuggestions(false)}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Finding perfect gifts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Suggestions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Step */}
      {step === 5 && (
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-2 text-foreground">Perfect Matches Found!</h2>
            <p className="text-muted-foreground">Here are the best gifts for your {formData.relation}</p>
          </div>

          {gifts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {gifts.map((gift, index) => (
                  <GiftCard key={gift.id} gift={gift} index={index} />
                ))}
              </div>
              
              <div className="text-center mb-8">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    getSuggestions(true);
                  }}
                  disabled={loading}
                  variant="outline"
                  size="lg"
                  className="bg-card/80 backdrop-blur-sm"
                >
                  {loading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Show More Gifts
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <Card className="max-w-2xl mx-auto text-center p-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  No exact matches found — here are some creative alternatives you can personalize.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-center flex gap-4 justify-center">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              size="lg"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Search
            </Button>
            <Button
              onClick={() => {
                setStep(1);
                setGifts([]);
                setFormData({
                  name: "",
                  age: undefined,
                  relation: "",
                  occasion: "",
                  budget_min: 500,
                  budget_max: 5000,
                  hobbies: [],
                  personalities: [],
                  city: "",
                });
              }}
              variant="outline"
              size="lg"
            >
              Start New Search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
