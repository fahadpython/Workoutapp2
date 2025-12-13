
import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Activity, Zap, Play, Pause, RotateCcw, Target, Settings2, CheckCircle } from 'lucide-react';
import { Exercise } from '../types';
import StickFigure from './StickFigure';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type Phase = 'ECCENTRIC' | 'CONCENTRIC' | 'HOLD' | 'REST';

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  // --- STATE ---
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState<Phase>('REST');
  const [gForce, setGForce] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<'IDLE' | 'RECORDING' | 'DONE'>('IDLE');
  const [thresholds, setThresholds] = useState({ high: 1.25, low: 1.05, sensitivity: 1.0 });

  // --- REFS (High Speed Logic) ---
  const stateRef = useRef({
    isActive: false,
    lastRepTime: 0,
    peakForce: 0,
    lowSignalStart: 0 as number | null
  });
  
  const calibRef = useRef({
    maxG: 0,
    minG: 10,
    samples: [] as number[]
  });

  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- AUDIO FEEDBACK ---
  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    startSensors();
    return () => stopSensors();
  }, []);

  const speak = (text: string, force = false) => {
    if (!synthRef.current || isPaused) return;
    if (synthRef.current.speaking && !force) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.3;
    u.pitch = 1.1;
    synthRef.current.speak(u);
  };

  // --- SENSOR ENGINE ---
  const startSensors = () => {
    // iOS Permission Request
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission()
            .then((res: string) => {
                if (res === 'granted') window.addEventListener('devicemotion', handleMotion);
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

    // 1. Calculate Magnitude (G-Force)
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    // Simple smoothing (Low Pass Filter)
    const rawMag = Math.sqrt(x*x + y*y + z*z) / 9.81;
    
    // Update UI (throttled)
    if (Math.random() > 0.7) setGForce(rawMag);

    // --- CALIBRATION LOGIC ---
    if (isCalibrating) {
        if (calibrationStep === 'RECORDING') {
            calibRef.current.maxG = Math.max(calibRef.current.maxG, rawMag);
            calibRef.current.minG = Math.min(calibRef.current.minG, rawMag);
        }
        return;
    }

    // --- REP COUNTING LOGIC (The State Machine) ---
    const now = Date.now();
    const { high, low } = thresholds;

    // Detect Phases based on G-Force relative to thresholds
    // High G = Moving Weight (Concentric/Eccentric turnaround)
    // ~1 G = Holding/Resting
    // < 1 G = Dropping/Lowering fast

    let currentPhase: Phase = 'REST';
    if (rawMag > high) currentPhase = 'CONCENTRIC';
    else if (rawMag < low) currentPhase = 'ECCENTRIC'; // Controlled lowering often reduces G slightly below 1 or spikes if messy
    else currentPhase = 'HOLD';

    if (currentPhase !== phase) setPhase(currentPhase);

    // Schmitt Trigger for Reps
    if (!stateRef.current.isActive) {
        // START CONDITION: Exceed High Threshold
        if (rawMag > high) {
            stateRef.current.isActive = true;
            stateRef.current.peakForce = rawMag;
            stateRef.current.lowSignalStart = null;
            
            // Audio Cue based on motion type
            if (exercise.motionType === 'press') speak("Drive!");
            else if (exercise.motionType === 'pull') speak("Pull!");
            else speak("Go!");
        }
    } else {
        // ACTIVE REP
        stateRef.current.peakForce = Math.max(stateRef.current.peakForce, rawMag);

        // END CONDITION: Signal drops to baseline (HOLD/REST) for debounce period
        if (rawMag < (high + low) / 2) { 
            if (!stateRef.current.lowSignalStart) {
                stateRef.current.lowSignalStart = now;
            } else if (now - stateRef.current.lowSignalStart > 400) {
                // Rep Completed
                completeRep();
            }
        } else {
            // Signal spiked again, reset drop timer
            stateRef.current.lowSignalStart = null;
        }

        // AUTO RESET (Stuck protection - 5s limit)
        if (stateRef.current.lowSignalStart && (now - stateRef.current.lowSignalStart > 5000)) {
             stateRef.current.isActive = false; // Silent reset
        }
    }
  };

  const completeRep = () => {
      stateRef.current.isActive = false;
      stateRef.current.lowSignalStart = null;
      
      const newCount = reps + 1;
      setReps(newCount);
      onRepCount(newCount);
      
      // Analyze the rep quality based on Peak Force
      const effort = stateRef.current.peakForce;
      if (effort > thresholds.high * 1.5) speak(`${newCount}. Explosive!`, true);
      else speak(String(newCount), true);

      // Reset peak
      stateRef.current.peakForce = 0;

      if (newCount >= targetReps) speak("Set Complete");
  };

  // --- CALIBRATION HANDLERS ---
  const startCalibration = () => {
      setIsCalibrating(true);
      setCalibrationStep('RECORDING');
      calibRef.current = { maxG: 0, minG: 10, samples: [] };
      speak("Do one full rep now.");
      
      // Stop recording after 3 seconds
      setTimeout(() => {
          finishCalibration();
      }, 3000);
  };

  const finishCalibration = () => {
      const { maxG } = calibRef.current;
      
      // Safety defaults if user didn't move
      let newHigh = 1.25;
      let newLow = 1.05;

      if (maxG > 1.1) {
          // Dynamic Threshold Calculation
          // If Max is 1.5G, High Thresh = 1.3G (approx)
          newHigh = 1.0 + ((maxG - 1.0) * 0.6); 
          newLow = 1.0 + ((maxG - 1.0) * 0.1); 
      }

      setThresholds({ ...thresholds, high: newHigh, low: newLow });
      setCalibrationStep('DONE');
      setIsCalibrating(false);
      speak("Calibrated. Start your set.");
  };

  const getPhaseColor = () => {
      switch(phase) {
          case 'CONCENTRIC': return 'text-orange-500';
          case 'ECCENTRIC': return 'text-blue-500';
          case 'HOLD': return 'text-green-500';
          default: return 'text-gray-500';
      }
  };

  const getPhaseText = () => {
       switch(phase) {
          case 'CONCENTRIC': return exercise.motionType === 'press' ? 'PUSH!' : 'PULL!';
          case 'ECCENTRIC': return 'CONTROL';
          case 'HOLD': return 'SQUEEZE';
          default: return 'READY';
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col">
       {/* HEADER */}
       <div className="p-4 bg-gym-800 border-b border-gym-700 flex justify-between items-center">
           <div>
               <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
               <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                  <Activity size={10} className="text-gym-accent" /> AI SENSOR V2
               </p>
           </div>
           <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
       </div>

       {/* MAIN CONTENT */}
       <div className="flex-1 flex flex-col items-center p-4 relative overflow-hidden">
           
           {/* BIO-MECHANIC ANIMATION (Restored) */}
           <div className="w-full max-w-xs mb-6 relative">
               <StickFigure 
                 motionType={exercise.motionType} 
                 exerciseName={exercise.name}
                 muscleSplit={exercise.muscleSplit}
                 // If not moving, pause animation, otherwise loop it to guide tempo
                 pacer={phase !== 'REST' ? exercise.pacer : undefined} 
               />
               
               {/* Overlay Phase Text */}
               <div className="absolute top-2 left-0 right-0 text-center">
                   <span className={`text-2xl font-black italic tracking-tighter animate-pulse ${getPhaseColor()}`}>
                       {getPhaseText()}
                   </span>
               </div>
           </div>

           {/* REP COUNTER */}
           <div className="text-center mb-6 relative z-10">
               <div className={`text-8xl font-black transition-colors duration-100 ${
                   phase === 'CONCENTRIC' ? 'text-white scale-110' : 'text-gray-200'
               }`}>
                   {reps}
               </div>
               <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Repetitions</p>
           </div>

           {/* SENSOR DATA & CALIBRATION */}
           <div className="w-full max-w-xs bg-gym-800 p-4 rounded-xl border border-gym-700">
               <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                       <Zap size={16} className={gForce > thresholds.high ? "text-orange-500" : "text-gray-500"} />
                       <span className="text-xs font-mono text-gray-400">Force: {gForce.toFixed(2)}G</span>
                   </div>
                   {calibrationStep === 'DONE' && (
                       <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                           <CheckCircle size={10} /> Calibrated
                       </span>
                   )}
               </div>

               {/* Force Bar */}
               <div className="w-full h-3 bg-gym-900 rounded-full overflow-hidden relative mb-4">
                   {/* Threshold Marker */}
                   <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(thresholds.high / 2.5) * 100}%` }}></div>
                   <div 
                     className={`h-full transition-all duration-75 ${gForce > thresholds.high ? 'bg-orange-500' : 'bg-gym-accent'}`}
                     style={{ width: `${Math.min((gForce / 2.5) * 100, 100)}%` }}
                   ></div>
               </div>

               {/* Calibration Button */}
               {isCalibrating ? (
                   <button 
                     disabled
                     className="w-full py-3 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg text-sm font-bold animate-pulse"
                   >
                       Do 1 Rep Now...
                   </button>
               ) : (
                   <button 
                     onClick={startCalibration}
                     className="w-full py-3 bg-gym-700 hover:bg-gym-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                   >
                       <Settings2 size={16} /> {calibrationStep === 'DONE' ? 'Recalibrate' : 'Calibrate Sensor'}
                   </button>
               )}
               <p className="text-[10px] text-gray-500 mt-2 text-center">
                   Tap Calibrate and do 1 rep to fix stuck counters.
               </p>
           </div>

       </div>

       {/* FOOTER CONTROLS */}
       <div className="p-4 bg-gym-800 border-t border-gym-700 flex gap-4">
           <button 
             onClick={() => { setReps(0); onRepCount(0); }}
             className="p-4 bg-gym-700 rounded-xl text-white hover:bg-gym-600"
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
             className="flex-1 py-4 bg-red-600/20 text-red-500 border border-red-500/50 font-bold rounded-xl"
           >
               Done
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
