import OpenAI from "openai";
import type { ScrapedContent, Service, Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET_KEY || "default_key",
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

interface ChatResponse {
  content: string;
  metadata?: {
    recommendations?: ServiceRecommendation[];
    showActions?: boolean;
    conversationType?: string;
  };
}

export async function generateChatResponse(context: ChatContext): Promise<ChatResponse> {
  try {
    // Build context for the AI
    const systemPrompt = buildSystemPrompt(context.language);
    const userContext = buildUserContext(context);
    const serviceContext = buildServiceContext(context.services, context.scrapedContent);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `
Context: ${userContext}

Available Services: ${serviceContext}

Recent conversation history:
${context.conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

User message: ${context.userMessage}

Please provide a helpful response in ${context.language === 'nl' ? 'Dutch' : context.language === 'fr' ? 'French' : 'English'} that:
1. Addresses the user's specific question or need
2. Recommends relevant services when appropriate
3. Provides specific cost information when available
4. Maintains Helan's professional and caring tone
5. Includes practical next steps

If recommending services, please format your response as JSON with this structure:
{
  "content": "Your response text",
  "recommendations": [
    {
      "id": "service_id",
      "name": "Service Name",
      "description": "Service description",
      "category": "category_name",
      "priceFrom": "price",
      "priceUnit": "unit",
      "isHelanService": true/false,
      "relevanceScore": 0.8
    }
  ],
  "showActions": true/false
}
      ` }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = response.choices[0].message.content;
    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      // Ensure we have valid recommendations with proper service mapping
      if (parsedResponse.recommendations) {
        parsedResponse.recommendations = parsedResponse.recommendations.map((rec: any) => {
          const matchingService = context.services.find(s => 
            s.name.toLowerCase().includes(rec.name.toLowerCase()) ||
            rec.name.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (matchingService) {
            return {
              ...matchingService,
              relevanceScore: rec.relevanceScore || 0.8,
              description: rec.description || matchingService.description,
            };
          }
          
          return rec;
        });
      }

      return {
        content: parsedResponse.content,
        metadata: {
          recommendations: parsedResponse.recommendations || [],
          showActions: parsedResponse.showActions || false,
          conversationType: determineConversationType(context.userMessage),
        },
      };
    } catch (parseError) {
      // Fallback to plain text response if JSON parsing fails
      return {
        content: aiResponse,
        metadata: {
          showActions: false,
          conversationType: determineConversationType(context.userMessage),
        },
      };
    }

  } catch (error) {
    console.error("Error generating chat response:", error);
    
    // Fallback response in case of error
    const fallbackMessage = context.language === 'nl' 
      ? "Excuses voor de technische storing. Ik verbind u graag door met een zorgconsulent die u persoonlijk kan helpen. U kunt ook bellen naar ons gratis nummer 0800 880 80."
      : context.language === 'fr'
      ? "Excusez-nous pour le problème technique. Je vous mets volontiers en contact avec un consultant en soins qui peut vous aider personnellement. Vous pouvez également appeler notre numéro gratuit 0800 880 80."
      : "Apologies for the technical issue. I'd be happy to connect you with a care consultant who can help you personally. You can also call our free number 0800 880 80.";

    return {
      content: fallbackMessage,
      metadata: {
        showActions: true,
        conversationType: "error",
      },
    };
  }
}

