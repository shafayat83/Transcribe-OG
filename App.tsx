
import React, { useState, useEffect, useRef } from 'react';
import { transcribeVideo, generateVoiceOver, TranscriptionResult } from './services/geminiService';

const Marquee = 'marquee' as any;

type View = 'home' | 'about' | 'privacy' | 'contact';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

const VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Amelia', description: 'Female: Professional, polished, and authoritative tone.' },
  { id: 'Charon', name: 'Mike', description: 'Male: Commandingly deep, resonant, and serious voice.' },
  { id: 'Zephyr', name: 'Olivia', description: 'Female: Smooth, natural, and balanced for narrations.' },
  { id: 'Puck', name: 'Jack', description: 'Male: Youthful, high-energy, and enthusiastic delivery.' },
  { id: 'Fenrir', name: 'Adam', description: 'Male: Expressive and clear emotive enunciation.' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [status, setStatus] = useState('System Ready');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleTranscribe = async () => {
    if (!url) return alert("Please enter a valid URL!");
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('Initializing AI Transcriber via Secure Server...');
    try {
      const data = await transcribeVideo(url, language);
      setResult(data);
      setEditableTranscript(data.transcript);
      setStatus('Transcription Complete.');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setStatus('System Error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVoiceOver = async () => {
    if (!editableTranscript) return;
    setTtsLoading(true);
    setStatus('Generating Voice-Over...');
    try {
      const textToSpeak = editableTranscript.slice(0, 500);
      const base64 = await generateVoiceOver(textToSpeak, selectedVoice);
      
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }

      const buffer = new ArrayBuffer(44 + bytes.length);
      const view = new DataView(buffer);
      view.setUint32(0, 0x52494646, false); 
      view.setUint32(4, 36 + bytes.length, true);
      view.setUint32(8, 0x57415645, false); 
      view.setUint32(12, 0x666d7420, false); 
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); 
      view.setUint16(22, 1, true); 
      view.setUint32(24, 24000, true);
      view.setUint32(28, 48000, true);
      view.setUint16(32, 2, true); 
      view.setUint16(34, 16, true); 
      view.setUint32(36, 0x64617461, false); 
      view.setUint32(40, bytes.length, true);
      for (let i = 0; i < bytes.length; i++) { view.setUint8(44 + i, bytes[i]); }
      
      const wavBlob = new Blob([buffer], { type: 'audio/wav' });
      setAudioUrl(URL.createObjectURL(wavBlob));
      setStatus('Voice Generation Complete.');
    } catch (err: any) {
      setError(err.message || "Speech synthesis failed.");
      setStatus('TTS Error.');
    } finally {
      setTtsLoading(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center">
          <label className="md:w-1/4 font-bold text-black text-xs uppercase">Video URL:</label>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL here..."
            className="flex-1 retro-border-inset p-2 font-sans bg-white text-black text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center">
          <label className="md:w-1/4 font-bold text-black text-xs uppercase">Language:</label>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full md:w-auto retro-border-inset p-1 bg-white text-black text-sm"
          >
            <option value="en">English (US)</option>
            <option value="bn">Bengali (বাংলা)</option>
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
          </select>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleTranscribe}
            disabled={loading}
            className="retro-button retro-border-outset bg-[#c0c0c0] px-8 py-2 font-bold uppercase text-xs"
          >
            {loading ? 'Processing...' : 'Start Transcription'}
          </button>
        </div>
      </div>

      <div className="p-2 bg-[#dfdfdf] border border-gray-400 font-mono text-[10px] text-black">
        SYSTEM STATUS: <span className={loading ? 'animate-pulse' : ''}>{status}</span>
      </div>

      {error && (
        <div className="p-3 border-2 border-red-600 bg-red-50 text-red-800 font-bold text-[10px] uppercase">
          [CRITICAL ERROR]: {error}
        </div>
      )}

      {result && result.groundingSources && result.groundingSources.length > 0 && (
        <div className="p-3 retro-border-inset bg-[#ffffcc] text-[10px]">
          <p className="font-bold uppercase mb-2">Sources Found:</p>
          <ul className="list-disc pl-4">
            {result.groundingSources.map((s, i) => (
              <li key={i}><a href={s.uri} target="_blank" rel="noopener">{s.title}</a></li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <label className="block font-bold text-black text-xs uppercase">Generated Transcript:</label>
        <textarea 
          value={editableTranscript}
          onChange={(e) => setEditableTranscript(e.target.value)}
          placeholder="Transcription results will appear here..."
          className="w-full h-64 retro-border-inset p-3 font-mono text-xs bg-white text-black resize-none"
        />
      </div>

      {editableTranscript && (
        <div className="p-4 retro-border-inset bg-[#d4d0c8] space-y-4">
          <h2 className="text-xs font-bold bg-[#000080] text-white px-2 py-1 uppercase">Audio Synthesis Unit</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select 
              value={selectedVoice} 
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="retro-border-inset p-1 text-xs"
            >
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.name} ({v.id})</option>)}
            </select>
            <button 
              onClick={handleGenerateVoiceOver}
              disabled={ttsLoading}
              className="retro-button retro-border-outset bg-[#008000] text-white px-6 py-2 font-bold uppercase text-xs"
            >
              {ttsLoading ? 'Synthesizing...' : 'Generate Audio'}
            </button>
            {audioUrl && <audio controls src={audioUrl} className="h-8"></audio>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-4 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-[#c0c0c0] border-none">
        <Marquee className="mb-4">SYSTEM READY. PROCESSED VIA VERCEL SERVERLESS SECURE GATEWAY.</Marquee>
        <header className="retro-border-outset p-4 bg-[#000080] text-white mb-6">
          <h1 className="text-3xl font-black italic tracking-tighter">TRANSCRIBE OG</h1>
          <p className="text-xs opacity-80">v2.1 Production Edition</p>
        </header>
        <main className="retro-border-outset bg-[#c0c0c0] p-6">
          {renderHome()}
        </main>
      </div>
    </div>
  );
};

export default App;
