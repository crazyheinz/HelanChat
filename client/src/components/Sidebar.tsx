import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Home, 
  Heart, 
  Download, 
  Mail, 
  Phone, 
  Star,
  Clock,
  Search,
  Bookmark
} from "lucide-react";

export default function Sidebar() {
  // Mock user profile data
  const userProfile = {
    age: "75 jaar",
    livingSituation: "Zelfstandig",
    healthStatus: "Beperkte mobiliteit",
    completeness: 75,
  };

  const currentServices = [
    { name: "Ziekenfonds", status: "active", type: "helan" },
    { name: "Aanvullende verzekering", status: "active", type: "helan" },
  ];

  const conversationContext = {
    startTime: "14:32 vandaag",
    topic: "Thuis wonen ondersteuning",
    savedItems: 4,
  };

  const recentConversations = [
    { title: "Huishoudelijke hulp", date: "3 dagen geleden" },
    { title: "Sociale activiteiten", date: "1 week geleden" },
  ];

  return (
    <div className="h-full bg-background border-l border-border flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Uw Profiel</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profiel volledigheid</span>
                <span className="font-medium text-helan-blue">{userProfile.completeness}%</span>
              </div>
              <Progress value={userProfile.completeness} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Vul uw gezondheidsinfo aan voor betere adviezen
              </p>
            </div>

            {/* Profile Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{userProfile.age}</p>
                  <p className="text-xs text-muted-foreground">Leeftijd</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{userProfile.livingSituation}</p>
                  <p className="text-xs text-muted-foreground">Woonsituatie</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{userProfile.healthStatus}</p>
                  <p className="text-xs text-muted-foreground">Gezondheid</p>
                </div>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-helan-blue hover:text-helan-blue hover:bg-blue-50"
            >
              Profiel aanpassen
            </Button>
          </CardContent>
        </Card>

        {/* Current Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Huidige Diensten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-helan-green rounded-full" />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <Badge variant="secondary" className="bg-helan-green text-white">
                  Actief
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversation Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gesprekscontext</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Gesprek gestart</p>
                <p className="text-xs text-muted-foreground">{conversationContext.startTime}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Search className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Onderwerp</p>
                <p className="text-xs text-muted-foreground">{conversationContext.topic}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Bookmark className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Opgeslagen items</p>
                <p className="text-xs text-muted-foreground">{conversationContext.savedItems} diensten bekeken</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recente gesprekken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentConversations.map((conversation, index) => (
              <div 
                key={index} 
                className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <p className="text-sm font-medium">{conversation.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{conversation.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t space-y-3">
        <Button className="w-full btn-helan-green">
          <Phone className="h-4 w-4 mr-2" />
          Bel mij terug
        </Button>
        <Button variant="outline" className="w-full border-helan-blue text-helan-blue hover:bg-helan-blue hover:text-white">
          <Mail className="h-4 w-4 mr-2" />
          Stuur samenvatting
        </Button>
        <Button variant="outline" className="w-full">
          <Star className="h-4 w-4 mr-2" />
          Feedback geven
        </Button>
      </div>
    </div>
  );
}
