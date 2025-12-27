
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Wind, RotateCcw, Smartphone, Waves, Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Exercise, PacerPhase } from '../types';
import { MotionProcessor, Position, MotionEvent, MotionPhase } from '../services/MotionProcessor';

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
  const [processorEvent, setProcessorEvent] = useState<MotionEvent | null>(null);
  const [phonePosition, setPhonePosition] = useState<Position>('HAND');
  const [isMutedState, setIsMutedState] = useState(false);
  const [isHapticsEnabledState, setIsHapticsEnabledState] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

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
    if (processorRef.current && !isPaused) {
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
        
        // Audio/Haptic triggers on phase change
        if (event.feedback && event.feedbackType) {
          speak(event.feedback);
          if (event.feedbackType === 'TOO_FAST') triggerHaptic([100, 50, 100]);
        }

        if (event.repCount > reps) {
          setReps(event.repCount);
          onRepCount(event.repCount);
          speak(String(event.repCount));
          triggerHaptic([100, 50, 100]);
        }
      }
    );

    window.addEventListener('deviceorientation', handleOrientation);
    processorRef.current.startCalibration();
    setIsActive(true);
  };

  // --- AUDIO & HAPTICS ---
  const speak = (text: string) => {
    if (isMutedRef.current || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
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

  const handleCalibrationFinished = () => {
    if (processorRef.current) {
      processorRef.current.finishCalibration();
      speak("Calibration complete. Start your set.");
    }
  };

  // --- RENDER HELPERS ---
  const progress = processorEvent?.progress || 0;
  const phase = processorEvent?.phase || 'IDLE';

  if (permissionState === 'prompt') {
    return (
      <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <Smartphone size={64} className="text-gym-accent mb-6 animate-bounce" />
        <h2 className="text-3xl font-black text-white mb-4">Motion Guard</h2>
        <p className="text-gray-400 mb-8">We use your phone's sensors to track your tempo and range of motion. For best results, keep the phone in the same spot.</p>
        
        <div className="w-full bg-gym-800 p-4 rounded-2xl border border-gym-700 mb-8">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-4">Where is your phone?</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPhonePosition('HAND')}
              className={`flex-1 py-4 rounded-xl border font-bold transition-all ${phonePosition === 'HAND' ? 'bg-gym-accent border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-gym-900 border-gym-700 text-gray-500'}`}
            >
              Hand / Wrist
            </button>
            <button 
              onClick={() => setPhonePosition('POCKET')}
              className={`flex-1 py-4 rounded-xl border font-bold transition-all ${phonePosition === 'POCKET' ? 'bg-gym-accent border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-gym-900 border-gym-700 text-gray-500'}`}
            >
              Pocket
            </button>
          </div>
        </div>

        <button 
          onClick={requestPermission}
          className="w-full py-5 bg-white text-gym-900 font-black rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          START TRACKING
        </button>
        <button onClick={onClose} className="mt-6 text-gray-500 font-bold hover:text-white">Cancel</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-gym-700 bg-gym-800">
        <div>
          <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${phase === 'CALIBRATING' ? 'bg-yellow-500 animate-pulse' : 'bg-gym-success'}`}></span>
            <p className="text-xs text-gym-accent font-mono tracking-widest uppercase">{phase}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleHaptics} className={`p-2 rounded-full ${isHapticsEnabledState ? 'text-white bg-gym-700' : 'text-gray-600'}`}><Waves size={20}/></button>
          <button onClick={toggleMute} className={`p-2 rounded-full ${!isMutedState ? 'text-white bg-gym-700' : 'text-gray-600'}`}>{isMutedState ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
          <button onClick={onClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
        </div>
      </div>

      {/* MAIN TRACKER VIEW */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* CALIBRATION OVERLAY */}
        {phase === 'CALIBRATING' ? (
          <div className="text-center animate-in zoom-in">
            <div className="w-48 h-48 bg-gym-800 rounded-full border-4 border-dashed border-gym-accent flex items-center justify-center mx-auto mb-8 animate-[spin_10s_linear_infinite]">
                <Target size={64} className="text-gym-accent -rotate-[inherit]" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2">CALIBRATING</h2>
            <p className="text-gray-400 max-w-[250px] mx-auto mb-8">Perform one slow repetition through your full range of motion.</p>
            <button 
              onClick={handleCalibrationFinished}
              className="px-10 py-4 bg-gym-accent text-white font-black rounded-2xl shadow-lg"
            >
              DONE MOVING
            </button>
          </div>
        ) : (
          <>
            {/* LIVE FEEDBACK TEXT */}
            <div className="absolute top-10 w-full text-center">
                {processorEvent?.feedbackType === 'TOO_FAST' && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-black rounded-full animate-bounce">
                    <AlertTriangle size={18} /> SLOW DOWN
                  </div>
                )}
                {processorEvent?.feedbackType === 'PERFECT' && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gym-success text-white font-black rounded-full animate-in fade-in">
                    <CheckCircle2 size={18} /> PERFECT TEMPO
                  </div>
                )}
            </div>

            {/* PACER CIRCLE */}
            <div className="relative scale-110">
              <div className={`w-72 h-72 rounded-full border-8 border-gym-800 flex flex-col items-center justify-center transition-all duration-300`}>
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Rep Progress</p>
                <h2 className="text-7xl font-black text-white tabular-nums">
                  {Math.round(progress * 100)}<span className="text-2xl text-gym-accent">%</span>
                </h2>
                <div className="mt-4 px-4 py-1 bg-gym-900 border border-gym-700 rounded-full text-xs font-bold text-gray-300">
                  {phase.replace('_', ' ')}
                </div>
              </div>
              
              {/* Progress Ring (SVG) */}
              <svg className="absolute top-0 left-0 w-72 h-72 -rotate-90 pointer-events-none">
                <circle 
                  cx="144" cy="144" r="136" 
                  stroke="currentColor" strokeWidth="12" 
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={854} 
                  strokeDashoffset={854 - (854 * progress)}
                  className={`transition-all duration-75 text-gym-accent`}
                />
              </svg>
            </div>

            <div className="mt-12 flex items-center gap-8">
               <button 
                 onClick={() => setIsPaused(!isPaused)}
                 className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${isPaused ? 'bg-gym-success border-white' : 'bg-gym-800 border-gym-700'} text-white shadow-xl transition-all`}
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
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Lifting Guard</p>
          <p className="text-5xl font-black text-white leading-none">
            {reps} <span className="text-xl text-gray-500 font-medium">/ {targetReps}</span>
          </p>
        </div>
        <button 
          onClick={onClose}
          className="px-8 py-4 bg-white text-gym-900 font-black rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          FINISH SET
        </button>
      </div>
    </div>
  );
};

export default MotionTracker;
