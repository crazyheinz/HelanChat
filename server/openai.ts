import OpenAI from "openai";
import type { ScrapedContent, Service, Message } from "@shared/schema";
import { functionDefinitions, executeFunction } from './functions';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserProfile {
  age?: string;
  livingSituation?: string;
  needs?: string[];
  language?: string;
  isZFMember?: boolean;
}

interface ChatContext {
  userMessage: string;
  conversationHistory: Message[];
  userProfile?: UserProfile;
  scrapedContent: ScrapedContent[];
  services: Service[];
  language: string;
}

interface ServiceRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  priceFrom?: string;
  priceUnit?: string;
  isHelanService: boolean;
  relevanceScore: number;
  image?: string;
}

interface ProductLink {
  name: string;
  url: string;
  price?: string;
  description?: string;
}

interface ChatResponse {
  content: string;
  metadata?: {
    recommendations?: ServiceRecommendation[];
    showActions?: boolean;
    conversationType?: string;
    productLinks?: ProductLink[];
  };
}

export async function generateChatResponse(context: ChatContext): Promise<ChatResponse> {
  try {
    console.log("Generating chat response for:", context.userMessage);
    
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Build context for the AI
    const systemPrompt = buildSystemPrompt(context.language);
    const userContext = buildUserContext(context);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `
Context: ${userContext}

Recent conversation history:
${context.conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

User message: ${context.userMessage}

Please analyze this user message and determine if you need to search for specific information using the available functions:
- searchProducts: for finding specific products or medical equipment
- getProductDetails: for getting detailed information about a specific product
- searchServices: for finding healthcare services by category
- getContactInfo: for finding contact information for specific departments

Respond naturally in ${context.language === 'nl' ? 'Dutch' : context.language === 'fr' ? 'French' : 'English'} and use functions when needed to provide accurate, up-to-date information.
      ` }
    ];

    console.log("Calling OpenAI API with function calling...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      functions: functionDefinitions,
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 1500,
    });

    const choice = response.choices[0];
    
    // Check if GPT wants to call a function
    if (choice.message.function_call) {
      const functionName = choice.message.function_call.name;
      const functionArgs = JSON.parse(choice.message.function_call.arguments);
      
      console.log(`GPT called function: ${functionName} with args:`, functionArgs);
      
      // Execute the function
      const functionResult = await executeFunction(functionName, functionArgs);
      
      // Add function result to conversation and get final response
      const updatedMessages = [
        ...messages,
        choice.message,
        {
          role: "function" as const,
          name: functionName,
          content: JSON.stringify(functionResult)
        }
      ];
      
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...updatedMessages,
          {
            role: "system" as const,
            content: `You are a helpful Helan healthcare assistant. Based on the search results provided, create a comprehensive response in Dutch about the products/services found.

CRITICAL INSTRUCTIONS:
- CRITICAL: Use *ONLY* the data provided in the function call results. Do not infer or add external information.
- Extract specific product information, prices, and URLs from the actual search results
- If search results contain product information, present it clearly
- If the function call results are empty or do not contain the specific details requested (e.g., a price for a specific product), clearly state that this information was not found in the search. Do not invent details.
- When presenting product information, ensure the product name, description, price, and URL are taken *directly* from the `productLinks` array in the function result.
- Always include the Helan Zorgwinkel link: https://www.helanzorgwinkel.be
- Mention that Helan customers get 10% discount when this information appears in search results

Format as JSON:
{
  "content": "Detailed Dutch response with authentic product information from search results",
  "showActions": true,
  "productLinks": [
    {
      "name": "Exact product name from search results",
      "url": "Exact URL from search results",
      "price": "Exact price if mentioned in results",
      "description": "Exact description from search results"
    }
  ]
}

Be professional and helpful. Guide users to appropriate next steps based on the actual search results provided.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const finalContent = finalResponse.choices[0].message.content;
      if (!finalContent) {
        throw new Error("No final response from OpenAI");
      }
      
      const parsedResponse = JSON.parse(finalContent);
      console.log("Successfully parsed JSON response");

      return {
        content: parsedResponse.content || "Dank u voor uw vraag. Ik help u graag verder.",
        metadata: {
          recommendations: parsedResponse.recommendations || [],
          showActions: parsedResponse.showActions || false,
          conversationType: determineConversationType(context.userMessage),
          productLinks: parsedResponse.productLinks || []
        },
      };
    } else {
      // No function call needed, return direct response
      const aiResponse = choice.message.content;
      if (!aiResponse) {
        throw new Error("No response from AI");
      }
      
      return {
        content: aiResponse,
        metadata: {
          showActions: false,
          conversationType: "general"
        }
      };
    }
  } catch (error) {
    console.error("Function calling error:", error);
    return {
      content: "Dank u voor uw vraag. Ik verbind u graag door met een zorgconsulent die u persoonlijk kan helpen. U kunt ook bellen naar ons gratis nummer 0800 880 80.",
      metadata: {
        showActions: true,
        conversationType: "error"
      }
    };
  }
}

export async function analyzeUserProfile(profile: UserProfile): Promise<{
  analysis: string;
  recommendedCategories: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a healthcare consultant analyzing user profiles to recommend appropriate care categories. Respond in JSON format."
        },
        {
          role: "user",
          content: `Analyze this user profile and recommend care categories: ${JSON.stringify(profile)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      analysis: result.analysis || "Profile analyzed successfully",
      recommendedCategories: result.recommendedCategories || []
    };
  } catch (error) {
    console.error("Error analyzing user profile:", error);
    return {
      analysis: "Unable to analyze profile at this time",
      recommendedCategories: []
    };
  }
}

