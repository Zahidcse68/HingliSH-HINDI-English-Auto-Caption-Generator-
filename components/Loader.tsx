import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const Loader: React.FC<{ status: string }> = ({ status }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 animate-fade-in text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Generating Your Video</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          {status}{dots}
        </p>
        <p className="text-xs text-slate-500 mt-4">
          High-quality rendering can take 1-2 minutes. Please don't close this tab.
        </p>
      </div>
    </div>
  );
};
