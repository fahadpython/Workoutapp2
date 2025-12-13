
import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Activity, Zap, Play, Pause, RotateCcw, Crosshair } from 'lucide-react';
import { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type TrackerState = 'IDLE' | 'LIFTING' | 'HOLDING' | 'LOWERING';

interface RepStats {
    duration: number;
    peakForce: number;
}

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  // UI State
  const [status, setStatus] = useState<TrackerState>('IDLE');
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<string>("Ready");
  const [debugSignal, setDebugSignal] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Logic Refs (The "State Machine" Memory)
  const stateRef = useRef<TrackerState>('IDLE');
  const repStartTimeRef = useRef<number>(0);
  const lastPeakTimeRef = useRef<number>(0);
  const peakForceRef = useRef<number>(0);
  const lowSignalStartRef = useRef<number | null>(null);
  
  // Calibration Data (Rep 1 is Baseline)
  const baselineRef = useRef<RepStats | null>(null);
  
  // Audio
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastSpeakTime = useRef(0);

  // Constants
  const GRAVITY = 9.81;
  const THRESHOLD_HIGH = 1.25; // 1.25G to start (Solid movement)
  const THRESHOLD_LOW = 1.15;  // 1.15G to consider "still" (breathing room)
  const DEBOUNCE_TIME = 800;   // 800ms quiet to confirm rep end
  const SQUEEZE_WINDOW = 1000; // If quiet within 1s of peak -> Squeeze
  const MAX_REP_DURATION = 6000; // 6s max before auto-reset

  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    startSensors();
    return () => stopSensors();
  }, []);

  // --- AUDIO ENGINE ---
  const speak = (text: string, force = false) => {
      if (!synthRef.current || isPaused) return;
      const now = Date.now();
      if (!force && now - lastSpeakTime.current < 2000) return; // Don't spam
      
      lastSpeakTime.current = now;
      synthRef.current.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.2;
      u.volume = 1.0;
      synthRef.current.speak(u);
  };

  // --- SENSOR LOGIC ---
  const startSensors = () => {
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

      // 1. Universal Metric: Normalized G-Force
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const rawMag = Math.sqrt(x*x + y*y + z*z);
      const gForce = rawMag / GRAVITY; // 1.0 = Still (Gravity only)

      // Debug View (Throttle updates)
      if (Math.random() > 0.8) setDebugSignal(gForce);

      processStateMachine(gForce);
  };

  const processStateMachine = (mag: number) => {
      const now = Date.now();
      const currentState = stateRef.current;

      // Track Peak Force during the active rep
      if (currentState !== 'IDLE' && mag > peakForceRef.current) {
          peakForceRef.current = mag;
          lastPeakTimeRef.current = now;
      }

      // --- STATE MACHINE ---
      switch (currentState) {
          case 'IDLE':
              // START CONDITION: Significant movement
              if (mag > THRESHOLD_HIGH) {
                  transitionTo('LIFTING', now);
                  speak("Up");
              }
              break;

          case 'LIFTING':
              // Moving the weight...
              if (mag < THRESHOLD_LOW) {
                  // Signal dropped. Start counting "Quiet Time"
                  if (!lowSignalStartRef.current) lowSignalStartRef.current = now;
                  
                  const quietDuration = now - lowSignalStartRef.current;

                  // SQUEEZE DETECTOR:
                  // If we just had a peak (<1s ago) and now it's quiet -> We are holding at top
                  if (quietDuration > 300 && (now - lastPeakTimeRef.current) < SQUEEZE_WINDOW) {
                      transitionTo('HOLDING', now);
                      speak("Hold...");
                  }
                  // END REP DETECTOR (If no squeeze happening):
                  else if (quietDuration > DEBOUNCE_TIME) {
                      completeRep(now);
                  }
              } else {
                  // Signal high again, reset quiet timer
                  lowSignalStartRef.current = null;
              }
              break;

          case 'HOLDING':
              // User is Squeezing...
              if (mag > THRESHOLD_HIGH) {
                  // Signal Spikes -> Moving to Eccentric (Lowering)
                  transitionTo('LOWERING', now);
                  lowSignalStartRef.current = null;
              } else if (mag < THRESHOLD_LOW) {
                  // Still holding... or done?
                  if (!lowSignalStartRef.current) lowSignalStartRef.current = now;
                  
                  // If held/quiet for too long (> 1.5s), assume rep is done (dropped weight)
                  if ((now - lowSignalStartRef.current) > 1500) {
                      completeRep(now);
                  }
              }
              break;

          case 'LOWERING':
              // Eccentric phase
              if (mag < THRESHOLD_LOW) {
                  if (!lowSignalStartRef.current) lowSignalStartRef.current = now;
                  if ((now - lowSignalStartRef.current) > DEBOUNCE_TIME) {
                      completeRep(now);
                  }
              } else {
                  lowSignalStartRef.current = null;
              }
              break;
      }

      // FAIL SAFE: Auto-reset if stuck in active state too long
      if (currentState !== 'IDLE' && (now - repStartTimeRef.current) > MAX_REP_DURATION) {
          // If we had decent force, count it. If not, discard.
          if (peakForceRef.current > 1.3) completeRep(now);
          else resetMachine();
      }
  };

  const transitionTo = (newState: TrackerState, now: number) => {
      stateRef.current = newState;
      setStatus(newState);
      
      if (newState === 'LIFTING') {
          repStartTimeRef.current = now;
          peakForceRef.current = 0;
          lowSignalStartRef.current = null;
          setFeedback("Drive!");
      }
      if (newState === 'HOLDING') {
          setFeedback("Squeezing...");
      }
      if (newState === 'LOWERING') {
          setFeedback("Control Down");
      }
  };

  const completeRep = (now: number) => {
      const duration = now - repStartTimeRef.current;
      const peak = peakForceRef.current;

      // --- AUTO CALIBRATION LOGIC ---
      let feedbackMsg = "Good Rep";
      let voiceCue = String(reps + 1);

      if (reps === 0) {
          // REP 1: Set Baseline
          baselineRef.current = { duration, peakForce: peak };
          feedbackMsg = "Baseline Set";
          voiceCue = "One. Calibrated.";
      } else if (baselineRef.current) {
          // REP 2+: Compare
          const base = baselineRef.current;
          
          // Check Tempo
          if (duration > base.duration * 1.5) {
              feedbackMsg = "Too Slow! Speed Up!";
              voiceCue = "Speed up!";
          } 
          // Check Intensity
          else if (peak < base.peakForce * 0.85) {
              feedbackMsg = "Weak! Push Harder!";
              voiceCue = "Push harder!";
          }
      }

      // Update State
      const newReps = reps + 1;
      setReps(newReps);
      onRepCount(newReps);
      setFeedback(feedbackMsg);
      speak(voiceCue, true);

      // Reset
      resetMachine();

      // Check Target
      if (newReps >= targetReps) {
          speak("Set Complete", true);
      }
  };

  const resetMachine = () => {
      stateRef.current = 'IDLE';
      setStatus('IDLE');
      lowSignalStartRef.current = null;
      peakForceRef.current = 0;
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col">
       {/* Header */}
       <div className="p-4 bg-gym-800 border-b border-gym-700 flex justify-between items-center">
           <div>
               <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
               <p className="text-xs text-green-400 font-mono flex items-center gap-1">
                   <Zap size={10} /> ADAPTIVE ENGINE ACTIVE
               </p>
           </div>
           <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
       </div>

       {/* MAIN VISUALIZER */}
       <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
           
           {/* Animated Background Pulse based on Signal */}
           <div 
             className="absolute rounded-full bg-gym-accent/10 transition-all duration-75 ease-linear"
             style={{ 
                 width: `${debugSignal * 100}px`, 
                 height: `${debugSignal * 100}px`,
                 opacity: Math.max(0, (debugSignal - 1) * 2) 
             }}
           ></div>

           {/* Rep Counter */}
           <div className="z-10 text-center mb-8">
               <h1 className={`text-9xl font-black transition-colors ${
                   status === 'LIFTING' ? 'text-blue-500' :
                   status === 'HOLDING' ? 'text-green-500' :
                   status === 'LOWERING' ? 'text-orange-500' : 'text-white'
               }`}>
                   {reps}
               </h1>
               <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Repetitions</p>
           </div>

           {/* Feedback Pill */}
           <div className={`z-10 px-6 py-3 rounded-full border-2 font-bold text-lg animate-pulse transition-colors ${
               status === 'IDLE' ? 'border-gray-700 bg-gray-800 text-gray-400' :
               status === 'HOLDING' ? 'border-green-500 bg-green-500/20 text-green-400' :
               'border-blue-500 bg-blue-500/20 text-blue-400'
           }`}>
               {feedback}
           </div>

           {/* DEBUG CONSOLE (Visual Debugger) */}
           <div className="mt-12 w-64 bg-black/50 p-4 rounded-lg font-mono text-xs text-left space-y-2 border border-white/10">
               <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                   <span className="text-gray-400">DEBUGGER</span>
                   <Activity size={12} className="text-green-400" />
               </div>
               <div className="flex justify-between">
                   <span className="text-gray-500">STATE:</span>
                   <span className={`font-bold ${status === 'IDLE' ? 'text-gray-300' : 'text-yellow-400'}`}>{status}</span>
               </div>
               <div className="flex justify-between">
                   <span className="text-gray-500">SIGNAL:</span>
                   <span className="text-blue-300">{debugSignal.toFixed(3)} G</span>
               </div>
               <div className="flex justify-between">
                   <span className="text-gray-500">PEAK:</span>
                   <span className="text-red-300">{peakForceRef.current.toFixed(2)} G</span>
               </div>
               {baselineRef.current && (
                   <div className="pt-2 mt-2 border-t border-white/10">
                       <p className="text-gray-500 text-[10px] mb-1">REP 1 BASELINE:</p>
                       <div className="flex justify-between">
                           <span>Force: {baselineRef.current.peakForce.toFixed(2)}</span>
                           <span>Time: {(baselineRef.current.duration/1000).toFixed(1)}s</span>
                       </div>
                   </div>
               )}
           </div>
       </div>

       {/* Footer */}
       <div className="p-4 bg-gym-800 border-t border-gym-700 flex gap-4">
           <button 
             onClick={() => {
                 setReps(0);
                 resetMachine();
                 baselineRef.current = null;
                 setFeedback("Ready");
             }}
             className="p-4 bg-gym-700 rounded-xl text-white"
           >
               <RotateCcw size={24} />
           </button>
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
               Stop
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
