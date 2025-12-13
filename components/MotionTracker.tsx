
import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Activity, Settings2, Play, Pause, AlertCircle } from 'lucide-react';
import { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type MotionState = 'RESTING' | 'SQUEEZING' | 'MOVING';

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  const [status, setStatus] = useState<MotionState>('RESTING');
  const [reps, setReps] = useState(0);
  const [sensitivity, setSensitivity] = useState(50); // 0-100
  const [debugVal, setDebugVal] = useState(0); // Current Variance
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs for high-speed logic (avoiding re-renders)
  const bufferRef = useRef<number[]>([]);
  const stateRef = useRef<MotionState>('RESTING');
  const stateDurationRef = useRef<number>(0);
  const lastStateTimeRef = useRef<number>(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphDataRef = useRef<number[]>(new Array(100).fill(0));
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const repCycleRef = useRef<{ moved: boolean, squeezed: boolean }>({ moved: false, squeezed: false });

  // Constants based on sensitivity slider
  // Squeeze Threshold: Low enough to catch trembling, high enough to ignore table vibrations
  const getSqueezeThreshold = () => 0.05 + ((100 - sensitivity) / 100) * 0.5; 
  const MOVE_THRESHOLD = 2.0; // High variance means big movement

  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    
    startSensors();
    
    // Animation Loop for Graph
    let animId: number;
    const draw = () => {
        renderGraph();
        animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
        stopSensors();
        cancelAnimationFrame(animId);
    };
  }, []);

  const speak = (text: string, force = false) => {
      if (!synthRef.current || isPaused) return;
      if (synthRef.current.speaking && !force) return;
      
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.2;
      u.pitch = 1.1;
      synthRef.current.speak(u);
  };

  const startSensors = () => {
      // iOS 13+ Permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          (DeviceMotionEvent as any).requestPermission()
              .then((response: string) => {
                  if (response === 'granted') {
                      window.addEventListener('devicemotion', handleMotion);
                  }
              })
              .catch(console.error);
      } else {
          window.addEventListener('devicemotion', handleMotion);
      }
  };

  const stopSensors = () => {
      window.removeEventListener('devicemotion', handleMotion);
  };

  const handleMotion = (event: DeviceMotionEvent) => {
      if (isPaused) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      // 1. Calculate Magnitude (Raw Energy)
      // We subtract gravity roughly (9.8) or just rely on Variance handling static offsets automatically.
      // Variance = Spread from mean. Static gravity (9.8 constant) has 0 variance.
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x*x + y*y + z*z);

      // 2. Add to Buffer (Window of ~20 frames / 300ms)
      bufferRef.current.push(magnitude);
      if (bufferRef.current.length > 20) bufferRef.current.shift();

      // 3. Calculate Variance (The "Jitter")
      // Mean
      const sum = bufferRef.current.reduce((a, b) => a + b, 0);
      const mean = sum / bufferRef.current.length;
      // Variance
      const variance = bufferRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bufferRef.current.length;
      
      // Update Graph Data
      graphDataRef.current.push(variance);
      if (graphDataRef.current.length > 100) graphDataRef.current.shift();
      
      // Update Debug UI occasionally
      if (Math.random() > 0.9) setDebugVal(variance);

      // 4. Determine State
      const squeezeThresh = getSqueezeThreshold();
      let newState: MotionState = 'RESTING';

      if (variance > MOVE_THRESHOLD) {
          newState = 'MOVING';
      } else if (variance > squeezeThresh) {
          newState = 'SQUEEZING';
      } else {
          newState = 'RESTING';
      }

      // 5. State Machine Logic
      const now = Date.now();
      const timeInState = now - lastStateTimeRef.current;

      if (newState !== stateRef.current) {
          handleStateChange(stateRef.current, newState, timeInState);
          stateRef.current = newState;
          lastStateTimeRef.current = now;
          setStatus(newState);
      } else {
          // Continuous State Logic
          if (newState === 'SQUEEZING' && timeInState > 3000 && timeInState < 3100) {
              speak("Perfect control.");
          }
          if (newState === 'RESTING' && timeInState > 3000 && timeInState < 3100 && reps > 0 && reps < targetReps) {
              speak("Don't stop.");
          }
      }
  };

  const handleStateChange = (prev: MotionState, next: MotionState, duration: number) => {
      // Rep Counting Logic:
      // A rep is: MOVING -> (Maybe SQUEEZING) -> MOVING -> RESTING
      // Simple logic: If we come from MOVING and go to RESTING/SQUEEZING, check if we did enough work.
      
      if (next === 'MOVING') {
          repCycleRef.current.moved = true;
      }
      
      if (next === 'SQUEEZING') {
          repCycleRef.current.squeezed = true;
          if (prev === 'MOVING') speak("Hold that squeeze.");
      }

      if (prev === 'SQUEEZING' && next === 'RESTING') {
          // If squeezed for very short time
          if (duration < 500) speak("Don't drop it yet!");
      }

      // End of Rep Logic:
      // If we go to RESTING after having MOVED significantly
      if (next === 'RESTING' && repCycleRef.current.moved) {
          // Debounce rapid state flicks
          if (prev === 'MOVING' || prev === 'SQUEEZING') {
             const newReps = reps + 1;
             setReps(newReps);
             onRepCount(newReps);
             
             const remaining = targetReps - newReps;
             if (remaining === 0) speak("Set Complete!", true);
             else speak(newReps.toString(), true);
             
             // Reset Cycle
             repCycleRef.current = { moved: false, squeezed: false };
          }
      }
  };

  const renderGraph = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const w = cvs.width;
      const h = cvs.height;
      const data = graphDataRef.current;

      ctx.clearRect(0, 0, w, h);
      
      // Draw Zones
      const squeezeY = h - (getSqueezeThreshold() * 50); // Scale factor for viz
      const moveY = h - (MOVE_THRESHOLD * 50);
      
      // Zone Backgrounds
      ctx.fillStyle = '#1e293b'; // Resting (Bottom)
      ctx.fillRect(0, squeezeY, w, h - squeezeY);
      
      ctx.fillStyle = '#1a2e05'; // Squeezing (Middle) - Dark Green
      ctx.fillRect(0, moveY, w, squeezeY - moveY);
      
      ctx.fillStyle = '#2a1a05'; // Moving (Top) - Dark Orange
      ctx.fillRect(0, 0, w, moveY);

      // Draw Threshold Lines
      ctx.strokeStyle = '#4ade80'; // Green Line (Squeeze Threshold)
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, squeezeY);
      ctx.lineTo(w, squeezeY);
      ctx.stroke();
      
      ctx.strokeStyle = '#f97316'; // Orange Line (Move Threshold)
      ctx.beginPath();
      ctx.moveTo(0, moveY);
      ctx.lineTo(w, moveY);
      ctx.stroke();

      // Draw Signal Line
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < data.length; i++) {
          const x = (i / data.length) * w;
          // Scale variance for display (multiply by 50 is arbitrary to make it visible)
          const y = h - (data[i] * 50); 
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.stroke();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col">
       {/* HEADER */}
       <div className="p-4 bg-gym-800 border-b border-gym-700 flex justify-between items-center">
           <div>
               <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
               <p className="text-xs text-gray-400">Jitter Engine Active</p>
           </div>
           <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
       </div>

       {/* GRAPH VISUALIZER */}
       <div className="relative h-48 w-full bg-black">
           <canvas 
             ref={canvasRef} 
             width={window.innerWidth} 
             height={192} 
             className="w-full h-full"
           />
           <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500">
               VAR: {debugVal.toFixed(4)}
           </div>
           <div className="absolute top-2 right-2 flex gap-2">
               <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'MOVING' ? 'bg-orange-500 text-white' : 'bg-gym-800 text-gray-500'}`}>MOVE</span>
               <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'SQUEEZING' ? 'bg-green-500 text-white' : 'bg-gym-800 text-gray-500'}`}>SQUEEZE</span>
               <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'RESTING' ? 'bg-blue-500 text-white' : 'bg-gym-800 text-gray-500'}`}>REST</span>
           </div>
       </div>

       {/* CONTROLS */}
       <div className="flex-1 p-6 flex flex-col items-center">
           
           {/* Rep Counter */}
           <div className="mb-8 text-center relative">
               <div className={`text-9xl font-black transition-colors duration-200 ${
                   status === 'MOVING' ? 'text-orange-500' :
                   status === 'SQUEEZING' ? 'text-green-500' : 'text-gray-700'
               }`}>
                   {reps}
               </div>
               <p className="text-gray-500 font-bold tracking-widest uppercase mt-2">Repetitions</p>
           </div>

           {/* Sensitivity Slider */}
           <div className="w-full max-w-xs bg-gym-800 p-4 rounded-xl border border-gym-700">
               <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2 text-white font-bold">
                       <Settings2 size={16} className="text-gym-accent" />
                       Squeeze Sensitivity
                   </div>
                   <span className="text-gym-accent">{sensitivity}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="100" 
                 value={sensitivity} 
                 onChange={(e) => setSensitivity(Number(e.target.value))}
                 className="w-full h-2 bg-gym-900 rounded-lg appearance-none cursor-pointer accent-gym-accent"
               />
               <p className="text-xs text-gray-500 mt-2">
                   Higher = Easier to trigger "Squeeze". Lower = Requires more shaking.
               </p>
           </div>

           {/* Status Message */}
           <div className="mt-8 flex items-center gap-3 animate-pulse">
               {status === 'SQUEEZING' && (
                   <>
                     <Activity className="text-green-500" /> 
                     <span className="text-green-400 font-bold text-lg">HOLD THAT TENSION...</span>
                   </>
               )}
               {status === 'MOVING' && (
                   <span className="text-orange-400 font-bold text-lg">MOVING WEIGHT...</span>
               )}
               {status === 'RESTING' && (
                   <span className="text-gray-500 font-bold">READY</span>
               )}
           </div>

           {/* Instructions */}
           {reps === 0 && (
               <div className="mt-auto mb-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 text-left">
                   <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                   <p className="text-xs text-yellow-200">
                       <b>How to use:</b> This sensor detects muscle tremors (jitter). 
                       When you lift, the line goes Orange. When you hold/squeeze, the line should be Green (shaky). If it's Blue, you are too still (increase sensitivity).
                   </p>
               </div>
           )}

       </div>

       {/* Footer Controls */}
       <div className="p-4 bg-gym-800 border-t border-gym-700 flex gap-4">
           <button 
             onClick={() => setIsPaused(!isPaused)}
             className="flex-1 py-4 bg-gym-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
           >
               {isPaused ? <Play size={20}/> : <Pause size={20}/>} {isPaused ? 'Resume' : 'Pause'}
           </button>
           <button 
             onClick={onClose}
             className="flex-1 py-4 bg-red-600/20 text-red-500 border border-red-500/50 font-bold rounded-xl"
           >
               Stop Sensor
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
