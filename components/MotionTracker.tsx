
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, RefreshCw, X, Zap, AlertCircle, CheckCircle2, Smartphone, Volume2, VolumeX, Wind, Lock } from 'lucide-react';
import { MotionCalibration, Exercise, PacerConfig, PacerPhase, MuscleGroup } from '../types';
import { saveCalibration, getCalibration } from '../services/storageService';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type TrackerState = 
  | 'INIT' 
  | 'SETUP_POSITION' 
  | 'CALIBRATION_INSTRUCTION' 
  | 'CALIBRATING' 
  | 'CALIBRATION_SAVED' 
  | 'POSITION_REMINDER' 
  | 'COUNTDOWN'
  | 'ACTIVE' 
  | 'FINISHED';

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
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
  const stillnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const MOVEMENT_THRESHOLD_HIGH = 2.0; // Start rep threshold (m/s^2)
  const MOVEMENT_THRESHOLD_LOW = 1.0;  // End rep threshold
  const REP_COOLDOWN = 800; 

  // --- DERIVE OPTIMAL POSITION ---
  const getOptimalPosition = (ex: Exercise): 'Pocket' | 'Armband' | 'Hand' => {
      const group = ex.targetGroup;
      const motion = ex.motionType;

      // Leg exercises -> Pocket (Hands usually holding weights)
      if (group === 'Legs' || group === 'Abs') return 'Pocket';
      
      // Presses -> Armband preferred (Hands move linearly, pocket might bunch up)
      if (motion === 'press' || group === 'Chest' || group === 'Shoulders') return 'Armband';
      
      // Arms/Pulling -> Hand allows seeing rotation, or Armband
      if (group === 'Biceps' || group === 'Triceps' || motion === 'curl') return 'Hand';
      
      return 'Pocket'; // Default fallback
  };

  const recommendedPosition = getOptimalPosition(exercise);

  // --- INIT ---
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Check local storage for calibration
    const saved = getCalibration(exercise.id);
    if (saved) {
        setCalibrationData(saved);
        setPhonePosition(saved.position);
        setState('POSITION_REMINDER');
    } else {
        // Enforce the recommended position initially
        setPhonePosition(recommendedPosition);
        setState('SETUP_POSITION');
    }

    return () => {
      stopSensors();
      stopPacerEngine();
      synthRef.current?.cancel();
      if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
    };
  }, [exercise.id]);

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
    // iOS 13+ support
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
      // Non-iOS
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
      // Reset logic
      isMoving.current = false;
      calibMaxForce.current = 0;
      motionBuffer.current = [];
  };

  // --- STEP 3: STARTING WORKOUT ---
  const handleStartSet = () => {
      if (!permissionGranted) {
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
      setPhonePosition(recommendedPosition);
      setState('SETUP_POSITION');
  };

  // --- SENSOR LOGIC ---
  const startSensors = () => window.addEventListener('devicemotion', handleMotion);
  const stopSensors = () => window.removeEventListener('devicemotion', handleMotion);

  const handleMotion = (event: DeviceMotionEvent) => {
    let mag = 0;

    // PREFER Linear Acceleration (Gravity removed)
    if (event.acceleration && event.acceleration.x !== null) {
        const { x, y, z } = event.acceleration;
        mag = Math.sqrt(x!*x! + y!*y! + z!*z!);
    } 
    // FALLBACK to Acceleration with Gravity (approximate)
    else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x !== null) {
        const { x, y, z } = event.accelerationIncludingGravity;
        const total = Math.sqrt(x!*x! + y!*y! + z!*z!);
        // Simple filter: Movement is deviation from 9.8 (1 G)
        // This handles rotation because 1G is 1G regardless of vector direction
        mag = Math.abs(total - 9.8);
    }

    setDebugVal(mag); 

    const now = Date.now();

    if (state === 'CALIBRATING') {
       processCalibration(mag, now);
    } else if (state === 'ACTIVE') {
       processActiveSet(mag, now);
    }
  };

  // CALIBRATION PROCESSING
  const calibStartTime = useRef(0);
  const calibMaxForce = useRef(0);
  
  const processCalibration = (mag: number, now: number) => {
      // 1. Detect Start
      if (!isMoving.current && mag > MOVEMENT_THRESHOLD_HIGH) {
          isMoving.current = true;
          calibStartTime.current = now;
          calibMaxForce.current = mag;
          setFeedback("Detecting movement...");
      }

      // 2. While Moving
      if (isMoving.current) {
          if (mag > calibMaxForce.current) calibMaxForce.current = mag;
          
          // 3. Detect End (Drop below LOW threshold)
          if (mag < MOVEMENT_THRESHOLD_LOW) {
             // Debounce: Must be still for 1s to confirm end
             if (!stillnessTimer.current) {
                 stillnessTimer.current = setTimeout(() => {
                     // Timer completed = Confirmed Stop
                     finishCalibration(now);
                 }, 1000); // 1 second stillness
             }
          } else {
              // Movement continued, cancel timer
              if (stillnessTimer.current) {
                  clearTimeout(stillnessTimer.current);
                  stillnessTimer.current = null;
              }
          }
      }
  };

  const finishCalibration = (now: number) => {
      // Safety check: ensure reasonable duration
      const duration = now - calibStartTime.current - 1000; // Subtract the stillness wait
      
      if (duration > 800) {
          const newData: MotionCalibration = {
              exerciseId: exercise.id,
              avgTime: duration,
              peakForce: calibMaxForce.current,
              position: phonePosition || 'Pocket',
              calibratedAt: new Date().toISOString()
          };
          setCalibrationData(newData);
          saveCalibration(newData); 
          setState('CALIBRATION_SAVED');
          speak("Calibration Saved.");
          isMoving.current = false;
          if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
      } else {
          // Noise/False start
          isMoving.current = false;
          setFeedback("Too short. Try again.");
          if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
      }
  };

  // ACTIVE SET PROCESSING
  const processActiveSet = (mag: number, now: number) => {
      if (!calibrationData) return;

      if (!isMoving.current && mag > MOVEMENT_THRESHOLD_HIGH) {
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
              if (variance > 4.0) { // Higher tolerance for shaking
                  shakeCount.current++;
                  if (shakeCount.current > 20) {
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
          if (mag < MOVEMENT_THRESHOLD_LOW) {
              // Quick Rep Logic: 500ms debounce
              if (now - lastRepTime.current > 500) {
                  // We don't use strict stillness timer here for responsiveness, 
                  // just a drop below threshold after min duration
                  const repDuration = now - repStartTime.current;
                  if (repDuration > 500) { // Min valid rep time
                      const newCount = reps + 1;
                      setReps(newCount);
                      onRepCount(newCount);
                      isMoving.current = false;
                      lastRepTime.current = now;
                      analyzeRep(repDuration, calibrationData.avgTime);
                  }
              }
          } else {
              lastRepTime.current = now; // Reset debounce timestamp
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
                      <h2 className="text-2xl font-bold text-white mb-2">Required Placement</h2>
                      <p className="text-gray-400 text-sm mb-6">For {exercise.name}, optimal sensor accuracy requires:</p>
                      
                      <div className="bg-gym-800 p-4 rounded-xl border border-gym-accent mb-6">
                          <p className="text-xl font-bold text-white uppercase tracking-wider">{phonePosition}</p>
                      </div>

                      <p className="text-xs text-gray-500 mb-6">
                          Please secure your phone in your <b>{phonePosition}</b> before continuing.
                      </p>
                      
                      <button 
                        onClick={handleStartCalibration}
                        className="w-full mt-2 py-4 bg-white text-gym-900 font-bold rounded-xl"
                      >
                          I'm Set
                      </button>
                  </div>
              );

          case 'CALIBRATION_INSTRUCTION':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <RefreshCw size={48} className="mx-auto text-yellow-500 mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Calibration</h2>
                      <p className="text-gray-300 mb-6">Perform <b>1 PERFECT REP</b> then hold still.</p>
                      <button 
                        onClick={beginCalibrationRep}
                        className="w-full py-4 bg-yellow-500 text-gym-900 font-bold rounded-xl"
                      >
                          Start
                      </button>
                  </div>
              );

          case 'CALIBRATING':
              return (
                  <div className="text-center animate-in zoom-in w-full max-w-xs">
                      <h2 className="text-4xl font-black text-white mb-4">DO 1 REP</h2>
                      <div className="w-full h-4 bg-gym-800 rounded-full overflow-hidden mx-auto mb-4">
                          <div className="h-full bg-yellow-500 transition-all duration-75" style={{width: `${Math.min(100, (debugVal/15)*100)}%`}}></div>
                      </div>
                      <p className="mt-4 text-gray-400 text-sm animate-pulse">Analyzing Motion...</p>
                      
                      {/* Manual Finish for stuck sensors */}
                      <button 
                        onClick={() => finishCalibration(Date.now() + 1000)} // Force finish with dummy duration if stuck
                        className="mt-8 text-xs text-gray-500 underline"
                      >
                          Stuck? Tap to Finish
                      </button>
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
                          <p className="text-gray-500 text-xs uppercase font-bold mb-1">Position Check</p>
                          <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                              {phonePosition} <Lock size={16} className="text-gym-success"/>
                          </h3>
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
                          
                          <div className="text-right">
                              <p className="text-gray-500 text-xs uppercase font-bold">AI Coach</p>
                              <div className={`text-xl font-bold ${feedback.includes('Fast') ? 'text-red-500' : 'text-green-400'}`}>
                                  {feedback}
                              </div>
                          </div>
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
