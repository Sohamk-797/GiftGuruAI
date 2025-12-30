// SEO Page Router - Dynamically serves pre-generated SEO pages
// This component handles routing for all programmatic SEO URLs

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { parseSlug } from "@/types/seo";
import SeoPage from "@/pages/SeoPage";
import { Gift } from "@/types/gift";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeoPageRouter() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [parsed, setParsed] = useState<ReturnType<typeof parseSlug> | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }

    // Try to parse the slug
    const parsedSlug = parseSlug(slug);
    
    if (!parsedSlug) {
      // Invalid SEO URL - redirect to 404
      setError(true);
      setLoading(false);
      return;
    }

    setParsed(parsedSlug);

    // In production, you'd fetch actual gifts based on the parsed intent
    // For now, generate sample gifts
    const sampleGifts: Gift[] = [
      {
        id: `gift-1`,
        title: `Personalized ${parsedSlug.relation || 'Gift'} Item`,
        description: `A thoughtful ${parsedSlug.occasion || 'special occasion'} gift that shows you care. Perfect for someone who appreciates quality and meaning.`,
        price_min: parsedSlug.budget ? parsedSlug.budget.min : 500,
        price_max: parsedSlug.budget ? parsedSlug.budget.max : 2000,
        match_score: 0.92,
        matched_tags: [parsedSlug.relation, parsedSlug.occasion, 'Thoughtful'].filter(Boolean),
        ai_rationale: `This gift combines personal touch with practical value, making it perfect for ${parsedSlug.relation || 'your loved one'}.`,
        delivery_estimate: '3-5 business days',
        vendor: 'Trusted Indian Vendor',
        images: {
          thumb: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=320&h=200&fit=crop',
          small: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=480&h=300&fit=crop',
          regular: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&h=700&fit=crop',
          raw: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48',
        },
        buy_link: '#',
      },
      {
        id: `gift-2`,
        title: `Premium ${parsedSlug.occasion || 'Occasion'} Experience`,
        description: `Create lasting memories with this unique experience gift. Ideal for ${parsedSlug.relation || 'someone special'} who values experiences over material things.`,
        price_min: parsedSlug.budget ? parsedSlug.budget.min + 200 : 1000,
        price_max: parsedSlug.budget ? parsedSlug.budget.max : 5000,
        match_score: 0.88,
        matched_tags: [parsedSlug.occasion, 'Experience', 'Premium'].filter(Boolean),
        ai_rationale: `Experiences create memories that last forever, making this an unforgettable gift.`,
        delivery_estimate: 'Instant digital delivery',
        vendor: 'Experience Provider',
        images: {
          thumb: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=320&h=200&fit=crop',
          small: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=480&h=300&fit=crop',
          regular: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&h=700&fit=crop',
          raw: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
        },
        buy_link: '#',
      },
      {
        id: `gift-3`,
        title: `Handcrafted ${parsedSlug.relation || 'Gift'} Collection`,
        description: `Support artisans while giving a unique, handmade gift. Each piece tells a story and celebrates Indian craftsmanship.`,
        price_min: parsedSlug.budget ? parsedSlug.budget.min + 100 : 800,
        price_max: parsedSlug.budget ? Math.min(parsedSlug.budget.max, parsedSlug.budget.min + 1500) : 3000,
        match_score: 0.85,
        matched_tags: ['Handcrafted', 'Artisan', parsedSlug.relation].filter(Boolean),
        ai_rationale: `Handmade gifts carry personal meaning and support local artisans.`,
        delivery_estimate: '5-7 business days',
        vendor: 'Artisan Collective',
        images: {
          thumb: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=320&h=200&fit=crop',
          small: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=480&h=300&fit=crop',
          regular: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=700&fit=crop',
          raw: 'https://images.unsplash.com/photo-1483985988355-763728e1935b',
        },
        buy_link: '#',
      },
    ];

    setGifts(sampleGifts);
    setLoading(false);
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !parsed || !slug) {
    navigate("/404");
    return null;
  }

  return <SeoPage slug={slug} parsed={parsed} gifts={gifts} />;
}
