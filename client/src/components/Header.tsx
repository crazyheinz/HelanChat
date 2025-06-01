import { Heart, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-helan-blue rounded-md flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-helan-blue">Helan</span>
            </div>
            <span className="text-muted-foreground text-sm hidden sm:block">
              Zorgassistent
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select defaultValue="nl">
              <SelectTrigger className="w-[120px] text-sm">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="sm" className="p-2">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
