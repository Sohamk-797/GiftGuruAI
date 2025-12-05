import { Badge } from "@/components/ui/badge";
import { PERSONALITY_TRAITS } from "@/types/gift";
import { X } from "lucide-react";

interface PersonalitySelectorProps {
  selectedTraits: string[];
  onChange: (traits: string[]) => void;
}

export const PersonalitySelector = ({ selectedTraits, onChange }: PersonalitySelectorProps) => {
  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      onChange(selectedTraits.filter(t => t !== trait));
    } else {
      onChange([...selectedTraits, trait]);
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
            variant={selectedTraits.includes(trait) ? "default" : "outline"}
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
