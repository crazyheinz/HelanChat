import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Euro, Calculator, Download, Mail } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  priceFrom: string;
  priceUnit: string;
  isHelanService: boolean;
}

interface CostSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

interface CostBreakdown {
  breakdown: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
    isHelanService: boolean;
  }>;
  totalCost: number;
  discount: number;
  finalCost: number;
  currency: string;
  isZFMember: boolean;
}

export default function CostSimulator({ isOpen, onClose, conversationId }: CostSimulatorProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

  // Fetch available services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: isOpen,
  });

  // Cost simulation mutation
  const simulateCostMutation = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      const response = await apiRequest("POST", "/api/cost/simulate", {
        serviceIds,
        userProfile: { isZFMember: true }, // Default assumption
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCostBreakdown(data);
    },
  });

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleCalculate = () => {
    if (selectedServices.length > 0) {
      simulateCostMutation.mutate(selectedServices);
    }
  };

  const handleExport = (format: 'json' | 'pdf') => {
    if (!conversationId) return;
    
    // Create export URL
    const exportUrl = `/api/chat/${conversationId}/export?format=${format}`;
    window.open(exportUrl, '_blank');
  };

  const getServicesByCategory = (category: string) => {
    return services.filter((service: Service) => service.category === category);
  };

  const categories = [
    { id: 'thuiszorg', name: 'Thuiszorg', icon: '🏠' },
    { id: 'huishoudelijke_hulp', name: 'Huishoudelijke hulp', icon: '🧹' },
    { id: 'sociale_ondersteuning', name: 'Sociale ondersteuning', icon: '👥' },
    { id: 'medische_zorg', name: 'Medische zorg', icon: '⚕️' },
    { id: 'woningaanpassingen', name: 'Woningaanpassingen', icon: '🔧' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-helan-blue" />
            <span>Kostensimulator</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Selecteer diensten</h3>
              
              {servicesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map(category => {
                    const categoryServices = getServicesByCategory(category.id);
                    if (categoryServices.length === 0) return null;
                    
                    return (
                      <Card key={category.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {categoryServices.map((service: Service) => (
                            <div key={service.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={service.id}
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => handleServiceToggle(service.id)}
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label 
                                    htmlFor={service.id} 
                                    className="font-medium cursor-pointer"
                                  >
                                    {service.name}
                                  </Label>
                                  <Badge 
                                    variant={service.isHelanService ? "default" : "secondary"}
                                    className={service.isHelanService ? "bg-helan-green" : ""}
                                  >
                                    {service.isHelanService ? "Helan" : "Partner"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {service.description}
                                </p>
                                <p className="text-sm font-medium text-helan-blue">
                                  €{service.priceFrom}/{service.priceUnit || 'maand'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleCalculate}
              disabled={selectedServices.length === 0 || simulateCostMutation.isPending}
              className="w-full btn-helan-blue"
            >
              {simulateCostMutation.isPending ? "Berekenen..." : "Kosten berekenen"}
            </Button>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Kostenoverzicht</h3>
            
            {costBreakdown ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Euro className="h-5 w-5 text-helan-blue" />
                    <span>Maandelijkse kosten</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Service breakdown */}
                  <div className="space-y-3">
                    {costBreakdown.breakdown.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Per {item.unit}
                          </p>
                        </div>
                        <p className="font-semibold">€{item.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotaal</span>
                      <span className="font-medium">€{costBreakdown.totalCost.toFixed(2)}</span>
                    </div>
                    
                    {costBreakdown.discount > 0 && (
                      <div className="flex justify-between text-helan-green">
                        <span>ZF lidvoordeel ({costBreakdown.isZFMember ? '15%' : '0%'})</span>
                        <span className="font-medium">-€{costBreakdown.discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Totaal per maand</span>
                      <span className="text-helan-blue">€{costBreakdown.finalCost.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Additional info */}
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-800">
                      💡 <strong>Tip:</strong> Als Helan ziekenfonds lid profiteert u van extra kortingen 
                      en terugbetalingen op veel diensten.
                    </p>
                  </div>
                  
                  {/* Export options */}
                  <div className="flex flex-col space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport('json')}
                      disabled={!conversationId}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download overzicht
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!conversationId}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email naar mezelf
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecteer diensten om een kostenoverzicht te krijgen</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
