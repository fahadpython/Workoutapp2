
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Wind, RotateCcw } from 'lucide-react';
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

  // --- REFS ---
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const requestRef = useRef<number>(0);
  const lastTickRef = useRef(0);
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

    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // --- AUDIO ---
  const speak = (text: string) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.3;
    u.pitch = 1.1;
    synthRef.current.speak(u);
  };

  // --- LOGIC ---
  const startCountdown = () => {
      speak("Get Ready.");
      setTimeout(() => {
          speak("3... 2... 1...");
          setTimeout(() => {
              speak("Go!");
              setIsActive(true);
              startPacer();
          }, 3000);
      }, 1000);
  };

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
      // setPhaseTimeLeft(phase.duration); // Loop updates this immediately anyway
      phaseStartTimeRef.current = Date.now();
      lastTickRef.current = phase.duration;

      // Audio Cue
      if (phase.voiceCue) speak(phase.voiceCue);
  };

  const gameLoop = () => {
      if (stateRef.current.isPaused) return;

      const now = Date.now();
      const elapsed = now - phaseStartTimeRef.current;
      const duration = stateRef.current.phaseDuration;
      const remainingMs = duration - elapsed;
      const remainingSec = Math.max(0, remainingMs / 1000);
      
      setPhaseTimeLeft(remainingSec);

      // Audio Ticks for countdown (optional, can be annoying if too frequent)
      // const secCeil = Math.ceil(remainingSec);
      // if (secCeil < lastTickRef.current && secCeil > 0) {
      //    lastTickRef.current = secCeil;
      // }

      // Phase Complete
      if (remainingMs <= 0) {
          const phases = exercise.pacer.phases;
          const nextIdx = stateRef.current.phaseIdx + 1;

          if (nextIdx >= phases.length) {
              // REP COMPLETE
              setReps(prev => {
                  const n = prev + 1;
                  onRepCount(n);
                  speak(String(n));
                  return n;
              });
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
      } else {
          // PAUSE
          setIsPaused(true);
          stateRef.current.isPaused = true;
          cancelAnimationFrame(requestRef.current);
      }
  };

  const resetPacer = () => {
      setReps(0);
      onRepCount(0);
      runPhase(0);
      if (isPaused) togglePause();
  };

  // --- RENDER HELPERS ---
  const currentPhase = exercise.pacer.phases[currentPhaseIndex] || { action: 'Ready', breathing: 'Hold', duration: 1 };
  
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

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col animate-in fade-in duration-300">
       {/* HEADER */}
       <div className="p-4 flex justify-between items-center border-b border-gym-700 bg-gym-800">
            <div>
                <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
                <p className="text-xs text-gym-accent font-mono tracking-widest">PACER MODE</p>
            </div>
            <div className="flex gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white transition-colors">
                    {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
                </button>
                <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white hover:bg-gym-600 transition-colors"><X size={20}/></button>
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
                           
                           {/* Phase Name */}
                           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-xl mb-3 animate-in slide-in-from-bottom-2 duration-300 key={currentPhase.action}">
                               {currentPhase.action}
                           </h2>
                           
                           {/* Breathing Cue */}
                           <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full backdrop-blur-md mb-2">
                               <Wind size={18} className="text-white" />
                               <span className="text-sm font-bold text-white uppercase tracking-widest">{currentPhase.breathing}</span>
                           </div>

                           {/* Countdown Timer */}
                           <p className="text-7xl font-mono font-bold text-white/40 absolute -bottom-24 tabular-nums">
                               {phaseTimeLeft.toFixed(1)}<span className="text-lg">s</span>
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
               </>
           )}
       </div>

       {/* FOOTER */}
       <div className="p-6 bg-gym-800 border-t border-gym-700 flex justify-between items-center z-10">
           <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Reps Completed</p>
               <p className="text-5xl font-black text-white leading-none">{reps} <span className="text-xl text-gray-500 font-medium">/ {targetReps}</span></p>
           </div>
           <button 
             onClick={onClose}
             className="px-8 py-4 bg-white text-gym-900 font-bold rounded-2xl shadow-xl active:scale-95 transition-transform hover:bg-gray-100"
           >
               Finish Set
           </button>
       </div>
    </div>
  );
};

export default MotionTracker;
