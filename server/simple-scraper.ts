import { storage } from './storage';
import type { InsertScrapedContent, InsertService } from '@shared/schema';
import { scrapingDb, scrapingContent, extractedServices } from './scraping-db';

export class SimpleHelanScraper {
  
  async scrapeHelanWebsites(): Promise<void> {
    console.log('Starting sitemap-based scraping...');
    
    try {
      // Scrape using sitemaps for comprehensive coverage
      const sitemapUrls = [
        'https://www.helan.be/nl/sitemap_static_nl.xml',
        'https://www.helan.be/nl/sitemap_advantage_nl.xml', 
        'https://www.helan.be/nl/sitemap_location_nl.xml',
        'https://www.helan.be/nl/sitemap_blog_nl.xml',
        'https://www.helan.be/fr/sitemap_static_fr.xml',
        'https://www.helan.be/fr/sitemap_advantage_fr.xml',
        'https://www.helan.be/fr/sitemap_location_fr.xml', 
        'https://www.helan.be/fr/sitemap_blog_fr.xml'
      ];

      for (const sitemapUrl of sitemapUrls) {
        console.log(`Processing sitemap: ${sitemapUrl}`);
        await this.scrapeSitemap(sitemapUrl);
        // Small delay between sitemaps
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Also scrape helanzorgwinkel main pages
      await this.scrapeWithFetch('https://helanzorgwinkel.be');
      await this.scrapeWithFetch('https://www.helanzorgwinkel.be/');
      
      // Process and extract services from scraped content
      await this.processScrapedContentForServices();
      
      console.log('Sitemap-based scraping completed successfully');
    } catch (error) {
      console.error('Sitemap scraping failed:', error);
    }
  }

  private async scrapeSitemap(sitemapUrl: string): Promise<void> {
    try {
      const response = await fetch(sitemapUrl);
      if (!response.ok) {
        console.log(`Sitemap not found: ${sitemapUrl}`);
        return;
      }

      const xmlContent = await response.text();
      
      // Extract URLs from sitemap XML
      const urlMatches = xmlContent.match(/<loc>(.*?)<\/loc>/g) || [];
      const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));
      
      console.log(`Found ${urls.length} URLs in sitemap ${sitemapUrl}`);
      
      // Scrape all URLs from sitemap
      const urlsToScrape = urls; // Process ALL URLs from sitemap
      
      for (const url of urlsToScrape) {
        await this.scrapeWithFetch(url);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error processing sitemap ${sitemapUrl}:`, error);
    }
  }

  private async scrapeWithFetch(url: string): Promise<void> {
    try {
      console.log(`Scraping ${url} with fetch...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HelanBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract basic information from HTML
      const title = this.extractTitle(html);
      const content = this.extractTextContent(html);
      const links = this.extractLinks(html, url);

      // Store scraped content
      await this.storeScrapedContent({
        url,
        title,
        content: content.substring(0, 5000), // Limit content size
        metadata: { 
          scrapedAt: new Date(),
          method: 'sitemap',
          linksFound: links.length 
        },
        lastScraped: new Date(),
      });

      console.log(`Successfully scraped ${url}`);
      // No longer following links - only scraping direct sitemap URLs

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  private async scrapeSubpage(url: string): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HelanBot/1.0)',
        },
        redirect: 'follow',
      });

      if (!response.ok) return;

      const html = await response.text();
      const title = this.extractTitle(html);
      const content = this.extractTextContent(html);

      await this.storeScrapedContent({
        url,
        title,
        content: content.substring(0, 3000),
        metadata: { 
          scrapedAt: new Date(),
          method: 'fetch-subpage' 
        },
        lastScraped: new Date(),
      });

    } catch (error) {
      console.error(`Error scraping subpage ${url}:`, error);
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'Geen titel';
  }

  private extractTextContent(html: string): string {
    // Remove scripts, styles, and other non-content elements
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const linkMatches = html.match(/<a[^>]+href="([^"]+)"/gi) || [];
    const links: string[] = [];

    for (const match of linkMatches) {
      const hrefMatch = match.match(/href="([^"]+)"/i);
      if (hrefMatch) {
        let link = hrefMatch[1];
        
        // Convert relative URLs to absolute
        if (link.startsWith('/')) {
          const base = new URL(baseUrl);
          link = `${base.protocol}//${base.host}${link}`;
        } else if (!link.startsWith('http')) {
          continue; // Skip non-HTTP links
        }

        // Only include links from the same domain
        if (link.includes('helan.be')) {
          links.push(link);
        }
      }
    }

    return Array.from(new Set(links)); // Remove duplicates
  }

  private async storeScrapedContent(data: {
    url: string;
    title: string;
    content: string;
    metadata: any;
    lastScraped: Date;
  }): Promise<void> {
    try {
      // Store in original database
      const existing = await storage.getScrapedContentByUrl(data.url);
      
      if (existing) {
        await storage.updateScrapedContent(data.url, {
          title: data.title,
          content: data.content,
          metadata: data.metadata,
          lastScraped: data.lastScraped,
        });
      } else {
        await storage.createScrapedContent(data);
      }

      // Also store in dedicated scraping database
      await scrapingDb.insert(scrapingContent).values({
        url: data.url,
        title: data.title,
        content: data.content,
        metadata: data.metadata,
        scrapedAt: data.lastScraped,
        lastUpdated: data.lastScraped,
      }).onConflictDoUpdate({
        target: scrapingContent.url,
        set: {
          title: data.title,
          content: data.content,
          metadata: data.metadata,
          lastUpdated: data.lastScraped,
        },
      });

    } catch (error) {
      console.error('Error storing scraped content:', error);
    }
  }

  async processScrapedContentForServices(): Promise<void> {
    try {
      const scrapedContent = await storage.getScrapedContent();
      
      for (const content of scrapedContent) {
        // Extract services from scraped content using text analysis
        const services = this.extractServicesFromContent(content.content, content.url);
        
        for (const service of services) {
          try {
            const existing = await storage.getServices();
            const serviceExists = existing.some(s => s.name.toLowerCase() === service.name.toLowerCase());
            
            if (!serviceExists) {
              await storage.createService(service);
              console.log(`Created service: ${service.name}`);
              
              // Also store in dedicated scraping database
              await scrapingDb.insert(extractedServices).values({
                name: service.name,
                description: service.description || '',
                category: service.category,
                priceFrom: service.priceFrom,
                priceTo: service.priceTo,
                priceUnit: service.priceUnit,
                sourceUrl: content.url,
                isHelanService: service.isHelanService ? 'true' : 'false',
                extractedAt: new Date(),
                metadata: service.metadata,
              });
            }
          } catch (error) {
            console.error('Error creating service:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing scraped content for services:', error);
    }
  }

  private extractServicesFromContent(content: string, url: string): InsertService[] {
    const services: InsertService[] = [];
    const isHelanService = url.includes('helan.be') && !url.includes('zorgwinkel');

    // Look for specific service patterns in the content
    const servicePatterns = [
      { name: 'Gipshoes', category: 'Orthopedische hulpmiddelen', keywords: ['gipshoes', 'gips schoen', 'gipsschoen'] },
      { name: 'Thuiszorg', category: 'Thuiszorg', keywords: ['thuiszorg', 'verpleging thuis', 'zorg aan huis'] },
      { name: 'Kinesitherapie', category: 'Therapie', keywords: ['kinesitherapie', 'fysiotherapie', 'revalidatie'] },
      { name: 'Rollator', category: 'Mobiliteitshulpmiddelen', keywords: ['rollator', 'loophulp', 'wandelframe'] },
      { name: 'Krukken', category: 'Mobiliteitshulpmiddelen', keywords: ['krukken', 'loopstokken', 'wandelstok'] },
      { name: 'Incontinentiemateriaal', category: 'Persoonlijke verzorging', keywords: ['incontinentie', 'luiers', 'absorberend'] },
    ];

    for (const pattern of servicePatterns) {
      const hasKeyword = pattern.keywords.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        // Extract price information if available
        const priceMatch = content.match(/(\d+(?:,\d+)?)\s*(?:euro|eur|€)/i);
        const priceFrom = priceMatch ? priceMatch[1].replace(',', '.') : null;

        services.push({
          name: pattern.name,
          description: `${pattern.name} beschikbaar via ${isHelanService ? 'Helan' : 'Helan Zorgwinkel'}`,
          category: pattern.category,
          priceFrom,
          priceUnit: priceFrom ? 'EUR' : null,
          isHelanService,
          isActive: true,
          metadata: { 
            extractedFrom: url, 
            foundKeywords: pattern.keywords.filter(k => 
              content.toLowerCase().includes(k.toLowerCase())
            ) 
          },
        });
      }
    }

    return services;
  }
}

export const simpleHelanScraper = new SimpleHelanScraper();