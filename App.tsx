import React, { useState } from 'react';
import { AppState } from './types';
import { CaptionEditor } from './components/CaptionEditor';
import { Video, Languages, Captions, Zap, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  const renderContent = () => {
    switch (appState) {
        case AppState.HOME:
            return (
                <div className="max-w-4xl mx-auto mt-20 animate-fade-in-up text-center px-4">
                    <div className="mb-12">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-indigo-500/20">
                            <Sparkles className="w-4 h-4" />
                            <span>Powered by Gemini 2.5 Flash</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                            Make Your Videos <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Viral</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Automatically add professional "Hinglish" subtitles, animations, and CapCut-style effects to your videos instantly using AI.
                        </p>
                    </div>

                    {/* Main Action Card */}
                    <div 
                        onClick={() => setAppState(AppState.CAPTION_UPLOAD)}
                        className="relative group bg-slate-800/50 hover:bg-slate-800 p-12 rounded-3xl border-2 border-slate-700 hover:border-indigo-500 cursor-pointer transition-all hover:scale-105 shadow-2xl max-w-md mx-auto backdrop-blur-sm"
                    >
                        <div className="absolute top-4 right-4 bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full border border-green-500/50 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> FREE FOREVER
                        </div>
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-indigo-500/30 group-hover:-rotate-6 transition-transform duration-300">
                            <Captions className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">Auto Caption Editor</h2>
                        <p className="text-slate-400">
                            Upload Video &rarr; AI Transcribes &rarr; Export with Style.
                        </p>
                    </div>
                </div>
            );
        
        case AppState.CAPTION_UPLOAD:
        case AppState.CAPTION_EDITOR:
            return <CaptionEditor onBack={() => setAppState(AppState.HOME)} />;
            
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setAppState(AppState.HOME)}>
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:rotate-3 transition-transform">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              DesiCut<span className="text-indigo-400">.ai</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="hidden sm:flex items-center gap-1.5 bg-slate-800 py-1.5 px-3 rounded-full border border-slate-700">
              <Languages className="w-4 h-4 text-indigo-400" /> 
              <span>Hindi & English Supported</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {renderContent()}
      </main>

      <footer className="py-8 text-center text-slate-600 text-sm border-t border-slate-800/50 mt-auto">
        <p>© 2025 DesiCut AI. Powered by Google Gemini Flash.</p>
      </footer>
    </div>
  );
};

export default App;