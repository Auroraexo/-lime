
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { EmailCampaign, ImageSize } from "../types";

// Create a helper to get fresh AI instance (especially for key changes)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCampaignContent = async (prompt: string): Promise<EmailCampaign> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate an email marketing campaign based on this prompt: "${prompt}". 
               Include multiple creative subject lines, a persuasive body copy, a strong CTA, and a detailed image prompt for a visual asset.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjectLines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of catchy subject lines"
          },
          bodyCopy: {
            type: Type.STRING,
            description: "The main content of the email"
          },
          cta: {
            type: Type.STRING,
            description: "Call to action text"
          },
          imagePrompt: {
            type: Type.STRING,
            description: "A descriptive prompt for an AI image generator to create a header image for this email"
          }
        },
        required: ["subjectLines", "bodyCopy", "cta", "imagePrompt"]
      }
    }
  });

  try {
    const text = response.text || '{}';
    return JSON.parse(text.trim()) as EmailCampaign;
  } catch (e) {
    throw new Error("Failed to parse campaign content from AI response.");
  }
};

export const generateImage = async (prompt: string, size: ImageSize): Promise<string> => {
  const ai = getAI();
  
  // Use gemini-2.5-flash-image for Standard quality, 
  // and gemini-3-pro-image-preview for high quality (1K, 2K, 4K)
  const isProModel = size !== 'Standard';
  const model = isProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const config: any = {
    imageConfig: {
      aspectRatio: "16:9"
    }
  };

  // imageSize is only supported by the Pro model
  if (isProModel) {
    config.imageConfig.imageSize = size;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: prompt }]
    },
    config: config
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => !!p.inlineData);
  if (part && part.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("No image was generated.");
};

export const createChatSession = (): Chat => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are an expert marketing consultant. Help the user refine their email campaigns, offer copywriting tips, and suggest design improvements.'
    }
  });
};
