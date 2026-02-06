import { GoogleGenAI } from "@google/genai";
import { Caption } from "../types";

// Ensure the user has selected an API key via AI Studio
export const ensureApiKey = async (): Promise<boolean> => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Assume success after prompt closes or handle retry in UI
      return true; 
    }
    return true;
  }
  return !!process.env.API_KEY;
};

// Generate a creative prompt in English based on user input, optionally with Hindi/Hinglish flavor
export const generateEnhancedPrompt = async (userInput: string, style: string): Promise<{ visualPrompt: string; hinglishCaption: string }> => {
  await ensureApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a creative video director assisting in creating a video prompt for an AI video generator.
    
    User Idea: "${userInput}"
    Target Style: "${style}"
    
    Task 1: Create a highly detailed visual prompt (in English) describing the scene, lighting, camera movement, and mood for a video generation model. Keep it under 50 words.
    Task 2: Write a short, catchy caption (max 10 words) in "Hinglish" (Hindi written in English script or mixed Hindi/English) that matches the mood.
    
    Output JSON format:
    {
      "visualPrompt": "...",
      "hinglishCaption": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    // Fallback
    return {
      visualPrompt: `${style}, ${userInput}`,
      hinglishCaption: userInput
    };
  }
};

export const generateVideo = async (visualPrompt: string): Promise<string> => {
  await ensureApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  console.log("Starting video generation with prompt:", visualPrompt);

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: visualPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16',
      }
    });

    console.log("Operation started:", operation);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling status...", operation);
    }

    if (operation.error) {
      throw new Error(operation.error.message);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned");
    }

    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (error: any) {
    console.error("Video generation failed:", error);
    if (error.message?.includes("Requested entity was not found") && window.aistudio) {
        await window.aistudio.openSelectKey();
        throw new Error("API Key refreshed. Please try again.");
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
    
    // Prompt for Hinglish subtitles with strict short segmentation
    const prompt = `
      Analyze the audio in this video and generate subtitles strictly in "Hinglish" (Hindi words written in English Latin script).
      
      CRITICAL RULES for Social Media Style:
      1. Split the text into VERY SHORT segments (maximum 3-5 words per segment). 
      2. Do NOT write long sentences. Break them up.
      3. Ensure EVERY spoken word is captured. Do not summarize.
      4. If there is no speech, describe the sound in brackets [Like this].
      
      Return a valid JSON array of objects.
      Schema:
      [
        { "id": "1", "start": 0.5, "end": 1.2, "text": "Short segment here" }
      ]
      
      Times must be in seconds (number).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for better video understanding and timestamp logic
      contents: {
        parts: [videoPart, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json'
      }
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
