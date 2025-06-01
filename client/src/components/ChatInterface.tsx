import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, Send, Mic, Calendar, Download, Mail } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import ProfileForm from "./ProfileForm";
import ServiceRecommendations from "./ServiceRecommendations";
import CostSimulator from "./CostSimulator";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [showCostSimulator, setShowCostSimulator] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    startConversation,
    isInitialized,
  } = useChat();

  useEffect(() => {
    if (!isInitialized) {
      startConversation();
    }
  }, [isInitialized, startConversation]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const quickQuestions = [
    "Wat zijn de kosten voor thuiszorg?",
    "Hoe kan ik een afspraak maken?",
    "Welke subsidies zijn beschikbaar?",
    "Wat is mogelijk voor woningaanpassingen?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    sendMessage(question);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-helan-blue text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Helan Zorgassistent</h3>
            <p className="text-blue-100 text-sm">
              {isLoading ? "Aan het typen..." : "Online • Hier om te helpen"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white hover:bg-opacity-10"
            onClick={() => setShowCostSimulator(true)}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="flex items-start space-x-3 chat-message">
              <div className="w-8 h-8 bg-helan-blue rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <Card className="flex-1 max-w-2xl">
                <CardContent className="p-4">
                  <p className="text-foreground mb-3">
                    Welkom bij de Helan Zorgassistent! 👋
                  </p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Ik help u graag bij vragen over onze diensten, kosten en ondersteuning 
                    voor langer zelfstandig thuis wonen. Om u de beste adviezen te geven, 
                    stel ik eerst enkele vragen over uw situatie.
                  </p>
                  <ProfileForm onProfileSubmit={(profile) => {
                    sendMessage("Profiel ingevuld", profile);
                  }} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 chat-message ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-helan-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <Card className={`flex-1 max-w-2xl ${message.role === "user" ? "order-first" : ""}`}>
                <CardContent className="p-4">
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={i === 0 ? "mt-0" : ""}>{line}</p>
                    ))}
                  </div>
                  
                  {/* Service Recommendations */}
                  {message.metadata?.recommendations && (
                    <div className="mt-4">
                      <ServiceRecommendations 
                        recommendations={message.metadata.recommendations}
                        onScheduleConsultation={() => {
                          // Handle consultation scheduling
                          console.log("Schedule consultation");
                        }}
                        onOpenCalculator={() => setShowCostSimulator(true)}
                      />
                    </div>
                  )}
                  
                  {/* Action Buttons for AI messages */}
                  {message.role === "assistant" && message.metadata?.showActions && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" className="btn-helan-blue">
                        <Calendar className="h-4 w-4 mr-2" />
                        Afspraak maken
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download overzicht
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Email naar mij
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {message.role === "user" && (
                <div className="w-8 h-8 bg-helan-green rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-3 chat-message">
              <div className="w-8 h-8 bg-helan-blue rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <Card className="flex-1 max-w-xs">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground text-sm">Assistent is aan het typen</span>
                    <div className="typing-dots">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Questions */}
          {messages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Veelgestelde vragen:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Stel uw vraag over zorg en ondersteuning..."
                className="min-h-[48px] max-h-32 resize-none pr-24"
                disabled={isLoading}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Spraak naar tekst"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 btn-helan-blue"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Simulator Modal */}
      {showCostSimulator && (
        <CostSimulator 
          isOpen={showCostSimulator}
          onClose={() => setShowCostSimulator(false)}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
