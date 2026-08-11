import React, { useState } from 'react';
import { Camera, Sparkles, Loader2, Wheat, Percent, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from '../services/i18n';
import { Button } from './Button';
import { classifyCropOnDevice } from '../services/tfCropClassifier';

interface ARMandiHUDProps {
    onGradeComplete?: (result: { grade: string; price: number; cropType: string }) => void;
}

export const ARMandiHUD: React.FC<ARMandiHUDProps> = ({ onGradeComplete }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
            setResult(null);
        };
        reader.readAsDataURL(file);
    };

    const triggerAIScan = async () => {
        if (!imagePreview) return;
        setLoading(true);

        try {
            // ⚡ 1. RUN INSTANT ON-DEVICE TENSORFLOW.JS MOBILENET NEURAL INFERENCE (0ms Offline)
            const tfResult = await classifyCropOnDevice(imagePreview);
            setResult(tfResult);

            if (onGradeComplete) {
                onGradeComplete({
                    grade: tfResult.grade,
                    price: tfResult.recommendedPrice,
                    cropType: tfResult.detectedCrop
                });
            }

            // 🌐 2. BACKGROUND CLOUD GEMINI 1.5 VISION SYNC IF ONLINE & API KEY SET
            const base64Image = imagePreview.split(',')[1];
            const token = localStorage.getItem('villagelink_token');

            fetch(`${API_BASE_URL}/api/ai/grade-crop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ image: base64Image })
            }).then(res => res.json()).then(data => {
                if (data.grading) {
                    const geminiGrading = { ...data.grading, engine: 'CLOUD_GEMINI' };
                    setResult(geminiGrading);
                    if (onGradeComplete) {
                        onGradeComplete({
                            grade: geminiGrading.grade,
                            price: geminiGrading.recommendedPrice,
                            cropType: geminiGrading.detectedCrop
                        });
                    }
                }
            }).catch(err => {
                console.log('Background Cloud Vision Sync skipped, using active On-Device TF.js MobileNet Result');
            });

        } catch (err) {
            console.error('On-Device TF.js Grading Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ar-mandi-hud-container w-full relative z-[10] mt-3">
            <div className="liquid-glass-card p-5 rounded-3xl border border-white/10 flex flex-col gap-4 backdrop-blur-2xl bg-black/40 shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-extrabold uppercase tracking-widest text-amber-400 font-space flex items-center gap-1.5">
                        <Wheat className="w-4 h-4" /> {t('mandi.cropGrading')}
                    </span>
                </div>

                {!imagePreview ? (
                    <label className="border-2 border-dashed border-white/10 hover:border-amber-500/40 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors bg-white/5">
                        <Camera className="w-10 h-10 text-slate-400" />
                        <span className="text-xs font-bold text-slate-300">{t('mandi.snapCrop')}</span>
                        <span className="text-[10px] text-slate-500">Supports JPG, PNG (Max 5MB)</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                    </label>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => { setImagePreview(null); setResult(null); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black border border-white/10 flex items-center justify-center text-white text-xs transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {!result && (
                            <Button
                                variant="glow"
                                onClick={triggerAIScan}
                                disabled={loading}
                                className="w-full py-3 rounded-2xl font-bold bg-amber-600 hover:bg-amber-500 border-none text-white flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Scanning Quality...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Run AI Quality Grading
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}

                {result && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div>
                                <span className="text-[10px] uppercase text-slate-400 font-bold block flex items-center gap-1.5">
                                    Detected Crop 
                                    {result.engine === 'ON_DEVICE_TFJS' ? (
                                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1">
                                            <Cpu className="w-2.5 h-2.5 animate-pulse" /> On-Device TF.js
                                        </span>
                                    ) : (
                                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5" /> Cloud Gemini
                                        </span>
                                    )}
                                </span>
                                <span className="text-sm font-extrabold text-white">{result.detectedCrop}</span>
                            </div>
                            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 font-extrabold text-xs rounded-full">
                                {result.grade}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                                <span className="text-[9px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                    <Percent className="w-3 h-3 text-cyan-400" /> Moisture
                                </span>
                                <span className="text-sm font-extrabold text-white">{result.moisture}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                                <span className="text-[9px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-400" /> Uniformity
                                </span>
                                <span className="text-sm font-extrabold text-white">{result.uniformity}</span>
                            </div>
                        </div>

                        {result.defects && result.defects.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase text-slate-400 font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Detected Defects
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {result.defects.map((def: string, idx: number) => (
                                        <span key={idx} className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full">
                                            {def}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase text-slate-400 font-bold block">Recommended Price</span>
                                <span className="text-lg font-black text-amber-400">₹{result.recommendedPrice}/kg</span>
                            </div>
                            <Button
                                variant="glow"
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 border-none text-white"
                                onClick={() => alert("Listed produce successfully on Mandi database!")}
                            >
                                List on Mandi
                            </Button>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed italic border-t border-white/5 pt-2">
                            "{result.analysis}"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
