import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// Scraping-specific database schema
export const scrapingContent = pgTable("scraping_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title"),
  content: text("content"),
  metadata: jsonb("metadata"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const extractedServices = pgTable("extracted_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  priceFrom: text("price_from"),
  priceTo: text("price_to"),
  priceUnit: text("price_unit"),
  sourceUrl: text("source_url"),
  isHelanService: text("is_helan_service").notNull(),
  extractedAt: timestamp("extracted_at").defaultNow(),
  metadata: jsonb("metadata"),
});

// Create separate database connection for scraping
const scrapingPool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const scrapingDb = drizzle({ client: scrapingPool, schema: { scrapingContent, extractedServices } });

// Initialize scraping tables
export async function initializeScrapingDb() {
  try {
    await scrapingPool.query(`
      CREATE TABLE IF NOT EXISTS scraping_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        content TEXT,
        metadata JSONB,
        scraped_at TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    await scrapingPool.query(`
      CREATE TABLE IF NOT EXISTS extracted_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price_from TEXT,
        price_to TEXT,
        price_unit TEXT,
        source_url TEXT,
        is_helan_service TEXT NOT NULL,
        extracted_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      );
    `);

    console.log('Scraping database tables initialized');
  } catch (error) {
    console.error('Error initializing scraping database:', error);
  }
}