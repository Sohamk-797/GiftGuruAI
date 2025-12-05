import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Gift } from "@/types/gift";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Share2, Heart, ArrowLeft, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildGiftShareUrl, copyToClipboard } from "@/utils/shareUrl";
import { Helmet } from "react-helmet";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { supabase } from "@/integrations/supabase/client";

export default function GiftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gift, setGift] = useState<Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const fetchGift = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Please sign in",
            description: "You need to be signed in to view gift details.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Fetch gift from database
        const { data, error } = await supabase
          .from('gifts')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('Error loading gift:', error);
          setGift(null);
          setLoading(false);
          return;
        }

        // Transform database gift to Gift interface
        const transformedGift: Gift = {
          id: data.id,
          title: data.title,
          description: data.description,
          price_min: data.price_min,
          price_max: data.price_max,
          match_score: data.match_score,
          matched_tags: data.matched_tags,
          ai_rationale: data.ai_rationale,
          delivery_estimate: data.delivery_estimate,
          vendor: data.vendor,
          images: data.images as any,
          buy_link: data.buy_link,
        };

        setGift(transformedGift);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching gift:", error);
        setLoading(false);
      }
    };

    fetchGift();
  }, [id, navigate, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleShare = async () => {
    const shareUrl = buildGiftShareUrl(id!);
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this gift with friends",
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const shareOnWhatsApp = () => {
    if (!gift) return;
    const shareUrl = buildGiftShareUrl(id!);
    const message = `Check out this gift: ${gift.title} - ${gift.ai_rationale}\n\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const toggleSave = () => {
    setSaved(!saved);
    toast({
      title: saved ? "Removed from saved" : "Saved!",
      description: saved ? "Gift removed from your list" : "Gift saved for later",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-24 mb-6" />
          <Card className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="w-full h-96" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 text-center p-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Gift Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This gift is no longer available or the link is invalid.
          </p>
          <Button onClick={() => navigate("/search")} size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  const shareUrl = buildGiftShareUrl(id!);
  const pageTitle = `${gift.title} - GiftGuru`;
  const pageDescription = gift.ai_rationale;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={gift.images.regular} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={gift.images.regular} />
        <link rel="canonical" href={shareUrl} />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        <AnimatedBackground />
        <DarkModeToggle />
        
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
          <Link to="/search">
            <Button variant="ghost" className="mb-6" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>

          <Card className="overflow-hidden shadow-2xl border-border bg-card">
            <CardHeader className="p-0">
              <div className="relative h-96 overflow-hidden bg-muted">
                {imageLoading && (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                )}
                <img
                  src={gift.images.small}
                  srcSet={`${gift.images.small} 480w, ${gift.images.regular} 1200w`}
                  sizes="(max-width: 768px) 480px, 1200px"
                  alt={gift.title}
                  width={1200}
                  height={700}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  loading="lazy"
                  onLoad={() => setImageLoading(false)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                    setImageLoading(false);
                  }}
                />
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  {Math.round(gift.match_score * 100)}% Match
                </div>
                <button
                  onClick={toggleSave}
                  className="absolute top-4 left-4 p-3 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
                  aria-label={saved ? "Remove from saved" : "Save for later"}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      saved ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <div>
                <h1 className="font-bold text-3xl md:text-4xl text-foreground mb-2">
                  {gift.title}
                </h1>
                <p className="text-lg text-muted-foreground">{gift.vendor}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {gift.matched_tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="bg-secondary/30 p-6 rounded-lg border-l-4 border-primary">
                <p className="text-base text-foreground italic leading-relaxed">
                  "{gift.ai_rationale}"
                </p>
              </div>

              {gift.description && (
                <div>
                  <h2 className="font-semibold text-xl text-foreground mb-2">Description</h2>
                  <p className="text-foreground leading-relaxed">{gift.description}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(gift.price_min)}
                    {gift.price_max !== gift.price_min &&
                      ` - ${formatCurrency(gift.price_max)}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {gift.delivery_estimate}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 md:p-8 pt-0 flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
                onClick={() => window.open(gift.buy_link, "_blank")}
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Buy Now
              </Button>
              <Button variant="outline" size="lg" onClick={shareOnWhatsApp}>
                <Share2 className="mr-2 h-5 w-5" />
                WhatsApp
              </Button>
              <Button variant="outline" size="lg" onClick={handleShare}>
                {copied ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <Copy className="mr-2 h-5 w-5" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