export async function analyzeUserProfile(profile: UserProfile): Promise<{
  analysis: string;
  recommendedCategories: string[];
  priorityLevel: 'low' | 'medium' | 'high';
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a healthcare needs analyzer for Helan. Analyze user profiles and provide care recommendations in JSON format.`,
        },
        {
          role: "user",
          content: `Analyze this user profile:
Age: ${profile.age}
Living situation: ${profile.livingSituation}
Identified needs: ${profile.needs?.join(', ')}
Language: ${profile.language}

Provide analysis in JSON format:
{
  "analysis": "Brief analysis of user's situation and primary care needs",
  "recommendedCategories": ["category1", "category2"],
  "priorityLevel": "low/medium/high"
}

Categories can include: thuiszorg, huishoudelijke_hulp, sociale_ondersteuning, medische_zorg, woningaanpassingen, emergency_support`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysisResult = response.choices[0].message.content;
    if (!analysisResult) {
      throw new Error("No analysis result from AI");
    }

    return JSON.parse(analysisResult);
  } catch (error) {
    console.error("Error analyzing user profile:", error);
    
    // Fallback analysis
    const priorityLevel = 
      profile.age === '80+' || profile.needs?.includes('medical_care') ? 'high' :
      profile.age === '66-80' || profile.needs?.includes('daily_care') ? 'medium' : 'low';

    return {
      analysis: "Based on your profile, we recommend exploring our care services to support your independence at home.",
      recommendedCategories: profile.needs?.slice(0, 3) || ['thuiszorg'],
      priorityLevel,
    };
  }
}

function buildSystemPrompt(language: string): string {
  const prompts = {
    nl: `Je bent een professionele zorgassistent voor Helan, een toonaangevende zorgverzekeringmaatschappij in België. Je helpt klanten bij het vinden van passende zorgdiensten en ondersteuning voor langer zelfstandig thuis wonen.

Jouw rol:
- Vriendelijk, professioneel en empathisch
- Expert in Helan's zorgdiensten en producten
- Gefocust op klantenservice en persoonlijke begeleiding
- Spreekt de klant altijd aan met "u"

Belangrijke principes:
- Geef altijd accurate informatie gebaseerd op de beschikbare diensten
- Vermeld kosten en terugbetalingen wanneer relevant
- Bied concrete vervolgstappen aan (afspraak, calculator, contactgegevens)
- Verwijs door naar zorgconsulenten voor complexe vragen
- Respecteer privacy en GDPR-richtlijnen

Tone of voice: Warm, professioneel, betrouwbaar en ondersteunend`,

    fr: `Vous êtes un assistant de soins professionnel pour Helan, une compagnie d'assurance soins de premier plan en Belgique. Vous aidez les clients à trouver des services de soins appropriés et un soutien pour vivre de manière autonome à domicile plus longtemps.

Votre rôle:
- Amical, professionnel et empathique
- Expert en services et produits de soins Helan
- Axé sur le service client et l'accompagnement personnel
- Toujours vouvoyer le client

Principes importants:
- Toujours donner des informations précises basées sur les services disponibles
- Mentionner les coûts et remboursements quand pertinent
- Offrir des étapes de suivi concrètes (rendez-vous, calculatrice, coordonnées)
- Référer aux consultants en soins pour les questions complexes
- Respecter la vie privée et les directives GDPR

Ton: Chaleureux, professionnel, fiable et solidaire`,

    en: `You are a professional care assistant for Helan, a leading healthcare insurance company in Belgium. You help customers find appropriate care services and support for living independently at home longer.

Your role:
- Friendly, professional and empathetic
- Expert in Helan's care services and products
- Focused on customer service and personal guidance
- Always address customers formally

Important principles:
- Always provide accurate information based on available services
- Mention costs and reimbursements when relevant
- Offer concrete next steps (appointment, calculator, contact details)
- Refer to care consultants for complex questions
- Respect privacy and GDPR guidelines

Tone of voice: Warm, professional, trustworthy and supportive`
  };

  return prompts[language as keyof typeof prompts] || prompts.nl;
}

function buildUserContext(context: ChatContext): string {
  if (!context.userProfile) {
    return "No user profile available. This is a new conversation.";
  }

  const profile = context.userProfile;
  return `User Profile:
- Age: ${profile.age || 'Not specified'}
- Living situation: ${profile.livingSituation || 'Not specified'}
- Care needs: ${profile.needs?.join(', ') || 'Not specified'}
- ZF Member: ${profile.isZFMember !== false ? 'Yes' : 'No'}
- Language: ${profile.language || 'Dutch'}`;
}

function buildServiceContext(services: Service[], scrapedContent: ScrapedContent[]): string {
  // Limit context to most relevant services
  const limitedServices = services.slice(0, 15);
  
  const serviceList = limitedServices.map(service => {
    const price = service.priceFrom ? `€${service.priceFrom}/${service.priceUnit || 'month'}` : 'On request';
    return `- ${service.name} (${service.category}): ${service.description} - ${price} ${service.isHelanService ? '[Helan Service]' : '[Partner Service]'}`;
  }).join('\n');

  // Add relevant scraped content context
  const relevantContent = scrapedContent
    .filter(content => content.title && content.content.length > 50)
    .slice(0, 5)
    .map(content => `${content.title}: ${content.content.substring(0, 200)}...`)
    .join('\n');

  return `Available Services:\n${serviceList}\n\nAdditional Information:\n${relevantContent}`;
}

function determineConversationType(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('kost') || message.includes('prijs') || message.includes('betalen')) {
    return 'cost_inquiry';
  }
  if (message.includes('afspraak') || message.includes('contact') || message.includes('bellen')) {
    return 'appointment_request';
  }
  if (message.includes('thuiszorg') || message.includes('verzorg')) {
    return 'home_care_inquiry';
  }
  if (message.includes('huishoud') || message.includes('schoonma')) {
    return 'household_help_inquiry';
  }
  if (message.includes('social') || message.includes('activiteit') || message.includes('eenzaam')) {
    return 'social_support_inquiry';
  }
  if (message.includes('woning') || message.includes('aanpass') || message.includes('veilig')) {
    return 'home_modification_inquiry';
  }
  
  return 'general_inquiry';
}

// Helper function to generate personalized service recommendations
export async function generateServiceRecommendations(
  userProfile: UserProfile,
  availableServices: Service[]
): Promise<ServiceRecommendation[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a care service recommendation engine. Match user profiles to appropriate services and rank them by relevance.",
        },
        {
          role: "user",
          content: `User Profile:
Age: ${userProfile.age}
Living: ${userProfile.livingSituation}
Needs: ${userProfile.needs?.join(', ')}

Available Services:
${availableServices.map(s => `${s.id}: ${s.name} - ${s.category} - ${s.description}`).join('\n')}

Recommend the top 4 most relevant services in JSON format:
{
  "recommendations": [
    {
      "id": "service_id",
      "relevanceScore": 0.9,
      "reasoning": "why this service is relevant"
    }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recommendations":[]}');
    
    return result.recommendations
      .map((rec: any) => {
        const service = availableServices.find(s => s.id === rec.id);
        if (!service) return null;
        
        return {
          ...service,
          relevanceScore: rec.relevanceScore || 0.5,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

  } catch (error) {
    console.error("Error generating service recommendations:", error);
    
    // Fallback: simple category-based matching
    const needCategoryMap: Record<string, string[]> = {
      'daily_care': ['thuiszorg', 'medische_zorg'],
      'household_help': ['huishoudelijke_hulp'],
      'medical_care': ['medische_zorg', 'thuiszorg'],
      'social_contacts': ['sociale_ondersteuning'],
      'transport': ['sociale_ondersteuning'],
      'home_modifications': ['woningaanpassingen'],
      'emergency_support': ['thuiszorg', 'medische_zorg'],
    };

    const relevantCategories = userProfile.needs?.flatMap(need => needCategoryMap[need] || []) || [];
    
    return availableServices
      .filter(service => relevantCategories.includes(service.category))
      .slice(0, 4)
      .map(service => ({
        ...service,
        relevanceScore: 0.7,
      }));
  }
}
