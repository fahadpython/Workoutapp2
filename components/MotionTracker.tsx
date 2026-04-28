
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Smartphone, Waves, Target, CheckCircle2, AlertTriangle, Gamepad2, Activity, ZapOff, CheckCircle } from 'lucide-react';
import { Exercise } from '../types';
import { MotionProcessor, Position, MotionEvent } from '../services/MotionProcessor';
import { getCalibration, saveCalibration } from '../services/storageService';
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
  
  // Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isVibrationOff, setIsVibrationOff] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Calibration States
  const [calibState, setCalibState] = useState<'NONE' | 'COUNTDOWN' | 'RECORDING' | 'DONE'>('NONE');
  const [calibCount, setCalibCount] = useState(3);

  // Modes
  const [mode, setMode] = useState<'STANDARD' | 'GAME'>('STANDARD');

  // --- REFS ---
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const processorRef = useRef<MotionProcessor | null>(null);
  const isMutedRef = useRef(false);
  const isVibrationOffRef = useRef(false);
  const isMountedRef = useRef(true);
  const modeRef = useRef('STANDARD');

  // --- INIT ---
  useEffect(() => {
    isMountedRef.current = true;
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    
    // Auto-detect existing calibration
    const savedCal = getCalibration(exercise.id);
    if (savedCal) {
        setCalibState('DONE'); // Skip calibration if known
    }

    return () => {
        isMountedRef.current = false;
        cleanup();
    };
  }, []);

  // Update refs when state changes for access inside callbacks
  useEffect(() => {
      isMutedRef.current = isMuted;
      isVibrationOffRef.current = isVibrationOff;
      modeRef.current = mode;
  }, [isMuted, isVibrationOff, mode]);

  const cleanup = () => {
      if (synthRef.current) {
          synthRef.current.cancel();
      }
      if (processorRef.current) {
          processorRef.current.cleanup();
          processorRef.current = null;
      }
      window.removeEventListener('deviceorientation', handleOrientation);
  };

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
     isPausedRef.current = isPaused;
  }, [isPaused]);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (processorRef.current && !isPausedRef.current && !isManualMode && isMountedRef.current) {
      processorRef.current.process(event.alpha, event.beta, event.gamma);
    }
  };

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          initProcessor(false);
        } else {
          setPermissionState('denied');
          // Auto fallback to manual mode if denied
          setIsManualMode(true);
          initProcessor(true);
        }
      } catch (e) {
        console.error(e);
        // Fallback
        setIsManualMode(true);
        initProcessor(true);
      }
    } else {
      setPermissionState('granted');
      initProcessor(false);
    }
  };

  const initProcessor = (manual: boolean) => {
    const savedCal = getCalibration(exercise.id);
    
    processorRef.current = new MotionProcessor(
      exercise,
      (event) => {
        if (!isMountedRef.current) return;

        setProcessorEvent(event);
        
        // Voice Feedback
        if (event.feedback && event.feedbackType !== 'WARNING') {
             speak(event.feedback);
        }

        if (event.repCount > reps) {
          setReps(event.repCount);
          onRepCount(event.repCount);
          speak(String(event.repCount));
          
          if (modeRef.current === 'STANDARD') {
              triggerHaptic([50, 50]);
          }

          if (event.repCount >= targetReps) {
              if (processorRef.current) {
                  processorRef.current.cleanup();
                  setIsPaused(true);
              }
              speak("Target reached. Finish Set.");
          }
        }
        
        // Feedback vibration (Mistakes) - Always allowed in both modes
        if (event.feedbackType === 'TOO_FAST' || event.feedbackType === 'TOO_SLOW') {
            triggerHaptic([200]);
        }
      },
      savedCal
    );

    if (manual) {
        setCalibState('DONE'); // No calibration needed for manual
        processorRef.current.setManualMode(true);
    } else {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.addEventListener('deviceorientation', handleOrientation);
    }
  };

  const handleManualStart = () => {
      setIsManualMode(true);
      setPermissionState('granted'); // Bypass screen
      initProcessor(true);
  };

  // --- CALIBRATION LOGIC ---
  const startCalibrationSequence = () => {
      setCalibState('COUNTDOWN');
      setCalibCount(3);
      if (processorRef.current) processorRef.current.startCalibrationCountdown();
      
      const int = setInterval(() => {
          if (!isMountedRef.current) {
              clearInterval(int);
              return;
          }
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
  };

  const finishCalibration = () => {
      if (processorRef.current) {
          const success = processorRef.current.finishCalibration();
          if (success) {
              setCalibState('DONE');
              speak("Calibrated.");
              
              // Save Calibration Data
              const calData = processorRef.current.getCalibrationData();
              calData.exerciseId = exercise.id;
              saveCalibration(calData);
          } else {
              setCalibState('NONE'); // Retry
              speak("Retry.");
          }
      }
  };

  const resetCalibration = () => {
      setCalibState('NONE');
  };

  // --- AUDIO & HAPTICS ---
  const speak = (text: string) => {
    if (isMutedRef.current || !synthRef.current || !isMountedRef.current) return;
    if (synthRef.current.speaking) return; 
    
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1; 
    synthRef.current.speak(u);
  };

  const triggerHaptic = (pattern: number[]) => {
    if (isVibrationOffRef.current || !navigator.vibrate || !isMountedRef.current) return;
    navigator.vibrate(pattern);
  };

  const handleClose = () => {
      cleanup();
      onClose();
  };

  // --- RENDER HELPERS ---
  const progress = processorEvent?.progress || 0;
  const phase = processorEvent?.phase || 'IDLE';
  const feedbackMsg = processorEvent?.feedback;
  const targetPos = exercise.targetGroup === 'Legs' ? 'Pocket' : 'Armband / Hand';

  // -- PERMISSION SCREEN --
  if (permissionState === 'prompt' && !isManualMode) {
    return (
      <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <Smartphone size={64} className="text-gym-accent mb-6 animate-bounce" />
        <h2 className="text-3xl font-black text-white mb-4">Motion Guard</h2>
        
        <div className="bg-gym-800 p-4 rounded-xl border border-gym-700 mb-6 text-left w-full">
            <p className="text-xs text-gray-400 font-bold uppercase mb-2">Instructions</p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                <li>Mount phone: <strong>{targetPos}</strong></li>
                <li>We track your <strong>Tempo</strong> & <strong>ROM</strong>.</li>
                <li>Keeps you honest on reps.</li>
            </ul>
        </div>

        <button onClick={requestPermission} className="w-full py-5 bg-white text-gym-900 font-black rounded-2xl shadow-xl mb-4">START SENSORS</button>
        <button onClick={handleManualStart} className="text-gray-500 font-bold hover:text-white">Use Visual Pacer (No Sensors)</button>
        <button onClick={onClose} className="mt-6 text-gray-500 text-xs">Cancel</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center border-b border-gym-700 bg-gym-800">
        <div>
          <h3 className="font-bold text-white text-lg">{exercise.name}</h3>
          <p className="text-xs text-gym-accent flex items-center gap-1">
              {isManualMode ? 'Visual Timer Mode' : 'Sensor Active'} 
              {isManualMode && <Activity size={10}/>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode(mode === 'GAME' ? 'STANDARD' : 'GAME')} className="p-2 bg-gym-700 rounded-full text-white">{mode === 'GAME' ? <Activity size={20}/> : <Gamepad2 size={20}/>}</button>
          
          <button onClick={() => setIsVibrationOff(!isVibrationOff)} className={`p-2 rounded-full ${isVibrationOff ? 'text-gray-500 bg-gym-800' : 'text-white bg-gym-700'}`}>
              {isVibrationOff ? <ZapOff size={20}/> : <Waves size={20}/>}
          </button>
          
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full ${isMuted ? 'text-gray-500 bg-gym-800' : 'text-white bg-gym-700'}`}>
              {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
          </button>
          
          <button onClick={handleClose} className="p-2 bg-gym-700 rounded-full text-white"><X size={20}/></button>
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
                    <h2 className="text-2xl font-black text-white mb-4">Calibration</h2>
                    <div className="bg-gym-800 p-4 rounded-xl mb-6 text-left">
                        <p className="text-xs text-gray-400 uppercase font-bold mb-2">Steps:</p>
                        <ol className="text-sm text-gray-300 list-decimal list-inside space-y-1">
                            <li>Get into starting position.</li>
                            <li>Wait for countdown.</li>
                            <li>Perform <strong>ONE PERFECT REP</strong>.</li>
                            <li>Full Range of Motion.</li>
                        </ol>
                    </div>
                    <button onClick={startCalibrationSequence} className="w-full py-4 bg-gym-accent text-white font-bold rounded-xl shadow-lg">Start Calibration</button>
                </>
            )}
            {calibState === 'COUNTDOWN' && (
                <>
                    <h1 className="text-9xl font-black text-white mb-4">{calibCount}</h1>
                    <p className="text-gym-accent font-bold uppercase animate-pulse">{feedbackMsg || "Get Ready..."}</p>
                </>
            )}
            {calibState === 'RECORDING' && (
                <>
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-red-500 animate-spin mx-auto mb-6"></div>
                    <h3 className="text-2xl font-bold text-white mb-2">Moving...</h3>
                    <p className="text-gray-400 mb-8 text-sm">{feedbackMsg || "Perform 1 Full Rep"}</p>
                    <button onClick={finishCalibration} className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg">Finish Rep</button>
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
                            {phase.replace('_', ' ')}
                            </div>
                        </div>
                        {/* Progress Ring */}
                        <svg className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 -rotate-90 pointer-events-none">
                            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={754} strokeDashoffset={754 - (754 * progress)} className="text-gym-accent transition-all duration-75" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
               {!isManualMode && (
                   <button 
                     onClick={resetCalibration}
                     className="px-4 py-2 bg-gym-800 rounded-lg text-xs font-bold text-gray-400 border border-gym-700"
                   >
                       Recalibrate
                   </button>
               )}
               <button 
                 onClick={() => {
                     const nextState = !isPaused;
                     setIsPaused(nextState);
                     speak(nextState ? "Paused" : "Resuming");
                     if (processorRef.current) {
                         if (nextState) processorRef.current.cleanup();
                         else if (isManualMode) processorRef.current.setManualMode(true);
                         else window.addEventListener('deviceorientation', handleOrientation);
                     }
                 }}
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
        <button onClick={handleClose} className="px-8 py-4 bg-white text-gym-900 font-black rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center gap-2">
          <CheckCircle size={20} /> FINISH SET
        </button>
      </div>
    </div>
  );
};

export default MotionTracker;
