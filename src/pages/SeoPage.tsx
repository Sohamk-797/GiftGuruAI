// SEO Page Template - Universal template for all programmatic SEO pages
// Renders fully static HTML at build time with complete metadata

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Gift, Sparkles, ArrowRight, Search, Heart } from "lucide-react";
import { ParsedSlug, generateRelatedUrls } from "@/types/seo";
import { Gift as GiftType } from "@/types/gift";

interface SeoPageProps {
  slug: string;
  parsed: ParsedSlug;
  gifts: GiftType[];
}

export default function SeoPage({ slug, parsed, gifts }: SeoPageProps) {
  const { relation, occasion, budget } = parsed;
  
  // Generate page title
  const title = generateTitle(parsed);
  const metaDescription = generateMetaDescription(parsed);
  const h1 = generateH1(parsed);
  const intro = generateIntro(parsed);
  
  // Get related pages for internal linking
  const relatedPages = generateRelatedUrls(parsed);
  
  // Canonical URL
  const canonicalUrl = `https://gift-guru-ai.vercel.app/${slug}`;
  
  return (
    <div className="min-h-screen relative">
      {/* SEO metadata */}
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={metaDescription} />
        
        {/* Structured Data - BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://gift-guru-ai.vercel.app/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": title,
                "item": canonicalUrl
              }
            ]
          })}
        </script>
        
        {/* Structured Data - ItemList for gifts */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": title,
            "numberOfItems": gifts.length,
            "itemListElement": gifts.map((gift, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": gift.title,
                "description": gift.description,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "INR",
                  "price": gift.price_min,
                  "availability": "https://schema.org/InStock"
                }
              }
            }))
          })}
        </script>
      </Helmet>

      <AnimatedBackground />
      <DarkModeToggle />

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{title}</span>
        </nav>

        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Gift Recommendations</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {h1}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            {intro}
          </p>
          
          {/* CTA - Requires auth */}
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Search className="h-5 w-5" />
              Get Personalized Recommendations
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          
          <p className="text-xs text-muted-foreground mt-2">
            Sign in to save favorites and get AI-powered suggestions
          </p>
        </div>

        {/* Filters Summary */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {relation && (
            <Badge variant="secondary" className="text-sm px-4 py-2">
              For: {relation}
            </Badge>
          )}
          {occasion && (
            <Badge variant="secondary" className="text-sm px-4 py-2">
              Occasion: {occasion}
            </Badge>
          )}
          {budget && (
            <Badge variant="secondary" className="text-sm px-4 py-2">
              Budget: {budget.display}
            </Badge>
          )}
        </div>

        {/* Gift Recommendations */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Top Gift Ideas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gifts.map((gift, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                {gift.images?.regular && (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={gift.images.regular}
                      alt={gift.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{gift.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {gift.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-primary">
                      ₹{gift.price_min.toLocaleString('en-IN')} - ₹{gift.price_max.toLocaleString('en-IN')}
                    </span>
                    {gift.match_score && (
                      <Badge variant="outline">
                        {Math.round(gift.match_score * 100)}% Match
                      </Badge>
                    )}
                  </div>
                  
                  {gift.matched_tags && gift.matched_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {gift.matched_tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {gift.ai_rationale && (
                    <p className="text-xs text-muted-foreground italic mb-4 line-clamp-2">
                      "{gift.ai_rationale}"
                    </p>
                  )}
                  
                  <Link to="/auth">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <Heart className="h-4 w-4" />
                      Save & Get More Like This
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Choose These Gifts */}
        <section className="mb-12 bg-card/50 backdrop-blur-sm border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Why These {relation ? `Gifts for ${relation}` : 'Gifts'}?
          </h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              {generateWhySection(parsed)}
            </p>
          </div>
        </section>

        {/* Related Pages - Internal Linking */}
        {relatedPages.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Related Gift Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPages.map((page, index) => (
                <Link
                  key={index}
                  to={`/${page.url}`}
                  className="block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all bg-card/50"
                >
                  <span className="text-sm font-medium hover:text-primary transition-colors">
                    {page.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="text-center bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">
            Get Your Perfect Gift Recommendation
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Answer a few questions about your recipient and let our AI find the perfect gift match based on personality, interests, and budget.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Start Finding Gifts Now
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}

// Helper functions for content generation
function generateTitle(parsed: ParsedSlug): string {
  const { relation, occasion, budget } = parsed;
  
  let parts: string[] = [];
  
  if (occasion) parts.push(occasion);
  parts.push('Gifts');
  if (relation) parts.push(`for ${relation}`);
  if (budget) parts.push(budget.display);
  
  return `${parts.join(' ')} | AI-Powered Gift Ideas - GiftGuru`;
}

function generateMetaDescription(parsed: ParsedSlug): string {
  const { relation, occasion, budget } = parsed;
  
  let desc = `Discover perfect ${occasion ? occasion.toLowerCase() + ' ' : ''}gifts`;
  if (relation) desc += ` for your ${relation.toLowerCase()}`;
  if (budget) desc += ` within ${budget.display}`;
  desc += `. AI-curated recommendations based on personality, hobbies, and interests. Find unique gift ideas that they'll love!`;
  
  return desc;
}

function generateH1(parsed: ParsedSlug): string {
  const { relation, occasion, budget } = parsed;
  
  let h1 = '';
  
  if (occasion && relation) {
    h1 = `Best ${occasion} Gifts for ${relation}`;
  } else if (relation) {
    h1 = `Thoughtful Gifts for ${relation}`;
  } else if (occasion) {
    h1 = `Perfect ${occasion} Gift Ideas`;
  } else {
    h1 = 'Unique Gift Ideas';
  }
  
  if (budget) {
    h1 += ` ${budget.display}`;
  }
  
  return h1;
}

function generateIntro(parsed: ParsedSlug): string {
  const { relation, occasion, budget } = parsed;
  
  let intro = `Finding the perfect ${occasion ? occasion.toLowerCase() + ' ' : ''}gift`;
  if (relation) intro += ` for your ${relation.toLowerCase()}`;
  intro += ` can be challenging. Our AI-powered recommendations help you discover thoughtful, personalized gifts`;
  if (budget) intro += ` within your ${budget.display} budget`;
  intro += ` that match their unique personality and interests.`;
  
  return intro;
}

function generateWhySection(parsed: ParsedSlug): string {
  const { relation, occasion, budget } = parsed;
  
  let why = `These gift recommendations are carefully curated using our AI system that considers personality traits, hobbies, and lifestyle preferences`;
  
  if (relation) {
    why += `. Each suggestion is specifically chosen to delight your ${relation.toLowerCase()} and show how much you care`;
  }
  
  if (occasion) {
    why += `. Perfect for ${occasion.toLowerCase()} celebrations`;
  }
  
  if (budget) {
    why += `, all within your ${budget.display} budget range`;
  }
  
  why += `. Every gift idea includes detailed explanations of why it's a great match, helping you make confident decisions.`;
  
  return why;
}
