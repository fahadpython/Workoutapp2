
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, RefreshCw, X, Zap, AlertCircle, CheckCircle2, Smartphone, Volume2, VolumeX, Wind } from 'lucide-react';
import { MotionCalibration, Exercise, PacerConfig, PacerPhase } from '../types';
import { saveCalibration, getCalibration } from '../services/storageService';

interface Props {
  exercise: Exercise;
  useSensors: boolean;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type TrackerState = 
  | 'INIT' 
  | 'SETUP_POSITION' // Ask where phone is (if not known)
  | 'CALIBRATION_INSTRUCTION' // "Do 1 Rep"
  | 'CALIBRATING' // Measuring the rep
  | 'CALIBRATION_SAVED' // Success state
  | 'POSITION_REMINDER' // "Put phone in Pocket" (if known)
  | 'COUNTDOWN'
  | 'ACTIVE' 
  | 'FINISHED';

const MotionTracker: React.FC<Props> = ({ exercise, useSensors, onRepCount, onClose, targetReps }) => {
  const [state, setState] = useState<TrackerState>('INIT');
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<string>("Get Ready");
  const [debugVal, setDebugVal] = useState(0);
  const [calibrationData, setCalibrationData] = useState<MotionCalibration | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [phonePosition, setPhonePosition] = useState<'Pocket'|'Armband'|'Hand'|null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // --- PACER REFS ---
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const pacerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  // --- SENSOR REFS ---
  const repStartTime = useRef(0);
  const isMoving = useRef(false);
  const motionBuffer = useRef<number[]>([]);
  const shakeCount = useRef(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastSpeechTime = useRef(0);
  const lastRepTime = useRef(0);

  // Constants
  const MOVEMENT_THRESHOLD = 1.5; 
  const REP_COOLDOWN = 1000; 

  // --- INIT ---
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    if (useSensors) {
        // Check local storage for calibration
        const saved = getCalibration(exercise.id);
        if (saved) {
            setCalibrationData(saved);
            setPhonePosition(saved.position);
            setState('POSITION_REMINDER');
        } else {
            setState('SETUP_POSITION');
        }
    } else {
        // No sensors, just go straight to pacer countdown
        setState('COUNTDOWN');
    }

    return () => {
      stopSensors();
      stopPacerEngine();
      synthRef.current?.cancel();
    };
  }, [exercise.id, useSensors]);

  // --- HELPER: SPEECH ---
  const speak = (text: string, force = false) => {
    if (isMuted || !synthRef.current) return;
    const now = Date.now();
    // Don't spam unless forced
    if (!force && now - lastSpeechTime.current < 2500) return;
    
    lastSpeechTime.current = now;
    synthRef.current.cancel(); 
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.2;
    u.pitch = 1.1;
    synthRef.current.speak(u);
  };

