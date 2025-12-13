import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Smartphone, Activity, Zap, Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';
import { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  // --- UI STATE (Visuals only) ---
  const [reps, setReps] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE'>('IDLE');
  const [magnitudeDisplay, setMagnitudeDisplay] = useState(0);
  const [debugLog, setDebugLog] = useState<string>("Ready");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // --- LOGIC REFS (The Brain - No Re-renders) ---
  const isActive = useRef(false);
  const isCooldown = useRef(false);
  const startTime = useRef(0);
  const lowSignalStart = useRef<number | null>(null);
  const cooldownStart = useRef(0);
  const repCountRef = useRef(0);
  
  // Audio Ref
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- CONSTANTS (Tweakable) ---
  const GRAVITY = 9.81;
  const HIGH_THRESH = 1.25; // Trigger Start
  const LOW_THRESH = 1.05;  // Trigger End (must go below this)
  const RESET_DELAY = 500;  // Time below LOW_THRESH to confirm end
  const COOLDOWN_MS = 300;  // Ignore noise after rep
  const MAX_DURATION = 5000; // Safety Valve (5s max rep time)

  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    
    // Check if permission is needed (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      setPermissionGranted(true);
    }

    return () => stopSensors();
  }, []);

  const speak = (text: string) => {
    if (!synthRef.current || isPaused) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.5; // Fast cues
    u.pitch = 1.1;
    synthRef.current.speak(u);
  };

  const requestAccess = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          startSensors();
        } else {
          setDebugLog("Permission Denied");
        }
      } catch (e) {
        setDebugLog("Error requesting sensor");
      }
    } else {
      setPermissionGranted(true);
      startSensors();
    }
  };

  const startSensors = () => {
    window.addEventListener('devicemotion', handleMotion);
  };

  const stopSensors = () => {
    window.removeEventListener('devicemotion', handleMotion);
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    if (isPaused) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    // 1. Calculate Universal Magnitude (G-Force)
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    const rawMag = Math.sqrt(x*x + y*y + z*z);
    const gForce = rawMag / GRAVITY; // Normalized to 1.0G being still

    const now = Date.now();

    // 2. Update UI (Throttled for performance)
    if (Math.random() > 0.8) { // Update roughly every 5th frame (~12fps)
       setMagnitudeDisplay(gForce);
    }

    // 3. Safety Valve: Stuck Protection
    // If active for too long without completing, reset.
    if (isActive.current && (now - startTime.current > MAX_DURATION)) {
       resetLogic("Auto-Reset (Stuck)");
       return;
    }

    // 4. Cooldown Check
    if (isCooldown.current) {
        if (now - cooldownStart.current > COOLDOWN_MS) {
            isCooldown.current = false;
        } else {
            return; // Ignore signal
        }
    }

    // 5. Schmitt Trigger Logic
    if (!isActive.current) {
        // --- IDLE STATE ---
        // Look for HIGH trigger
        if (gForce > HIGH_THRESH) {
            isActive.current = true;
            startTime.current = now;
            lowSignalStart.current = null;
            
            setStatus('ACTIVE');
            setDebugLog("Rep Started");
            speak("Up"); // Audio Feedback
        }
    } else {
        // --- ACTIVE STATE ---
        // Look for LOW trigger (End of rep)
        if (gForce < LOW_THRESH) {
            // Signal is low. Start/Check Debounce Timer.
            if (!lowSignalStart.current) {
                lowSignalStart.current = now;
            } else if (now - lowSignalStart.current > RESET_DELAY) {
                // Signal stayed low long enough -> Rep Complete!
                completeRep();
            }
        } else {
            // Signal spiked again (still moving). Reset debounce.
            lowSignalStart.current = null;
        }
    }
  };

  const completeRep = () => {
      // Logic Reset
      isActive.current = false;
      lowSignalStart.current = null;
      isCooldown.current = true;
      cooldownStart.current = Date.now();
      
      // Update Count
      repCountRef.current += 1;
      const newCount = repCountRef.current;
      
      // Update UI / Parent
      setReps(newCount);
      onRepCount(newCount);
      setStatus('IDLE');
      setDebugLog("Rep Completed");
      speak(String(newCount)); // "One", "Two"...
      
      if (newCount >= targetReps) {
          speak("Set Complete");
      }
  };

  const resetLogic = (reason: string) => {
      isActive.current = false;
      lowSignalStart.current = null;
      setStatus('IDLE');
      setDebugLog(reason);
  };

  const manualReset = () => {
      setReps(0);
      repCountRef.current = 0;
      resetLogic("Manual Reset");
      onRepCount(0);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col">
       {/* HEADER */}
       <div className="p-4 bg-gym-800 border-b border-gym-700 flex justify-between items-center">
           <div>
               <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
               <p className="text-[10px] text-gray-400 font-mono">SCHMITT TRIGGER ENGINE</p>
           </div>
           <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
       </div>

       {/* CONTENT */}
       <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
           
           {!permissionGranted ? (
               <div className="text-center">
                   <Smartphone size={64} className="mx-auto text-gym-accent mb-4" />
                   <h2 className="text-2xl font-bold text-white mb-2">Sensor Access</h2>
                   <p className="text-gray-400 mb-6">We need motion data to count reps.</p>
                   <button 
                     onClick={requestAccess}
                     className="px-8 py-3 bg-gym-accent text-white font-bold rounded-xl shadow-lg hover:bg-blue-600"
                   >
                       Enable Sensors
                   </button>
               </div>
           ) : (
               <>
                   {/* STATUS INDICATOR */}
                   <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2 border ${
                       status === 'ACTIVE' 
                       ? 'bg-green-500/20 text-green-400 border-green-500/50 animate-pulse' 
                       : 'bg-gray-800 text-gray-500 border-gray-700'
                   }`}>
                       <div className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                       {status}
                   </div>

                   {/* REP COUNTER */}
                   <div className="text-center relative">
                       <h1 className="text-9xl font-black text-white tabular-nums tracking-tighter">
                           {reps}
                       </h1>
                       <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-2">Repetitions</p>
                   </div>

                   {/* MAGNITUDE VISUALIZER */}
                   <div className="w-full max-w-xs">
                       <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                           <span>FORCE</span>
                           <span>{magnitudeDisplay.toFixed(2)} G</span>
                       </div>
                       <div className="w-full h-4 bg-gym-800 rounded-full overflow-hidden border border-gym-700 relative">
                           {/* Threshold Markers */}
                           <div className="absolute top-0 bottom-0 w-0.5 bg-gray-600 z-10" style={{ left: `${(LOW_THRESH / 3) * 100}%` }}></div>
                           <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(HIGH_THRESH / 3) * 100}%` }}></div>
                           
                           {/* Bar */}
                           <div 
                             className={`h-full transition-all duration-100 ease-out ${magnitudeDisplay > HIGH_THRESH ? 'bg-gym-accent' : magnitudeDisplay > LOW_THRESH ? 'bg-orange-500' : 'bg-gray-600'}`}
                             style={{ width: `${Math.min((magnitudeDisplay / 3) * 100, 100)}%` }}
                           ></div>
                       </div>
                       <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                           <span>0G</span>
                           <span className="text-red-500 font-bold">START ({HIGH_THRESH})</span>
                           <span>3G</span>
                       </div>
                   </div>

                   {/* DEBUG LOG */}
                   <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-green-400 w-full max-w-xs text-center">
                       &gt; {debugLog}
                   </div>
               </>
           )}
       </div>

       {/* FOOTER */}
       <div className="p-4 bg-gym-800 border-t border-gym-700 flex gap-4">
           <button 
             onClick={manualReset}
             className="p-4 bg-gym-700 rounded-xl text-white hover:bg-gym-600"
             title="Reset Counter"
           >
               <RotateCcw size={24} />
           </button>
           <button 
             onClick={() => setIsPaused(!isPaused)}
             className={`flex-1 py-4 font-bold rounded-xl flex items-center justify-center gap-2 ${isPaused ? 'bg-yellow-600 text-white' : 'bg-gym-700 text-white'}`}
           >
               {isPaused ? <Play size={20}/> : <Pause size={20}/>}
               {isPaused ? 'Resume' : 'Pause'}
           </button>
           <button 
             onClick={onClose}
             className="flex-1 py-4 bg-red-600/20 text-red-500 border border-red-500/50 font-bold rounded-xl hover:bg-red-600/30"
           >
               Stop
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
