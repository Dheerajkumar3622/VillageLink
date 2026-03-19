import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown, MapPin, Loader2, Navigation } from 'lucide-react';

interface JourneyCinematicProps {
    path: string[];
    onClose: () => void;
}

const TOTAL_FRAMES = 80;
// We'll map the path array to certain frame segments
// e.g., if path has 4 items, we divide 80 frames into 3 segments.

export const JourneyCinematic: React.FC<JourneyCinematicProps> = ({ path, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Animation state
    const [currentFrame, parseIntCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const playRef = useRef<number | null>(null);
    
    // Scrubbing state
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const startFrame = useRef(0);

    // Preload Images
    useEffect(() => {
        let loaded = 0;
        const imgArray: HTMLImageElement[] = [];

        // Frame name format from the directory: Whisk_ctywujmjntnjfjzm1smhzjytaty3qtl4imzj1yn_000.jpg to 079.jpg
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            const paddedId = i.toString().padStart(3, '0');
            img.src = `/animation/Whisk_ctywujmjntnjfjzm1smhzjytaty3qtl4imzj1yn_${paddedId}.jpg`;
            
            const handleLoad = () => {
                loaded++;
                setImagesLoaded(loaded);
                if (loaded === TOTAL_FRAMES) {
                    setIsLoaded(true);
                }
            };
            
            img.onload = handleLoad;
            img.onerror = handleLoad; // Prevent infinite loading if frame is missing
            
            imgArray.push(img);
        }
        setImages(imgArray);
        
        return () => {
            if (playRef.current) cancelAnimationFrame(playRef.current);
        };
    }, []);

    // Draw on Canvas when frame or loaded state changes
    useEffect(() => {
        if (!isLoaded || !canvasRef.current || images.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas scale matches High DPI displays
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        const img = images[currentFrame];
        // Cover logic (like object-fit: cover)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = `brightness(0.9) contrast(1.1)`; // Cinematic feel
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
    }, [currentFrame, isLoaded, images]);

    // Calculate which stops to show based on frame
    const segments = Math.max(1, path.length - 1);
    const framesPerSegment = Math.floor(TOTAL_FRAMES / segments);

    const getActiveStopIndex = () => {
        if (currentFrame >= TOTAL_FRAMES - 2) return path.length - 1;
        return Math.floor(currentFrame / framesPerSegment);
    };

    const activeStopIndex = getActiveStopIndex();
    const progressPerc = (currentFrame / (TOTAL_FRAMES - 1)) * 100;

    // Auto Play Logic
    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (playRef.current) cancelAnimationFrame(playRef.current);
        } else {
            setIsPlaying(true);
            const loop = () => {
                parseIntCurrentFrame(prev => {
                    const next = prev + 1;
                    if (next >= TOTAL_FRAMES) {
                        setIsPlaying(false);
                        return TOTAL_FRAMES - 1;
                    }
                    return next;
                });
                playRef.current = requestAnimationFrame(loop);
            };
            playRef.current = requestAnimationFrame(loop);
        }
    };

    // Scrub Control (Touch/Mouse)
    const handleStart = (clientX: number) => {
        setIsDragging(true);
        setIsPlaying(false); // Stop auto play on drag
        if (playRef.current) cancelAnimationFrame(playRef.current);
        startX.current = clientX;
        startFrame.current = currentFrame;
    };

    const handleMove = (clientX: number) => {
        if (!isDragging) return;
        const deltaX = clientX - startX.current;
        const frameShift = Math.floor(deltaX / 5); // 5px drag = 1 frame
        
        let newFrame = startFrame.current + frameShift;
        if (newFrame < 0) newFrame = 0;
        if (newFrame >= TOTAL_FRAMES) newFrame = TOTAL_FRAMES - 1;
        
        parseIntCurrentFrame(newFrame);
    };

    const handleEnd = () => setIsDragging(false);

    if (!isLoaded) {
        return (
            <div className="fixed inset-0 z-[500] bg-black text-white flex flex-col items-center justify-center font-sans tracking-widest uppercase text-xs animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-500" />
                <p>Loading Cinematic Journey</p>
                <div className="w-48 h-1 bg-white/10 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${(imagesLoaded / TOTAL_FRAMES) * 100}%`}}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[400] bg-black font-sans overflow-hidden animate-fade-in touch-none select-none" 
            ref={containerRef}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
        >
            {/* Cinematic Background */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            
            {/* Whisk 3.0 Vignette/Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-900/30 via-transparent to-brand-900/30 pointer-events-none mix-blend-color"></div>

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform hover:bg-white/20 pointer-events-auto shadow-xl">
                    <ChevronDown size={24} />
                </button>
                <div className="text-center drop-shadow-md">
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">Horizon Drive</p>
                    <p className="text-sm font-bold text-white shadow-black">Interactive Preview</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Current Active Station Signboard (3D Glassmorphic) */}
            <div className="absolute top-1/4 right-8 z-20 pointer-events-none perspective-1000">
                {path.map((stop, idx) => {
                    const isActive = idx === activeStopIndex;
                    const isPassed = idx < activeStopIndex;
                    
                    if (!isActive && !isPassed && idx !== activeStopIndex + 1) return null; // Only show relevant ones near

                    return (
                        <div 
                            key={stop}
                            className={`transform-3d transition-all duration-700 absolute right-0 w-48 ${
                                isActive ? 'opacity-100 rotate-y-[-15deg] translate-x-0 translate-z-[50px] scale-100' :
                                isPassed ? 'opacity-0 translate-y-[-100px] -rotate-y-[45deg] scale-75' :
                                'opacity-0 translate-y-[100px] rotate-y-[45deg] scale-75'
                            }`}
                        >
                            <div className="bg-white/10 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                        <MapPin size={12} className="text-white" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-wider text-brand-400">{idx === 0 ? 'START' : idx === path.length - 1 ? 'DESTINATION' : 'STOP'}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">{stop}</h3>
                                {idx > 0 && idx === activeStopIndex && (
                                    <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest animate-pulse">Arriving Soon</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Cyber-Dashboard */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    
                    {/* Progress Track */}
                    <div className="relative h-2 bg-white/20 rounded-full mb-8 backdrop-blur-md overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_10px_rgba(var(--brand-500),0.8)] transition-all duration-100 ease-linear"
                            style={{ width: `${progressPerc}%` }}
                        ></div>
                        {/* Waypoints markers */}
                        {path.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-black transition-colors duration-300 ${idx <= activeStopIndex ? 'bg-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),1)]' : 'bg-white/30'}`}
                                style={{ left: `calc(${(idx / (path.length - 1)) * 100}% - 8px)` }}
                            ></div>
                        ))}
                    </div>

                    {/* Controls & Data */}
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-1">Swipe horizontally</p>
                            <h2 className="text-2xl font-black text-white drop-shadow-md">To Explore Route</h2>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_20px_rgba(190,81,3,0.5)] flex items-center justify-center text-white font-bold active:scale-90 transition-transform"
                        >
                            {isPlaying ? (
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-4 bg-white rounded-full"></div>
                                    <div className="w-1.5 h-4 bg-white rounded-full"></div>
                                </div>
                            ) : (
                                <Navigation className="ml-1 rotate-90" size={24} fill="currentColor" />
                            )}
                        </button>
                    </div>

                </div>
            </div>

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-3d {
                    transform-style: preserve-3d;
                }
            `}</style>
        </div>
    );
};