  const vibrate = (pattern: number | number[]) => {
      if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  // --- STEP 1: SENSOR PERMISSIONS ---
  const requestPermission = async (nextState: () => void) => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          startSensors();
          nextState();
        } else {
          setFeedback("Permission denied.");
        }
      } catch (e) {
        setFeedback("Error accessing sensors.");
      }
    } else {
      setPermissionGranted(true);
      startSensors();
      nextState();
    }
  };

  // --- STEP 2: STARTING CALIBRATION ---
  const handleStartCalibration = () => {
      requestPermission(() => {
          setState('CALIBRATION_INSTRUCTION');
          speak(`Place phone in your ${phonePosition}. Perform one perfect rep.`);
      });
  };

  const beginCalibrationRep = () => {
      setState('CALIBRATING');
      speak("Go.");
  };

  // --- STEP 3: STARTING WORKOUT ---
  const handleStartSet = () => {
      // If sensors needed, ensure they are on
      if (useSensors && !permissionGranted) {
          requestPermission(() => {
              startCountdown();
          });
      } else {
          startCountdown();
      }
  };

  const startCountdown = () => {
      setState('COUNTDOWN');
      let count = 3;
      speak("3");
      const interval = setInterval(() => {
          count--;
          if (count > 0) speak(count.toString());
          else {
              clearInterval(interval);
              setState('ACTIVE');
              speak("Go!");
              startPacerEngine(); // Visuals
          }
      }, 1000);
  };

  const handleForceRecalibrate = () => {
      setCalibrationData(null);
      setState('SETUP_POSITION');
  };

  // --- SENSOR LOGIC ---
  const startSensors = () => window.addEventListener('devicemotion', handleMotion);
  const stopSensors = () => window.removeEventListener('devicemotion', handleMotion);

  const handleMotion = (event: DeviceMotionEvent) => {
    if (!event.acceleration) return;
    const { x, y, z } = event.acceleration;
    if (x === null || y === null || z === null) return;

    const magnitude = Math.sqrt(x*x + y*y + z*z);
    setDebugVal(magnitude); 

    const now = Date.now();

    if (state === 'CALIBRATING') {
       processCalibration(magnitude, now);
    } else if (state === 'ACTIVE' && useSensors) {
       processActiveSet(magnitude, now);
    }
  };

  // CALIBRATION PROCESSING
  const calibStartTime = useRef(0);
  const calibMaxForce = useRef(0);
  
  const processCalibration = (mag: number, now: number) => {
      if (!isMoving.current && mag > MOVEMENT_THRESHOLD) {
          isMoving.current = true;
          calibStartTime.current = now;
          calibMaxForce.current = mag;
      }

      if (isMoving.current) {
          if (mag > calibMaxForce.current) calibMaxForce.current = mag;
          
          if (mag < MOVEMENT_THRESHOLD) {
             if (now - lastRepTime.current > 500) {
                 const duration = now - calibStartTime.current;
                 if (duration > 800) {
                     const newData: MotionCalibration = {
                         exerciseId: exercise.id,
                         avgTime: duration,
                         peakForce: calibMaxForce.current,
                         position: phonePosition || 'Pocket',
                         calibratedAt: new Date().toISOString()
                     };
                     setCalibrationData(newData);
                     saveCalibration(newData); // PERSIST
                     setState('CALIBRATION_SAVED');
                     speak("Calibration Saved.");
                     isMoving.current = false;
                 }
                 lastRepTime.current = now;
             }
          } else {
              lastRepTime.current = now;
          }
      }
  };

  // ACTIVE SET PROCESSING
  const processActiveSet = (mag: number, now: number) => {
      if (!calibrationData) return;

      if (!isMoving.current && mag > MOVEMENT_THRESHOLD) {
          if (now - lastRepTime.current > REP_COOLDOWN) {
              isMoving.current = true;
              repStartTime.current = now;
              motionBuffer.current = [];
              shakeCount.current = 0;
          }
      }

      if (isMoving.current) {
          motionBuffer.current.push(mag);
          
          // Shaking
          const recent = motionBuffer.current.slice(-10);
          if (recent.length > 5) {
              const variance = recent.reduce((sum, val) => sum + Math.abs(val - mag), 0) / recent.length;
              if (variance > 3.0) {
                  shakeCount.current++;
                  if (shakeCount.current > 15) {
                      setFeedback("STABILIZE!");
                      speak("Stabilize!");
                      shakeCount.current = 0;
                  }
              }
          }

          // Tempo
          const currentDuration = now - repStartTime.current;
          if (currentDuration > calibrationData.avgTime * 1.5 && currentDuration < calibrationData.avgTime * 2.5) {
              if (feedback !== "PUSH!") {
                  setFeedback("PUSH!");
                  speak("Push!");
              }
          }

          // End Rep
          if (mag < MOVEMENT_THRESHOLD) {
              if (now - lastRepTime.current > 500) {
                  const repDuration = now - repStartTime.current;
                  if (repDuration > 500) {
                      const newCount = reps + 1;
                      setReps(newCount);
                      onRepCount(newCount);
                      isMoving.current = false;
                      lastRepTime.current = now;
                      analyzeRep(repDuration, calibrationData.avgTime);
                  }
              }
          } else {
              lastRepTime.current = now;
          }
      }
  };

  const analyzeRep = (duration: number, target: number) => {
      const ratio = duration / target;
      if (ratio < 0.6) {
          setFeedback("Too Fast");
          speak("Slow down.");
      } else if (ratio > 1.5) {
          setFeedback("Good Grind");
      } else {
          setFeedback("Perfect");
      }
  };

  // --- VISUAL PACER ENGINE (From ExerciseCard) ---
  const runPhase = (phaseIdx: number) => {
      if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);

      const phases = exercise.pacer.phases;
      if (!phases || phases.length === 0) return;

      const currentPhase = phases[phaseIdx];
      setCurrentPhaseIndex(phaseIdx);
      
      const durationMs = currentPhase.duration * 1000;
      const startTime = Date.now();
      
      setPhaseTimeLeft(currentPhase.duration);

      // Haptics
      const action = currentPhase.action.toUpperCase();
      if (['PRESS', 'DRIVE', 'PULL', 'UP', 'EXPLODE', 'CURL'].some(k => action.includes(k))) vibrate(150); 
      else if (['HOLD', 'SQUEEZE'].some(k => action.includes(k))) vibrate([70, 50, 70]);
      else vibrate(30);

      // TTS
      if (currentPhase.voiceCue) speak(currentPhase.voiceCue);
      
      lastTickRef.current = Math.ceil(currentPhase.duration);

      pacerTimerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;
          const remainingMs = Math.max(0, durationMs - elapsed);
          const remainingSec = remainingMs / 1000;
          
          setPhaseTimeLeft(remainingSec);
          
          // Metronome Tick
          const currentCeil = Math.ceil(remainingSec);
          if (currentCeil < lastTickRef.current) {
               lastTickRef.current = currentCeil;
               if (['LOWER', 'DOWN', 'STRETCH'].some(k => currentPhase.action.toUpperCase().includes(k))) {
                  if (remainingSec > 0.1) vibrate(20); 
               }
          }

          if (remainingMs <= 0) {
              if(pacerTimerRef.current) clearInterval(pacerTimerRef.current);
              const nextPhaseIdx = phaseIdx + 1;
              if (nextPhaseIdx < phases.length) runPhase(nextPhaseIdx);
              else runPhase(0);
          }
      }, 33);
  };

  const startPacerEngine = () => {
      if (exercise.pacer.phases.length > 0) runPhase(0);
  };

  const stopPacerEngine = () => {
      if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
  };

  const activePhase: PacerPhase = exercise.pacer.phases[currentPhaseIndex] || { 
      action: 'GO', breathing: 'Hold', duration: 1, voiceCue: ''
  };

  const getPhaseColor = (phase: PacerPhase) => {
      switch (phase.breathing) {
          case 'Exhale': return 'text-gym-success'; 
          case 'Inhale': return 'text-blue-400'; 
          default: return 'text-yellow-400'; 
      }
  };

  // --- RENDER ---
  const renderContent = () => {
      switch (state) {
          case 'INIT':
              return <div className="text-white">Initializing...</div>;
          
          case 'SETUP_POSITION':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <Smartphone size={48} className="mx-auto text-gym-accent mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Where is your phone?</h2>
                      <p className="text-gray-400 text-sm mb-6">We need to know position to track reps accurately.</p>
                      <div className="space-y-3">
                          {['Pocket', 'Armband', 'Hand'].map((pos) => (
                              <button 
                                key={pos}
                                onClick={() => setPhonePosition(pos as any)}
                                className={`w-full py-3 rounded-lg border font-bold ${phonePosition === pos ? 'bg-gym-accent border-gym-accent text-white' : 'bg-gym-800 border-gym-700 text-gray-300'}`}
                              >
                                  {pos}
                              </button>
                          ))}
                      </div>
                      <button 
                        disabled={!phonePosition}
                        onClick={handleStartCalibration}
                        className="w-full mt-6 py-4 bg-white text-gym-900 font-bold rounded-xl disabled:opacity-50"
                      >
                          Next
                      </button>
                  </div>
              );

          case 'CALIBRATION_INSTRUCTION':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <RefreshCw size={48} className="mx-auto text-yellow-500 mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Calibration</h2>
                      <p className="text-gray-300 mb-6">Perform <b>1 PERFECT REP</b>. <br/>Full range of motion. Control the speed.</p>
                      <button 
                        onClick={beginCalibrationRep}
                        className="w-full py-4 bg-yellow-500 text-gym-900 font-bold rounded-xl"
                      >
                          I'm Ready
                      </button>
                  </div>
              );

          case 'CALIBRATING':
              return (
                  <div className="text-center animate-in zoom-in">
                      <h2 className="text-4xl font-black text-white mb-4">DO 1 REP</h2>
                      <div className="w-64 h-2 bg-gym-800 rounded-full overflow-hidden mx-auto">
                          <div className="h-full bg-yellow-500 transition-all duration-75" style={{width: `${Math.min(100, (debugVal/10)*100)}%`}}></div>
                      </div>
                      <p className="mt-4 text-gray-400 text-sm">Analyzing...</p>
                  </div>
              );

          case 'CALIBRATION_SAVED':
              return (
                  <div className="text-center animate-in zoom-in">
                      <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Saved!</h2>
                      <p className="text-gray-400 mb-6">Baseline established.</p>
                      <button onClick={() => setState('POSITION_REMINDER')} className="px-8 py-3 bg-white text-gym-900 font-bold rounded-full">Continue</button>
                  </div>
              );

          case 'POSITION_REMINDER':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <div className="bg-gym-800 p-6 rounded-2xl border border-gym-700 mb-6 relative">
                          <button onClick={handleForceRecalibrate} className="absolute top-2 right-2 text-xs text-gym-accent underline">Recalibrate</button>
                          <Smartphone size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500 text-xs uppercase font-bold mb-1">Required Position</p>
                          <h3 className="text-2xl font-bold text-white">{phonePosition}</h3>
                      </div>
                      <button 
                        onClick={handleStartSet}
                        className="w-full py-4 bg-gym-accent text-white font-bold rounded-xl shadow-lg shadow-blue-900/50"
                      >
                          Start Set
                      </button>
                  </div>
              );

          case 'COUNTDOWN':
              return (
                  <div className="text-center">
                      <div className="text-8xl font-black text-white animate-pulse">...</div>
                  </div>
              );

          case 'ACTIVE':
              return (
                  <div className="w-full flex flex-col items-center justify-between h-full py-8">
                      {/* Top Stats */}
                      <div className="w-full flex justify-between items-start px-6">
                          <div>
                              <p className="text-gray-500 text-xs uppercase font-bold">Reps</p>
                              <h2 className="text-6xl font-black text-white leading-none">{reps}</h2>
                              <p className="text-gray-600 text-xs">Target: {targetReps}</p>
                          </div>
                          {useSensors && (
                              <div className="text-right">
                                  <p className="text-gray-500 text-xs uppercase font-bold">AI Coach</p>
                                  <div className={`text-xl font-bold ${feedback.includes('Fast') ? 'text-red-500' : 'text-green-400'}`}>
                                      {feedback}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Visual Pacer (Center) */}
                      {!exercise.isWarmup && exercise.pacer.phases.length > 0 && (
                          <div className="relative">
                              <div className={`w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-300 ease-linear
                                  ${activePhase.breathing === 'Exhale' ? 'border-gym-success bg-gym-success/10 scale-110' : 
                                  activePhase.breathing === 'Inhale' ? 'border-blue-500 bg-blue-500/10 scale-90' : 
                                  'border-yellow-500 bg-yellow-500/10 scale-100'
                                  }
                              `}>
                                  <p className={`text-4xl font-black uppercase italic tracking-tighter ${getPhaseColor(activePhase)}`}>
                                      {activePhase.action}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                      <Wind size={20} className={getPhaseColor(activePhase)} />
                                      <span className="text-xl font-bold text-white">{activePhase.breathing}</span>
                                  </div>
                              </div>
                              {/* Phase Progress Bar */}
                              <div className="w-48 bg-gym-800 rounded-full h-2 mt-8 mx-auto overflow-hidden">
                                  <div 
                                      className={`h-full ${activePhase.breathing === 'Exhale' ? 'bg-gym-success' : 'bg-blue-500'}`}
                                      style={{ width: `${(phaseTimeLeft / activePhase.duration) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                      )}

                      {/* Bottom Button */}
                      <button 
                        onClick={onClose}
                        className="bg-red-500/20 text-red-500 border border-red-500/50 px-10 py-4 rounded-full font-bold flex items-center gap-2"
                      >
                        <X size={20} /> Finish Set
                      </button>
                  </div>
              );
          
          default: return null;
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900/98 backdrop-blur flex flex-col animate-in fade-in">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-gym-700">
            <h3 className="font-bold text-white">{exercise.name}</h3>
            <div className="flex gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400">
                    {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
                </button>
                <button onClick={onClose} className="p-2 bg-gym-800 rounded-full text-white"><X size={20}/></button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            {renderContent()}
        </div>
    </div>
  );
};

export default MotionTracker;
