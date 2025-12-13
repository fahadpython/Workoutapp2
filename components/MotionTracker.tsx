
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, RefreshCw, X, Zap, AlertCircle, CheckCircle2, Smartphone, Volume2, VolumeX, Wind, Lock, BarChart3 } from 'lucide-react';
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
  const [debugVal, setDebugVal] = useState(0); // Live Sensor Value
  const [maxForce, setMaxForce] = useState(0); // Peak force tracking
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

  // Constants for Physics
  // We use Deviation from Gravity (9.8m/s). 
  // 1.5 = Moderate movement. 5.0 = Explosive.
  const THRESHOLD_START = 1.8; 
  const THRESHOLD_END = 1.2;  
  const MIN_REP_TIME = 600; // ms

  // --- DERIVE OPTIMAL POSITION ---
  const getOptimalPosition = (ex: Exercise): 'Pocket' | 'Armband' | 'Hand' => {
      const group = ex.targetGroup;
      const motion = ex.motionType;
      if (group === 'Legs' || group === 'Abs') return 'Pocket';
      if (motion === 'press' || group === 'Chest' || group === 'Shoulders') return 'Armband';
      if (group === 'Biceps' || group === 'Triceps' || motion === 'curl') return 'Hand';
      return 'Pocket';
  };

  const recommendedPosition = getOptimalPosition(exercise);

  // --- INIT ---
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    const saved = getCalibration(exercise.id);
    if (saved) {
        setCalibrationData(saved);
        setPhonePosition(saved.position);
        setState('POSITION_REMINDER');
    } else {
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
  const speak = (text: string, force = false, pitch = 1.1) => {
    if (isMuted || !synthRef.current) return;
    const now = Date.now();
    // Allow overlapping speech only if forced (like counts)
    if (!force && now - lastSpeechTime.current < 1500) return;
    
    lastSpeechTime.current = now;
    synthRef.current.cancel(); 
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.2;
    u.pitch = pitch;
    synthRef.current.speak(u);
  };

  const vibrate = (pattern: number | number[]) => {
      if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  // --- SENSOR LOGIC ---
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

  const startSensors = () => window.addEventListener('devicemotion', handleMotion);
  const stopSensors = () => window.removeEventListener('devicemotion', handleMotion);

  const handleMotion = (event: DeviceMotionEvent) => {
    let mag = 0;

    // Calculate Total Force (Magnitude)
    if (event.acceleration) {
        const { x, y, z } = event.acceleration;
        if (x !== null && y !== null && z !== null) {
             mag = Math.sqrt(x*x + y*y + z*z);
        }
    } 
    
    // Fallback if linear acceleration not available (older Androids)
    if (mag === 0 && event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        if (x !== null && y !== null && z !== null) {
            const total = Math.sqrt(x*x + y*y + z*z);
            mag = Math.abs(total - 9.8); // Remove gravity approx
        }
    }

    setDebugVal(mag); // Update UI bar
    if (mag > maxForce) setMaxForce(mag); // Track peak for calibration UI

    const now = Date.now();

    if (state === 'CALIBRATING') {
       processCalibration(mag, now);
    } else if (state === 'ACTIVE') {
       processActiveSet(mag, now);
    }
  };

  // --- 1. CALIBRATION LOGIC ---
  const calibStartTime = useRef(0);
  const calibMaxForce = useRef(0);
  
  const handleStartCalibration = () => {
      requestPermission(() => {
          setState('CALIBRATION_INSTRUCTION');
          speak(`Place phone in your ${phonePosition}.`);
      });
  };

  const beginCalibrationRep = () => {
      setState('CALIBRATING');
      speak("Do one rep now.");
      isMoving.current = false;
      calibMaxForce.current = 0;
      setMaxForce(0);
  };

  const processCalibration = (mag: number, now: number) => {
      // START DETECTION
      if (!isMoving.current && mag > THRESHOLD_START) {
          isMoving.current = true;
          calibStartTime.current = now;
          calibMaxForce.current = mag;
          setFeedback("Measuring...");
      }

      // DURING REP
      if (isMoving.current) {
          if (mag > calibMaxForce.current) calibMaxForce.current = mag;
          
          // END DETECTION (Signal drops + Time passed)
          if (mag < THRESHOLD_END) {
             // We need a moment of silence to confirm end
             if (!stillnessTimer.current) {
                 stillnessTimer.current = setTimeout(() => {
                     finishCalibration(now);
                 }, 800); // Wait 0.8s to confirm stop
             }
          } else {
              // Still moving, cancel stop timer
              if (stillnessTimer.current) {
                  clearTimeout(stillnessTimer.current);
                  stillnessTimer.current = null;
              }
          }
      }
  };

  const finishCalibration = (now: number) => {
      const duration = now - calibStartTime.current - 800; // Subtract wait time
      
      if (duration > 500) {
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
          speak("Calibration Good.");
          isMoving.current = false;
      } else {
          isMoving.current = false;
          setFeedback("Too short. Do a full rep.");
          speak("Too short. Again.");
      }
      if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
  };

  // --- 2. ACTIVE SET LOGIC ---
  const processActiveSet = (mag: number, now: number) => {
      if (!calibrationData) return;

      // START REP
      if (!isMoving.current && mag > THRESHOLD_START) {
          // Debounce: prevent double counting too fast
          if (now - lastRepTime.current > 400) {
              isMoving.current = true;
              repStartTime.current = now;
          }
      }

      // DURING REP
      if (isMoving.current) {
          // END REP DETECTION
          if (mag < THRESHOLD_END) {
              // Less strict end detection for active workout to be responsive
              if (now - lastRepTime.current > 400) { // Safety buffer
                  const repDuration = now - repStartTime.current;
                  
                  // Minimum duration sanity check (0.5s)
                  if (repDuration > 500) {
                      completeRep(repDuration);
                  }
              }
          } else {
              // Keep updating timestamp while moving
              lastRepTime.current = now; 
          }
      }
  };

  const completeRep = (duration: number) => {
      isMoving.current = false;
      const newCount = reps + 1;
      setReps(newCount);
      onRepCount(newCount);
      
      // SYNC PACER: Reset visual loop to 0 to match user's rhythm
      resetPacerEngine();

      // SMART COACH VOICE
      const remaining = targetReps - newCount;
      
      if (remaining === 0) {
          speak("Set Complete!", true);
          setFeedback("DONE!");
      } else if (remaining <= 3 && remaining > 0) {
          if (remaining === 1) speak("Last one!", true);
          else speak(`${remaining} more`, true);
      } else {
          // Just count the number
          speak(newCount.toString(), true);
      }

      // ANALYZE TEMPO
      const targetTime = calibrationData?.avgTime || 2000;
      const ratio = duration / targetTime;
      
      if (ratio < 0.6) {
          setFeedback("Too Fast!");
          vibrate([50, 50, 50]);
      } else if (ratio > 1.5) {
          setFeedback("Grinding...");
      } else {
          setFeedback("Good Tempo");
      }
  };

  const handleStartSet = () => {
      if (!permissionGranted) {
          requestPermission(() => startCountdown());
      } else {
          startCountdown();
      }
  };

  const startCountdown = () => {
      setState('COUNTDOWN');
      let count = 3;
      speak(`Target: ${targetReps} reps. Starting in 3`);
      const interval = setInterval(() => {
          count--;
          if (count > 0) speak(count.toString());
          else {
              clearInterval(interval);
              setState('ACTIVE');
              speak("Go!");
              startPacerEngine(); 
          }
      }, 1000);
  };

  // --- VISUAL PACER ENGINE ---
  const resetPacerEngine = () => {
      // Syncs the visual animation to the start of the cycle
      startPacerEngine();
  };

  const runPhase = (phaseIdx: number) => {
      if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);

      const phases = exercise.pacer.phases;
      if (!phases || phases.length === 0) return;

      const currentPhase = phases[phaseIdx];
      setCurrentPhaseIndex(phaseIdx);
      
      const durationMs = currentPhase.duration * 1000;
      const startTime = Date.now();
      
      setPhaseTimeLeft(currentPhase.duration);

      // Simple Haptics for phase change
      if (currentPhase.action === 'EXPLODE' || currentPhase.action === 'DRIVE') vibrate(50);

      pacerTimerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;
          const remainingMs = Math.max(0, durationMs - elapsed);
          
          setPhaseTimeLeft(remainingMs / 1000);

          if (remainingMs <= 0) {
              if(pacerTimerRef.current) clearInterval(pacerTimerRef.current);
              const nextPhaseIdx = phaseIdx + 1;
              // Loop or Stop? In AI mode, we ideally loop, but relying on resetPacerEngine for hard sync
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
      action: 'READY', breathing: 'Hold', duration: 1, voiceCue: ''
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
              return <div className="text-white">Initializing Sensors...</div>;
          
          case 'SETUP_POSITION':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <Smartphone size={48} className="mx-auto text-gym-accent mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Required Placement</h2>
                      <div className="bg-gym-800 p-4 rounded-xl border border-gym-accent mb-6">
                          <p className="text-xl font-bold text-white uppercase tracking-wider">{phonePosition}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-6">Put phone in {phonePosition} for accuracy.</p>
                      <button onClick={handleStartCalibration} className="w-full py-4 bg-white text-gym-900 font-bold rounded-xl">Next</button>
                  </div>
              );

          case 'CALIBRATION_INSTRUCTION':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <RefreshCw size={48} className="mx-auto text-yellow-500 mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Calibration</h2>
                      <p className="text-gray-300 mb-6">Perform <b>1 FULL REP</b> then STOP moving.</p>
                      <button onClick={beginCalibrationRep} className="w-full py-4 bg-yellow-500 text-gym-900 font-bold rounded-xl">Start Calibration</button>
                  </div>
              );

          case 'CALIBRATING':
              return (
                  <div className="text-center animate-in zoom-in w-full max-w-xs">
                      <h2 className="text-4xl font-black text-white mb-4">DO 1 REP</h2>
                      
                      {/* Live Sensor Feedback Bar */}
                      <div className="w-full h-12 bg-gym-800 rounded-lg overflow-hidden mx-auto mb-2 border border-gym-700 relative">
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 z-10 font-mono">
                              FORCE SENSOR
                          </div>
                          {/* Live Bar */}
                          <div 
                            className="h-full bg-yellow-500 transition-all duration-75 ease-out opacity-50" 
                            style={{width: `${Math.min(100, (debugVal/5)*100)}%`}}
                          ></div>
                          {/* Peak Marker */}
                          <div 
                             className="absolute top-0 bottom-0 w-1 bg-white" 
                             style={{left: `${Math.min(100, (maxForce/5)*100)}%`}}
                          ></div>
                      </div>
                      
                      <p className="text-gym-accent font-bold animate-pulse mb-8">{feedback}</p>
                      
                      <button onClick={() => finishCalibration(Date.now() + 1000)} className="text-xs text-gray-500 underline mt-4">Manual Finish (If Stuck)</button>
                  </div>
              );

          case 'CALIBRATION_SAVED':
              return (
                  <div className="text-center animate-in zoom-in">
                      <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Saved!</h2>
                      <p className="text-gray-400 mb-6">Sensor Calibrated.</p>
                      <button onClick={() => setState('POSITION_REMINDER')} className="px-8 py-3 bg-white text-gym-900 font-bold rounded-full">Continue</button>
                  </div>
              );

          case 'POSITION_REMINDER':
              return (
                  <div className="max-w-xs text-center animate-in zoom-in">
                      <div className="bg-gym-800 p-6 rounded-2xl border border-gym-700 mb-6 relative">
                          <p className="text-gray-500 text-xs uppercase font-bold mb-1">Check Position</p>
                          <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                              {phonePosition} <Lock size={16} className="text-gym-success"/>
                          </h3>
                      </div>
                      <button onClick={handleStartSet} className="w-full py-4 bg-gym-accent text-white font-bold rounded-xl shadow-lg shadow-blue-900/50">Start Set</button>
                  </div>
              );

          case 'COUNTDOWN':
              return <div className="text-center"><div className="text-8xl font-black text-white animate-pulse">...</div></div>;

          case 'ACTIVE':
              return (
                  <div className="w-full flex flex-col items-center justify-between h-full py-8">
                      <div className="w-full flex justify-between items-start px-6">
                          <div>
                              <p className="text-gray-500 text-xs uppercase font-bold">Reps</p>
                              <h2 className="text-7xl font-black text-white leading-none">{reps}</h2>
                              <p className="text-gray-400 text-sm mt-1">Target: {targetReps}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-gray-500 text-xs uppercase font-bold">AI Coach</p>
                              <div className={`text-xl font-bold ${feedback.includes('Fast') ? 'text-red-500' : 'text-green-400'}`}>{feedback}</div>
                              {/* Small Debug Bar for Active Mode */}
                              <div className="w-24 h-1 bg-gym-700 mt-2 ml-auto rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{width: `${Math.min(100, (debugVal/4)*100)}%`}}></div>
                              </div>
                          </div>
                      </div>

                      {/* Synced Visual Pacer */}
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
                              <div className="w-48 bg-gym-800 rounded-full h-2 mt-8 mx-auto overflow-hidden">
                                  <div className={`h-full ${activePhase.breathing === 'Exhale' ? 'bg-gym-success' : 'bg-blue-500'}`} style={{ width: `${(phaseTimeLeft / activePhase.duration) * 100}%` }}></div>
                              </div>
                          </div>
                      )}

                      <button onClick={onClose} className="bg-red-500/20 text-red-500 border border-red-500/50 px-10 py-4 rounded-full font-bold flex items-center gap-2"><X size={20} /> Finish Set</button>
                  </div>
              );
          
          default: return null;
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900/98 backdrop-blur flex flex-col animate-in fade-in">
        <div className="p-4 flex justify-between items-center border-b border-gym-700">
            <h3 className="font-bold text-white">{exercise.name}</h3>
            <div className="flex gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400">
                    {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
                </button>
                <button onClick={onClose} className="p-2 bg-gym-800 rounded-full text-white"><X size={20}/></button>
            </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            {renderContent()}
        </div>
    </div>
  );
};

export default MotionTracker;
