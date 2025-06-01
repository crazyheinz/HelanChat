import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  onProfileSubmit: (profile: any) => void;
}

export default function ProfileForm({ onProfileSubmit }: ProfileFormProps) {
  const [profile, setProfile] = useState({
    age: "",
    livingSituation: "",
    needs: [] as string[],
    language: "nl",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const needsOptions = [
    { id: "daily_care", label: "Dagelijkse verzorging" },
    { id: "household_help", label: "Huishoudelijke hulp" },
    { id: "medical_care", label: "Medische zorg" },
    { id: "social_contacts", label: "Sociale contacten" },
    { id: "transport", label: "Vervoer" },
    { id: "financial_advice", label: "Financieel advies" },
    { id: "emergency_support", label: "Noodondersteuning" },
    { id: "home_modifications", label: "Woningaanpassingen" },
  ];

  const handleNeedChange = (needId: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      needs: checked 
        ? [...prev.needs, needId]
        : prev.needs.filter(id => id !== needId)
    }));
  };

  const handleSubmit = () => {
    if (!profile.age || !profile.livingSituation || profile.needs.length === 0) {
      return; // Basic validation
    }
    
    setIsSubmitted(true);
    onProfileSubmit(profile);
  };

  if (isSubmitted) {
    return (
      <div className="text-sm text-muted-foreground">
        ✅ Profiel succesvol aangemaakt! Ik ga nu passende aanbevelingen voor u zoeken...
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Vertel ons over uw situatie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Leeftijd</Label>
            <Select 
              value={profile.age} 
              onValueChange={(value) => setProfile(prev => ({ ...prev, age: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer uw leeftijd" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="18-30">18-30 jaar</SelectItem>
                <SelectItem value="31-50">31-50 jaar</SelectItem>
                <SelectItem value="51-65">51-65 jaar</SelectItem>
                <SelectItem value="66-80">66-80 jaar</SelectItem>
                <SelectItem value="80+">80+ jaar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="living">Woonsituatie</Label>
            <Select 
              value={profile.livingSituation} 
              onValueChange={(value) => setProfile(prev => ({ ...prev, livingSituation: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer uw woonsituatie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="independent">Zelfstandig thuis</SelectItem>
                <SelectItem value="with_family">Bij familie</SelectItem>
                <SelectItem value="assisted_living">Thuis met assistentie</SelectItem>
                <SelectItem value="care_facility">Woonzorgcentrum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Waar heeft u ondersteuning bij nodig? (meerdere opties mogelijk)</Label>
          <div className="grid grid-cols-2 gap-3">
            {needsOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={profile.needs.includes(option.id)}
                  onCheckedChange={(checked) => handleNeedChange(option.id, !!checked)}
                />
                <Label htmlFor={option.id} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit}
          className="w-full btn-helan-blue"
          disabled={!profile.age || !profile.livingSituation || profile.needs.length === 0}
        >
          Profiel aanmaken en verder
        </Button>
      </CardContent>
    </Card>
  );
}
