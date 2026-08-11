import React, { useEffect, useRef, useState } from 'react';
import { 
    Sparkles, Sliders, Volume2, VolumeX, RotateCcw, ShieldAlert, 
    Compass, Eye, Shield, Sun, CloudRain, Moon, CloudFog,
    Maximize2, Minimize2, ArrowLeft, Navigation, Search, Music,
    Phone, Settings, ChevronUp, ChevronDown, Battery, Lock,
    Unlock, Wind, Thermometer, AlertTriangle
} from 'lucide-react';
import { BusState } from '@villagelink/shared';

// Type definitions
interface MockVehicle {
    id: string;
    name: string;
    type: 'AUTO' | 'BUS' | 'CAR' | 'TRACTOR' | 'MOTORCYCLE';
    rx: number; // lateral offset (meters)
    ry: number; // distance ahead/behind (meters)
    speed: number; // absolute speed (km/h)
    heading: number; // heading in radians relative to self
}

interface ProximityRadar3DProps {
    realTimeVehicles?: BusState[];
    userLocation?: { lat: number; lng: number } | null;
}

// Environment Presets Types
type PresetType = 'MANDI' | 'FOG' | 'MONSOON' | 'HIGHWAY';

interface EnvironmentPreset {
    name: string;
    roadCurve: number;
    weather: 'CLEAR' | 'FOG' | 'RAIN';
    trafficDensity: 'LOW' | 'MEDIUM' | 'HIGH';
    fogDensity: number;
    rainDensity: number;
    initialSpeed: number;
    icon: React.ReactNode;
}

// Real-time audio engine
class SynthesizerEngine {
    private ctx: AudioContext | null = null;
    private humNode: OscillatorNode | null = null;
    private humGain: GainNode | null = null;
    private oscLFO: OscillatorNode | null = null;

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.startAutopilotHum();
        } catch (e) {
            console.warn("AudioContext failed to initialize", e);
        }
    }

    private startAutopilotHum() {
        if (!this.ctx) return;
        try {
            // FM Carrier
            this.humNode = this.ctx.createOscillator();
            this.humGain = this.ctx.createGain();
            this.humNode.type = 'triangle';
            this.humNode.frequency.setValueAtTime(60, this.ctx.currentTime); // Low engine hum

            // FM Modulator LFO
            this.oscLFO = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            this.oscLFO.frequency.setValueAtTime(30, this.ctx.currentTime);
            lfoGain.gain.setValueAtTime(15, this.ctx.currentTime); // Modulation depth

            this.oscLFO.connect(lfoGain);
            if (this.humNode.frequency) {
                lfoGain.connect(this.humNode.frequency);
            }

            this.humNode.connect(this.humGain);
            this.humGain.connect(this.ctx.destination);
            
            this.humGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            this.humNode.start();
            this.oscLFO.start();
        } catch (e) {
            // Safe fallback
        }
    }

    updateHumPitch(speed: number) {
        if (!this.humNode || !this.ctx) return;
        const targetFreq = 60 + (speed / 80) * 80; // Scale frequency with speed
        this.humNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    }

    playLidarClick() {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.015);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.015);
        } catch (e) {}
    }

    playBlindSpotTone(side: 'left' | 'right') {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
            const gain = this.ctx.createGain();

            if (pan) {
                osc.connect(pan);
                pan.connect(gain);
                pan.pan.setValueAtTime(side === 'left' ? -0.8 : 0.8, this.ctx.currentTime);
            } else {
                osc.connect(gain);
            }
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            
            // Apply warbling LFO
            const lfo = this.ctx.createOscillator();
            const lfoG = this.ctx.createGain();
            lfo.frequency.setValueAtTime(8, this.ctx.currentTime);
            lfoG.gain.setValueAtTime(30, this.ctx.currentTime);
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);

            lfo.start();
            osc.start();
            lfo.stop(this.ctx.currentTime + 0.3);
            osc.stop(this.ctx.currentTime + 0.3);
        } catch (e) {}
    }

    playCriticalBeep() {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) {}
    }

    mute(muted: boolean) {
        if (!this.humGain || !this.ctx) return;
        this.humGain.gain.setValueAtTime(muted ? 0 : 0.02, this.ctx.currentTime);
    }
}

const audioSynth = new SynthesizerEngine();

// Speech Synthesis Warning engine
const speakWarning = (phrase: string) => {
    try {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel current speeches
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.rate = 1.15;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    } catch (e) {
        console.warn("Speech synthesis error", e);
    }
};

