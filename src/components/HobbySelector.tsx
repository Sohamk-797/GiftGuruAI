import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HOBBY_CATEGORIES } from "@/types/gift";
import { Search, X } from "lucide-react";

interface HobbySelectorProps {
  selectedHobbies: string[];
  onChange: (hobbies: string[]) => void;
}

export const HobbySelector = ({ selectedHobbies, onChange }: HobbySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customHobby, setCustomHobby] = useState("");

  const toggleHobby = (hobby: string) => {
    if (selectedHobbies.includes(hobby)) {
      onChange(selectedHobbies.filter(h => h !== hobby));
    } else {
      onChange([...selectedHobbies, hobby]);
    }
  };

  const addCustomHobby = () => {
    if (customHobby && !selectedHobbies.includes(customHobby)) {
      onChange([...selectedHobbies, customHobby]);
      setCustomHobby("");
    }
  };

  const allHobbies = Object.values(HOBBY_CATEGORIES).flat();
  const filteredHobbies = searchTerm
    ? allHobbies.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
    : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hobbies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {selectedHobbies.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 bg-secondary/50 rounded-lg border border-border">
          {selectedHobbies.map((hobby) => (
            <Badge
              key={hobby}
              variant="default"
              className="bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 cursor-pointer transition-all animate-scale-in"
              onClick={() => toggleHobby(hobby)}
            >
              {hobby}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="h-[300px] rounded-lg border border-border p-4 bg-card">
        {filteredHobbies ? (
          <div className="flex flex-wrap gap-2">
            {filteredHobbies.map((hobby) => (
              <Badge
                key={hobby}
                variant={selectedHobbies.includes(hobby) ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => toggleHobby(hobby)}
              >
                {hobby}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(HOBBY_CATEGORIES).map(([category, hobbies]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {hobbies.map((hobby) => (
                    <Badge
                      key={hobby}
                      variant={selectedHobbies.includes(hobby) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleHobby(hobby)}
                    >
                      {hobby}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          placeholder="Add custom hobby..."
          value={customHobby}
          onChange={(e) => setCustomHobby(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCustomHobby()}
          className="bg-card border-border"
        />
        <Button onClick={addCustomHobby} variant="outline">
          Add
        </Button>
      </div>
    </div>
  );
};
