import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { GroundingChunk, Business, WhatsAppCheckResult, RankingResult, KeywordRank } from '../types';
import { UserLocation, ScrapeResult } from '../types';

const PAGE_SIZE = 100;

export async function fetchBusinessData(
  query: string,
  location: UserLocation | null,
  isDeepDive: boolean,
  page: number = 1
): Promise<ScrapeResult> {
    
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    if (isDeepDive) {
        const prompt = `
            Act as a world-class business intelligence analyst. Your critical task is to conduct an exhaustive deep scrape of a specific business from the user's query and return a complete and accurate dataset in the specified JSON format.

            1.  **Identify the Business:**
                *   Analyze the user's query to identify the exact business name and its location: "${query}".

            2.  **Gather Comprehensive Data (Exhaustive Search Required):**
                *   You must scour all available public online sources, including Google Maps, the business's official website, all official social media profiles (Facebook, Instagram, LinkedIn, Twitter/X, YouTube, etc.), news articles, and business directories to find the following information. Be relentless in your search.
                *   **Business Name:** The official name.
                *   **Category:** The primary business category (e.g., "Italian Restaurant", "Software Company").
                *   **Address:** The full physical address.
                *   **Phone Number:** The main contact number, formatted in E.164 international format (e.g., +14155552671).
                *   **Website:** The full URL of the official business website. If not found, return an empty string "".
                *   **Total Reviews:** The total count of Google Maps reviews as a number (e.g., 1234). If not found, return null.
                *   **Recent Review Reply Date:** Find the date of the absolute most recent public reply made by the business owner to any Google Review. Format as "YYYY-MM-DD". If no replies can be found, you MUST return the string "No recent replies".
                *   **Company Owner Name:** The name of the primary owner, CEO, or founder, if publicly available. If this information cannot be found, you MUST return the string "Not publicly available".
                *   **Owner's Social Media:** A list of full URLs for the owner's public social media profiles (especially LinkedIn and Twitter/X). If none are found, you MUST return an empty array [].
                *   **Company Social Media:** A list of full URLs for ALL official company social media profiles (Facebook, Instagram, LinkedIn, Twitter/X, YouTube, etc.). If none are found, you MUST return an empty array [].
                *   **Description:** A brief, one-paragraph summary of the business's operations, products, or services.

            3.  **Format the Output (Strict Adherence Required):**
                *   You MUST return a single, valid JSON object containing the gathered data.
                *   Do not include any introductory text, explanations, apologies, or markdown formatting outside of the JSON object. Your entire response must be ONLY the JSON object itself.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The official business name." },
                        category: { type: Type.STRING, description: "The primary business category." },
                        address: { type: Type.STRING, description: "The full physical address." },
                        phone: { type: Type.STRING, description: "The main contact number in E.164 format." },
                        website: { type: Type.STRING, description: "The full URL of the official website." },
                        reviewCount: { type: Type.NUMBER, description: "The total count of Google Maps reviews as a number." },
                        recentReviewReplyDate: { type: Type.STRING, description: "Date of the most recent review reply (YYYY-MM-DD) or 'No recent replies'." },
                        ownerName: { type: Type.STRING, description: "The name of the company owner, or 'Not publicly available'." },
                        ownerSocialMedia: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of URLs for the owner's social media profiles. Can be an empty array."
                        },
                        companySocialMedia: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of URLs for official company social media profiles. Can be an empty array."
                        },
                        description: { type: Type.STRING, description: "A brief description of the business." }
                    },
                }
            }
        });
        
        try {
            const business: Business = JSON.parse(response.text);
            return { text: '', sources: [], businesses: [business] };
        } catch (e) {
            console.error("Failed to parse JSON response for deep dive:", e);
            return { text: "Error: Could not parse the deep dive data. The model's response might be malformed. The raw response is provided below.\n\n" + response.text, sources: [] };
        }

    } else {
      const config: any = {
        tools: [{ googleMaps: {} }],
      };
      if (location) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
        };
      }
      const prompt = `Find and list up to ${PAGE_SIZE} businesses based on the query: "${query}". For each business, provide its name, address, phone number, a brief description, its star rating, and the total number of reviews. This is page ${page} of the results. It is crucial that you provide different businesses than you would for other pages. The phone number MUST be in E.164 international format (e.g., +14155552671), with no spaces, parentheses, or dashes. Respond ONLY with a valid JSON array of objects. Each object must have keys: "name", "address", "phone", "description", "rating" (as a number, e.g., 4.5), and "reviewCount" (as a number, e.g., 125). Do not include any introductory text, markdown formatting, or code fences. If no more new results can be found, return an empty array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: config,
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];
      
      try {
        const arrayMatch = response.text.match(/(\[[\s\S]*\])/);

        if (!arrayMatch) {
            console.warn("No JSON array found in the response text.");
            return { 
                text: "Error: No valid business data was returned. The model may have provided a text-based answer instead. See raw response below.\n\n" + response.text, 
                sources: sources 
            };
        }
        
        const businesses: Business[] = JSON.parse(arrayMatch[0]);
        const cleanedBusinesses = businesses.map(business => ({
            ...business,
            phone: business.phone ? String(business.phone).replace(/[\s\(\)-]/g, '') : '',
        }));

        return { text: '', sources, businesses: cleanedBusinesses };
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        return { text: "Error: Could not parse the data into a table. The raw response is provided below.\n\n" + response.text, sources: sources };
      }
    }

  } catch (error) {
    console.error("Error fetching data from Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to retrieve business data. Please check your query or try again later. (Details: ${error.message})`);
    }
    throw new Error("An unknown error occurred while fetching business data.");
  }
}


