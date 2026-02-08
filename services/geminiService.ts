import { GoogleGenAI, Type } from "@google/genai";
import { Caption } from "../types";

// Ensure the user has selected an API key via AI Studio or Env Var
export const ensureApiKey = async (): Promise<boolean> => {
  // Priority 1: Environment Variable (Vercel / .env)
  if (process.env.API_KEY) return true;

  // Priority 2: IDX / AI Studio Internal Environment
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try {
          await window.aistudio.openSelectKey();
      } catch (e) {
          console.error("Key selection dismissed or failed", e);
      }
    }
    return await window.aistudio.hasSelectedApiKey(); 
  }
  
  return false;
};

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const transcribeVideo = async (videoFile: File): Promise<Caption[]> => {
  const hasKey = await ensureApiKey();
  
  if (!hasKey && !process.env.API_KEY) {
     throw new Error("Google Gemini API Key is missing. Please set it in your environment variables to use the AI features.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const videoPart = await fileToGenerativePart(videoFile);
    
    // Using Gemini 3 Flash Preview for better transcription accuracy
    const prompt = `
      Analyze the audio and generate "Hinglish" subtitles (Hindi in English script).
      Rules:
      1. Max 3-4 words per segment.
      2. Capture every spoken word accurately.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [videoPart, { text: prompt }]
      },
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              text: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate captions");
    
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
    
  } catch (error: any) {
    console.error("Transcription failed", error);
    throw new Error(`Transcription failed: ${error.message || "Unknown error"}`);
  }
};

export const generateEnhancedPrompt = async (userInput: string, stylePrompt: string): Promise<{ visualPrompt: string; hinglishCaption: string }> => {
  const hasKey = await ensureApiKey();
  if (!hasKey && !process.env.API_KEY) {
     throw new Error("Google Gemini API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a creative director for viral short-form videos.
    User Idea: "${userInput}"
    Style/Aesthetic: "${stylePrompt}"

    Task:
    1. Create a detailed visual prompt for an AI video generator (Veo) that combines the user's idea with the requested style. It should be descriptive, mentioning lighting, camera movement, and mood.
    2. Write a catchy, short "Hinglish" (Hindi + English) caption/script for this video that would appeal to Gen Z.

    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visualPrompt: { type: Type.STRING },
          hinglishCaption: { type: Type.STRING },
        },
        required: ['visualPrompt', 'hinglishCaption'],
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate prompt");
  return JSON.parse(text);
};

export const generateVideo = async (visualPrompt: string): Promise<string> => {
    const hasKey = await ensureApiKey();
    if (!hasKey && !process.env.API_KEY) {
        throw new Error("Google Gemini API Key is missing.");
    }
    
    // Always create a new instance to ensure the latest key is used, especially after selection
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: visualPrompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to return a URI.");

    // Append API key as per Veo requirements for download/playback
    return `${videoUri}&key=${process.env.API_KEY}`;
};