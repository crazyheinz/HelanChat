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

    const purchaseKeywords = ["kopen", "bestellen", "shop", "prijs", "huren"];
    const isPurchaseQuery = purchaseKeywords.some(keyword => query.toLowerCase().includes(keyword));

    let productResults = results.filter(item => {
      const lowerCaseUrl = item.url.toLowerCase();
      if (isPurchaseQuery) {
        return lowerCaseUrl.includes("helanzorgwinkel.be");
      }
      return lowerCaseUrl.includes("helanzorgwinkel.be") || lowerCaseUrl.includes("helan.be");
    });

    productResults.sort((a, b) => {
      const aIsZorgwinkel = a.url.toLowerCase().includes("helanzorgwinkel.be");
      const bIsZorgwinkel = b.url.toLowerCase().includes("helanzorgwinkel.be");
      const aHasPrice = extractPrice(a.content) !== undefined;
      const bHasPrice = extractPrice(b.content) !== undefined;

      if (aIsZorgwinkel && !bIsZorgwinkel) return -1;
      if (!aIsZorgwinkel && bIsZorgwinkel) return 1;
      if (aHasPrice && !bHasPrice) return -1;
      if (!aHasPrice && bHasPrice) return 1;
      // If relevance from searchScrapedContent is not enough, add more sorting logic here
      return 0;
    });

    console.log(`Filtered to ${productResults.length} product results after initial filtering and sorting`);

    if (productResults.length === 0) {
      return [];
    }

    const productLinks: ProductLink[] = productResults
      .slice(0, 5) // Take top 5 results
      .map((item) => {
        const productName = item.title || query; // Default to query if title is missing
        const price = extractPrice(item.content);
        let description = "";

        // Try to find a more specific description
        // Look for sentences near the query term or price. This is a simple heuristic.
        const sentences = item.content.split('.');
        let foundSpecificDesc = false;
        for (const sentence of sentences) {
          const lowerSentence = sentence.toLowerCase();
          if (lowerSentence.includes(query.toLowerCase()) || (price && lowerSentence.includes(price.split(' ')[0]))) {
            description = sentence.trim();
            if (description.length > 30) { // Ensure it's a meaningful sentence
              foundSpecificDesc = true;
              break;
            }
          }
        }

        if (!foundSpecificDesc) {
          const shortDesc = extractShortDescription(item.content);
          description = shortDesc ? `Informatie over: ${shortDesc}` : `Meer informatie over ${productName}`;
        }
        
        if (item.url.toLowerCase().includes("helanzorgwinkel.be")) {
          description += " (Beschikbaar bij Helan Zorgwinkel)";
        } else if (item.url.toLowerCase().includes("helan.be")) {
          description += " (Informatie van Helan)";
        }


        return {
          name: productName,
          url: item.url,
          price: price,
          description: description,
        };
      });

    console.log('Product links being returned:', productLinks.map(p => ({
      name: p.name,
      url: p.url,
      price: p.price,
      description: p.description
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

