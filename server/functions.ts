import { storage } from "./storage";
import type { ProductLink } from "@shared/schema";
import type { ScrapedContent, Service } from "../shared/schema";

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
          description:
            "Search query for products (e.g., 'rolstoel', 'wandelstok', 'incontinentie')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_details",
    description:
      "Get detailed information about a specific product including price and availability",
    parameters: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "Name of the product to get details for",
        },
      },
      required: ["productName"],
    },
  },
  {
    name: "search_services",
    description:
      "Search for Helan services like thuiszorg, huishoudhulp, kinderopvang",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Service category (e.g., 'thuiszorg', 'huishoudhulp', 'kinderopvang')",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_contact_info",
    description: "Get contact information for specific departments or services",
    parameters: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description:
            "Department or service name (e.g., 'zorgwinkel', 'thuiszorg', 'algemeen')",
        },
      },
      required: ["department"],
    },
  },
];

function extractPrice(content: string): string | undefined {
  const match = content.match(/(\d{1,4}(?:[.,]\d{2})?) ?(€|EUR)/i);
  return match ? `${match[1]} ${match[2]}` : undefined;
}

function extractShortDescription(content: string): string | undefined {
  return content?.split(". ").slice(0, 1).join(".").trim(); // eerste zin
}

export async function searchProducts(query: string): Promise<ProductLink[]> {
  try {
    console.log(`Searching products for: ${query}`);
    const results = await storage.searchScrapedContent(query);
    console.log(`Found ${results.length} total search results`);

    // Prioriteer specifieke productpagina's
    const productResults = results.filter(
      (item) =>
        (item.url.includes("helanzorgwinkel.be") || item.url.includes("helan.be")) &&
        (item.content?.toLowerCase().includes(query.toLowerCase()) ||
          (item.title && item.title.toLowerCase().includes(query.toLowerCase())))
    ).sort((a, b) => {
      // Prioriteer pagina's met prijzen en specifieke producten
      const aHasPrice = a.content.includes('€') || a.content.includes('EUR');
      const bHasPrice = b.content.includes('€') || b.content.includes('EUR');
      const aIsProductPage = a.url.includes('/shop/') || a.url.includes('/product/');
      const bIsProductPage = b.url.includes('/shop/') || b.url.includes('/product/');
      
      if (aIsProductPage && !bIsProductPage) return -1;
      if (!aIsProductPage && bIsProductPage) return 1;
      if (aHasPrice && !bHasPrice) return -1;
      if (!aHasPrice && bHasPrice) return 1;
      return 0;
    });

    console.log(`Filtered to ${productResults.length} product results`);

    const productLinks: ProductLink[] = productResults
      .slice(0, 5)
      .map((item) => {
        // Extract specifieke productinformatie uit de content
        const content = item.content;
        let productName = item.title || "Product";
        let price = extractPrice(content);
        let description = '';
        
        // Zoek naar specifieke productnamen in content die rolstoel bevatten
        if (content.includes('rolstoel') || content.includes('Rolstoel')) {
          const lines = content.split('\n');
          for (const line of lines) {
            if ((line.includes('rolstoel') || line.includes('Rolstoel')) && 
                (line.includes('€') || line.includes('EUR')) &&
                line.length < 100 && line.length > 10) {
              const parts = line.split(/€|EUR/);
              if (parts.length >= 2) {
                productName = parts[0].trim();
                const priceMatch = line.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|EUR)/);
                if (priceMatch) {
                  price = `€${priceMatch[1]}`;
                }
              }
              break;
            }
          }
        }
        
        // Verbeterde beschrijving
        if (content.includes('Lichtgewicht')) description += 'Lichtgewicht ';
        if (content.includes('Manuele')) description += 'Manuele ';
        if (content.includes('Elektrische')) description += 'Elektrische ';
        description += 'rolstoel - Verkrijgbaar bij Helan Zorgwinkel';
        
        return {
          name: productName,
          url: item.url,
          price: price,
          description: description || extractShortDescription(content) || 'Rolstoel beschikbaar via Helan Zorgwinkel'
        };
      });

    console.log('Product links being returned:', productLinks.map(p => ({
      name: p.name,
      url: p.url,
      price: p.price
    })));

    return productLinks;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}
export async function getProductDetails(
  productName: string,
): Promise<ScrapedContent[]> {
  try {
    console.log(`Getting product details for: ${productName}`);
    const results = await storage.searchScrapedContent(productName);

    // Look for specific product pages
    const productDetails = results.filter(
      (item) =>
        item.url.includes("helanzorgwinkel.be") &&
        item.content.toLowerCase().includes(productName.toLowerCase()),
    );

    return productDetails.slice(0, 5);
  } catch (error) {
    console.error("Error getting product details:", error);
    return [];
  }
}

export async function searchServices(category: string): Promise<Service[]> {
  try {
    console.log(`Searching services for category: ${category}`);
    const services = await storage.getServicesByCategory(category);
    return services.slice(0, 10);
  } catch (error) {
    console.error("Error searching services:", error);
    return [];
  }
}

export async function getContactInfo(
  department: string,
): Promise<ScrapedContent[]> {
  try {
    console.log(`Getting contact info for: ${department}`);
    const contactQuery = `contact ${department}`;
    const results = await storage.searchScrapedContent(contactQuery);

    // Filter for contact-related content
    const contactResults = results.filter(
      (item) =>
        item.content.toLowerCase().includes("contact") ||
        item.content.toLowerCase().includes("telefoon") ||
        item.content.toLowerCase().includes("email") ||
        item.content.toLowerCase().includes("0800"),
    );

    return contactResults.slice(0, 5);
  } catch (error) {
    console.error("Error getting contact info:", error);
    return [];
  }
}

// Function router - calls the appropriate function based on name
export async function executeFunction(name: string, args: any): Promise<any> {
  switch (name) {
    case "search_products":
      return await searchProducts(args.query);
    case "get_product_details":
      return await getProductDetails(args.productName);
    case "search_services":
      return await searchServices(args.category);
    case "get_contact_info":
      return await getContactInfo(args.department);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

