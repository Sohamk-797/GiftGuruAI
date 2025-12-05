import { Gift } from "@/types/gift";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2, Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { buildGiftShareUrl, copyToClipboard } from "@/utils/shareUrl";

interface GiftCardProps {
  gift: Gift;
  index: number;
}

export const GiftCard = ({ gift, index }: GiftCardProps) => {
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleShare = async () => {
    const shareUrl = buildGiftShareUrl(gift.id);
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      toast({
        title: "Link copied!",
        description: "Share this gift with friends",
      });
    } else {
      // Fallback to WhatsApp if copy fails
      const message = `Check out this gift: ${gift.title}\n\n${shareUrl}`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  const toggleSave = () => {
    setSaved(!saved);
    toast({
      title: saved ? "Removed from saved" : "Saved!",
      description: saved ? "Gift removed from your list" : "Gift saved for later",
    });
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in bg-card border-border"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="p-0">
        <Link to={`/gift/${gift.id}`} className="block">
          <div className="relative h-48 overflow-hidden bg-muted">
            <img
              src={gift.images.small}
              srcSet={`${gift.images.thumb} 320w, ${gift.images.small} 480w`}
              sizes="(max-width: 640px) 320px, 480px"
              alt={gift.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
              }}
            />
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold shadow-lg">
              {Math.round(gift.match_score * 100)}% Match
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleSave();
              }}
              className="absolute top-2 left-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
              aria-label={saved ? "Remove from saved" : "Save for later"}
            >
              <Heart className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          </div>
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <Link to={`/gift/${gift.id}`} className="block">
          <div>
            <h3 className="font-bold text-lg text-foreground mb-1 hover:text-primary transition-colors">
              {gift.title}
            </h3>
            <p className="text-sm text-muted-foreground">{gift.vendor}</p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-1.5">
          {gift.matched_tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-foreground italic bg-secondary/30 p-3 rounded-lg border-l-4 border-primary">
          "{gift.ai_rationale}"
        </p>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(gift.price_min)}
              {gift.price_max !== gift.price_min && ` - ${formatCurrency(gift.price_max)}`}
            </p>
            <p className="text-xs text-muted-foreground">{gift.delivery_estimate}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => window.open(gift.buy_link, '_blank')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Buy Now
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleShare}
          aria-label="Share gift link"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
