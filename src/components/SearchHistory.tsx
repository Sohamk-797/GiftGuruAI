import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Edit, Trash2, Gift } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SearchHistoryRow = Database['public']['Tables']['search_history']['Row'];

interface SearchHistoryProps {
  history: SearchHistoryRow[];
  onLoadSearch: (item: SearchHistoryRow) => void;
  onDeleteSearch: (id: string) => void;
}

export const SearchHistory = ({ history, onLoadSearch, onDeleteSearch }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock className="h-5 w-5 text-primary" />
          Recent Searches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-base font-semibold mb-1">
                <Gift className="h-4 w-4 text-primary" />
                <span>{item.name ? `${item.name}'s Gift` : "Gift Search"}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {item.relation}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {item.occasion}
                </Badge>
                {item.age && (
                  <Badge variant="secondary" className="text-xs">
                    Age {item.age}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(item.budget_min)} - {formatCurrency(item.budget_max)}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {item.hobbies.slice(0, 3).map((hobby, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {hobby}
                  </Badge>
                ))}
                {item.hobbies.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{item.hobbies.length - 3} more
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onLoadSearch(item)}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteSearch(item.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