export async function checkWhatsAppStatus(phoneNumber: string): Promise<WhatsAppCheckResult> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the E.164 formatted phone number ${phoneNumber}. Determine if there is public evidence (e.g., on websites, social media) that it is associated with a WhatsApp or WhatsApp Business account. Respond ONLY with a valid JSON object matching the required schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { 
              type: Type.STRING,
              enum: ['Likely Active', 'Likely Inactive', 'Unknown'],
              description: "The likelihood of the number being on WhatsApp."
            },
            reason: { 
              type: Type.STRING,
              description: "A brief reason for the classification."
            }
          },
          required: ["status", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text) as WhatsAppCheckResult;
    return result;

  } catch (error) {
    console.error("Error checking WhatsApp status:", error);
     if (error instanceof Error) {
        if (error.message.includes('JSON')) {
            throw new Error('Verification failed: The AI returned an invalid or unexpected response. Please try again.');
        }
        throw new Error(`Verification failed due to an API error. Please try again later. (Details: ${error.message})`);
    }
    throw new Error('An unknown error occurred during WhatsApp status verification.');
  }
}

export async function checkBusinessRanking(
    businessName: string,
    websitePhone: string,
    keyword: string,
    location: string
): Promise<RankingResult> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        if (keyword && keyword.trim() !== '') {
            // Mode 1: Check rank for a specific keyword and discover related ones
            const prompt = `
                Act as a local SEO analyst. Your task is to find a business's rank on Google Maps for a primary keyword, discover related ranking keywords, and provide a screenshot.

                1.  **Business and Location:**
                    *   Business Name: "${businessName}"
                    *   Identifying Info: "${websitePhone}"
                    *   Location: "${location}"
                    *   Primary Keyword: "${keyword}"

                2.  **Primary Keyword Rank:**
                    *   Simulate a Google Maps search for the **primary keyword** in the specified location.
                    *   Analyze the top 50 results to find the exact rank of the target business.

                3.  **Discover Related Keywords:**
                    *   Perform a supplementary analysis to discover up to 10 additional, relevant keywords for which this business also ranks in the top 50 in the same location.
                    *   For each discovered keyword, determine its search rank.

                4.  **Format the Text Output (Strict Adherence Required):**
                    *   The **very first line** of your text output MUST be the rank for the primary keyword. It should be a number (e.g., "3") or the text "Not Found". Do not add any other words on this line.
                    *   Starting on the second line, list each discovered keyword and its rank, one per line, using the format: \`keyword :: rank\`.
                    *   If no related keywords are found, only output the primary rank on the first line.
                    *   **Example Output:**
                        3
                        pizza delivery near me :: 5
                        best italian food in ${location} :: 8
                        late night pizza :: 12

                5.  **Generate Screenshot:**
                    *   Generate a realistic screenshot of the Google Maps search results page for the **primary keyword** search.
                    *   If the target business was found, visually highlight it in the screenshot.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const textResponse = response.text ? response.text.trim() : '';
            const lines = textResponse.split('\n').map(l => l.trim()).filter(Boolean);

            const rank = lines.length > 0 ? lines[0] : 'Not Provided';
            const discoveredRanks: KeywordRank[] = [];

            if (lines.length > 1) {
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split('::').map(p => p.trim());
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        discoveredRanks.push({ keyword: parts[0], rank: parts[1] });
                    }
                }
            }

            let imageUrl: string | null = null;
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    break;
                }
            }
            
            if (!rank && !imageUrl && discoveredRanks.length === 0) {
                 throw new Error("The model did not return a rank, screenshot, or any keywords. Please try a more specific query.");
            }

            return { rank, imageUrl, discoveredRanks: discoveredRanks.length > 0 ? discoveredRanks : null };

        } else {
            // Mode 2: Discover top ranking keywords
            const prompt = `
                Act as a local SEO analyst. Your task is to perform an exhaustive discovery of all possible ranking keywords for a business on Google Maps.

                1.  **Identify the Business:**
                    *   Find the business named "${businessName}" on Google Maps in the location "${location}".
                    *   An identifying detail might be its website or phone: "${websitePhone}".

                2.  **Discover All Ranking Keywords:**
                    *   Perform a deep and comprehensive analysis of the local search landscape for this business. Search as deep as possible.
                    *   Your goal is to identify as many relevant keywords as possible for which this business appears in Google Maps search results, regardless of its ranking position.
                    *   Brainstorm a wide variety of search terms, including long-tail keywords, service-specific queries, and location-based searches.
                    *   For each discovered keyword, determine its search rank (the numerical position). If the rank is very low (e.g., outside the top 200), you can state it as ">200". Be thorough and do not stop at the first few pages of results.

                3.  **Format the Output:**
                    *   You MUST return a valid JSON array of objects.
                    *   Each object in the array should represent a keyword and must have two keys: "keyword" (the search term) and "rank" (the position as a string, e.g., "5", ">50", or ">200").
                    *   Return a comprehensive list. Aim for a large quantity of results, including keywords with very low rankings (e.g., 50+, 100+, >200). The goal is to get a complete picture of the business's search footprint.
                    *   If no ranking keywords can be found, return an empty array.
                    *   Do not include any other text, explanations, or markdown formatting outside of the JSON array.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                keyword: { type: Type.STRING, description: "The search term the business ranks for." },
                                rank: { type: Type.STRING, description: "The numerical rank/position for the keyword, e.g., '5', '>50', or '>200'." }
                            },
                            required: ["keyword", "rank"]
                        }
                    }
                }
            });

            const discoveredRanks = JSON.parse(response.text) as KeywordRank[];
            return { rank: null, imageUrl: null, discoveredRanks };
        }

    } catch (error) {
        console.error("Error checking business ranking:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to check ranking. The model may have had an issue generating the response. (Details: ${error.message})`);
        }
        throw new Error("An unknown error occurred while checking the business ranking.");
    }
}