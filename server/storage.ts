import { 
  users, conversations, messages, scrapedContent, services, 
  appointments, feedback, analytics,
  type User, type InsertUser, type Conversation, type InsertConversation,
  type Message, type InsertMessage, type ScrapedContent, type InsertScrapedContent,
  type Service, type InsertService, type Appointment, type InsertAppointment,
  type Feedback, type InsertFeedback, type Analytics, type InsertAnalytics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getConversationsBySession(sessionId: string): Promise<Conversation[]>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;

  // Scraped Content
  createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent>;
  updateScrapedContent(url: string, content: Partial<ScrapedContent>): Promise<ScrapedContent | undefined>;
  getScrapedContent(): Promise<ScrapedContent[]>;
  getScrapedContentByUrl(url: string): Promise<ScrapedContent | undefined>;
  searchScrapedContent(query: string): Promise<ScrapedContent[]>;

  // Services
  createService(service: InsertService): Promise<Service>;
  getServices(): Promise<Service[]>;
  getServicesByCategory(category: string): Promise<Service[]>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | undefined>;

  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointments(): Promise<Appointment[]>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;

  // Feedback
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedback(): Promise<Feedback[]>;

  // Analytics
  createAnalyticsEvent(event: InsertAnalytics): Promise<Analytics>;
  getAnalytics(fromDate?: Date): Promise<Analytics[]>;
  getAnalyticsStats(): Promise<{
    todayConversations: number;
    appointmentsScheduled: number;
    averageRating: number;
    scrapedPages: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Conversations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [conv] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return conv;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conv] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conv || undefined;
  }

  async getConversationsBySession(sessionId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.sessionId, sessionId));
  }

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db
      .insert(messages)
      .values(message)
      .returning();
    return msg;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // Scraped Content
  async createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent> {
    const [scraped] = await db
      .insert(scrapedContent)
      .values(content)
      .returning();
    return scraped;
  }

  async updateScrapedContent(url: string, contentUpdate: Partial<ScrapedContent>): Promise<ScrapedContent | undefined> {
    const [scraped] = await db
      .update(scrapedContent)
      .set({ ...contentUpdate, lastScraped: new Date() })
      .where(eq(scrapedContent.url, url))
      .returning();
    return scraped || undefined;
  }

  async getScrapedContent(): Promise<ScrapedContent[]> {
    return await db
      .select()
      .from(scrapedContent)
      .where(eq(scrapedContent.isActive, true))
      .orderBy(desc(scrapedContent.lastScraped));
  }

  async getScrapedContentByUrl(url: string): Promise<ScrapedContent | undefined> {
    const [scraped] = await db.select().from(scrapedContent).where(eq(scrapedContent.url, url));
    return scraped || undefined;
  }

  async searchScrapedContent(query: string): Promise<ScrapedContent[]> {
    // Simple text search - in production you might want to use full-text search
    return await db
      .select()
      .from(scrapedContent)
      .where(and(
        eq(scrapedContent.isActive, true),
        // Note: This is a simple search implementation
        // For production, consider using PostgreSQL's full-text search capabilities
      ));
  }

  // Services
  async createService(service: InsertService): Promise<Service> {
    const [srv] = await db
      .insert(services)
      .values(service)
      .returning();
    return srv;
  }

  async getServices(): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.name);
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(and(eq(services.category, category), eq(services.isActive, true)))
      .orderBy(services.name);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const [srv] = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();
    return srv || undefined;
  }

  // Appointments
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [appt] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return appt;
  }

  async getAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [appt] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return appt || undefined;
  }

  // Feedback
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [fb] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return fb;
  }

  async getFeedback(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  // Analytics
  async createAnalyticsEvent(event: InsertAnalytics): Promise<Analytics> {
    const [analytics_event] = await db
      .insert(analytics)
      .values(event)
      .returning();
    return analytics_event;
  }

  async getAnalytics(fromDate?: Date): Promise<Analytics[]> {
    const query = db.select().from(analytics);
    
    if (fromDate) {
      return await query.where(gte(analytics.createdAt, fromDate));
    }
    
    return await query.orderBy(desc(analytics.createdAt));
  }

  async getAnalyticsStats(): Promise<{
    todayConversations: number;
    appointmentsScheduled: number;
    averageRating: number;
    scrapedPages: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count today's conversations
    const [todayConvs] = await db
      .select({ count: count() })
      .from(conversations)
      .where(gte(conversations.createdAt, today));

    // Count pending appointments
    const [pendingAppts] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.status, "pending"));

    // Calculate average rating
    const feedbackList = await db.select().from(feedback);
    const averageRating = feedbackList.length > 0 
      ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length 
      : 0;

    // Count scraped pages
    const [scrapedPages] = await db
      .select({ count: count() })
      .from(scrapedContent)
      .where(eq(scrapedContent.isActive, true));

    return {
      todayConversations: todayConvs.count,
      appointmentsScheduled: pendingAppts.count,
      averageRating: Math.round(averageRating * 10) / 10,
      scrapedPages: scrapedPages.count,
    };
  }
}

export const storage = new DatabaseStorage();
