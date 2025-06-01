import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Calculator, ExternalLink, Euro } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  priceFrom?: string;
  priceUnit?: string;
  isHelanService: boolean;
  image?: string;
}

interface ServiceRecommendationsProps {
  recommendations: Service[];
  onScheduleConsultation: () => void;
  onOpenCalculator: () => void;
}

export default function ServiceRecommendations({ 
  recommendations, 
  onScheduleConsultation, 
  onOpenCalculator 
}: ServiceRecommendationsProps) {
  
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getServiceImage = (category: string) => {
    // Default service images based on category
    const imageMap: Record<string, string> = {
      thuiszorg: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
      huishoudelijke_hulp: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
      sociale_ondersteuning: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
      medische_zorg: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
      woningaanpassingen: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150",
    };
    
    return imageMap[category] || imageMap.thuiszorg;
  };

  const formatPrice = (price?: string, unit?: string) => {
    if (!price) return "Op aanvraag";
    
    const unitLabels: Record<string, string> = {
      hour: "/uur",
      month: "/maand",
      session: "/sessie",
      day: "/dag",
    };
    
    return `€${price}${unitLabels[unit || ''] || ''}`;
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground">Aanbevolen diensten voor u:</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((service) => (
          <Card key={service.id} className="service-card overflow-hidden">
            <div className="aspect-video w-full bg-muted">
              <img 
                src={service.image || getServiceImage(service.category)}
                alt={service.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = getServiceImage('thuiszorg');
                }}
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-foreground">{service.name}</h5>
                <Badge 
                  variant={service.isHelanService ? "default" : "secondary"}
                  className={service.isHelanService ? "bg-helan-green" : ""}
                >
                  {service.isHelanService ? "Helan Dienst" : "Partner"}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {service.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-helan-blue" />
                  <span className="font-medium text-helan-blue">
                    {formatPrice(service.priceFrom, service.priceUnit)}
                  </span>
                </div>
                
                <Button size="sm" variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button onClick={onOpenCalculator} className="btn-helan-blue">
          <Calculator className="h-4 w-4 mr-2" />
          Kosten berekenen
        </Button>
        <Button 
          onClick={onScheduleConsultation}
          variant="outline" 
          className="border-helan-blue text-helan-blue hover:bg-helan-blue hover:text-white"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Afspraak maken
        </Button>
      </div>
      
      {/* Disclaimer */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600">ℹ️</span>
          <div className="text-yellow-800">
            <strong>Disclaimer:</strong> Dit is een simulatie op basis van uw profiel. 
            De werkelijke kosten kunnen afwijken. Voor een nauwkeurige offerte kunt u 
            een persoonlijk gesprek inplannen.
          </div>
        </div>
      </div>
    </div>
  );
}
