
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Wind, RotateCcw, Smartphone, Waves, Target, CheckCircle2, AlertTriangle, Gamepad2, Activity } from 'lucide-react';
import { Exercise, PacerPhase } from '../types';
import { MotionProcessor, Position, MotionEvent, MotionPhase } from '../services/MotionProcessor';
import GamePacer from './GamePacer';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  // --- STATE ---
  const [isPaused, setIsPaused] = useState(false);
  const [reps, setReps] = useState(0);
  const [processorEvent, setProcessorEvent] = useState<MotionEvent | null>(null);
  const [phonePosition, setPhonePosition] = useState<Position>('HAND');
  const [isMutedState, setIsMutedState] = useState(false);
  const [isHapticsEnabledState, setIsHapticsEnabledState] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Calibration States
  const [calibState, setCalibState] = useState<'NONE' | 'COUNTDOWN' | 'RECORDING' | 'DONE'>('NONE');
  const [calibCount, setCalibCount] = useState(3);

  // Modes
  const [mode, setMode] = useState<'STANDARD' | 'GAME'>('STANDARD');
  const [useSensors, setUseSensors] = useState(true);

  // --- REFS ---
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const processorRef = useRef<MotionProcessor | null>(null);
  const isMutedRef = useRef(false);
  const isHapticsEnabledRef = useRef(true);

  // --- INIT ---
  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    
    // Auto-detect position based on exercise
    if (exercise.targetGroup === 'Legs') setPhonePosition('POCKET');

    return () => {
        if (synthRef.current) synthRef.current.cancel();
        window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (processorRef.current && !isPaused && useSensors) {
      processorRef.current.process(event.alpha, event.beta, event.gamma);
    }
  };

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          initProcessor();
        } else {
          setPermissionState('denied');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setPermissionState('granted');
      initProcessor();
    }
  };

  const initProcessor = () => {
    processorRef.current = new MotionProcessor(
      exercise,
      phonePosition,
      (event) => {
        setProcessorEvent(event);
        
        // Voice Feedback
        if (event.feedback && event.feedbackType !== 'WARNING') {
             // Only speak important cues, not every frame
             speak(event.feedback);
        }

        if (event.repCount > reps) {
          setReps(event.repCount);
          onRepCount(event.repCount);
          speak(String(event.repCount));
          triggerHaptic([50, 50]);
        }
        
        if (event.feedbackType === 'TOO_FAST' || event.feedbackType === 'TOO_SLOW') {
            triggerHaptic([200]);
        }
      }
    );

    window.addEventListener('deviceorientation', handleOrientation);
  };

  // --- CALIBRATION LOGIC ---
  const startCalibrationSequence = () => {
      setCalibState('COUNTDOWN');
      setCalibCount(3);
      if (processorRef.current) processorRef.current.startCalibrationCountdown();
      
      const int = setInterval(() => {
          setCalibCount(prev => {
              if (prev <= 1) {
                  clearInterval(int);
                  beginRecording();
                  return 0;
              }
              speak(String(prev - 1));
              return prev - 1;
          });
      }, 1000);
      speak("3");
  };

  const beginRecording = () => {
      setCalibState('RECORDING');
      if (processorRef.current) processorRef.current.startCalibrationRecording();
      speak("Move now. Full range.");
  };

  const finishCalibration = () => {
      if (processorRef.current) {
          const success = processorRef.current.finishCalibration();
          if (success) {
              setCalibState('DONE');
              speak("Calibrated. Begin Set.");
          } else {
              setCalibState('NONE'); // Retry
              speak("Retry.");
          }
      }
  };

  // --- AUDIO & HAPTICS ---
  const speak = (text: string) => {
    if (isMutedRef.current || !synthRef.current) return;
    // Debounce speech slightly to avoid spam
    if (synthRef.current.speaking) return; 
    
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1; // Slightly faster
    synthRef.current.speak(u);
  };

  const triggerHaptic = (pattern: number[]) => {
    if (!isHapticsEnabledRef.current || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    setIsMutedState(isMutedRef.current);
  };

  const toggleHaptics = () => {
    isHapticsEnabledRef.current = !isHapticsEnabledRef.current;
    setIsHapticsEnabledState(isHapticsEnabledRef.current);
  };

  // --- RENDER HELPERS ---
  const progress = processorEvent?.progress || 0;
  const phase = processorEvent?.phase || 'IDLE';
  const feedbackMsg = processorEvent?.feedback;

  // -- PERMISSION SCREEN --
  if (permissionState === 'prompt' && useSensors) {
    return (
      <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <Smartphone size={64} className="text-gym-accent mb-6 animate-bounce" />
        <h2 className="text-3xl font-black text-white mb-4">Motion Guard</h2>
        <p className="text-gray-400 mb-8">Mount phone to body for rep counting & tempo policing.</p>
        
        <div className="w-full bg-gym-800 p-4 rounded-2xl border border-gym-700 mb-8">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-4">Where is your phone?</p>
          <div className="flex gap-2">
            <button onClick={() => setPhonePosition('HAND')} className={`flex-1 py-4 rounded-xl border font-bold ${phonePosition === 'HAND' ? 'bg-gym-accent text-white' : 'bg-gym-900 text-gray-500'}`}>Hand</button>
            <button onClick={() => setPhonePosition('POCKET')} className={`flex-1 py-4 rounded-xl border font-bold ${phonePosition === 'POCKET' ? 'bg-gym-accent text-white' : 'bg-gym-900 text-gray-500'}`}>Pocket</button>
          </div>
        </div>

        <button onClick={requestPermission} className="w-full py-5 bg-white text-gym-900 font-black rounded-2xl shadow-xl mb-4">START SENSORS</button>
        <button onClick={() => { setUseSensors(false); setPermissionState('granted'); }} className="text-gray-500 font-bold hover:text-white">Or Use Manual Pacer (No Sensors)</button>
        <button onClick={onClose} className="mt-6 text-gray-500 text-xs">Cancel</button>
      </div>
    );
  }

  // -- MANUAL MODE (If sensors disabled) --
  if (!useSensors) {
      // Simple manual game pacer without sensor input logic
      // TODO: Implementation for manual mode fallback can be added here
      // For now, render standard with auto-progress for visualization?
      // Just reuse GamePacer with simulated progress?
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-gym-700 bg-gym-800">
        <div>
          <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
          <p className="text-xs text-gym-accent">{mode === 'GAME' ? 'Interactive Pacer' : 'Standard Pacer'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setMode(mode === 'GAME' ? 'STANDARD' : 'GAME')} className="p-2 bg-gym-700 rounded-full text-white">{mode === 'GAME' ? <Activity size={20}/> : <Gamepad2 size={20}/>}</button>
          <button onClick={toggleMute} className={`p-2 rounded-full ${!isMutedState ? 'text-white bg-gym-700' : 'text-gray-600'}`}>{isMutedState ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
          <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* CALIBRATION UI */}
        {calibState !== 'DONE' ? (
          <div className="text-center animate-in zoom-in w-full max-w-xs">
            {calibState === 'NONE' && (
                <>
                    <Target size={64} className="text-gray-600 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white mb-4">Calibration Required</h2>
                    <p className="text-gray-400 mb-8 text-sm">Get into your starting position.</p>
                    <button onClick={startCalibrationSequence} className="w-full py-4 bg-gym-accent text-white font-bold rounded-xl shadow-lg">Start (3s Delay)</button>
                </>
            )}
            {calibState === 'COUNTDOWN' && (
                <>
                    <h1 className="text-9xl font-black text-white mb-4">{calibCount}</h1>
                    <p className="text-gym-accent font-bold uppercase animate-pulse">Get Ready...</p>
                </>
            )}
            {calibState === 'RECORDING' && (
                <>
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-red-500 animate-spin mx-auto mb-6"></div>
                    <h3 className="text-2xl font-bold text-white mb-2">Perform 1 Rep</h3>
                    <p className="text-gray-400 mb-8 text-sm">Full Range: Start -> End -> Start</p>
                    <button onClick={finishCalibration} className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg">Done Moving</button>
                </>
            )}
          </div>
        ) : (
          <>
            {/* LIVE FEEDBACK TEXT */}
            <div className="absolute top-6 w-full text-center z-10 pointer-events-none">
                {feedbackMsg && (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 text-white font-black rounded-full shadow-lg transition-all duration-300
                    ${processorEvent?.feedbackType === 'TOO_FAST' ? 'bg-red-500 animate-bounce' : 
                      processorEvent?.feedbackType === 'TOO_SLOW' ? 'bg-orange-500' : 'bg-gym-success'}
                  `}>
                    {processorEvent?.feedbackType === 'TOO_FAST' && <AlertTriangle size={18} />}
                    {feedbackMsg}
                  </div>
                )}
            </div>

            {/* MODE RENDERER */}
            <div className="w-full max-w-sm">
                {mode === 'GAME' ? (
                    <GamePacer 
                        progress={progress} 
                        phase={phase} 
                        isPaused={isPaused} 
                        pacerConfig={exercise.pacer} 
                    />
                ) : (
                    <div className="relative flex justify-center py-10">
                        <div className={`w-64 h-64 rounded-full border-8 border-gym-800 flex flex-col items-center justify-center transition-all duration-300 shadow-2xl`}>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Depth</p>
                            <h2 className="text-6xl font-black text-white tabular-nums">
                            {Math.round(progress * 100)}<span className="text-2xl text-gym-accent">%</span>
                            </h2>
                            <div className="mt-4 px-4 py-1 bg-gym-900 border border-gym-700 rounded-full text-xs font-bold text-gray-300">
                            {phase}
                            </div>
                        </div>
                        {/* Progress Ring */}
                        <svg className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 -rotate-90 pointer-events-none">
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={754} strokeDashoffset={754 - (754 * progress)} className="text-gym-accent transition-all duration-75" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-8">
               <button 
                 onClick={() => { setIsPaused(!isPaused); speak(isPaused ? "Resuming" : "Paused"); }}
                 className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${isPaused ? 'bg-gym-success border-white' : 'bg-gym-800 border-gym-700'} text-white shadow-xl transition-all active:scale-95`}
               >
                 {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
               </button>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-6 bg-gym-800 border-t border-gym-700 flex justify-between items-center z-10">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Session Reps</p>
          <p className="text-5xl font-black text-white leading-none">
            {reps} <span className="text-xl text-gray-500 font-medium">/ {targetReps}</span>
          </p>
        </div>
        <button onClick={onClose} className="px-8 py-4 bg-white text-gym-900 font-black rounded-2xl shadow-xl active:scale-95 transition-transform">
          FINISH SET
        </button>
      </div>
    </div>
  );
};

export default MotionTracker;
