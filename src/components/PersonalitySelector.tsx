import { Badge } from "@/components/ui/badge";
import { PERSONALITY_TRAITS } from "@/types/gift";
import { X } from "lucide-react";

interface PersonalitySelectorProps {
  selectedTraits: string[];
  onChange: (traits: string[]) => void;
}

const normalizeTag = (t: string) => String(t || "").trim();

export const PersonalitySelector = ({ selectedTraits, onChange }: PersonalitySelectorProps) => {
  // case-insensitive presence check
  const hasTrait = (arr: string[], trait: string) =>
    arr.some(t => normalizeTag(t).toLowerCase() === normalizeTag(trait).toLowerCase());

  const toggleTrait = (trait: string) => {
    const n = normalizeTag(trait);
    if (!n) return;
    if (hasTrait(selectedTraits, n)) {
      onChange(selectedTraits.filter(t => normalizeTag(t).toLowerCase() !== n.toLowerCase()));
    } else {
      onChange([...selectedTraits, n]);
    }
  };

  return (
    <div className="space-y-4">
      {selectedTraits.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 bg-secondary/50 rounded-lg border border-border">
          {selectedTraits.map((trait) => (
            <Badge
              key={trait}
              variant="default"
              className="bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent/90 cursor-pointer transition-all animate-scale-in"
              onClick={() => toggleTrait(trait)}
            >
              {trait}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PERSONALITY_TRAITS.map((trait) => (
          <Badge
            key={trait}
            variant={hasTrait(selectedTraits, trait) ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105 bg-card"
            onClick={() => toggleTrait(trait)}
          >
            {trait}
          </Badge>
        ))}
      </div>
    </div>
  );
};
