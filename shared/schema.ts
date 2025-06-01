import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id"),
  sessionId: text("session_id").notNull(),
  language: text("language").default("nl").notNull(),
  status: text("status").default("active").notNull(), // active, completed, abandoned
  userProfile: jsonb("user_profile"), // Store user profile data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store additional data like service recommendations
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scrapedContent = pgTable("scraped_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  title: text("title"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store structured data about services, prices, etc.
  lastScraped: timestamp("last_scraped").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priceFrom: decimal("price_from", { precision: 10, scale: 2 }),
  priceTo: decimal("price_to", { precision: 10, scale: 2 }),
  priceUnit: text("price_unit"), // hour, month, session
  isHelanService: boolean("is_helan_service").default(true).notNull(),
  metadata: jsonb("metadata"), // Store additional service data
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  appointmentType: text("appointment_type").notNull(), // phone, video, office, home
  preferredDate: timestamp("preferred_date"),
  status: text("status").default("pending").notNull(), // pending, confirmed, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analytics = pgTable("analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  event: text("event").notNull(),
  conversationId: uuid("conversation_id"),
  sessionId: text("session_id"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
  appointments: many(appointments),
  feedback: many(feedback),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  conversation: one(conversations, {
    fields: [appointments.conversationId],
    references: [conversations.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  conversation: one(conversations, {
    fields: [feedback.conversationId],
    references: [conversations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertScrapedContentSchema = createInsertSchema(scrapedContent).omit({
  id: true,
  lastScraped: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertScrapedContent = z.infer<typeof insertScrapedContentSchema>;
export type ScrapedContent = typeof scrapedContent.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;
