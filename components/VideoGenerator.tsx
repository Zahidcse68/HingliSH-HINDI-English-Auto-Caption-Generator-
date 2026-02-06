import React, { useState } from 'react';
import { Template, AppState, VideoGenerationResult } from '../types';
import { TEMPLATES } from '../constants';
import { TemplateCard } from './TemplateCard';
import { Loader } from './Loader';
import { VideoResult } from './VideoResult';
import { ensureApiKey, generateEnhancedPrompt, generateVideo } from '../services/geminiService';
import { Sparkles } from 'lucide-react';

interface VideoGeneratorProps {
  onBack: () => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onBack }) => {
  const [internalState, setInternalState] = useState<AppState>(AppState.TEMPLATE_SELECTION);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [result, setResult] = useState<VideoGenerationResult | null>(null);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    setInternalState(AppState.PROMPT_INPUT);
  };

  const handleGenerate = async () => {
    if (!userInput.trim() || !selectedTemplateId) return;

    try {
      setInternalState(AppState.GENERATING);
      setGenerationStatus('Validating API Key...');
      await ensureApiKey();

      setGenerationStatus('Generating creative Hinglish script...');
      const template = TEMPLATES.find(t => t.id === selectedTemplateId)!;
      const { visualPrompt, hinglishCaption } = await generateEnhancedPrompt(userInput, template.stylePrompt);

      setGenerationStatus('Rendering video with AI (this may take a minute)...');
      const videoUri = await generateVideo(visualPrompt);

      setResult({
        videoUri,
        caption: hinglishCaption,
      });
      setInternalState(AppState.RESULT);

    } catch (error: any) {
      console.error(error);
      setResult({ videoUri: null, caption: null, error: error.message });
      alert(`Error: ${error.message}`);
      setInternalState(AppState.PROMPT_INPUT);
    }
  };

  const handleReset = () => {
    setInternalState(AppState.TEMPLATE_SELECTION);
    setSelectedTemplateId(null);
    setUserInput('');
    setResult(null);
  };

  return (
    <div className="w-full">
        {/* Nav Helper */}
        <div className="mb-4">
             <button onClick={onBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                &larr; Back to Menu
             </button>
        </div>

        {internalState === AppState.TEMPLATE_SELECTION && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-bold text-white">Choose a Vibe</h2>
              <p className="text-slate-400">Select a professional CapCut-style template.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => (
                <TemplateCard 
                  key={template.id}
                  template={template}
                  isSelected={false}
                  onSelect={handleTemplateSelect}
                />
              ))}
            </div>
          </div>
        )}

        {internalState === AppState.PROMPT_INPUT && selectedTemplateId && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in-up">
             <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Describe Your Vision</h2>
              <p className="text-slate-400">We'll mix Hindi & English.</p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <textarea 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="e.g., A rainy evening in Delhi with street food..."
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 resize-none"
                />
            </div>

            <div className="flex gap-4">
                <button onClick={() => setInternalState(AppState.TEMPLATE_SELECTION)} className="flex-1 py-3.5 rounded-xl font-semibold text-slate-300 hover:bg-slate-800">
                    Back
                </button>
                <button 
                    onClick={handleGenerate}
                    disabled={!userInput.trim()}
                    className={`flex-2 w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 ${!userInput.trim() ? 'bg-slate-700 opacity-50' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    <Sparkles className="w-5 h-5" /> Generate
                </button>
            </div>
          </div>
        )}

        {internalState === AppState.GENERATING && <Loader status={generationStatus} />}

        {internalState === AppState.RESULT && result && result.videoUri && (
           <VideoResult videoUrl={result.videoUri} caption={result.caption || ''} onReset={handleReset} />
        )}
    </div>
  );
};
