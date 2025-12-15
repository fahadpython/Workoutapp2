
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Wind, RotateCcw, Smartphone, Waves } from 'lucide-react';
import { Exercise, PacerPhase } from '../types';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  // --- STATE ---
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reps, setReps] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0); // Seconds
  const [isMuted, setIsMuted] = useState(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true); // Default to on
  const [timerSeconds, setTimerSeconds] = useState(0); // For timed exercises

  // --- REFS ---
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const requestRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartTimeRef = useRef(0);
  
  // Mutable state for the loop to access without closures
  const stateRef = useRef({ 
      phaseIdx: 0, 
      phaseDuration: 0,
      isPaused: false 
  });

  // --- INIT ---
  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    
    startCountdown();

    return () => {
        cancelAnimationFrame(requestRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // --- AUDIO & HAPTICS ---
  const speak = (text: string) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.3;
    u.pitch = 1.1;
    synthRef.current.speak(u);
  };

  const triggerHaptic = (pattern: number | number[]) => {
      if (!isHapticsEnabled || !navigator.vibrate) return;
      // Stop any existing vibration before starting new one
      navigator.vibrate(0);
      navigator.vibrate(pattern);
  };

  const getPhaseHapticPattern = (action: string): number[] => {
      const a = action.toUpperCase();

      // 1. ISOMETRIC (Holds/Squeezes/Stretches) -> "Rapid Flutter"
      // Feels like tension or shaking. Distinguishable from movement.
      if (['HOLD', 'SQUEEZE', 'STRETCH', 'PAUSE'].some(k => a.includes(k))) {
          // 50ms on, 50ms off, repeat 4 times
          return [50, 50, 50, 50, 50, 50, 50, 50]; 
      }

      // 2. ECCENTRIC (Lowering/Returning) -> "Double Thump" (Heartbeat)
      // Feels like a controlled metronome. "Bump-Bump".
      if (['LOWER', 'RELEASE', 'RETURN', 'DOWN', 'CONTROL', 'RESET'].some(k => a.includes(k))) {
          // 200ms on, 100ms off, 200ms on
          return [200, 100, 200];
      }

      // 3. CONCENTRIC (Explosive/Drive) -> "Solid Drive" (One Long Buzz)
      // Feels like power. One distinct long vibration.
      // Default for Press, Pull, Drive, Curl, Up, etc.
      return [400];
  };

  // --- LOGIC ---
  const startCountdown = () => {
      speak("Get Ready.");
      setTimeout(() => {
          speak("3"); triggerHaptic(50);
          setTimeout(() => {
              speak("2"); triggerHaptic(50);
              setTimeout(() => {
                  speak("1"); triggerHaptic(50);
                  setTimeout(() => {
                      speak("Go!"); triggerHaptic([100, 50, 400]); // Startup buzz
                      setIsActive(true);
                      
                      if (exercise.isTimed) {
                          startTimer();
                      } else {
                          startPacer();
                      }
                  }, 1000);
              }, 1000);
          }, 1000);
      }, 1000);
  };

  // --- TIMED EXERCISE LOGIC ---
  const startTimer = () => {
      setIsPaused(false);
      setTimerSeconds(0);
      
      timerRef.current = setInterval(() => {
          setTimerSeconds(prev => prev + 1);
          // Optional: Speak every 10s
          // if ((prev + 1) % 10 === 0) speak(String(prev + 1));
      }, 1000);

      // Start the breathing pacer in background just for visuals
      startPacer();
  };

  const stopTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
  };

  // --- PACER LOGIC ---
  const startPacer = () => {
    if (exercise.pacer.phases.length === 0) return;
    
    setIsPaused(false);
    stateRef.current.isPaused = false;
    
    // Initialize first phase
    runPhase(0);

    // Start Animation Loop
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const runPhase = (idx: number) => {
      const phases = exercise.pacer.phases;
      const phase = phases[idx];
      stateRef.current.phaseIdx = idx;
      stateRef.current.phaseDuration = phase.duration * 1000;
      
      setCurrentPhaseIndex(idx);
      phaseStartTimeRef.current = Date.now();

      // Audio Cue
      if (phase.voiceCue) speak(phase.voiceCue);
      
      // Smart Haptic Cue based on Action Type
      triggerHaptic(getPhaseHapticPattern(phase.action));
  };

  const gameLoop = () => {
      if (stateRef.current.isPaused) return;

      const now = Date.now();
      const elapsed = now - phaseStartTimeRef.current;
      const duration = stateRef.current.phaseDuration;
      const remainingMs = duration - elapsed;
      const remainingSec = Math.max(0, remainingMs / 1000);
      
      setPhaseTimeLeft(remainingSec);

      // Phase Complete
      if (remainingMs <= 0) {
          const phases = exercise.pacer.phases;
          const nextIdx = stateRef.current.phaseIdx + 1;

          if (nextIdx >= phases.length) {
              // REP COMPLETE (Only count if NOT timed)
              if (!exercise.isTimed) {
                  setReps(prev => {
                      const n = prev + 1;
                      onRepCount(n);
                      speak(String(n));
                      // Rep Complete: Distinct "Success" pattern
                      // Three rising pulses
                      triggerHaptic([100, 50, 100, 50, 200]); 
                      return n;
                  });
              }
              runPhase(0);
          } else {
              // NEXT PHASE
              runPhase(nextIdx);
          }
      }

      requestRef.current = requestAnimationFrame(gameLoop);
  };

  const togglePause = () => {
      if (isPaused) {
          // RESUME
          setIsPaused(false);
          stateRef.current.isPaused = false;
          // Adjust start time so the jump doesn't occur
          const duration = stateRef.current.phaseDuration;
          const remainingMs = phaseTimeLeft * 1000;
          phaseStartTimeRef.current = Date.now() - (duration - remainingMs);
          
          requestRef.current = requestAnimationFrame(gameLoop);
          if (exercise.isTimed) startTimer();

      } else {
          // PAUSE
          setIsPaused(true);
          stateRef.current.isPaused = true;
          cancelAnimationFrame(requestRef.current);
          if (exercise.isTimed) stopTimer();
      }
  };

  const resetPacer = () => {
      setReps(0);
      setTimerSeconds(0);
      onRepCount(0);
      runPhase(0);
      if (isPaused) togglePause();
  };

  const handleFinish = () => {
      // If timed, we use the timer value as the 'reps' (seconds)
      if (exercise.isTimed) {
          onRepCount(timerSeconds);
      }
      onClose();
  };

  // --- RENDER HELPERS ---
  const currentPhase = exercise.pacer.phases[currentPhaseIndex] || { action: 'Ready', breathing: 'Hold', duration: 1, voiceCue: '' };
  
  const getPhaseColor = (p: PacerPhase) => {
    switch (p.breathing) {
        case 'Exhale': return 'text-gym-success border-gym-success shadow-[0_0_40px_rgba(16,185,129,0.3)]'; 
        case 'Inhale': return 'text-blue-400 border-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.3)]'; 
        default: return 'text-yellow-400 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.3)]'; 
    }
  };

  const getPhaseBg = (p: PacerPhase) => {
    switch (p.breathing) {
        case 'Exhale': return 'bg-gym-success/10'; 
        case 'Inhale': return 'bg-blue-400/10'; 
        default: return 'bg-yellow-400/10'; 
    }
  };

  const formatTimer = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s<10?'0':''}${s}`;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col animate-in fade-in duration-300">
       {/* HEADER */}
       <div className="p-4 flex justify-between items-center border-b border-gym-700 bg-gym-800">
            <div>
                <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
                <p className="text-xs text-gym-accent font-mono tracking-widest">{exercise.isTimed ? 'TIMER MODE' : 'PACER MODE'}</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => { 
                        const newState = !isHapticsEnabled;
                        setIsHapticsEnabled(newState); 
                        if(newState) triggerHaptic([50, 50, 200]); // Confirmation buzz
                    }} 
                    className={`p-2 rounded-full transition-colors ${isHapticsEnabled ? 'text-white bg-gym-700' : 'text-gray-600 hover:text-gray-400'}`}
                    title={isHapticsEnabled ? "Vibration ON" : "Vibration OFF"}
                >
                    <Waves size={20} className={isHapticsEnabled ? "animate-pulse" : ""}/>
                </button>
                <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className={`p-2 rounded-full transition-colors ${!isMuted ? 'text-white bg-gym-700' : 'text-gray-600 hover:text-gray-400'}`}
                    title="Toggle Audio"
                >
                    {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                </button>
                <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white hover:bg-gym-600 transition-colors ml-2"><X size={20}/></button>
            </div>
       </div>

       {/* CONTENT */}
       <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
           
           {!isActive ? (
               <div className="text-center animate-pulse">
                   <h1 className="text-7xl font-black text-white tracking-tighter">READY</h1>
                   <p className="text-gym-accent mt-4 font-mono">Focus on tempo</p>
               </div>
           ) : (
               <>
                   {/* PACER CIRCLE */}
                   <div className="relative mb-16 scale-110">
                       {/* Outer Ring & Content */}
                       <div className={`w-72 h-72 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-300 ${getPhaseColor(currentPhase)} ${getPhaseBg(currentPhase)}`}>
                           
                           {/* Phase Name or Timer */}
                           {exercise.isTimed ? (
                               <div className="text-center">
                                   <p className="text-xs text-gray-400 font-bold uppercase mb-2">Duration</p>
                                   <h2 className="text-6xl font-black tracking-tighter text-white drop-shadow-xl font-mono">
                                       {formatTimer(timerSeconds)}
                                   </h2>
                               </div>
                           ) : (
                               <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-xl mb-3 animate-in slide-in-from-bottom-2 duration-300 key={currentPhase.action}">
                                   {currentPhase.action}
                               </h2>
                           )}
                           
                           {/* Breathing Cue */}
                           <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full backdrop-blur-md mt-4">
                               <Wind size={18} className="text-white" />
                               <span className="text-sm font-bold text-white uppercase tracking-widest">{currentPhase.breathing}</span>
                           </div>

                           {/* Countdown Timer (only for reps mode or breathing cues) */}
                           <p className="text-2xl font-mono font-bold text-white/40 absolute -bottom-12 tabular-nums">
                               {phaseTimeLeft.toFixed(1)}<span className="text-xs">s</span>
                           </p>
                       </div>
                       
                       {/* Progress Ring (SVG) */}
                       <svg className="absolute top-0 left-0 w-72 h-72 -rotate-90 pointer-events-none drop-shadow-lg">
                           <circle cx="144" cy="144" r="136" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gym-900/30" />
                           <circle 
                               cx="144" cy="144" r="136" 
                               stroke="currentColor" strokeWidth="8" 
                               fill="transparent"
                               strokeLinecap="round"
                               strokeDasharray={854} // 2 * pi * 136
                               strokeDashoffset={854 - (854 * (phaseTimeLeft / currentPhase.duration))}
                               className={`transition-all duration-75 ${currentPhase.breathing === 'Exhale' ? 'text-gym-success' : 'text-blue-400'}`}
                           />
                       </svg>
                   </div>

                   {/* CONTROLS */}
                   <div className="w-full flex items-center gap-8 justify-center">
                       <button 
                         onClick={resetPacer}
                         className="p-5 bg-gym-800 text-gray-400 rounded-full hover:bg-gym-700 hover:text-white transition-all shadow-lg border border-gym-700"
                         title="Reset"
                       >
                           <RotateCcw size={28} />
                       </button>
                       
                       <button 
                         onClick={togglePause}
                         className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isPaused ? 'bg-gym-success text-white ring-4 ring-gym-success/30' : 'bg-yellow-500 text-gym-900 ring-4 ring-yellow-500/30'}`}
                       >
                           {isPaused ? <Play size={48} fill="currentColor" /> : <Pause size={48} fill="currentColor" />}
                       </button>
                   </div>
                   
                   {/* HAPTIC LEGEND (Visual Feedback) */}
                   {isHapticsEnabled && (
                       <p className="absolute bottom-24 text-[10px] text-gray-500 uppercase font-mono tracking-widest animate-pulse">
                           {['HOLD','SQUEEZE','STRETCH'].some(k=>currentPhase.action.includes(k)) ? '~~~ FLUTTER ~~~' : 
                            ['LOWER','DOWN','RETURN'].some(k=>currentPhase.action.includes(k)) ? '• • DOUBLE BEAT' : 
                            '— SOLID DRIVE —'}
                       </p>
                   )}
               </>
           )}
       </div>

       {/* FOOTER */}
       <div className="p-6 bg-gym-800 border-t border-gym-700 flex justify-between items-center z-10">
           <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{exercise.isTimed ? 'Current Time' : 'Reps Completed'}</p>
               <p className="text-5xl font-black text-white leading-none">
                   {exercise.isTimed ? formatTimer(timerSeconds) : reps} 
                   {!exercise.isTimed && <span className="text-xl text-gray-500 font-medium">/ {targetReps}</span>}
               </p>
           </div>
           <button 
             onClick={handleFinish}
             className="px-8 py-4 bg-white text-gym-900 font-bold rounded-2xl shadow-xl active:scale-95 transition-transform hover:bg-gray-100"
           >
               Finish Set
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
