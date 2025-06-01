import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  MessageSquare, 
  Calendar, 
  Star, 
  Database,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  Download
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/admin/conversations"],
  });

  // Fetch feedback
  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ["/api/admin/feedback"],
  });

  // Fetch scraped content
  const { data: scrapedContent = [], isLoading: scrapedLoading } = useQuery({
    queryKey: ["/api/admin/scraped-content"],
  });

  // Manual scraping mutation
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/scrape", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const handleScrape = () => {
    scrapeMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-helan-blue text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Helan Zorgassistent - Admin Dashboard</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            
            {/* Navigation */}
            <div className="border-b">
              <TabsList className="w-full justify-start h-12 bg-muted/50">
                <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="conversations" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Gesprekken</span>
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex items-center space-x-2">
                  <Star className="h-4 w-4" />
                  <span>Feedback</span>
                </TabsTrigger>
                <TabsTrigger value="scraping" className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Scraping</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="p-6 space-y-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Gesprekken vandaag</p>
                          <p className="text-2xl font-bold">
                            {statsLoading ? "..." : stats?.todayConversations || 0}
                          </p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-helan-blue" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Afspraken gemaakt</p>
                          <p className="text-2xl font-bold">
                            {statsLoading ? "..." : stats?.appointmentsScheduled || 0}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-helan-green" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Gemiddelde rating</p>
                          <p className="text-2xl font-bold">
                            {statsLoading ? "..." : stats?.averageRating || "0.0"}
                          </p>
                        </div>
                        <Star className="h-8 w-8 text-helan-orange" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Pagina's gescraped</p>
                          <p className="text-2xl font-bold">
                            {statsLoading ? "..." : stats?.scrapedPages || 0}
                          </p>
                        </div>
                        <Database className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recente activiteit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {conversationsLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                          ))}
                        </div>
                      ) : (
                        conversations.slice(0, 10).map((conv: any, index: number) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <p className="font-medium">Nieuw gesprek gestart</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(conv.createdAt).toLocaleString('nl-NL')}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {conv.data?.language || 'nl'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Conversations Tab */}
              <TabsContent value="conversations" className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gesprekken overzicht</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Tijd</th>
                            <th className="text-left p-2">Sessie ID</th>
                            <th className="text-left p-2">Taal</th>
                            <th className="text-left p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversationsLoading ? (
                            <tr>
                              <td colSpan={4} className="text-center p-4">
                                Laden...
                              </td>
                            </tr>
                          ) : (
                            conversations.slice(0, 20).map((conv: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">
                                  {new Date(conv.createdAt).toLocaleString('nl-NL')}
                                </td>
                                <td className="p-2 font-mono text-xs">
                                  {conv.sessionId?.slice(0, 8)}...
                                </td>
                                <td className="p-2">
                                  <Badge variant="outline">
                                    {conv.data?.language || 'nl'}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  <Badge variant="secondary">
                                    Actief
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Feedback Tab */}
              <TabsContent value="feedback" className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gebruiker feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {feedbackLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                          ))}
                        </div>
                      ) : feedback.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Nog geen feedback ontvangen
                        </p>
                      ) : (
                        feedback.map((fb: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= fb.rating 
                                          ? 'text-helan-orange fill-current' 
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-semibold">{fb.rating}/5</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(fb.createdAt).toLocaleDateString('nl-NL')}
                              </span>
                            </div>
                            {fb.comment && (
                              <p className="text-sm text-muted-foreground">
                                "{fb.comment}"
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scraping Tab */}
              <TabsContent value="scraping" className="p-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Website Scraping</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">Laatste scraping</p>
                          <p className="text-sm text-muted-foreground">
                            2 uur geleden • {stats?.scrapedPages || 0} pagina's verwerkt
                          </p>
                        </div>
                        <Button 
                          onClick={handleScrape}
                          disabled={scrapeMutation.isPending}
                          className="btn-helan-orange"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                          {scrapeMutation.isPending ? 'Scraping...' : 'Nu scrapen'}
                        </Button>
                      </div>

                      {scrapeMutation.isSuccess && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800">
                            ✅ Scraping succesvol gestart! Dit kan enkele minuten duren.
                          </p>
                        </div>
                      )}

                      {scrapeMutation.isError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-800">
                            ❌ Fout bij starten van scraping. Probeer opnieuw.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Scraped Content Section */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Gescrapte Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
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
                                  {new Date(content.lastScraped).toLocaleDateString('nl-NL')}
                                </span>
                              </div>
                              <p className="text-xs text-blue-600 mb-2 truncate">
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
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
