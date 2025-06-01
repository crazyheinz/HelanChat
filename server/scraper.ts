import puppeteer from 'puppeteer';
import { storage } from './storage';
import type { InsertScrapedContent } from '@shared/schema';

export class HelanScraper {
  private browser: puppeteer.Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeHelanWebsites(): Promise<void> {
    if (!this.browser) {
      await this.initialize();
    }

    const websites = [
      'https://helan.be',
      'https://helanzorgwinkel.be'
    ];

    for (const website of websites) {
      try {
        await this.scrapeWebsite(website);
      } catch (error) {
        console.error(`Error scraping ${website}:`, error);
      }
    }
  }

  private async scrapeWebsite(baseUrl: string): Promise<void> {
    if (!this.browser) return;

    const page = await this.browser.newPage();
    
    try {
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Extract page content
      const pageData = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, footer');
        scripts.forEach(el => el.remove());

        // Extract main content
        const title = document.querySelector('title')?.textContent || '';
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter(Boolean);
        
        const paragraphs = Array.from(document.querySelectorAll('p'))
          .map(p => p.textContent?.trim())
          .filter(Boolean);

        // Look for service information
        const serviceElements = Array.from(document.querySelectorAll('.service, .product, .zorg, .dienst, [class*="service"], [class*="product"]'));
        const services = serviceElements.map(el => ({
          title: el.querySelector('h1, h2, h3, h4')?.textContent?.trim() || '',
          description: el.querySelector('p')?.textContent?.trim() || '',
          price: el.textContent?.match(/€\s*\d+[.,]?\d*/g)?.[0] || ''
        })).filter(s => s.title);

        // Look for pricing information
        const priceElements = Array.from(document.querySelectorAll('[class*="price"], [class*="cost"], [class*="tarif"]'));
        const prices = priceElements.map(el => el.textContent?.trim()).filter(Boolean);

        return {
          title,
          content: [...headings, ...paragraphs].join('\n'),
          services,
          prices,
          url: window.location.href
        };
      });

