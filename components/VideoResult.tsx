import React from 'react';
import { Download, RefreshCw, Share2 } from 'lucide-react';

interface VideoResultProps {
  videoUrl: string;
  caption: string;
  onReset: () => void;
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, caption, onReset }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `desicut-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Direct download blocked by browser. Right click the video and 'Save Video As'.");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
        {/* Video Player */}
        <div className="aspect-[9/16] bg-black relative">
            <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop
                className="w-full h-full object-cover"
            />
        </div>
        
        {/* Caption Section */}
        <div className="p-6 bg-slate-800">
            <h3 className="text-sm font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Hinglish Caption</h3>
            <p className="text-xl text-white font-medium font-serif italic">"{caption}"</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Download className="w-5 h-5" />
          Download HD
        </button>
        <button 
          onClick={onReset}
          className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Create New
        </button>
      </div>
    </div>
  );
};
