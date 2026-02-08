
export interface Template {
  id: string;
  name: string;
  description: string;
  stylePrompt: string;
  icon: string; // Lucide icon name or similar identifier
  gradient: string;
}

export interface VideoGenerationResult {
  videoUri: string | null;
  caption: string | null;
  error?: string;
}

export interface Caption {
  id: string;
  start: number;
  end: number;
  text: string;
}

export type AnimationType = 'none' | 'pop' | 'fade' | 'slide' | 'karaoke' | 'typewriter' | 'highlight-word' | 'bounce' | 'shake';

export interface CaptionStyle {
  id: string;
  name: string;
  // Typography
  font: string;
  fontSize: number;
  fontWeight: string | number;
  // Colors
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  // Background
  backgroundColor?: string;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  // Animation
  animation: AnimationType;
  highlightColor?: string; // For karaoke/active word
  highlightBgColor?: string; // For active word background
}

export enum AppState {
  HOME = 'HOME',
  CAPTION_UPLOAD = 'CAPTION_UPLOAD',
  CAPTION_EDITOR = 'CAPTION_EDITOR',
  TEMPLATE_SELECTION = 'TEMPLATE_SELECTION',
  PROMPT_INPUT = 'PROMPT_INPUT',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT',
}

// Extend Window interface for AI Studio global
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext?: typeof AudioContext;
  }
}