function buildSystemPrompt(language: string): string {
  return `You are a helpful healthcare assistant for Helan, a Belgian healthcare provider. You have access to real-time information about healthcare services, products, and contact details through function calls.

Key guidelines:
- Always use functions to get accurate, up-to-date information
- CRITICAL: Base your responses *exclusively* on the information returned by function calls. Do not add information not present in the function results. If function results are empty or lack detail, clearly state that the specific information could not be found.
- Provide specific product information with prices and links when available
- Maintain a professional, caring tone
- Respond in ${language === 'nl' ? 'Dutch' : language === 'fr' ? 'French' : 'English'}
- When using functions, format the final response as JSON with appropriate metadata

For product inquiries, always include:
- Use *exact* product names, descriptions, pricing information, and direct website links *as provided by the search functions*.
- Availability information

When no specific information is found, guide users to appropriate contact methods or the general website.`;
}

function buildUserContext(context: ChatContext): string {
  let userContext = `User asking about: ${context.userMessage}`;
  
  if (context.userProfile) {
    userContext += `\nUser profile: ${JSON.stringify(context.userProfile)}`;
  }
  
  return userContext;
}

function determineConversationType(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('prijs') || message.includes('kost') || message.includes('price')) {
    return 'pricing';
  }
  if (message.includes('product') || message.includes('artikel') || message.includes('bestellen')) {
    return 'product';
  }
  if (message.includes('service') || message.includes('dienst') || message.includes('hulp')) {
    return 'service';
  }
  if (message.includes('contact') || message.includes('bellen') || message.includes('afspraak')) {
    return 'contact';
  }
  
  return 'general';
}

export async function generateServiceRecommendations(
  userProfile: UserProfile,
  userMessage: string,
  availableServices: Service[]
): Promise<ServiceRecommendation[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a healthcare service recommendation engine. Analyze user needs and recommend relevant services with relevance scores. Respond in JSON format."
        },
        {
          role: "user",
          content: `
User profile: ${JSON.stringify(userProfile)}
User message: ${userMessage}
Available services: ${JSON.stringify(availableServices.slice(0, 20))}

Recommend the most relevant services with relevance scores (0-1).
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const recommendations = result.recommendations || [];

    return recommendations.map((rec: any) => {
      const matchingService = availableServices.find(s => s.id === rec.id || s.name.toLowerCase().includes(rec.name?.toLowerCase()));
      
      if (matchingService) {
        return {
          id: matchingService.id,
          name: matchingService.name,
          description: rec.description || matchingService.description || '',
          category: matchingService.category,
          priceFrom: matchingService.priceFrom,
          priceUnit: matchingService.priceUnit,
          isHelanService: matchingService.isHelanService,
          relevanceScore: rec.relevanceScore || 0.8,
        };
      }
      
      return {
        id: `rec-${Date.now()}`,
        name: rec.name || 'Onbekende service',
        description: rec.description || '',
        category: 'algemeen',
        relevanceScore: rec.relevanceScore || 0.8,
        isHelanService: true
      };
    });
  } catch (error) {
    console.error("Error generating service recommendations:", error);
    return [];
  }
}