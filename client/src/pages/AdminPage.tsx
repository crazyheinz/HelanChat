import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database,
  RefreshCw,
  ExternalLink,
  Calendar,
  BarChart3
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("scraping");

  // Fetch scraping stats
  const { data: scrapingStats, isLoading: scrapingStatsLoading } = useQuery({
    queryKey: ["/api/scraping/stats"],
    refetchInterval: 30000,
  });

  // Fetch scraped content from dedicated database
  const { data: scrapedContent = [], isLoading: scrapedLoading } = useQuery({
    queryKey: ["/api/scraping/content"],
  });

  // Fetch extracted services from scraping database
  const { data: extractedServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/scraping/services"],
  });

  // Manual scraping mutation
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/scraping/start", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/services"] });
    },
  });

  const handleScrape = () => {
    scrapeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-helan-blue mb-2">
            Helan Scraping Database Admin
          </h1>
          <p className="text-muted-foreground">
            Beheer en bekijk de gescrapte content van Helan websites
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scraping">Scraping Data</TabsTrigger>
            <TabsTrigger value="services">Geëxtraheerde Services</TabsTrigger>
            <TabsTrigger value="stats">Statistieken</TabsTrigger>
          </TabsList>

          {/* Scraping Data Tab */}
          <TabsContent value="scraping" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Website Scraping Controle</CardTitle>
                <Button 
                  onClick={handleScrape}
                  disabled={scrapeMutation.isPending}
                  className="btn-helan-orange"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                  {scrapeMutation.isPending ? 'Scraping...' : 'Nu scrapen'}
                </Button>
              </CardHeader>
              <CardContent>
                {scrapeMutation.isSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <p className="text-green-800">
                      ✅ Scraping succesvol gestart!
                    </p>
                  </div>
                )}

                {scrapeMutation.isError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-red-800">
                      ❌ Fout bij starten van scraping.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">helan.be</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Hoofdwebsite met algemene informatie
                    </p>
                    <Badge variant="secondary">Automatisch</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">helanzorgwinkel.be</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Zorgwinkel met producten en diensten
                    </p>
                    <Badge variant="secondary">Automatisch</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gescrapte Content ({scrapedContent.length} pagina's)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {scrapedLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : scrapedContent.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nog geen content gescraped
                    </p>
                  ) : (
                    scrapedContent.map((content: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm truncate max-w-md">
                            {content.title || 'Geen titel'}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(content.scrapedAt || content.scraped_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mb-2 truncate flex items-center">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {content.url}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {content.content?.substring(0, 150)}...
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Geëxtraheerde Services ({extractedServices.length} diensten)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {servicesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : extractedServices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nog geen services geëxtraheerd
                    </p>
                  ) : (
                    extractedServices.map((service: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{service.name}</h4>
                          <Badge variant={service.is_helan_service === 'true' ? 'default' : 'secondary'}>
                            {service.is_helan_service === 'true' ? 'Helan' : 'Helan Zorgwinkel'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-helan-orange">
                            {service.category}
                          </span>
                          {service.price_from && (
                            <span className="text-sm font-medium">
                              €{service.price_from}
                              {service.price_to && service.price_to !== service.price_from ? `-${service.price_to}` : ''}
                              {service.price_unit && ` ${service.price_unit}`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Pagina's gescraped</p>
                      <p className="text-2xl font-bold">
                        {scrapedContent.length}
                      </p>
                    </div>
                    <Database className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Services gevonden</p>
                      <p className="text-2xl font-bold">
                        {extractedServices.length}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Laatste scraping</p>
                      <p className="text-2xl font-bold">
                        {scrapedContent.length > 0 ? 'Vandaag' : 'Nooit'}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}