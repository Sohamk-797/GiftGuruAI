import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Edit, Trash2, Gift as GiftIcon } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SearchHistoryRow = Database["public"]["Tables"]["search_history"]["Row"];

interface SearchHistoryProps {
  history: SearchHistoryRow[];
  onLoadSearch: (item: SearchHistoryRow) => void;
  onDeleteSearch: (id: string) => void;
}

export const SearchHistory = ({ history, onLoadSearch, onDeleteSearch }: SearchHistoryProps) => {
  if (!Array.isArray(history) || history.length === 0) return null;

  const formatCurrency = (amount?: number) => {
    const value = typeof amount === "number" ? amount : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
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
        {history.slice(0, 5).map((item) => {
          const id = item?.id ?? "";
          const nameLabel = item?.name ? `${item.name}'s Gift` : "Gift Search";
          const relation = item?.relation ?? "—";
          const occasion = item?.occasion ?? "—";
          const age = typeof item?.age === "number" ? item.age : undefined;
          const hobbies = Array.isArray(item?.hobbies) ? item.hobbies.map((h: any) => String(h).trim()).filter(Boolean) : [];
          const personalities = Array.isArray(item?.personalities) ? item.personalities.map((p: any) => String(p).trim()).filter(Boolean) : [];
          const budgetMin = typeof item?.budget_min === "number" ? item.budget_min : undefined;
          const budgetMax =
            typeof item?.budget_max === "number" ? item.budget_max : budgetMin ?? undefined;

          // parse created_at safely
          let createdAtText = "";
          try {
            const raw = item?.created_at;
            const date = raw ? new Date(raw) : null;
            createdAtText = date && !isNaN(date.getTime())
              ? format(date, "MMM d, yyyy 'at' h:mm a")
              : "";
          } catch {
            createdAtText = "";
          }

          const handleLoad = () => {
            try {
              onLoadSearch(item);
            } catch (e) {
              console.error("Failed to load search item", e);
            }
          };

          const handleDelete = () => {
            if (!id) {
              console.warn("Attempted to delete search history with missing id");
              return;
            }
            try {
              onDeleteSearch(id);
            } catch (e) {
              console.error("Failed to delete search item", e);
            }
          };

          return (
            <div
              key={id || Math.random().toString(36).slice(2)}
              className="flex items-start justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
            >
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 text-base font-semibold mb-1 truncate">
                  <GiftIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{nameLabel}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {relation}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {occasion}
                  </Badge>
                  {age !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Age {age}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(budgetMin)}{budgetMax !== undefined && ` - ${formatCurrency(budgetMax)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {hobbies.slice(0, 3).map((hobby, idx) => (
                    <Badge key={`h-${idx}-${hobby}`} variant="outline" className="text-xs">
                      {hobby}
                    </Badge>
                  ))}
                  {hobbies.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{hobbies.length - 3} more</span>
                  )}
                </div>

                {personalities.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {personalities.slice(0, 3).map((p, idx) => (
                      <Badge key={`p-${idx}-${p}`} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {personalities.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{personalities.length - 3} more</span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {createdAtText}
                </p>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLoad}
                  className="h-8 w-8"
                  aria-label="Load search"
                  title="Load search"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label="Delete search"
                  title="Delete search"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
