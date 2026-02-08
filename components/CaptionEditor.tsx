import React, { useRef, useState, useEffect } from 'react';
import { Upload, Play, Pause, Download, Type, MonitorPlay, Move, Minus, Plus, Settings, Palette, Zap, Video as VideoIcon, RotateCcw, List, Trash2, PlusCircle, Gauge } from 'lucide-react';
import { transcribeVideo } from '../services/geminiService';
import { CAPTION_STYLES } from '../constants';
import { Caption, CaptionStyle, AnimationType } from '../types';
import { Loader } from './Loader';

interface CaptionEditorProps {
  onBack: () => void;
}

const ANIMATION_TYPES: AnimationType[] = ['none', 'pop', 'fade', 'slide', 'karaoke', 'typewriter', 'highlight-word', 'bounce', 'shake'];

export const CaptionEditor: React.FC<CaptionEditorProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [captions, setCaptions] = useState<Caption[]>([]);
  
  // --- Styling State ---
  const [activeStyle, setActiveStyle] = useState<CaptionStyle>({...CAPTION_STYLES[0]});
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.8 });
  
  // --- Video State ---
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [exportQuality, setExportQuality] = useState<'standard' | 'hd' | 'ultra'>('hd');
  
  // --- Editor UI State ---
  const [activeTab, setActiveTab] = useState<'captions' | 'presets' | 'text' | 'bg' | 'anim' | 'video'>('captions');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Refs for Audio Context to prevent "already connected" errors
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Robust Cleanup: Reset AudioContext when file changes or unmounts
  useEffect(() => {
    // Reset refs when fileUrl changes
    sourceNodeRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
    }

    return () => {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
        }
    };
  }, [fileUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const vid = e.target.files[0];
      setFile(vid);
      setFileUrl(URL.createObjectURL(vid));
      setCaptions([]);
      setIsPlaying(false);
      setPosition({ x: 0.5, y: 0.8 });
    }
  };

  const processVideo = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Uploading and Analyzing Audio...');
    try {
      const generatedCaptions = await transcribeVideo(file);
      setCaptions(generatedCaptions);
      setActiveTab('captions'); 
    } catch (e: any) {
      alert("Error generating captions: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: CaptionStyle) => {
    setActiveStyle({ ...template });
  };

  // --- Caption Management ---
  const updateCaption = (idx: number, field: keyof Caption, value: any) => {
    const newCaptions = [...captions];
    newCaptions[idx] = { ...newCaptions[idx], [field]: value };
    setCaptions(newCaptions);
  };

  const deleteCaption = (idx: number) => {
    const newCaptions = captions.filter((_, i) => i !== idx);
    setCaptions(newCaptions);
  };

  const addCaption = () => {
    const lastCap = captions[captions.length - 1];
    const start = lastCap ? lastCap.end : 0;
    setCaptions([...captions, { 
        id: Date.now().toString(), 
        start: Number(start.toFixed(2)), 
        end: Number((start + 2).toFixed(2)), 
        text: "New Text" 
    }]);
  };

  // --- Rendering Engine ---
  const render = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (video && canvas && ctx) {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const activeCaption = captions.find(c => currentTime >= c.start && currentTime <= c.end);

      if (activeCaption) {
        ctx.save();
        
        const fontSize = (canvas.width / 1080) * activeStyle.fontSize * 2 * scale; 
        const font = `${activeStyle.fontWeight} ${fontSize}px ${activeStyle.font.split(',')[0]}`;
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        const centerX = canvas.width * position.x;
        const centerY = canvas.height * position.y;

        const words = activeCaption.text.split(' ');
        const totalDuration = activeCaption.end - activeCaption.start;
        const elapsed = currentTime - activeCaption.start;
        const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
        const activeWordIndex = Math.floor(progress * words.length);

        const lines: { text: string, words: string[], indices: number[] }[] = [];
        let currentLineWords: string[] = [];
        let currentLineIndices: number[] = [];
        let currentLineWidth = 0;
        const maxWidth = canvas.width * 0.9;

        words.forEach((word, idx) => {
             const wordWidth = ctx.measureText(word + ' ').width;
             if (currentLineWidth + wordWidth + (activeStyle.paddingX * 2) > maxWidth && currentLineWords.length > 0) {
                 lines.push({ text: currentLineWords.join(' '), words: currentLineWords, indices: currentLineIndices });
                 currentLineWords = []; currentLineIndices = []; currentLineWidth = 0;
             }
             currentLineWords.push(word);
             currentLineIndices.push(idx);
             currentLineWidth += wordWidth;
        });
        if (currentLineWords.length > 0) lines.push({ text: currentLineWords.join(' '), words: currentLineWords, indices: currentLineIndices });

        const lineHeight = fontSize * 1.3;
        const totalBlockHeight = lines.length * lineHeight;
        let startY = centerY - (totalBlockHeight / 2) + (lineHeight / 2);

        lines.forEach((line) => {
             if (activeStyle.backgroundColor) {
                 const metrics = ctx.measureText(line.text);
                 const bgWidth = metrics.width + (activeStyle.paddingX * 4);
                 const bgHeight = lineHeight + (activeStyle.paddingY * 2);
                 
                 if (activeStyle.animation !== 'highlight-word') {
                    ctx.fillStyle = activeStyle.backgroundColor;
                    ctx.beginPath();
                    ctx.roundRect(
                        centerX - metrics.width/2 - (activeStyle.paddingX * 2), 
                        startY - lineHeight/2 - activeStyle.paddingY, 
                        bgWidth, 
                        bgHeight, 
                        activeStyle.borderRadius
                    );
                    ctx.fill();
                 }
             }

             let lineCursorX = centerX - (ctx.measureText(line.text).width / 2);
             
             line.words.forEach((word, wordIdxInLine) => {
                 const globalIdx = line.indices[wordIdxInLine];
                 const isWordActive = globalIdx === activeWordIndex;
                 const isWordPast = globalIdx < activeWordIndex;
                 const wordWidth = ctx.measureText(word + ' ').width;

                 let fillColor = activeStyle.color;
                 let offsetY = 0;

                 if (activeStyle.animation === 'karaoke') {
                     if (isWordActive || isWordPast) fillColor = activeStyle.highlightColor || '#00FF00';
                 } 
                 else if (activeStyle.animation === 'highlight-word') {
                     if (isWordActive) {
                         ctx.fillStyle = activeStyle.highlightBgColor || '#FFFF00';
                         ctx.fillRect(lineCursorX - 5, startY - lineHeight/2, wordWidth + 10, lineHeight);
                         fillColor = '#000000';
                     }
                 }
                 else if (activeStyle.animation === 'pop') {
                     if (isWordActive) {
                         fillColor = activeStyle.highlightColor || activeStyle.color;
                         ctx.font = `900 ${fontSize * 1.1}px ${activeStyle.font.split(',')[0]}`;
                     } else {
                         ctx.font = font; 
                     }
                 }
                 else if (activeStyle.animation === 'bounce') {
                     if (isWordActive) offsetY = -10;
                 }
                 else if (activeStyle.animation === 'shake') {
                     if (isWordActive) {
                         const shakeX = (Math.random() - 0.5) * 5;
                         lineCursorX += shakeX;
                     }
                 }
                 else if (activeStyle.animation === 'typewriter') {
                     if (globalIdx > activeWordIndex) return; 
                 }

                 if (activeStyle.shadowColor) {
                     ctx.shadowColor = activeStyle.shadowColor;
                     ctx.shadowBlur = 10;
                     ctx.shadowOffsetX = 3;
                     ctx.shadowOffsetY = 3;
                 } else {
                     ctx.shadowColor = 'transparent';
                 }

                 const scaledStrokeWidth = (activeStyle.strokeWidth || 0) * (canvas.width / 1080);
                 if (activeStyle.strokeColor && scaledStrokeWidth > 0) {
                     ctx.lineWidth = scaledStrokeWidth;
                     ctx.strokeStyle = activeStyle.strokeColor;
                     ctx.strokeText(word, lineCursorX + (wordWidth/2), startY + offsetY);
                 }

                 ctx.fillStyle = fillColor;
                 ctx.fillText(word, lineCursorX + (wordWidth/2), startY + offsetY);

                 lineCursorX += wordWidth;
             });

             startY += lineHeight;
        });

        ctx.restore();
      }
    }
    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [captions, activeStyle, currentTime, scale, position]);

  // --- Handlers ---
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setPosition({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleExport = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    if (captions.length === 0) { alert("Generate captions first!"); return; }

    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);
    video.currentTime = 0;
    
    // Initialize Audio Context ONLY ONCE
    if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;
    
    // Initialize Source Node ONLY ONCE and connect to default destination (speakers)
    if (!sourceNodeRef.current) {
        sourceNodeRef.current = audioCtx.createMediaElementSource(video);
        sourceNodeRef.current.connect(audioCtx.destination);
    }
    const source = sourceNodeRef.current;
    
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    
    // FPS and Bitrate based on quality
    const fps = 60;
    const bitrate = exportQuality === 'ultra' ? 25000000 : exportQuality === 'hd' ? 12000000 : 5000000;

    const canvasStream = canvasRef.current.captureStream(fps); 
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: bitrate
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `desicut-${exportQuality}-${Date.now()}.webm`;
        a.click();
        
        source.disconnect(dest);
        setIsPlaying(false);
        video.playbackRate = 1;
        setPlaybackSpeed(1);
    };

    video.playbackRate = 1;
    mediaRecorder.start();
    await video.play();
    setIsPlaying(true);
    
    video.onended = () => {
        mediaRecorder.stop();
        video.onended = null; 
    };
  };

  if (loading) return <Loader status={status} />;

  if (!file) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] animate-fade-in">
         <div className="mb-4"><button onClick={onBack} className="text-sm text-slate-400">&larr; Back</button></div>
         <div className="bg-slate-800 p-8 rounded-2xl border-2 border-dashed border-slate-600 hover:border-indigo-500 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8 text-indigo-400" /></div>
            <h2 className="text-2xl font-bold text-white mb-2">Upload for DesiCut</h2>
            <p className="text-slate-400 mb-6">Import clips to add CapCut-style effects.</p>
            <input type="file" accept="video/*" onChange={handleFileChange} className="block w-full text-slate-400 file:bg-indigo-600 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-white cursor-pointer"/>
         </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
        <button onClick={onBack} className="text-slate-400 hover:text-white font-medium">&larr; Menu</button>
        
        {captions.length > 0 && (
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-slate-800 rounded text-slate-300"><Minus className="w-4 h-4" /></button>
                    <span className="text-xs w-12 text-center font-mono">{(scale * 100).toFixed(0)}%</span>
                    <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:bg-slate-800 rounded text-slate-300"><Plus className="w-4 h-4" /></button>
                </div>
             </div>
        )}

        <button onClick={handleExport} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20">
             <Download className="w-4 h-4" /> Export {exportQuality.toUpperCase()}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* CENTER: Canvas Player (8 cols) */}
        <div className="lg:col-span-8 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center shadow-2xl border border-slate-800">
           <video 
              key={fileUrl} /* CRITICAL: Force remount to reset audio connections */
              ref={videoRef} 
              src={fileUrl!} 
              className="hidden" 
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)} 
              crossOrigin="anonymous" 
              playsInline 
            />
           <canvas 
             ref={canvasRef}
             className="max-w-full max-h-[75vh] w-auto h-auto cursor-pointer object-contain"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onClick={() => !isDragging && togglePlay()}
           />
           {!isPlaying && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Play className="w-16 h-16 text-white fill-white opacity-80" /></div>}
        </div>

        {/* RIGHT: Editor Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-slate-800 rounded-2xl flex flex-col overflow-hidden border border-slate-700 shadow-xl">
            {captions.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <MonitorPlay className="w-16 h-16 text-slate-600" />
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Generate Captions</h3>
                        <p className="text-slate-400 text-sm">AI will transcribe audio to Hinglish subtitles.</p>
                    </div>
                    <button onClick={processVideo} className="w-full bg-indigo-600 py-3 rounded-xl text-white font-bold hover:scale-105 transition-transform">
                        Start Generation
                    </button>
                 </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-700 bg-slate-900 overflow-x-auto">
                         <button onClick={() => setActiveTab('captions')} className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${activeTab === 'captions' ? 'text-white border-b-2 border-white bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                           <List className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setActiveTab('presets')} className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${activeTab === 'presets' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                           <Settings className="w-3 h-3" /> Styles
                        </button>
                        <button onClick={() => setActiveTab('text')} className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${activeTab === 'text' ? 'text-pink-400 border-b-2 border-pink-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                           <Type className="w-3 h-3" /> Text
                        </button>
                        <button onClick={() => setActiveTab('anim')} className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${activeTab === 'anim' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                           <Zap className="w-3 h-3" /> Anim
                        </button>
                        <button onClick={() => setActiveTab('video')} className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${activeTab === 'video' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                           <VideoIcon className="w-3 h-3" /> Video
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-800">
                        {activeTab === 'captions' && (
                            <div className="space-y-3 pb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Transcript</h4>
                                    <button onClick={addCaption} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold">
                                        <PlusCircle className="w-3 h-3" /> Add Line
                                    </button>
                                </div>
                                {captions.map((cap, idx) => {
                                    const isActive = currentTime >= cap.start && currentTime <= cap.end;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`p-3 rounded-lg border transition-all ${isActive ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 bg-slate-800/50'}`}
                                        >
                                           <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1 bg-slate-900 rounded p-1 border border-slate-700">
                                                    <input 
                                                        type="number" 
                                                        step="0.1" 
                                                        value={cap.start} 
                                                        onChange={(e) => updateCaption(idx, 'start', parseFloat(e.target.value))} 
                                                        className="w-12 bg-transparent text-xs text-center focus:outline-none font-mono text-slate-300"
                                                    />
                                                    <span className="text-slate-600 text-[10px]">&rarr;</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.1" 
                                                        value={cap.end} 
                                                        onChange={(e) => updateCaption(idx, 'end', parseFloat(e.target.value))} 
                                                        className="w-12 bg-transparent text-xs text-center focus:outline-none font-mono text-slate-300"
                                                    />
                                                </div>
                                                <button onClick={() => {if(videoRef.current){videoRef.current.currentTime = cap.start; videoRef.current.play(); setIsPlaying(true);}}} className={`p-1 rounded hover:bg-slate-700 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}><Play className="w-3 h-3" /></button>
                                                <button onClick={() => deleteCaption(idx)} className="ml-auto text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>
                                           </div>
                                           <textarea value={cap.text} onChange={(e) => updateCaption(idx, 'text', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none resize-none font-medium" rows={2}/>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {activeTab === 'presets' && (
                             <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">CapCut Style Templates</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {CAPTION_STYLES.map(style => (
                                        <button key={style.id} onClick={() => applyTemplate(style)} className={`p-3 rounded-xl text-left transition-all border ${activeStyle.id === style.id ? 'bg-indigo-900/50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
                                            <div className="font-bold text-sm text-white mb-1">{style.name}</div>
                                            <div className="h-1 w-full bg-slate-600 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-pink-500" style={{width: '60%'}}></div></div>
                                        </button>
                                    ))}
                                </div>
                             </div>
                        )}

                        {activeTab === 'text' && (
                            <div className="space-y-6">
                                <div><label className="text-xs font-bold text-slate-400 mb-2 block">Font Color</label><div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg"><input type="color" value={activeStyle.color} onChange={e => setActiveStyle({...activeStyle, color: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" /><span className="text-sm font-mono text-slate-300">{activeStyle.color}</span></div></div>
                                <div><label className="text-xs font-bold text-slate-400 mb-2 block">Stroke Width</label><input type="range" min="0" max="10" value={activeStyle.strokeWidth || 0} onChange={e => setActiveStyle({...activeStyle, strokeWidth: parseInt(e.target.value)})} className="w-full accent-indigo-500" /></div>
                            </div>
                        )}

                        {activeTab === 'video' && (
                             <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block flex items-center gap-1"><Gauge className="w-3 h-3" /> Export Quality</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['standard', 'hd', 'ultra'] as const).map(q => (
                                            <button 
                                                key={q}
                                                onClick={() => setExportQuality(q)}
                                                className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${exportQuality === q ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-500'}`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        {exportQuality === 'ultra' ? 'High Bitrate (25Mbps) - Best for YouTube/Reels.' : exportQuality === 'hd' ? 'Medium Bitrate (12Mbps) - Recommended.' : 'Low Bitrate (5Mbps) - Fast upload.'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block">Playback Speed</label>
                                    <div className="flex gap-2">
                                        {[0.5, 1.0, 1.5, 2.0].map(speed => (
                                            <button key={speed} onClick={() => handlePlaybackSpeed(speed)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${playbackSpeed === speed ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{speed}x</button>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};