export const ProximityRadar3D: React.FC<ProximityRadar3DProps> = ({
    realTimeVehicles = [],
    userLocation
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Simulation parameters
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [sandboxOpen, setSandboxOpen] = useState(false);
    const [useSandboxData, setUseSandboxData] = useState(realTimeVehicles.length === 0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (realTimeVehicles && realTimeVehicles.length > 0) {
            setUseSandboxData(false);
        }
    }, [realTimeVehicles]);
    
    // UI View Settings
    const [viewMode, setViewMode] = useState<'PERSPECTIVE' | 'BIRDEYE'>('PERSPECTIVE');
    const [renderScope, setRenderScope] = useState<'NEON' | 'NIGHTVISION' | 'THERMAL'>('NEON');

    // Tesla Cockpit states
    const [climateTemp, setClimateTemp] = useState(20.0);
    const [autopilotActive, setAutopilotActive] = useState(true);
    const [dashboardLocked, setDashboardLocked] = useState(false);

    // Controls states
    const [ownSpeed, setOwnSpeed] = useState(40); // km/h
    const [ownSteer, setOwnSteer] = useState(0); // steering slider (-10 to 10)
    const [activePreset, setActivePreset] = useState<PresetType>('MANDI');

    // Interactive Drag Camera angles
    const cameraYawRef = useRef<number>(0); // radians
    const cameraPitchRef = useRef<number>(Math.PI * 0.14); // radians
    const cameraZoomRef = useRef<number>(1.0); // zoom scaling

    const isDragging = useRef<boolean>(false);
    const prevDragCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const clickStartRef = useRef<number>(0);
    const clickMoveRef = useRef<number>(0);

    // Presets definition
    const presets: Record<PresetType, EnvironmentPreset> = {
        MANDI: {
            name: 'Mandi Commute',
            roadCurve: 0,
            weather: 'CLEAR',
            trafficDensity: 'HIGH',
            fogDensity: 0.1,
            rainDensity: 0,
            initialSpeed: 35,
            icon: <Sun size={14} className="text-amber-400" />
        },
        FOG: {
            name: 'Midnight Fog',
            roadCurve: -2.5,
            weather: 'FOG',
            trafficDensity: 'MEDIUM',
            fogDensity: 0.75,
            rainDensity: 0,
            initialSpeed: 25,
            icon: <CloudFog size={14} className="text-slate-300 animate-pulse" />
        },
        MONSOON: {
            name: 'Monsoon Storm',
            roadCurve: 4.0,
            weather: 'RAIN',
            trafficDensity: 'HIGH',
            fogDensity: 0.4,
            rainDensity: 0.8,
            initialSpeed: 30,
            icon: <CloudRain size={14} className="text-sky-400 animate-bounce" />
        },
        HIGHWAY: {
            name: 'Highway Chase',
            roadCurve: 1.5,
            weather: 'CLEAR',
            trafficDensity: 'MEDIUM',
            fogDensity: 0.05,
            rainDensity: 0,
            initialSpeed: 70,
            icon: <Moon size={14} className="text-indigo-400" />
        }
    };

    // Simulated Traffic Array in Ref (to maintain 60fps write/read velocity)
    const mockVehiclesRef = useRef<MockVehicle[]>([
        { id: 'm1', name: 'Raju Auto-Express', type: 'AUTO', rx: -3.5, ry: 15, speed: 32, heading: 0 },
        { id: 'm2', name: 'Khet Tractor Trolley', type: 'TRACTOR', rx: 3.6, ry: 28, speed: 18, heading: 0.05 },
        { id: 'm3', name: 'District Intercity Bus', type: 'BUS', rx: 0, ry: 45, speed: 40, heading: 0 },
        { id: 'm4', name: 'Royal Enfield', type: 'MOTORCYCLE', rx: -1.2, ry: -8, speed: 52, heading: -0.02 },
        { id: 'm5', name: 'Suzuki Swift', type: 'CAR', rx: 4.2, ry: -14, speed: 65, heading: 0.01 }
    ]);

    // Speed background flow line particles
    const speedParticles = useRef<{ rx: number; ry: number; speedMultiplier: number; z: number }[]>([]);
    // Sky starry backdrop particles
    const stars = useRef<{ x: number; y: number; size: number; alpha: number }[]>([]);
    // Rain particles
    const rainParticles = useRef<{ x: number; y: number; speed: number; len: number }[]>([]);

    // Telemetry warning states
    const lastSpeechWarning = useRef<number>(0);
    const lastLidarSweepAngle = useRef<number>(0);
    const hazardVignetteIntensity = useRef<number>(0);
    const currentGForce = useRef<number>(0); // Lateral G simulation
    const targetGForce = useRef<number>(0);

    // Initialize systems
    useEffect(() => {
        // Init speed flow lines
        const lines = [];
        for (let i = 0; i < 35; i++) {
            lines.push({
                rx: (Math.random() - 0.5) * 16,
                ry: Math.random() * 60,
                speedMultiplier: 1.0 + Math.random() * 1.5,
                z: Math.random() * 1.5
            });
        }
        speedParticles.current = lines;

        // Init stars
        const starlist = [];
        for (let i = 0; i < 50; i++) {
            starlist.push({
                x: Math.random() * 600,
                y: Math.random() * 150,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0.3 + Math.random() * 0.7
            });
        }
        stars.current = starlist;

        // Init rain
        const rainlist = [];
        for (let i = 0; i < 60; i++) {
            rainlist.push({
                x: Math.random() * 600,
                y: Math.random() * 400,
                speed: 10 + Math.random() * 10,
                len: 5 + Math.random() * 8
            });
        }
        rainParticles.current = rainlist;

        // Initialize Web Audio Engine
        audioSynth.init();
        audioSynth.mute(!soundEnabled);

        return () => {
            audioSynth.mute(true);
        };
    }, []);

    // Sync Audio state
    useEffect(() => {
        audioSynth.mute(!soundEnabled);
    }, [soundEnabled]);

    // Handle preset activation changes
    const applyPreset = (key: PresetType) => {
        setActivePreset(key);
        const preset = presets[key];
        setOwnSteer(preset.roadCurve);
        setOwnSpeed(preset.initialSpeed);

        // Reposition some traffic for immediate visual effect based on scenario
        if (key === 'FOG') {
            mockVehiclesRef.current[1].ry = 12; // Bring Tractor close in fog
            mockVehiclesRef.current[2].ry = 22; // Bring Bus closer
        } else if (key === 'HIGHWAY') {
            mockVehiclesRef.current[4].speed = ownSpeed + 25; // Accelerate overtaking car
            mockVehiclesRef.current[4].ry = -18;
        }

        if (!voiceMuted) {
            speakWarning(`System: Environment preset set to ${preset.name}.`);
        }
    };

    // Render loop and physical simulation updates
    useEffect(() => {
        let animId: number;
        let lastTime = performance.now();

        const loop = (time: number) => {
            const dt = Math.min(0.03, (time - lastTime) / 1000); // Caps dt at 30ms to prevent background tab jumps
            lastTime = time;

            updatePhysics(dt, time);
            renderCanvas();

            animId = requestAnimationFrame(loop);
        };

        const updatePhysics = (dt: number, time: number) => {
            // Update audio engine pitch based on velocity
            audioSynth.updateHumPitch(ownSpeed);

            // G-Force computation with smoothing
            targetGForce.current = (ownSteer / 10) * (ownSpeed / 80) * 0.8;
            currentGForce.current += (targetGForce.current - currentGForce.current) * 8 * dt;

            // 1. Move simulated traffic relative to own velocity and steering yaw
            const steerAngleRad = (ownSteer / 10) * 0.15; // steering yaw rate
            const ownSpeedMs = (ownSpeed * 1000) / 3600;

            mockVehiclesRef.current.forEach(veh => {
                const targetSpeedMs = (veh.speed * 1000) / 3600;
                
                // Absolute speeds mapping. Relative longitudinal change
                let deltaV = targetSpeedMs - ownSpeedMs;
                veh.ry += deltaV * dt;

                // Adjust relative lateral coordinate due to own vehicle turning steering rate
                if (ownSpeed > 1) {
                    veh.rx -= ownSpeedMs * Math.sin(steerAngleRad) * dt * (veh.ry > 0 ? 1 : -1);
                }

                // Recycle vehicles when boundaries crossed
                if (veh.ry > 65) {
                    veh.ry = -25;
                    veh.rx = (Math.random() - 0.5) * 8; // Randomize target lane injection
                } else if (veh.ry < -25) {
                    veh.ry = 65;
                    veh.rx = (Math.random() - 0.5) * 8;
                }

                // Lateral micro-wobbles / standard highway steering overrides
                const lateralDrift = Math.sin(time / 1500 + Number(veh.id.replace(/\D/g, ''))) * 0.18 * dt;
                veh.rx += lateralDrift;
            });

            // 2. Drift Speed Background lines
            const particleSpeedFactor = Math.max(0.1, ownSpeed / 30);
            speedParticles.current.forEach(p => {
                p.ry -= particleSpeedFactor * p.speedMultiplier * 25 * dt;
                
                // Add yaw drifting to ground markers relative to steering
                p.rx -= currentGForce.current * p.speedMultiplier * 8 * dt;

                if (p.ry < -2) {
                    p.ry = 60 + Math.random() * 5;
                    p.rx = (Math.random() - 0.5) * 16;
                }
            });

            // 3. Ambient Weather Animations
            const activePresetObj = presets[activePreset];
            if (activePresetObj.weather === 'RAIN') {
                rainParticles.current.forEach(p => {
                    p.y += p.speed * 60 * dt;
                    p.x -= currentGForce.current * 150 * dt; // Blow rain diagonal on turning
                    if (p.y > 450) {
                        p.y = -20;
                        p.x = Math.random() * 600;
                    }
                });
            }

            // 4. Update Rotating LIDAR Sweep Angle
            lastLidarSweepAngle.current += 1.8 * dt; // Revolves 1.8 radians/sec
            if (lastLidarSweepAngle.current > Math.PI * 2) {
                lastLidarSweepAngle.current -= Math.PI * 2;
                if (soundEnabled) audioSynth.playLidarClick(); // Subtle lidar tick beep
            }
        };

        const renderCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Handle high DPI retina display sizing
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Dynamic scale adjustment
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }

            const W = rect.width;
            const H = rect.height;

            // Execute 20-Layer Composite render stack
            ctx.save();
            executeLayers(ctx, W, H);
            ctx.restore();
        };

        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [ownSpeed, ownSteer, activePreset, soundEnabled, viewMode, renderScope]);

    // 3D Matrix projecting relative coordinates onto perspective grid canvas
    const project3D = (rx: number, ry: number, rz: number, W: number, H: number) => {
        const horizonY = H * 0.40;
        const curveOffsetFactor = ownSteer * -1.8;
        const vanishX = W * 0.5 + curveOffsetFactor * 4;

        // Apply interactive custom Drag Camera angles
        // Pitch (inclination) and Yaw (heading tilt)
        const yaw = cameraYawRef.current;
        const pitch = cameraPitchRef.current;
        const zoom = cameraZoomRef.current;

        // Perform relative translation based on camera angle
        let rotatedRx = rx * Math.cos(yaw) - ry * Math.sin(yaw);
        let rotatedRy = rx * Math.sin(yaw) + ry * Math.cos(yaw);

        // Adjust perspective focal limits
        const d = Math.max(0.1, rotatedRy + 15);
        const scale = (35 / (35 + d * 1.5)) * zoom;

        // Bending curves offsets (higher curve at distance)
        const bendOffset = curveOffsetFactor * (1 - scale) * (1 - scale) * 40;
        
        // Final screen space projections
        const cx = vanishX + bendOffset + rotatedRx * scale * 34;
        
        // Inclination scaling shift (pitch shifts horizon position)
        const horizonShift = (pitch - Math.PI * 0.14) * 200;
        const cy = H - (H - horizonY - horizonShift) * (1 - scale) - rz * scale * 26;

        return { x: cx, y: cy, scale };
    };

    // --- RENDER PIPELINE LAYERS EXECUTION ---
    const executeLayers = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        // Dynamic Horizon limit
        const horizonY = H * 0.40 + (cameraPitchRef.current - Math.PI * 0.14) * 200;

        // Layer 1: Cinematic Deep Space Parallax Starfield & Background
        let bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (renderScope === 'NIGHTVISION') {
            bgGrad.addColorStop(0, '#000800');
            bgGrad.addColorStop(1, '#001800');
        } else if (renderScope === 'THERMAL') {
            bgGrad.addColorStop(0, '#00001a');
            bgGrad.addColorStop(1, '#05052d');
        } else {
            // Standard Premium Cyber Space Obsidian - Warm Dark Purple/Midnight Blue Theme
            bgGrad.addColorStop(0, '#0c0b1f');
            bgGrad.addColorStop(0.5, '#03020c');
            bgGrad.addColorStop(1, '#000002');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Draw parallax stars (sky zone above horizon)
        if (renderScope !== 'NIGHTVISION' && renderScope !== 'THERMAL') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            stars.current.forEach(s => {
                if (s.y < horizonY) {
                    ctx.beginPath();
                    ctx.arc(s.x * (W / 600), s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Layer 2: Horizon Aurora / Twilight Glow Shimmer
        if (renderScope === 'NEON') {
            const twilightGrad = ctx.createRadialGradient(W * 0.5, horizonY, 5, W * 0.5, horizonY, W * 0.6);
            twilightGrad.addColorStop(0, 'rgba(245, 158, 11, 0.18)'); // Amber twilight glow
            twilightGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.05)');
            twilightGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = twilightGrad;
            ctx.beginPath();
            ctx.arc(W * 0.5, horizonY, W * 0.6, 0, Math.PI, true);
            ctx.fill();
        }

        // Horizon partition wire
        ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(W, horizonY);
        ctx.stroke();

        // 3D projection wrapper for standard viewports
        if (viewMode === 'PERSPECTIVE') {
            renderPerspectiveSimulation(ctx, W, H, horizonY);
        } else {
            renderBirdEyeSimulation(ctx, W, H);
        }

        // Overlay 1: Interactive Overlay HUD & Speedometer Dashboard Panel
        renderOverlayHUD(ctx, W, H);

        // Overlay 2: Dynamic Screen Red Flash Vignette on TTC Hazard
        if (hazardVignetteIntensity.current > 0.05) {
            const vignetteGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.35, W * 0.5, H * 0.5, W * 0.7);
            vignetteGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
            vignetteGrad.addColorStop(1, `rgba(239, 68, 68, ${hazardVignetteIntensity.current * 0.38})`);
            ctx.fillStyle = vignetteGrad;
            ctx.fillRect(0, 0, W, H);
            
            // Pulsing screen red glow vignette
            hazardVignetteIntensity.current -= 0.6 * 0.016; // Decay frame rate
        }

        // Overlay 3: Weather overlay
        const activePresetObj = presets[activePreset];
        if (activePresetObj.weather === 'RAIN' && viewMode === 'PERSPECTIVE') {
            ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.35)' : 'rgba(14, 165, 233, 0.28)';
            ctx.lineWidth = 1.2;
            rainParticles.current.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - currentGForce.current * 8, p.y + p.len);
                ctx.stroke();
            });
        }
    };

    // Render 3D perspective grid layout
    const renderPerspectiveSimulation = (ctx: CanvasRenderingContext2D, W: number, H: number, horizonY: number) => {
        // Setup glow states
        ctx.shadowBlur = renderScope === 'NIGHTVISION' ? 5 : 12;
        ctx.shadowColor = renderScope === 'NIGHTVISION' ? '#00FF41' : '#F59E0B'; // Tesla Amber Glow

        // Layer 3: Asphalt textures & Road lines
        ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const project = (x: number, y: number, z: number) => project3D(x, y, z, W, H);

        // Asphalt outer limits
        [-5.5, 5.5].forEach(rx => {
            ctx.beginPath();
            ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.35)' : 'rgba(245, 158, 11, 0.45)'; // Amber boundary lines
            ctx.lineWidth = 1.8;
            for (let ry = -15; ry <= 55; ry += 2) {
                const pt = project(rx, ry, 0);
                if (ry === -15) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
        });

        // Center Lanes Dashed Marks
        [-1.83, 1.83].forEach(rx => {
            ctx.beginPath();
            ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.25)' : 'rgba(245, 158, 11, 0.2)'; // Amber dashes
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 16]);
            for (let ry = -15; ry <= 55; ry += 2) {
                const pt = project(rx, ry, 0);
                if (ry === -15) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Layer 4: Projected Distance Marker Cross-bars
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        for (let m = 10; m <= 50; m += 10) {
            ctx.beginPath();
            ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(245, 158, 11, 0.15)'; // Amber cross bars
            ctx.lineWidth = 1.2;
            const ptLeft = project(-5.5, m, 0);
            const ptRight = project(5.5, m, 0);
            ctx.moveTo(ptLeft.x, ptLeft.y);
            ctx.lineTo(ptRight.x, ptRight.y);
            ctx.stroke();

            // Labels on edge
            ctx.fillStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.4)' : 'rgba(255,255,255,0.3)';
            ctx.fillText(`${m}m`, ptLeft.x - 14, ptLeft.y + 3);
        }

        // Layer 5: LIDAR Rotating Laser Scan Beam (Horizon slice arc)
        ctx.shadowBlur = 0;
        const sweepAngle = lastLidarSweepAngle.current;
        const scanPt = project(5.5 * Math.sin(sweepAngle), 35 * Math.cos(Math.abs(sweepAngle - Math.PI)), 0);
        
        const scanGrad = ctx.createLinearGradient(W * 0.5, H - 40, scanPt.x, scanPt.y);
        scanGrad.addColorStop(0, renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0)' : 'rgba(6, 182, 212, 0)');
        scanGrad.addColorStop(1, renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.22)' : 'rgba(6, 182, 212, 0.22)');
        
        ctx.fillStyle = scanGrad;
        ctx.beginPath();
        ctx.moveTo(W * 0.5, H - 40);
        
        // Scan swept polygon projection
        const pt1 = project(0, 0, 0);
        const pt2 = project(8 * Math.sin(sweepAngle - 0.15), 45 * Math.cos(sweepAngle - 0.15), 0);
        const pt3 = project(8 * Math.sin(sweepAngle), 45 * Math.cos(sweepAngle), 0);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.lineTo(pt3.x, pt3.y);
        ctx.closePath();
        ctx.fill();

        // Layer 6: Dynamic Speed ground drift particle particles
        ctx.fillStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.3)' : 'rgba(251, 191, 36, 0.18)';
        speedParticles.current.forEach(p => {
            const pt = project(p.rx, p.ry, 0);
            const scaleSize = Math.max(1, p.z * pt.scale * 3);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, scaleSize, 0, Math.PI * 2);
            ctx.fill();
        });

        // Layer 7: Interactive Blind Spot alert shapes
        // Ambient flank warnings indicators
        const drawBlindSpotFlank = (side: 'left' | 'right') => {
            const rxSign = side === 'left' ? -1 : 1;
            ctx.fillStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.03)' : 'rgba(239, 68, 68, 0.04)';
            ctx.beginPath();
            const b1 = project(rxSign * 1.83, -8, 0);
            const b2 = project(rxSign * 5.0, -8, 0);
            const b3 = project(rxSign * 5.0, 3, 0);
            const b4 = project(rxSign * 1.83, 3, 0);
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.lineTo(b3.x, b3.y);
            ctx.lineTo(b4.x, b4.y);
            ctx.closePath();
            ctx.fill();
        };
        drawBlindSpotFlank('left');
        drawBlindSpotFlank('right');

        // Layer 8: User Self Vehicle Premium rendering + headlights
        const selfPt = project(0, 0, 0);
        
        // Headlight gradients
        const headGradL = ctx.createRadialGradient(selfPt.x - 8, selfPt.y - 10, 1, selfPt.x - 18, selfPt.y - 120, 40);
        headGradL.addColorStop(0, 'rgba(255, 255, 220, 0.3)');
        headGradL.addColorStop(1, 'rgba(255, 255, 220, 0)');
        ctx.fillStyle = headGradL;
        ctx.beginPath();
        ctx.moveTo(selfPt.x - 4, selfPt.y - 10);
        ctx.lineTo(selfPt.x - 28, selfPt.y - 120);
        ctx.lineTo(selfPt.x + 4, selfPt.y - 120);
        ctx.closePath();
        ctx.fill();

        const headGradR = ctx.createRadialGradient(selfPt.x + 8, selfPt.y - 10, 1, selfPt.x + 18, selfPt.y - 120, 40);
        headGradR.addColorStop(0, 'rgba(255, 255, 220, 0.3)');
        headGradR.addColorStop(1, 'rgba(255, 255, 220, 0)');
        ctx.fillStyle = headGradR;
        ctx.beginPath();
        ctx.moveTo(selfPt.x + 4, selfPt.y - 10);
        ctx.lineTo(selfPt.x + 28, selfPt.y - 120);
        ctx.lineTo(selfPt.x - 4, selfPt.y - 120);
        ctx.closePath();
        ctx.fill();

        // Self Vehicle Vector outline
        drawVehicleVector(ctx, project, 0, -2, 1.7, 3.8, 1.4, 'CAR', 0, true);

        // Layer 9: Target Vehicle Silhouette projections loop
        const currentTargets = useSandboxData 
            ? mockVehiclesRef.current 
            : translateSocketsToLocal(realTimeVehicles, userLocation);

        let activeDangerClose = false;
        let warningSpeechKey: string | null = null;

        currentTargets.forEach(veh => {
            const absoluteDist = Math.sqrt(veh.rx * veh.rx + veh.ry * veh.ry);
            const inLeftBlindSpot = veh.rx < -1.8 && veh.rx > -5.2 && veh.ry > -8 && veh.ry < 3;
            const inRightBlindSpot = veh.rx > 1.8 && veh.rx < 5.2 && veh.ry > -8 && veh.ry < 3;

            let strokeColor = renderScope === 'NIGHTVISION' ? '#00FF41' : '#F59E0B'; // Default Tesla Amber
            if (renderScope === 'THERMAL') {
                // Color scale mapped by speed
                const speedIndex = Math.min(1.0, veh.speed / 80);
                strokeColor = `hsl(${240 - speedIndex * 240}, 100%, 50%)`;
            } else if (absoluteDist < 8) {
                strokeColor = '#EF4444'; // Red alert warning
                activeDangerClose = true;
                warningSpeechKey = `Alert! Danger close! ${veh.type} at ${Math.round(absoluteDist)} meters.`;
            } else if (inLeftBlindSpot || inRightBlindSpot) {
                strokeColor = '#F97316'; // Orange warning
                if (Math.random() < 0.015 && soundEnabled) {
                    audioSynth.playBlindSpotTone(inLeftBlindSpot ? 'left' : 'right');
                }
            }

            // Draw Silhouette outline
            drawVehicleVector(ctx, project, veh.rx, veh.ry, getVehicleWidth(veh.type), getVehicleLength(veh.type), getVehicleHeight(veh.type), veh.type, veh.heading, false, strokeColor);

            // Layer 10: Predictive Trajectory dotted arcs
            ctx.shadowBlur = 0;
            ctx.strokeStyle = strokeColor + '4d'; // Translucent
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            
            let lastTx = veh.rx;
            let lastTy = veh.ry;
            for (let t = 0.5; t <= 3.0; t += 0.5) {
                // Simple trajectory projection using velocity vectors
                const angle = veh.heading + (ownSteer / 10) * -0.05 * t;
                const distOffset = ((veh.speed * 1000) / 3600) * t;
                const tx = veh.rx + Math.sin(angle) * distOffset * 0.15; // Scaled offset for perspective
                const ty = veh.ry + Math.cos(angle) * distOffset * 0.15;
                const pt = project(tx, ty, 0);
                
                if (t === 0.5) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw floating HUD tag above target if within scale
            const tagPt = project(veh.rx, veh.ry, getVehicleHeight(veh.type));
            if (tagPt.scale > 0.35) {
                ctx.fillStyle = strokeColor;
                ctx.font = 'bold 8px monospace';
                ctx.fillText(`${veh.name}`, tagPt.x, tagPt.y - 12);
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = '7px monospace';
                ctx.fillText(`${Math.round(veh.speed)} km/h | D:${Math.round(absoluteDist)}m`, tagPt.x, tagPt.y - 4);
            }
        });

        // Loop voice warning triggers (throttled to once every 6 seconds)
        if (warningSpeechKey && !voiceMuted) {
            const now = Date.now();
            if (now - lastSpeechWarning.current > 6000) {
                speakWarning(warningSpeechKey);
                lastSpeechWarning.current = now;
            }
        }

        // Web Audio beep triggers for critical proximity
        if (activeDangerClose && soundEnabled) {
            hazardVignetteIntensity.current = Math.min(1.0, hazardVignetteIntensity.current + 0.12);
            if (Math.random() < 0.2) {
                audioSynth.playCriticalBeep();
                if (window.navigator.vibrate) {
                    window.navigator.vibrate([100, 50, 100]); // Danger proximity pulse
                }
            }
        }
    };

    // Render Bird's-Eye top down radar mode
    const renderBirdEyeSimulation = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        const cx = W * 0.5;
        const cy = H * 0.5 + 20;
        const maxRadius = Math.min(W, H) * 0.45;
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.16)' : 'rgba(6, 182, 212, 0.16)';
        ctx.lineWidth = 1.2;

        // Concentric range rings
        for (let r = 0.2; r <= 1.0; r += 0.2) {
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
            ctx.stroke();

            // Label range
            ctx.fillStyle = renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.4)' : 'rgba(255,255,255,0.3)';
            ctx.font = '8px monospace';
            ctx.fillText(`${Math.round(50 * r)}m`, cx + maxRadius * r - 12, cy - 4);
        }

        // Crosshairs axes
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        // LIDAR Sweep rotating beam
        const sweepAngle = lastLidarSweepAngle.current;
        const sweepX = cx + maxRadius * Math.sin(sweepAngle);
        const sweepY = cy - maxRadius * Math.cos(sweepAngle);

        const radarGrad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
        radarGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        radarGrad.addColorStop(1, renderScope === 'NIGHTVISION' ? 'rgba(0, 255, 65, 0.25)' : 'rgba(6, 182, 212, 0.25)');
        ctx.fillStyle = radarGrad;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxRadius, -sweepAngle - 0.2, -sweepAngle);
        ctx.closePath();
        ctx.fill();

        // Draw Player Self-Dot
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06B6D4';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Project nearby objects on radar matrix coordinates
        const targets = useSandboxData ? mockVehiclesRef.current : translateSocketsToLocal(realTimeVehicles, userLocation);
        ctx.shadowBlur = 0;

        targets.forEach(veh => {
            const distRatio = Math.sqrt(veh.rx * veh.rx + veh.ry * veh.ry) / 50;
            if (distRatio > 1.1) return; // Out of visual bounds

            const angle = Math.atan2(veh.rx, veh.ry);
            const targetX = cx + Math.sin(angle) * maxRadius * distRatio;
            const targetY = cy - Math.cos(angle) * maxRadius * distRatio;

            // Draw target dots
            let dotColor = '#10B981'; // Emerald
            if (Math.abs(veh.rx) < 1.8 && veh.ry > 0 && veh.ry < 8) dotColor = '#EF4444'; // Red alarm
            else if (Math.abs(veh.rx) > 1.8 && Math.abs(veh.rx) < 5 && Math.abs(veh.ry) < 8) dotColor = '#F97316'; // Orange

            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '8px monospace';
            ctx.fillText(veh.name.split(' ')[0], targetX, targetY - 8);
        });
    };
    // Draw Vector Vehicle outlines with advanced glows
    const drawVehicleVector = (
        ctx: CanvasRenderingContext2D,
        project: (x: number, y: number, z: number) => { x: number; y: number; scale: number },
        rx: number,
        ry: number,
        w: number,
        l: number,
        h: number,
        type: 'AUTO' | 'BUS' | 'CAR' | 'TRACTOR' | 'MOTORCYCLE',
        heading: number,
        isSelf: boolean,
        colorPreset?: string
    ) => {
        // Compute 3D corners projection
        const halfW = w / 2;
        const halfL = l / 2;

        // Apply rotation to coordinates relative to vector heading
        const projectRotatedCorner = (cx: number, cy: number, cz: number) => {
            const rotX = cx * Math.cos(heading) - cy * Math.sin(heading);
            const rotY = cx * Math.sin(heading) + cy * Math.cos(heading);
            return project(rx + rotX, ry + rotY, cz);
        };

        const mainColor = colorPreset || (isSelf ? '#FFFFFF' : '#F59E0B');
        const strokeColor = mainColor;
        const scale = projectRotatedCorner(0, 0, 0).scale;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.3 * scale;

        // Draw corner brackets around target vehicles if scale is large enough and not self
        if (!isSelf && scale > 0.35) {
            const size = 12 * scale;
            const centerPt = projectRotatedCorner(0, 0, h * 0.5);
            ctx.strokeStyle = strokeColor + '99'; // semi-translucent
            ctx.lineWidth = 1 * scale;
            
            // Draw left-top bracket
            ctx.beginPath();
            ctx.moveTo(centerPt.x - size, centerPt.y - size + 4);
            ctx.lineTo(centerPt.x - size, centerPt.y - size);
            ctx.lineTo(centerPt.x - size + 4, centerPt.y - size);
            ctx.stroke();

            // Draw right-top bracket
            ctx.beginPath();
            ctx.moveTo(centerPt.x + size, centerPt.y - size + 4);
            ctx.lineTo(centerPt.x + size, centerPt.y - size);
            ctx.lineTo(centerPt.x + size - 4, centerPt.y - size);
            ctx.stroke();

            // Draw left-bottom bracket
            ctx.beginPath();
            ctx.moveTo(centerPt.x - size, centerPt.y + size - 4);
            ctx.lineTo(centerPt.x - size, centerPt.y + size);
            ctx.lineTo(centerPt.x - size + 4, centerPt.y + size);
            ctx.stroke();

            // Draw right-bottom bracket
            ctx.beginPath();
            ctx.moveTo(centerPt.x + size, centerPt.y + size - 4);
            ctx.lineTo(centerPt.x + size, centerPt.y + size);
            ctx.lineTo(centerPt.x + size - 4, centerPt.y + size);
            ctx.stroke();
        }

        // Draw Helper to render a filled 3D face
        const drawFace = (points: { x: number, y: number }[], fillColor: string, outlineColor: string) => {
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = outlineColor;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        if (type === 'BUS') {
            // Sleek Tesla-style electric bus: solid curves and distinct windows
            const b1 = projectRotatedCorner(-halfW, -halfL, 0);
            const b2 = projectRotatedCorner(halfW, -halfL, 0);
            const b3 = projectRotatedCorner(halfW, halfL, 0);
            const b4 = projectRotatedCorner(-halfW, halfL, 0);

            const t1 = projectRotatedCorner(-halfW, -halfL, h);
            const t2 = projectRotatedCorner(halfW, -halfL, h);
            const t3 = projectRotatedCorner(halfW, halfL, h);
            const t4 = projectRotatedCorner(-halfW, halfL, h);

            // Shaded Body Panels
            const glassFill = isSelf ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.35)';
            const bodyFill = isSelf ? 'rgba(255, 255, 255, 0.18)' : 'rgba(245, 158, 11, 0.22)';

            // Draw Bottom
            drawFace([b1, b2, b3, b4], bodyFill, strokeColor);
            // Draw Left Side
            drawFace([b1, b4, t4, t1], bodyFill, strokeColor);
            // Draw Right Side
            drawFace([b2, b3, t3, t2], bodyFill, strokeColor);
            // Draw Front Windshield
            drawFace([b4, b3, t3, t4], glassFill, strokeColor);
            // Draw Back Face
            drawFace([b1, b2, t2, t1], bodyFill, strokeColor);
            // Draw Roof
            drawFace([t1, t2, t3, t4], bodyFill, strokeColor);

            // Draw side windows dividers
            const midY1 = projectRotatedCorner(-halfW, -halfL * 0.3, h * 0.4);
            const midY2 = projectRotatedCorner(-halfW, -halfL * 0.3, h * 0.8);
            const midY3 = projectRotatedCorner(-halfW, halfL * 0.3, h * 0.4);
            const midY4 = projectRotatedCorner(-halfW, halfL * 0.3, h * 0.8);
            ctx.beginPath();
            ctx.moveTo(midY1.x, midY1.y); ctx.lineTo(midY2.x, midY2.y);
            ctx.moveTo(midY3.x, midY3.y); ctx.lineTo(midY4.x, midY4.y);
            ctx.stroke();

        } else if (type === 'TRACTOR') {
            // Sleek solid tractor: rear cabin + front engine hood blocks
            const b1 = projectRotatedCorner(-halfW, -halfL, 0);
            const b2 = projectRotatedCorner(halfW, -halfL, 0);
            const b3 = projectRotatedCorner(halfW, halfL, 0);
            const b4 = projectRotatedCorner(-halfW, halfL, 0);

            // Cabin roof
            const t1 = projectRotatedCorner(-halfW, -halfL, h);
            const t2 = projectRotatedCorner(halfW, -halfL, h);
            const t3 = projectRotatedCorner(halfW, 0, h);
            const t4 = projectRotatedCorner(-halfW, 0, h);

            // Cabin bottom at z=h*0.4
            const m1 = projectRotatedCorner(-halfW, -halfL, h * 0.4);
            const m2 = projectRotatedCorner(halfW, -halfL, h * 0.4);
            const m3 = projectRotatedCorner(halfW, 0, h * 0.4);
            const m4 = projectRotatedCorner(-halfW, 0, h * 0.4);

            // Engine bonnet front (lower hood)
            const f1 = projectRotatedCorner(-halfW * 0.7, halfL, 0);
            const f2 = projectRotatedCorner(halfW * 0.7, halfL, 0);
            const f3 = projectRotatedCorner(halfW * 0.7, halfL, h * 0.5);
            const f4 = projectRotatedCorner(-halfW * 0.7, halfL, h * 0.5);

            // Draw Cabin
            const cabinFill = isSelf ? 'rgba(6, 182, 212, 0.05)' : 'rgba(245, 158, 11, 0.1)';
            const glassFill = isSelf ? 'rgba(6, 182, 212, 0.25)' : 'rgba(245, 158, 11, 0.3)';
            const roofFill = isSelf ? 'rgba(15, 23, 42, 0.8)' : 'rgba(245, 158, 11, 0.45)';
            const engineFill = isSelf ? 'rgba(6, 182, 212, 0.1)' : 'rgba(245, 158, 11, 0.15)';
            const frontFill = isSelf ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.2)';
            const hoodFill = isSelf ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.18)';

            drawFace([m1, m2, m3, m4], cabinFill, strokeColor);
            drawFace([m1, m4, t4, t1], glassFill, strokeColor); // Glass left
            drawFace([m2, m3, t3, t2], glassFill, strokeColor); // Glass right
            drawFace([m3, m4, t4, t3], glassFill, strokeColor); // Windshield
            drawFace([t1, t2, t3, t4], roofFill, strokeColor); // Roof

            // Draw Engine Hood
            drawFace([b4, b3, f2, f1], engineFill, strokeColor);
            drawFace([f1, f2, f3, f4], frontFill, strokeColor);
            drawFace([m4, m3, f3, f4], hoodFill, strokeColor); // top hood

            // Exhaust pipe
            const chimneyB = projectRotatedCorner(halfW * 0.3, halfL * 0.5, h * 0.5);
            const chimneyT = projectRotatedCorner(halfW * 0.3, halfL * 0.5, h * 1.4);
            ctx.beginPath();
            ctx.moveTo(chimneyB.x, chimneyB.y);
            ctx.lineTo(chimneyT.x, chimneyT.y);
            ctx.stroke();

        } else if (type === 'AUTO') {
            // Rounded dome-style auto cabin
            const b1 = projectRotatedCorner(-halfW, -halfL, 0);
            const b2 = projectRotatedCorner(halfW, -halfL, 0);
            const b3 = projectRotatedCorner(halfW, halfL, 0);
            const b4 = projectRotatedCorner(-halfW, halfL, 0);

            const t1 = projectRotatedCorner(-halfW * 0.7, -halfL * 0.7, h);
            const t2 = projectRotatedCorner(halfW * 0.7, -halfL * 0.7, h);
            const t3 = projectRotatedCorner(halfW * 0.6, halfL * 0.2, h * 1.1);
            const t4 = projectRotatedCorner(-halfW * 0.6, halfL * 0.2, h * 1.1);
            
            const nose = projectRotatedCorner(0, halfL, h * 0.5);

            // Shaded bodies
            const backScreenFill = isSelf ? 'rgba(234, 179, 8, 0.25)' : 'rgba(245, 158, 11, 0.35)';
            const canopyFill = isSelf ? 'rgba(15, 23, 42, 0.9)' : 'rgba(245, 158, 11, 0.5)';
            const windshieldFill = isSelf ? 'rgba(6, 182, 212, 0.25)' : 'rgba(245, 158, 11, 0.35)';
            const noseFill = isSelf ? 'rgba(234, 179, 8, 0.15)' : 'rgba(245, 158, 11, 0.22)';

            drawFace([b1, b2, t2, t1], backScreenFill, strokeColor); // Yellow back screen
            drawFace([t1, t2, t3, t4], canopyFill, strokeColor); // Canopy roof
            drawFace([t4, t3, nose], windshieldFill, strokeColor); // Front windshield
            drawFace([b4, b3, nose], noseFill, strokeColor); // Front nose

        } else if (type === 'MOTORCYCLE') {
            // Sleek aerodynamic bike rider shape
            const wheelF = projectRotatedCorner(0, halfL, h * 0.25);
            const wheelB = projectRotatedCorner(0, -halfL, h * 0.25);
            const tank = projectRotatedCorner(0, 0, h * 0.65);
            const riderHead = projectRotatedCorner(0, -halfL * 0.2, h * 1.15);

            // Draw chassis lines
            ctx.beginPath();
            ctx.moveTo(wheelB.x, wheelB.y);
            ctx.lineTo(tank.x, tank.y);
            ctx.lineTo(wheelF.x, wheelF.y);
            ctx.stroke();

            // Draw rider body
            ctx.fillStyle = isSelf ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.4)';
            ctx.beginPath();
            ctx.arc(riderHead.x, riderHead.y, 4.5 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else {
            // TESLA-STYLE CAR: Aerodynamic chassis + tapered glass cabin (windshield, windows, roof)
            const b1 = projectRotatedCorner(-halfW, -halfL, 0);
            const b2 = projectRotatedCorner(halfW, -halfL, 0);
            const b3 = projectRotatedCorner(halfW, halfL, 0);
            const b4 = projectRotatedCorner(-halfW, halfL, 0);

            // Mid height of chassis (top of lower body)
            const m1 = projectRotatedCorner(-halfW, -halfL, h * 0.42);
            const m2 = projectRotatedCorner(halfW, -halfL, h * 0.42);
            const m3 = projectRotatedCorner(halfW, halfL * 0.85, h * 0.42);
            const m4 = projectRotatedCorner(-halfW, halfL * 0.85, h * 0.42);

            // Tapered cabin roof top
            const t1 = projectRotatedCorner(-halfW * 0.72, -halfL * 0.75, h);
            const t2 = projectRotatedCorner(halfW * 0.72, -halfL * 0.75, h);
            const t3 = projectRotatedCorner(halfW * 0.68, halfL * 0.05, h);
            const t4 = projectRotatedCorner(-halfW * 0.68, halfL * 0.05, h);

            const glassColor = isSelf ? 'rgba(6, 182, 212, 0.25)' : 'rgba(245, 158, 11, 0.3)';
            const bodyColor = isSelf ? 'rgba(255, 255, 255, 0.15)' : 'rgba(245, 158, 11, 0.22)';
            const roofColor = isSelf ? 'rgba(15, 23, 42, 0.85)' : 'rgba(245, 158, 11, 0.45)';

            // Draw lower chassis base
            drawFace([b1, b2, m2, m1], bodyColor, strokeColor); // Back panel
            drawFace([b4, b3, m3, m4], bodyColor, strokeColor); // Front bumper panel
            drawFace([b1, b4, m4, m1], bodyColor, strokeColor); // Left side panel
            drawFace([b2, b3, m3, m2], bodyColor, strokeColor); // Right side panel

            // Draw cabin windows & slanted windshield
            drawFace([m4, m3, t3, t4], glassColor, strokeColor); // Windshield
            drawFace([m1, m2, t2, t1], glassColor, strokeColor); // Rear window
            drawFace([m1, m4, t4, t1], glassColor, strokeColor); // Left window panel
            drawFace([m2, m3, t3, t2], glassColor, strokeColor); // Right window panel
            drawFace([t1, t2, t3, t4], roofColor, strokeColor); // Roof panel

            // Draw side mirrors
            const mirrorL_B = projectRotatedCorner(-halfW, halfL * 0.2, h * 0.42);
            const mirrorL_T = projectRotatedCorner(-halfW * 1.25, halfL * 0.25, h * 0.48);
            const mirrorR_B = projectRotatedCorner(halfW, halfL * 0.2, h * 0.42);
            const mirrorR_T = projectRotatedCorner(halfW * 1.25, halfL * 0.25, h * 0.48);
            ctx.beginPath();
            ctx.moveTo(mirrorL_B.x, mirrorL_B.y); ctx.lineTo(mirrorL_T.x, mirrorL_T.y);
            ctx.moveTo(mirrorR_B.x, mirrorR_B.y); ctx.lineTo(mirrorR_T.x, mirrorR_T.y);
            ctx.stroke();
        }
    };

    // Helper dimension mappings
    const getVehicleWidth = (t: string) => t === 'BUS' ? 2.5 : t === 'TRACTOR' ? 2.0 : t === 'AUTO' ? 1.3 : t === 'MOTORCYCLE' ? 0.75 : 1.7;
    const getVehicleLength = (t: string) => t === 'BUS' ? 9.5 : t === 'TRACTOR' ? 4.5 : t === 'AUTO' ? 2.8 : t === 'MOTORCYCLE' ? 1.8 : 4.0;
    const getVehicleHeight = (t: string) => t === 'BUS' ? 2.8 : t === 'TRACTOR' ? 2.2 : t === 'AUTO' ? 1.6 : t === 'MOTORCYCLE' ? 1.3 : 1.35;

    // Projected mirror viewport renderers
    const renderOverlayHUD = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        // Clean canvas layout for Tesla-style dashboard overlay.
        // Secondary widgets are rendered in high-DPI HTML overlays.
    };

    const drawMirrorGraphics = (ctx: CanvasRenderingContext2D, dx: number, dy: number, w: number, h: number, side: 'left' | 'right') => {
        // Draw miniature perspective guidelines inside rear mirror scopes
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, w, h);
        ctx.clip();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx + w * 0.5, dy + h);
        ctx.lineTo(dx + (side === 'left' ? w * 0.1 : w * 0.9), dy + h * 0.2);
        ctx.stroke();

        // Project close targets in relative mirrors
        const targets = useSandboxData ? mockVehiclesRef.current : translateSocketsToLocal(realTimeVehicles, userLocation);
        targets.forEach(veh => {
            const isBS = (side === 'left' && veh.rx < -1.5 && veh.rx > -4.5 && veh.ry > -8 && veh.ry < 3) ||
                         (side === 'right' && veh.rx > 1.5 && veh.rx < 4.5 && veh.ry > -8 && veh.ry < 3);

            if (isBS) {
                ctx.fillStyle = 'rgba(249, 115, 22, 0.35)'; // Orange alert
                ctx.beginPath();
                ctx.arc(dx + w * 0.5 + (veh.rx * 10), dy + h * 0.5 - (veh.ry * 3), 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    };

    // Coordinate converters for Socket IO integrations
    const translateSocketsToLocal = (vehicles: BusState[], userLoc?: { lat: number; lng: number } | null): MockVehicle[] => {
        if (!userLoc) return [];
        return vehicles.map((v, i) => {
            if (!v.currentLocation) return null;
            
            // Haversine relative calculations
            const R = 6371; // Earth km
            const lat1 = userLoc.lat * Math.PI / 180;
            const lat2 = v.currentLocation.lat * Math.PI / 180;
            const dLat = (v.currentLocation.lat - userLoc.lat) * Math.PI / 180;
            const dLng = (v.currentLocation.lng - userLoc.lng) * Math.PI / 180;

            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1) * Math.cos(lat2) * 
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c * 1000; // to meters

            // Bearing conversion
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
            const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

            const selfHdg = 0; // Relative reference frame
            const rx = d * Math.sin((bearing - selfHdg) * Math.PI / 180);
            const ry = d * Math.cos((bearing - selfHdg) * Math.PI / 180);

            return {
                id: v.driverId || `soc-${i}`,
                name: v.driverName || 'Bus Operator',
                type: (v.vehicleType as any) || 'BUS',
                rx,
                ry: ry - 5, // offset correction
                speed: v.speed || 0,
                heading: 0
            };
        }).filter(Boolean) as MockVehicle[];
    };

    // Canvas gesture control bindings
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDragging.current = true;
        prevDragCoords.current = { x: e.clientX, y: e.clientY };
        clickStartRef.current = Date.now();
        clickMoveRef.current = 0;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging.current) return;
        const dx = e.clientX - prevDragCoords.current.x;
        const dy = e.clientY - prevDragCoords.current.y;

        cameraYawRef.current += dx * 0.007; // rotate yaw
        cameraPitchRef.current = Math.max(Math.PI * 0.05, Math.min(Math.PI * 0.45, cameraPitchRef.current - dy * 0.005));

        prevDragCoords.current = { x: e.clientX, y: e.clientY };
        clickMoveRef.current += Math.abs(dx) + Math.abs(dy);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        
        // If it was a quick click and not a drag, toggle fullscreen
        const elapsed = Date.now() - clickStartRef.current;
        if (elapsed < 250 && clickMoveRef.current < 10) {
            setIsFullscreen(!isFullscreen);
        }
    };

    // Native non-passive wheel & touchmove listeners to allow preventDefault without browser console warnings
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheelNative = (e: WheelEvent) => {
            if (e.cancelable) e.preventDefault();
            cameraZoomRef.current = Math.max(0.5, Math.min(2.5, cameraZoomRef.current - e.deltaY * 0.001));
        };

        const onTouchMoveNative = (e: TouchEvent) => {
            if (!isDragging.current || e.touches.length !== 1) return;
            if (e.cancelable) e.preventDefault();
            const dx = e.touches[0].clientX - prevDragCoords.current.x;
            const dy = e.touches[0].clientY - prevDragCoords.current.y;

            cameraYawRef.current += dx * 0.01;
            cameraPitchRef.current = Math.max(Math.PI * 0.05, Math.min(Math.PI * 0.45, cameraPitchRef.current - dy * 0.008));

            prevDragCoords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            clickMoveRef.current += Math.abs(dx) + Math.abs(dy);
        };

        canvas.addEventListener('wheel', onWheelNative, { passive: false });
        canvas.addEventListener('touchmove', onTouchMoveNative, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', onWheelNative);
            canvas.removeEventListener('touchmove', onTouchMoveNative);
        };
    }, []);

    const resetCamera = () => {
        cameraYawRef.current = 0;
        cameraPitchRef.current = Math.PI * 0.14;
        cameraZoomRef.current = 1.0;
        if (!voiceMuted) speakWarning("System: Camera coordinate alignment reset.");
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            prevDragCoords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            clickStartRef.current = Date.now();
            clickMoveRef.current = 0;
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging.current || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - prevDragCoords.current.x;
        const dy = e.touches[0].clientY - prevDragCoords.current.y;

        cameraYawRef.current += dx * 0.01;
        cameraPitchRef.current = Math.max(Math.PI * 0.05, Math.min(Math.PI * 0.45, cameraPitchRef.current - dy * 0.008));

        prevDragCoords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        clickMoveRef.current += Math.abs(dx) + Math.abs(dy);
    };

    return (
        <div 
            ref={containerRef} 
            className={`bg-[#02020a] select-none font-sans transition-all duration-300 relative ${
                isFullscreen 
                    ? 'fixed inset-0 z-[250] h-[100dvh] w-screen rounded-none overflow-hidden' 
                    : 'w-full rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative'
            }`}
        >
            {/* HUD Status Bar Header */}
            <div className="absolute top-0 inset-x-0 h-10 bg-slate-950/60 backdrop-blur-md border-b border-white/5 px-4 flex justify-between items-center z-10 pointer-events-none">
                {/* Left Header Info */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {isFullscreen && (
                        <button
                          onClick={() => setIsFullscreen(false)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white transition-all font-mono text-[9px] uppercase font-bold tracking-wider"
                        >
                          <ArrowLeft size={11} className="text-amber-500" />
                          <span>Back</span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white/40">
                        <span className={ownSpeed === 0 ? 'text-amber-500 font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}>P</span>
                        <span className="text-white/10">|</span>
                        <span className={ownSpeed > 0 ? 'text-amber-500 font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}>D</span>
                    </div>

                    <span className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest bg-white/5 px-2 py-0.5 rounded-lg">
                        Chill
                    </span>

                    <button 
                        onClick={() => setDashboardLocked(!dashboardLocked)} 
                        className="text-slate-400 hover:text-white transition-all"
                        title="Lock Dashboard"
                    >
                        {dashboardLocked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                    </button>
                </div>

                {/* Center Autopilot Status */}
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-white/50 tracking-widest font-black uppercase">
                    <span className={`w-1.5 h-1.5 rounded-full ${autopilotActive ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
                    <span>Autopilot {autopilotActive ? 'Engaged' : 'Muted'}</span>
                </div>

                {/* Right Header Info */}
                <div className="flex items-center gap-3 pointer-events-auto font-mono text-[10px] text-slate-400 font-bold">
                    <div className="flex items-center gap-1">
                        <Battery size={13} className="text-emerald-500" />
                        <span>62%</span>
                    </div>
                    <span>15:40</span>
                    <span className="text-slate-600">|</span>
                    <span>3°C</span>
                </div>
            </div>

            {/* Left Speedometer & Status Lights Column */}
            <div className="absolute top-14 left-4 flex flex-col gap-3.5 z-10 pointer-events-none">
                <div className="flex flex-col bg-slate-950/45 backdrop-blur-xl border border-white/5 p-3 rounded-2xl shadow-xl items-center min-w-[70px]">
                    <span className="font-sans font-black text-3xl text-white tracking-tighter leading-none">
                        {Math.round(ownSpeed)}
                    </span>
                    <span className="font-mono text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        KM/H
                    </span>
                </div>

                {/* Speed Limit indicator */}
                <div className="w-8 h-8 rounded-full bg-white border-[3px] border-red-600 flex items-center justify-center font-sans font-black text-[11px] text-black shadow-lg self-center">
                    40
                </div>

                {/* System warning indicators */}
                <div className="flex flex-col gap-2 pointer-events-auto self-center bg-slate-950/45 backdrop-blur-xl border border-white/5 p-1.5 rounded-2xl">
                    <button 
                        onClick={() => setAutopilotActive(!autopilotActive)} 
                        className={`p-2 rounded-xl transition-all ${autopilotActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-600'}`}
                        title="Autopilot HUD"
                    >
                        <Sparkles size={14} className={autopilotActive ? 'animate-pulse' : ''} />
                    </button>
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)} 
                        className={`p-2 rounded-xl transition-all ${soundEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                    >
                        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    <button 
                        onClick={() => setVoiceMuted(!voiceMuted)} 
                        className={`p-2 rounded-xl transition-all font-mono text-[8px] font-black ${voiceMuted ? 'text-red-500' : 'text-emerald-400'}`}
                        title="Speech synthesis alert"
                    >
                        VOX
                    </button>
                </div>
            </div>

            {/* Right Top Stylized Mini Map Overlay */}
            <div className="absolute top-14 right-4 z-10 pointer-events-none">
                <div className="w-36 h-24 bg-slate-950/70 border border-white/10 rounded-2xl p-2 shadow-xl shadow-black/40 flex flex-col justify-between select-none relative overflow-hidden pointer-events-auto">
                    {/* Miniature SVG map graphic */}
                    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
                        <path d="M 10 50 Q 50 20 90 50 T 90 90" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                        <path d="M 30 10 L 30 90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                        <path d="M 70 10 L 70 90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                        <circle cx="50" cy="35" r="3" fill="#f59e0b" />
                    </svg>
                    <div className="z-10 font-mono text-[8px] text-slate-400 font-bold uppercase tracking-wider">NH-2 Highway</div>
                    <div className="z-10 font-mono text-[7px] text-slate-500">2.4 km to Mandi</div>
                </div>
            </div>

            {/* High-Performance Canvas Viewport */}
            <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleMouseUp}
                className={`w-full ${isFullscreen ? 'h-screen' : 'h-[460px]'} block cursor-grab active:cursor-grabbing bg-slate-950`}
            />

            {/* Center warning banner */}
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[85%] max-w-sm pointer-events-none z-10">
                <div className="bg-amber-950/70 backdrop-blur-xl border border-amber-500/30 px-3 py-2 rounded-xl flex items-center gap-2 text-center justify-center shadow-lg shadow-black/30">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 animate-bounce" />
                    <span className="text-[8px] font-sans font-black text-amber-300 uppercase tracking-widest">
                        Park Assist is degraded
                    </span>
                </div>
            </div>

            {/* Bottom floating widgets */}
            <div className="absolute bottom-16 inset-x-4 flex justify-between gap-4 z-10 pointer-events-none">
                {/* Tire Pressure Widget (TPMS) */}
                <div className="w-36 bg-slate-950/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-xl flex flex-col gap-1 select-none pointer-events-auto">
                    <div className="font-mono text-[7px] text-slate-500 uppercase font-black tracking-wider">Tires (bar)</div>
                    <div className="flex items-center justify-between gap-2">
                        {/* 3D Top Down Car Schematic */}
                        <svg className="w-10 h-14 opacity-75 shrink-0" viewBox="0 0 40 60">
                            <rect x="12" y="10" width="16" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                            <rect x="15" y="15" width="10" height="25" rx="2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
                            {/* Wheels */}
                            <rect x="8" y="15" width="4" height="8" rx="1.5" fill="rgba(255,255,255,0.3)" />
                            <rect x="28" y="15" width="4" height="8" rx="1.5" fill="rgba(255,255,255,0.3)" />
                            <rect x="8" y="37" width="4" height="8" rx="1.5" fill="rgba(255,255,255,0.3)" />
                            <rect x="28" y="37" width="4" height="8" rx="1.5" fill="rgba(255,255,255,0.3)" />
                        </svg>
                        <div className="flex flex-col gap-0.5 text-[7px] font-mono text-white/60">
                            <div className="flex justify-between gap-2"><span>FL:</span><span className="font-bold text-emerald-400">3.1</span></div>
                            <div className="flex justify-between gap-2"><span>FR:</span><span className="font-bold text-emerald-400">3.1</span></div>
                            <div className="flex justify-between gap-2"><span>RL:</span><span className="font-bold text-emerald-400">3.1</span></div>
                            <div className="flex justify-between gap-2"><span>RR:</span><span className="font-bold text-amber-400">3.0</span></div>
                        </div>
                    </div>
                </div>

                {/* Navigation Destination Search Widget */}
                <div className="w-40 bg-slate-950/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-xl flex flex-col gap-1.5 select-none pointer-events-auto justify-center">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Navigate..." 
                            disabled
                            className="w-full bg-slate-900/80 border border-white/5 rounded-lg px-6 py-0.5 text-[8px] text-white/70 font-sans focus:outline-none placeholder-white/20"
                        />
                        <Search size={8} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                    </div>
                    <div className="flex gap-1">
                        <button className="flex-1 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-0.5 font-mono text-[7px] text-white/70">
                            <Navigation size={8} className="text-amber-400" />
                            <span>Home</span>
                        </button>
                        <button className="flex-1 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-0.5 font-mono text-[7px] text-white/70">
                            <Navigation size={8} className="text-cyan-400" />
                            <span>Work</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Climate control bar */}
            <div className="absolute bottom-2 inset-x-2 flex justify-between items-center bg-slate-950/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-2xl shadow-xl pointer-events-auto z-10">
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setSandboxOpen(!sandboxOpen)} 
                        className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                        title="Radar configuration settings"
                    >
                        <Settings size={13} />
                    </button>
                    <button className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all">
                        <Music size={13} className="text-emerald-400" />
                    </button>
                    <button className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all">
                        <Phone size={13} className="text-cyan-400" />
                    </button>
                </div>

                {/* Climate Display Dial */}
                <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-lg">
                    <button 
                        onClick={() => setClimateTemp(prev => Math.max(18.0, prev - 0.5))}
                        className="text-white/60 hover:text-white font-mono text-xs font-black transition-all px-1"
                    >
                        -
                    </button>
                    <div className="flex items-center gap-0.5 select-none">
                        <Thermometer size={11} className="text-amber-500" />
                        <span className="font-mono text-[10px] font-black text-white">{climateTemp.toFixed(1)}°C</span>
                    </div>
                    <button 
                        onClick={() => setClimateTemp(prev => Math.min(26.0, prev + 0.5))}
                        className="text-white/60 hover:text-white font-mono text-xs font-black transition-all px-1"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center gap-1 font-mono text-[8px] text-slate-500 font-bold uppercase">
                    <Wind size={11} className="text-slate-400" />
                    <span>Fan 3</span>
                </div>
            </div>

            {/* Sandbox Developer Controls drawer (Floats over bottom climate bar when active) */}
            {sandboxOpen && (
                <div className="absolute bottom-16 inset-x-4 bg-slate-950/95 border border-white/10 rounded-2xl p-4 space-y-3 font-sans z-20 shadow-2xl animate-slide-up">
                    <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <h4 className="font-mono font-black text-[10px] text-white uppercase tracking-widest flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                            Simulation Radar Controller
                        </h4>
                        <button 
                            onClick={() => setSandboxOpen(false)}
                            className="text-white/40 hover:text-white font-mono text-[9px] font-bold transition-all"
                        >
                            [Close]
                        </button>
                    </div>

                    {/* Mode selector */}
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setUseSandboxData(true)}
                            className={`py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-wider font-black border transition-all ${useSandboxData ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-white/50 border-white/5 hover:text-white'}`}
                        >
                            Simulated Traffic
                        </button>
                        <button 
                            onClick={() => {
                                setUseSandboxData(false);
                                if (!voiceMuted) speakWarning("System: Real-time Socket.IO telemetry feed engaged.");
                            }}
                            className={`py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-wider font-black border transition-all ${!useSandboxData ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-white/50 border-white/5 hover:text-white'}`}
                        >
                            Real Socket Feeds
                        </button>
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <p className="text-[7px] text-white/40 uppercase tracking-widest font-mono font-bold mb-1">Select Scenario Presets</p>
                        <div className="grid grid-cols-4 gap-1.5">
                            {(Object.keys(presets) as PresetType[]).map((key) => {
                                const preset = presets[key];
                                const isActive = activePreset === key;
                                return (
                                    <button 
                                        key={key}
                                        onClick={() => applyPreset(key)}
                                        className={`flex items-center justify-center gap-1 p-1 rounded-lg text-[8px] font-bold border transition-all ${isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-900 text-white/40 border-white/5 hover:bg-slate-800'}`}
                                    >
                                        {preset.icon}
                                        <span>{preset.name.split(' ')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-2 pt-0.5">
                        <div>
                            <div className="flex justify-between text-[8px] font-mono text-white/60 mb-0.5">
                                <span>OWN SPEED VELOCITY</span>
                                <span className="text-white font-bold">{ownSpeed} KM/H</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={ownSpeed} 
                                onChange={(e) => setOwnSpeed(Number(e.target.value))}
                                className="w-full accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-[8px] font-mono text-white/60 mb-0.5">
                                <span>STEERING YAW OFFSET</span>
                                <span className="text-white font-bold">{ownSteer > 0 ? `Right (+${ownSteer})` : ownSteer < 0 ? `Left (${ownSteer})` : 'Center'}</span>
                            </div>
                            <input 
                                type="range" 
                                min="-10" 
                                max="10" 
                                step="0.5"
                                value={ownSteer} 
                                onChange={(e) => setOwnSteer(Number(e.target.value))}
                                className="w-full accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
