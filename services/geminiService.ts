import { GoogleGenAI } from "@google/genai";
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

// Generate a creative prompt using the lightweight Flash model (Free Tier friendly)
export const generateEnhancedPrompt = async (userInput: string, style: string): Promise<{ visualPrompt: string; hinglishCaption: string }> => {
  await ensureApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a creative video director.
    User Idea: "${userInput}"
    Target Style: "${style}"
    
    Task 1: Create a highly detailed visual prompt (in English, max 50 words) for a video generation model.
    Task 2: Write a short, catchy caption (max 10 words) in "Hinglish" (Hindi written in English script).
    
    Output JSON: { "visualPrompt": "...", "hinglishCaption": "..." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Switched to Flash for speed and free-tier compatibility
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return { visualPrompt: `${style}, ${userInput}`, hinglishCaption: userInput };
  }
};

export const generateVideo = async (visualPrompt: string): Promise<string> => {
  const hasKey = await ensureApiKey();
  if (!hasKey && !process.env.API_KEY) {
      throw new Error("Missing API Key. Please add API_KEY to your Vercel Environment Variables.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview', // Veo requires a PAID/BILLED API Key
      prompt: visualPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16',
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) throw new Error(operation.error.message);

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (error: any) {
    console.error("Video generation failed:", error);
    // Specific error handling for Veo payment issues
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        throw new Error("Veo Model access denied. Ensure your API Key is linked to a PAID Billing Account in Google AI Studio.");
    }
    throw error;
  }
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
  await ensureApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const videoPart = await fileToGenerativePart(videoFile);
    
    // Using Gemini 2.5 Flash - This is Free Tier friendly and excellent for transcription
    const prompt = `
      Analyze the audio and generate "Hinglish" subtitles (Hindi in English script).
      Rules:
      1. Max 3-4 words per segment.
      2. Capture every spoken word accurately.
      3. Return JSON array: [{ "id": "1", "start": 0.0, "end": 1.0, "text": "..." }]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // CHANGED: Using Flash model for Free Tier support
      contents: {
        parts: [videoPart, { text: prompt }]
      },
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate captions");
    
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error("Transcription failed", error);
    throw error;
  }
};