      // Find all internal links for further scraping
      const links = await page.evaluate((baseUrl) => {
        const linkElements = Array.from(document.querySelectorAll('a[href]'));
        return linkElements
          .map(link => {
            const href = link.getAttribute('href');
            if (!href) return null;
            
            // Convert relative URLs to absolute
            try {
              const url = new URL(href, baseUrl);
              return url.href;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .filter(url => url && (url.includes('helan.be') || url.includes('helanzorgwinkel.be')))
          .slice(0, 50); // Limit to prevent infinite scraping
      }, baseUrl);

      // Store main page content
      await this.storeScrapedContent({
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        metadata: {
          services: pageData.services,
          prices: pageData.prices,
          scrapedAt: new Date().toISOString()
        }
      });

      // Scrape important subpages
      const importantPages = links.filter(link => 
        link.includes('/zorg') || 
        link.includes('/dienst') || 
        link.includes('/product') || 
        link.includes('/prij') ||
        link.includes('/cost') ||
        link.includes('/service')
      ).slice(0, 20); // Limit subpages

      for (const link of importantPages) {
        try {
          await this.scrapePage(link);
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error scraping page ${link}:`, error);
        }
      }

    } finally {
      await page.close();
    }
  }

  private async scrapePage(url: string): Promise<void> {
    if (!this.browser) return;

    // Check if already scraped recently (within 24 hours)
    const existing = await storage.getScrapedContentByUrl(url);
    if (existing && existing.lastScraped) {
      const hoursSinceLastScrape = (Date.now() - existing.lastScraped.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastScrape < 24) {
        return; // Skip if scraped recently
      }
    }

    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      const pageData = await page.evaluate(() => {
        // Clean up page content
        const scripts = document.querySelectorAll('script, style, nav, footer, .cookie, .navigation');
        scripts.forEach(el => el.remove());

        const title = document.querySelector('title')?.textContent || 
                     document.querySelector('h1')?.textContent || '';
        
        // Extract structured content
        const content = Array.from(document.querySelectorAll('h1, h2, h3, p, li'))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join('\n');

        // Look for service/product specific information
        const serviceInfo = {
          prices: Array.from(document.querySelectorAll('[class*="price"], [class*="cost"], [class*="tarif"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean),
          features: Array.from(document.querySelectorAll('ul li, .feature, .benefit'))
            .map(el => el.textContent?.trim())
            .filter(Boolean),
          categories: Array.from(document.querySelectorAll('.category, .tag, [class*="categor"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
        };

        return {
          title,
          content,
          serviceInfo,
          url: window.location.href
        };
      });

      // Store or update content
      await this.storeScrapedContent({
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        metadata: {
          ...pageData.serviceInfo,
          scrapedAt: new Date().toISOString()
        }
      });

    } finally {
      await page.close();
    }
  }

  private async storeScrapedContent(data: {
    url: string;
    title: string;
    content: string;
    metadata: any;
  }): Promise<void> {
    try {
      const existing = await storage.getScrapedContentByUrl(data.url);
      
      if (existing) {
        await storage.updateScrapedContent(data.url, {
          title: data.title,
          content: data.content,
          metadata: data.metadata,
        });
      } else {
        await storage.createScrapedContent({
          url: data.url,
          title: data.title,
          content: data.content,
          metadata: data.metadata,
          isActive: true,
        });
      }
    } catch (error) {
      console.error('Error storing scraped content:', error);
    }
  }

  // Method to extract services from scraped content and store them
  async processScrapedContentForServices(): Promise<void> {
    const scrapedData = await storage.getScrapedContent();
    
    for (const scraped of scrapedData) {
      if (!scraped.metadata || !scraped.metadata.services) continue;
      
      const services = scraped.metadata.services as any[];
      
      for (const serviceData of services) {
        if (!serviceData.title) continue;
        
        try {
          // Determine category based on content
          let category = 'general';
          const title = serviceData.title.toLowerCase();
          const description = serviceData.description?.toLowerCase() || '';
          
          if (title.includes('thuiszorg') || title.includes('verzorg') || description.includes('thuis')) {
            category = 'thuiszorg';
          } else if (title.includes('huishoud') || description.includes('schoonma')) {
            category = 'huishoudelijke_hulp';
          } else if (title.includes('social') || title.includes('activiteit')) {
            category = 'sociale_ondersteuning';
          } else if (title.includes('medisch') || title.includes('gezond')) {
            category = 'medische_zorg';
          }

          // Extract price information
          let priceFrom = null;
          let priceUnit = null;
          
          if (serviceData.price) {
            const priceMatch = serviceData.price.match(/€\s*(\d+(?:[.,]\d+)?)/);
            if (priceMatch) {
              priceFrom = priceMatch[1].replace(',', '.');
              
              if (serviceData.price.includes('uur')) priceUnit = 'hour';
              else if (serviceData.price.includes('maand')) priceUnit = 'month';
              else if (serviceData.price.includes('sessie')) priceUnit = 'session';
            }
          }

          await storage.createService({
            name: serviceData.title,
            description: serviceData.description || '',
            category,
            priceFrom,
            priceUnit,
            isHelanService: scraped.url.includes('helan.be'),
            metadata: {
              sourceUrl: scraped.url,
              extractedAt: new Date().toISOString()
            },
            isActive: true,
          });
          
        } catch (error) {
          // Service might already exist, continue with next
          console.log(`Service ${serviceData.title} might already exist or error occurred:`, error.message);
        }
      }
    }
  }
}

export const helanScraper = new HelanScraper();

// Schedule daily scraping
export function scheduleScrapingJob(): void {
  // Run scraping every 24 hours
  setInterval(async () => {
    try {
      console.log('Starting scheduled scraping job...');
      await helanScraper.scrapeHelanWebsites();
      await helanScraper.processScrapedContentForServices();
      console.log('Scheduled scraping job completed.');
    } catch (error) {
      console.error('Error in scheduled scraping job:', error);
    } finally {
      await helanScraper.close();
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}
