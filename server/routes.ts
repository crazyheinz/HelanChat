import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, analyzeUserProfile } from "./openai";
import { helanScraper, scheduleScrapingJob } from "./scraper";
import { simpleHelanScraper } from "./simple-scraper";
import { initializeScrapingDb, scrapingDb, scrapingContent, extractedServices } from "./scraping-db";
import { z } from "zod";
import { nanoid } from "nanoid";

// Initialize scraping database
initializeScrapingDb();

// Start scraping schedule
scheduleScrapingJob();

// Run initial scraping on startup
(async () => {
  console.log('Starting initial scraping on server startup...');
  try {
    await simpleHelanScraper.scrapeHelanWebsites();
    console.log('Initial scraping completed successfully');
  } catch (error) {
    console.error('Initial scraping failed:', error);
  }
})();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Chat API endpoints
  app.post("/api/chat/start", async (req, res) => {
    try {
      const { sessionId, language = "nl" } = req.body;
      
      const conversation = await storage.createConversation({
        sessionId: sessionId || nanoid(),
        language,
        status: "active",
      });

      // Log analytics
      await storage.createAnalyticsEvent({
        event: "conversation_started",
        conversationId: conversation.id,
        sessionId: conversation.sessionId,
        data: { language }
      });

      res.json(conversation);
    } catch (error) {
      console.error("Error starting conversation:", error);
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  app.post("/api/chat/:conversationId/message", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, userProfile } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Store user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content: content.trim(),
      });

      // Update conversation with profile if provided
      if (userProfile) {
        await storage.updateConversation(conversationId, {
          userProfile,
        });
      }

      // Get conversation context
      const conversation = await storage.getConversation(conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);
      
      // Get relevant scraped content for context
      const scrapedContent = await storage.getScrapedContent();
      const services = await storage.getServices();

      // Generate AI response
      const aiResponse = await generateChatResponse({
        userMessage: content,
        conversationHistory: messages,
        userProfile: conversation?.userProfile as any,
        scrapedContent: scrapedContent.slice(0, 10), // Limit context
        services: services.slice(0, 20),
        language: conversation?.language || "nl"
      });

      // Store AI message
      const assistantMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse.content,
        metadata: aiResponse.metadata,
      });

      // Log analytics
      await storage.createAnalyticsEvent({
        event: "message_sent",
        conversationId,
        data: { 
          userMessageLength: content.length,
          aiResponseLength: aiResponse.content.length 
        }
      });

      res.json({
        userMessage,
        assistantMessage,
        recommendations: aiResponse.metadata?.recommendations || [],
      });

    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.get("/api/chat/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Profile analysis endpoint
  app.post("/api/profile/analyze", async (req, res) => {
    try {
      const profileSchema = z.object({
        age: z.string(),
        livingSituation: z.string(),
        needs: z.array(z.string()),
        language: z.string().optional(),
      });

      const profile = profileSchema.parse(req.body);
      const analysis = await analyzeUserProfile(profile);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing profile:", error);
      res.status(500).json({ error: "Failed to analyze profile" });
    }
  });

  // Services API
  app.get("/api/services", async (req, res) => {
    try {
      const { category } = req.query;
      
      let services;
      if (category && typeof category === "string") {
        services = await storage.getServicesByCategory(category);
      } else {
        services = await storage.getServices();
      }
      
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to get services" });
    }
  });

  // Cost simulation
  app.post("/api/cost/simulate", async (req, res) => {
    try {
      const { serviceIds, userProfile } = req.body;
      
      if (!Array.isArray(serviceIds)) {
        return res.status(400).json({ error: "Service IDs must be an array" });
      }

      const services = await storage.getServices();
      const selectedServices = services.filter(s => serviceIds.includes(s.id));
      
      let totalCost = 0;
      const breakdown = selectedServices.map(service => {
        const price = service.priceFrom ? parseFloat(service.priceFrom) : 0;
        totalCost += price;
        
        return {
          id: service.id,
          name: service.name,
          price,
          unit: service.priceUnit || 'month',
          isHelanService: service.isHelanService,
        };
      });

      // Calculate discounts (simplified logic)
      const isZFMember = userProfile?.isZFMember !== false; // Default to true
      const discount = isZFMember ? totalCost * 0.15 : 0; // 15% discount for ZF members
      const finalCost = totalCost - discount;

      res.json({
        breakdown,
        totalCost,
        discount,
        finalCost,
        currency: "EUR",
        isZFMember,
      });
      
    } catch (error) {
      console.error("Error simulating costs:", error);
      res.status(500).json({ error: "Failed to simulate costs" });
    }
  });

  // Appointments
  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentSchema = z.object({
        conversationId: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().min(1),
        appointmentType: z.enum(["phone", "video", "office", "home"]),
        preferredDate: z.string().datetime().optional(),
        notes: z.string().optional(),
      });

      const appointmentData = appointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment({
        ...appointmentData,
        preferredDate: appointmentData.preferredDate 
          ? new Date(appointmentData.preferredDate) 
          : undefined,
      });

      // Log analytics
      await storage.createAnalyticsEvent({
        event: "appointment_scheduled",
        conversationId: appointmentData.conversationId,
        data: { 
          appointmentType: appointmentData.appointmentType,
          hasPreferredDate: !!appointmentData.preferredDate 
        }
      });

      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackSchema = z.object({
        conversationId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      });

      const feedbackData = feedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(feedbackData);

      // Log analytics
      await storage.createAnalyticsEvent({
        event: "feedback_submitted",
        conversationId: feedbackData.conversationId,
        data: { rating: feedbackData.rating }
      });

      res.json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getAnalyticsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/admin/conversations", async (req, res) => {
    try {
      // Get recent conversations with basic info
      const analytics = await storage.getAnalytics();
      const conversationStarts = analytics
        .filter(a => a.event === "conversation_started")
        .slice(0, 50);
      
      res.json(conversationStarts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    try {
      const feedback = await storage.getFeedback();
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to get feedback" });
    }
  });

  app.get("/api/admin/scraped-content", async (req, res) => {
    try {
      const scrapedContent = await storage.getScrapedContent();
      res.json(scrapedContent.slice(0, 20)); // Limit to 20 most recent items
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraped content" });
    }
  });

  app.post("/api/admin/scrape", async (req, res) => {
    try {
      // Trigger manual scraping
      res.json({ message: "Scraping started" });
      
      // Run scraping in background
      setImmediate(async () => {
        try {
          await simpleHelanScraper.scrapeHelanWebsites();
          console.log("Manual scraping completed");
        } catch (error) {
          console.error("Manual scraping failed:", error);
        }
      });
      
    } catch (error) {
      res.status(500).json({ error: "Failed to start scraping" });
    }
  });

  // Scraping database API endpoints
  app.get("/api/scraping/content", async (req, res) => {
    try {
      const content = await scrapingDb.select().from(scrapingContent).orderBy(scrapingContent.scrapedAt);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraping content" });
    }
  });

  app.get("/api/scraping/services", async (req, res) => {
    try {
      const services = await scrapingDb.select().from(extractedServices).orderBy(extractedServices.extractedAt);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch extracted services" });
    }
  });

  app.get("/api/scraping/stats", async (req, res) => {
    try {
      const contentCount = await scrapingDb.select().from(scrapingContent);
      const servicesCount = await scrapingDb.select().from(extractedServices);
      
      res.json({
        totalContent: contentCount.length,
        totalServices: servicesCount.length,
        lastScraped: contentCount.length > 0 ? contentCount[contentCount.length - 1].scrapedAt : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraping stats" });
    }
  });

  app.post("/api/scraping/start", async (req, res) => {
    try {
      res.json({ message: "Scraping started" });
      
      setImmediate(async () => {
        try {
          await simpleHelanScraper.scrapeHelanWebsites();
          console.log("Dedicated scraping completed");
        } catch (error) {
          console.error("Dedicated scraping failed:", error);
        }
      });
      
    } catch (error) {
      res.status(500).json({ error: "Failed to start dedicated scraping" });
    }
  });

  // Export conversation summary
  app.get("/api/chat/:conversationId/export", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { format = "json" } = req.query;
      
      const conversation = await storage.getConversation(conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const exportData = {
        conversation,
        messages,
        exportedAt: new Date().toISOString(),
      };

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="conversation-${conversationId}.json"`);
        res.json(exportData);
      } else {
        // Simple text format
        const textContent = messages
          .map(m => `[${m.role.toUpperCase()}] ${m.content}`)
          .join("\n\n");
          
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="conversation-${conversationId}.txt"`);
        res.send(textContent);
      }

      // Log analytics
      await storage.createAnalyticsEvent({
        event: "conversation_exported",
        conversationId,
        data: { format }
      });

    } catch (error) {
      console.error("Error exporting conversation:", error);
      res.status(500).json({ error: "Failed to export conversation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
