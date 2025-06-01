import { storage } from './storage';
import type { ScrapedContent, Service } from '../shared/schema';

// Function definitions for GPT function calling
export const functionDefinitions = [
  {
    name: "search_products",
    description: "Search for specific products or services in the database",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for products (e.g., 'rolstoel', 'wandelstok', 'incontinentie')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_product_details",
    description: "Get detailed information about a specific product including price and availability",
    parameters: {
      type: "object", 
      properties: {
        productName: {
          type: "string",
          description: "Name of the product to get details for"
        }
      },
      required: ["productName"]
    }
  },
  {
    name: "search_services",
    description: "Search for Helan services like thuiszorg, huishoudhulp, kinderopvang",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string", 
          description: "Service category (e.g., 'thuiszorg', 'huishoudhulp', 'kinderopvang')"
        }
      },
      required: ["category"]
    }
  },
  {
    name: "get_contact_info",
    description: "Get contact information for specific departments or services",
    parameters: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description: "Department or service name (e.g., 'zorgwinkel', 'thuiszorg', 'algemeen')"
        }
      },
      required: ["department"]
    }
  }
];

// Function implementations
export async function searchProducts(query: string): Promise<ScrapedContent[]> {
  try {
    console.log(`Searching products for: ${query}`);
    const results = await storage.searchScrapedContent(query);
    console.log(`Found ${results.length} total search results`);
    
    // Filter for product-related content from helanzorgwinkel or helan.be
    const productResults = results.filter(item => 
      (item.url.includes('helanzorgwinkel.be') || item.url.includes('helan.be')) && 
      (item.content.toLowerCase().includes(query.toLowerCase()) || 
       (item.title && item.title.toLowerCase().includes(query.toLowerCase())))
    );
    
    console.log(`Filtered to ${productResults.length} product results`);
    console.log('Sample results:', productResults.slice(0, 2).map(r => ({ url: r.url, title: r.title })));
    
    return productResults.slice(0, 10); // Limit results
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

export async function getProductDetails(productName: string): Promise<ScrapedContent[]> {
  try {
    console.log(`Getting product details for: ${productName}`);
    const results = await storage.searchScrapedContent(productName);
    
    // Look for specific product pages
    const productDetails = results.filter(item =>
      item.url.includes('helanzorgwinkel.be') &&
      item.content.toLowerCase().includes(productName.toLowerCase())
    );
    
    return productDetails.slice(0, 5);
  } catch (error) {
    console.error('Error getting product details:', error);
    return [];
  }
}

export async function searchServices(category: string): Promise<Service[]> {
  try {
    console.log(`Searching services for category: ${category}`);
    const services = await storage.getServicesByCategory(category);
    return services.slice(0, 10);
  } catch (error) {
    console.error('Error searching services:', error);
    return [];
  }
}

export async function getContactInfo(department: string): Promise<ScrapedContent[]> {
  try {
    console.log(`Getting contact info for: ${department}`);
    const contactQuery = `contact ${department}`;
    const results = await storage.searchScrapedContent(contactQuery);
    
    // Filter for contact-related content
    const contactResults = results.filter(item =>
      item.content.toLowerCase().includes('contact') ||
      item.content.toLowerCase().includes('telefoon') ||
      item.content.toLowerCase().includes('email') ||
      item.content.toLowerCase().includes('0800')
    );
    
    return contactResults.slice(0, 5);
  } catch (error) {
    console.error('Error getting contact info:', error);
    return [];
  }
}

// Function router - calls the appropriate function based on name
export async function executeFunction(name: string, args: any): Promise<any> {
  switch (name) {
    case 'search_products':
      return await searchProducts(args.query);
    case 'get_product_details':
      return await getProductDetails(args.productName);
    case 'search_services':
      return await searchServices(args.category);
    case 'get_contact_info':
      return await getContactInfo(args.department);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}