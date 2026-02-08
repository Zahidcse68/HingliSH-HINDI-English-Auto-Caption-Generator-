import React, { useState } from 'react';
import { AppState } from './types';
import { VideoGenerator } from './components/VideoGenerator';
import { CaptionEditor } from './components/CaptionEditor';
import { Video, Languages, Clapperboard, Captions, Zap, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  const renderContent = () => {
    switch (appState) {
        case AppState.HOME:
            return (
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12 animate-fade-in-up">
                    {/* Mode 1: Text to Video (Paid) */}
                    <div 
                        onClick={() => setAppState(AppState.TEMPLATE_SELECTION)}
                        className="relative group bg-slate-800 hover:bg-slate-700 p-8 rounded-2xl border-2 border-slate-700 hover:border-indigo-500 cursor-pointer transition-all hover:scale-105 shadow-2xl"
                    >
                        <div className="absolute top-4 right-4 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-full border border-indigo-500/50 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> PAID PLAN
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
                            <Clapperboard className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Generate Video</h2>
                        <p className="text-slate-400">
                            Create professional videos from text using Google Veo. Requires a billed API key.
                        </p>
                    </div>

                    {/* Mode 2: Auto Captions (Free) */}
                    <div 
                        onClick={() => setAppState(AppState.CAPTION_UPLOAD)}
                        className="relative group bg-slate-800 hover:bg-slate-700 p-8 rounded-2xl border-2 border-slate-700 hover:border-pink-500 cursor-pointer transition-all hover:scale-105 shadow-2xl"
                    >
                        <div className="absolute top-4 right-4 bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/50 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> FREE TIER
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20 group-hover:-rotate-12 transition-transform">
                            <Captions className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Auto Captions</h2>
                        <p className="text-slate-400">
                            Upload your video. We'll add trending CapCut-style Hinglish subtitles for free.
                        </p>
                    </div>
                </div>
            );
        case AppState.TEMPLATE_SELECTION:
        case AppState.PROMPT_INPUT:
        case AppState.GENERATING:
        case AppState.RESULT:
            return <VideoGenerator onBack={() => setAppState(AppState.HOME)} />;
        
        case AppState.CAPTION_UPLOAD:
        case AppState.CAPTION_EDITOR:
            return <CaptionEditor onBack={() => setAppState(AppState.HOME)} />;
            
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              DesiCut<span className="text-indigo-400">.ai</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="hidden sm:flex items-center gap-1">
              <Languages className="w-4 h-4" /> Hindi & English
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {renderContent()}
      </main>

      <footer className="py-6 text-center text-slate-600 text-sm">
        <p>© 2025 DesiCut AI. Powered by Gemini Veo & Flash.</p>
      </footer>
    </div>
  );
};

export default App;