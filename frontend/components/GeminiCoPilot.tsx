import React, { useState, useRef } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Play, Volume2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from '../services/i18n';

interface GeminiCoPilotProps {
    onBookingExtracted: (data: { source: string; destination: string; seats: number }) => void;
}

export const GeminiCoPilot: React.FC<GeminiCoPilotProps> = ({ onBookingExtracted }) => {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);
    const [textQuery, setTextQuery] = useState('');
    const [ttsResponse, setTtsResponse] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Convert audio to base64 to send to backend
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    await processAudio(base64Audio);
                };
                
                // Stop all tracks to release hardware
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setTtsResponse(null);
            setTranscript('');
        } catch (err) {
            console.warn('Microphone permission blocked or not supported. Falling back to text input.', err);
            setShowTextInput(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (base64Audio: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('villagelink_token');
            const res = await fetch(`${API_BASE_URL}/api/ai/process-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ audio: base64Audio })
            });

            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();
            
            if (data.transcript) {
                setTranscript(data.transcript);
            }
            
            if (data.extracted && data.extracted.source && data.extracted.destination) {
                onBookingExtracted(data.extracted);
                if (data.tts) {
                    playTTS(data.tts);
                }
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            setTranscript('Failed to process voice. Try typing instead!');
        } finally {
            setLoading(false);
        }
    };

    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textQuery.trim()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('villagelink_token');
            const res = await fetch(`${API_BASE_URL}/api/ai/process-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: textQuery })
            });

            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();
            
            if (data.extracted && data.extracted.source && data.extracted.destination) {
                onBookingExtracted(data.extracted);
                setShowTextInput(false);
                setTextQuery('');
                if (data.tts) {
                    playTTS(data.tts);
                }
            } else {
                setTranscript('Could not detect stops. Try saying: "Basantpur se Sasaram ek ticket"');
            }
        } catch (error) {
            console.error('Error processing text:', error);
        } finally {
            setLoading(false);
        }
    };

    const playTTS = (base64Audio: string) => {
        try {
            setTtsResponse(base64Audio);
            const snd = new Audio("data:audio/mp3;base64," + base64Audio);
            snd.play();
        } catch (e) {
            console.warn('TTS playback failed:', e);
        }
    };

    return (
        <div className="gemini-copilot-container w-full relative z-[100] mt-3">
            <div className="liquid-glass-card p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-3 backdrop-blur-2xl bg-black/40">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-space flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Gemini Voice Co-Pilot
                        </span>
                    </div>
                    <button 
                        onClick={() => setShowTextInput(!showTextInput)}
                        className="text-[10px] font-bold text-white/50 hover:text-white uppercase transition-colors"
                    >
                        {showTextInput ? 'Use Mic' : 'Type Command'}
                    </button>
                </div>

                {!showTextInput ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all ${isRecording ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse' : 'bg-brand-500/10 border-brand-500/40 hover:border-brand-500/80 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}
                        >
                            {isRecording ? (
                                <MicOff className="w-8 h-8 text-red-500" />
                            ) : loading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                            ) : (
                                <Mic className="w-8 h-8 text-brand-400" />
                            )}
                        </button>

                        <p className="text-[11px] text-center text-slate-400 font-medium px-4">
                            {isRecording ? 'Listening to voice...' : loading ? 'AI is processing...' : t('passenger.voicePrompt')}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={textQuery}
                            onChange={(e) => setTextQuery(e.target.value)}
                            placeholder="e.g. Basantpur se Sasaram 2 ticket book karo"
                            className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-600 hover:bg-brand-500 border-none px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all text-white flex items-center gap-1"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask AI'}
                        </button>
                    </form>
                )}

                {transcript && (
                    <div className="w-full mt-2 bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-slate-300 relative animate-fade-in">
                        <p className="font-bold text-[10px] text-brand-400 uppercase mb-1">Transcript</p>
                        <p className="italic">"{transcript}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};
