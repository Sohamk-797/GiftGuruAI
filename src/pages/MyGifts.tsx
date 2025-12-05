// REPLACE ENTIRE FILE WITH THIS
// src/pages/MyGifts.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GiftCard } from "@/components/GiftCard";
import { Gift } from "@/types/gift";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ArrowLeft, Gift as GiftIcon, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MyGifts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGifts = async (): Promise<void> => {
    setLoading(true);
    try {
      // fetch session safely
      const sessionResp = await supabase.auth.getSession();
      const session = sessionResp?.data?.session;
      if (!session) {
        // not authenticated — redirect to home/login
        navigate("/");
        return;
      }

      const userId = session.user.id;

      // Use a relaxed-typed supabase client to avoid generated types mismatch for "favorites"
      const sb: any = supabase as any;

      // 1) fetch favorite gift ids for this user
      const favResp: any = await sb
        .from("favorites")
        .select("gift_id")
        .eq("user_id", userId);

      if (favResp?.error) {
        console.error("Error fetching favorites:", favResp.error);
        throw favResp.error;
      }

      const favData: any[] = Array.isArray(favResp?.data) ? favResp.data : [];
      const giftIds = favData.map((r: any) => r.gift_id).filter(Boolean) as string[];

      if (!giftIds || giftIds.length === 0) {
        // no favorites — clear list
        setGifts([]);
        return;
      }

      // 2) fetch gifts with those ids
      // Use sb for this request as well if your generated "gifts" types are causing issues.
      const giftsResp: any = await sb
        .from("gifts")
        .select("*")
        .in("id", giftIds)
        .order("created_at", { ascending: false });

      if (giftsResp?.error) {
        console.error("Error fetching gifts by ids:", giftsResp.error);
        throw giftsResp.error;
      }

      const giftsData: any[] = Array.isArray(giftsResp?.data) ? giftsResp.data : [];

      const transformedGifts: Gift[] = giftsData.map((gift: any) => ({
        id: gift.id,
        title: gift.title,
        description: gift.description,
        price_min: gift.price_min ?? 0,
        price_max: gift.price_max ?? gift.price_min ?? 0,
        match_score: gift.match_score ?? 0,
        matched_tags: gift.matched_tags ?? [],
        ai_rationale: gift.ai_rationale ?? "",
        delivery_estimate: gift.delivery_estimate ?? "",
        vendor: gift.vendor ?? "",
        images: gift.images as any,
        buy_link: gift.buy_link ?? "",
        // runtime flag derived from favorites
        favorited: true,
      }));

      setGifts(transformedGifts);
    } catch (error: any) {
      console.error("Error loading favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load your favorite gifts. Please try again.",
        variant: "destructive",
      });
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <DarkModeToggle />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 animate-fade-in">
          <Button
            onClick={() => navigate("/search")}
            variant="outline"
            className="mb-4 btn-hover-lift bg-card/80 backdrop-blur-md border-border/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-glow">
              <GiftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">My Gifts</h1>
              <p className="text-muted-foreground">All your personalized gift recommendations</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : gifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {gifts.map((gift, index) => (
              <GiftCard key={gift.id} gift={gift} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-scale-in">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">No gifts yet</h2>
            <p className="text-muted-foreground mb-6">Start by creating your first gift search</p>
            <Button onClick={() => navigate("/search")} className="bg-primary hover:bg-primary/90 btn-hover-lift">
              <Sparkles className="mr-2 h-4 w-4" />
              Find Gifts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGifts;
