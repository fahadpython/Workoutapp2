
import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, RefreshCw, CheckCircle2, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { MotionCalibration, Exercise } from '../types';
import { saveCalibration, getCalibration } from '../services/storageService';

interface Props {
  exercise: Exercise;
  onRepCount: (count: number) => void;
  onClose: () => void;
  targetReps: number;
}

type TrackerState = 
  | 'INIT' 
  | 'PERMISSION'
  | 'INSTRUCTION' 
  | 'CALIB_REP_1' 
  | 'CALIB_REP_2' 
  | 'CALIB_REP_3' 
  | 'ANALYZING'
  | 'READY' 
  | 'ACTIVE';

type Axis = 'x' | 'y' | 'z' | 'alpha' | 'beta' | 'gamma';

const MotionTracker: React.FC<Props> = ({ exercise, onRepCount, onClose, targetReps }) => {
  const [state, setState] = useState<TrackerState>('INIT');
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<string>("Ready");
  const [mainMetric, setMainMetric] = useState(0);
  
  // Calibration
  const [calibration, setCalibration] = useState<MotionCalibration & { direction: 1 | -1 } | null>(null);
  const calibBuffer = useRef<{
      x: number[], y: number[], z: number[], 
      alpha: number[], beta: number[], gamma: number[],
      timestamp: number[]
  }>({ x:[], y:[], z:[], alpha:[], beta:[], gamma:[], timestamp:[] });

  // Active Logic
  const [velocity, setVelocity] = useState(0);
  const [positionPct, setPositionPct] = useState(0);
  const repState = useRef<'START' | 'CONCENTRIC' | 'TOP' | 'ECCENTRIC'>('START');
  const lastPositionRef = useRef(0);
  const lastTimeRef = useRef(0);
  const stuckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;
    const saved = getCalibration(exercise.id);
    if (saved) {
        setCalibration({ ...saved, direction: 1 }); // Default direction
        setState('READY');
    } else {
        setState('PERMISSION');
    }
    return () => { stopSensors(); };
  }, [exercise.id]);

  const speak = (text: string) => {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.2;
      synthRef.current.speak(u);
  };

  const startSensors = () => {
      window.addEventListener('devicemotion', handleMotion);
  };
  const stopSensors = () => {
      window.removeEventListener('devicemotion', handleMotion);
  };

  const handleMotion = (event: DeviceMotionEvent) => {
      const now = Date.now();
      const acc = event.accelerationIncludingGravity;
      const rot = event.rotationRate;
      
      const frame = {
          x: acc?.x || 0, y: acc?.y || 0, z: acc?.z || 0,
          alpha: rot?.alpha || 0, beta: rot?.beta || 0, gamma: rot?.gamma || 0
      };

      if (state.startsWith('CALIB_REP')) {
          calibBuffer.current.x.push(frame.x);
          calibBuffer.current.y.push(frame.y);
          calibBuffer.current.z.push(frame.z);
          calibBuffer.current.alpha.push(frame.alpha);
          calibBuffer.current.beta.push(frame.beta);
          calibBuffer.current.gamma.push(frame.gamma);
          calibBuffer.current.timestamp.push(now);
      } else if (state === 'ACTIVE' && calibration) {
          processActiveFrame(frame, now);
      }
  };

  // --- HYBRID AXIS-LOCKER ENGINE ---
  const analyzeCalibration = () => {
      const data = calibBuffer.current;
      const axes: Axis[] = ['x', 'y', 'z', 'alpha', 'beta', 'gamma'];
      let bestAxis: Axis = 'y';
      let maxRange = 0;
      let mode: 'LINEAR' | 'ROTATIONAL' = 'LINEAR';

      // 1. Determine Mode & Axis
      axes.forEach(axis => {
          const values = data[axis];
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          
          let score = 0;
          if (['alpha', 'beta', 'gamma'].includes(axis)) {
              // Rotation > 40 degrees roughly correlates to > 50-100 deg/s peaks in motion
              score = range / 50; 
          } else {
              // Linear (Gravity 9.8)
              score = range / 4; 
          }

          if (score > maxRange) {
              maxRange = score;
              bestAxis = axis;
              mode = ['alpha', 'beta', 'gamma'].includes(axis) ? 'ROTATIONAL' : 'LINEAR';
          }
      });

      if (maxRange < 0.5) {
          speak("Motion too small. Try again.");
          setState('INSTRUCTION');
          return;
      }

      // 2. Determine Direction (Does rep Start High or Low?)
      // We assume the user starts calibration at the "Start" position.
      // Average the first 10 frames vs the calculated Min/Max.
      const axisValues = data[bestAxis];
      const startVal = axisValues.slice(0, 10).reduce((a,b) => a+b,0) / 10;
      const minVal = Math.min(...axisValues);
      const maxVal = Math.max(...axisValues);
      
      // If start is closer to Max, then Rep goes Down (Max -> Min -> Max)
      // If start is closer to Min, then Rep goes Up (Min -> Max -> Min)
      // We want Normalized Position 0 to be Start, 1 to be End (Peak Contraction)
      let direction: 1 | -1 = 1;
      
      const distToMin = Math.abs(startVal - minVal);
      const distToMax = Math.abs(startVal - maxVal);
      
      // Standard: Start is Min (0). End is Max (1).
      // Inverted: Start is Max (0). End is Min (1).
      if (distToMax < distToMin) {
          direction = -1; // Inverted
      }

      const calibData: MotionCalibration & { direction: 1 | -1 } = {
          exerciseId: exercise.id,
          mode,
          axis: bestAxis,
          minVal,
          maxVal,
          avgRepTime: 3000, 
          calibratedAt: new Date().toISOString(),
          direction
      };

      setCalibration(calibData);
      saveCalibration(calibData);
      setState('READY');
      speak("Engine Locked.");
  };

  const processActiveFrame = (frame: any, now: number) => {
      if (!calibration) return;

      const raw = frame[calibration.axis];
      const range = calibration.maxVal - calibration.minVal;
      
      // Normalize 0..1
      let pct = (raw - calibration.minVal) / range;
      
      // Apply Direction Correction
      if (calibration.direction === -1) {
          pct = 1 - pct;
      }
      
      // Clamp
      pct = Math.max(0, Math.min(1, pct));
      
      // Smoothing
      const smoothPct = (pct * 0.15) + (lastPositionRef.current * 0.85);
      
      setPositionPct(smoothPct * 100);
      setMainMetric(smoothPct);
      
      // Velocity (Pct/sec)
      const dt = (now - lastTimeRef.current) / 1000;
      if (dt > 0) {
          const v = (smoothPct - lastPositionRef.current) / dt;
          setVelocity(v);
          analyzeRep(smoothPct, v);
      }
      
      lastPositionRef.current = smoothPct;
      lastTimeRef.current = now;
  };

  const analyzeRep = (pos: number, vel: number) => {
      // Logic Flow from Prompt
      // 1. Start -> End (Concentric)
      // 2. End (Squeeze)
      // 3. End -> Start (Eccentric)
      
      const START_ZONE = 0.25;
      const END_ZONE = 0.75;

      switch (repState.current) {
          case 'START':
              if (pos > START_ZONE && vel > 0.3) {
                  repState.current = 'CONCENTRIC';
                  setFeedback("Drive!");
              }
              break;
          case 'CONCENTRIC':
              // Sticking Point Logic
              if (vel < 0.1 && pos > 0.3 && pos < 0.7) {
                  setFeedback("PUSH HARDER!");
              }
              if (pos > END_ZONE) {
                  repState.current = 'TOP';
                  setFeedback("Squeeze");
              }
              break;
          case 'TOP':
              if (pos < END_ZONE && vel < -0.2) {
                  repState.current = 'ECCENTRIC';
                  setFeedback("Control Down");
              }
              break;
          case 'ECCENTRIC':
              if (vel < -1.5) setFeedback("Too Fast!");
              
              if (pos < START_ZONE) {
                  setReps(r => r + 1);
                  onRepCount(reps + 1);
                  speak((reps + 1).toString());
                  repState.current = 'START';
                  setFeedback("Rep Complete");
              }
              break;
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900/98 backdrop-blur flex flex-col animate-in fade-in">
        <div className="p-4 flex justify-between items-center border-b border-gym-700">
            <h3 className="font-bold text-white">{exercise.name}</h3>
            <button onClick={() => { stopSensors(); onClose(); }} className="p-2 bg-gym-800 rounded-full text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {state === 'PERMISSION' && (
                <div className="max-w-xs">
                    <Smartphone size={64} className="mx-auto text-gym-accent mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">Sensor Access</h2>
                    <button onClick={() => { startSensors(); setState('INSTRUCTION'); }} className="w-full py-4 bg-gym-accent text-white font-bold rounded-xl">Allow Access</button>
                </div>
            )}

            {state === 'INSTRUCTION' && (
                <div className="max-w-xs">
                    <RefreshCw size={64} className="mx-auto text-yellow-500 mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Calibration</h2>
                    <p className="text-gray-300 mb-8">Do 3 full reps to teach the AI your range of motion.</p>
                    <button onClick={() => { startSensors(); setState('CALIB_REP_1'); speak("Start Rep 1"); }} className="w-full py-4 bg-yellow-500 text-gym-900 font-bold rounded-xl">Start Calibration</button>
                </div>
            )}

            {state.startsWith('CALIB') && (
                <div className="w-full h-full flex flex-col items-center justify-center" onClick={() => {
                    if (state === 'CALIB_REP_1') { setState('CALIB_REP_2'); speak("Rep 2"); }
                    else if (state === 'CALIB_REP_2') { setState('CALIB_REP_3'); speak("Rep 3"); }
                    else if (state === 'CALIB_REP_3') { analyzeCalibration(); }
                }}>
                    <h2 className="text-6xl font-black text-white mb-4">{state.replace('CALIB_', '').replace('_', ' ')}</h2>
                    <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-ping"></div>
                    <p className="mt-12 text-gray-500">Tap after completing rep</p>
                </div>
            )}

            {state === 'READY' && (
                <div className="max-w-xs animate-in zoom-in">
                    <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Engine Locked</h2>
                    <p className="text-gray-400 mb-6 text-sm">Mode: {calibration?.mode} | Axis: {calibration?.axis}</p>
                    <button onClick={() => { setState('ACTIVE'); speak("Go"); }} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg">Start Set</button>
                    <button onClick={() => setState('INSTRUCTION')} className="mt-4 text-gray-500 text-sm">Recalibrate</button>
                </div>
            )}

            {state === 'ACTIVE' && (
                <div className="w-full flex flex-col items-center">
                     <div className="w-64 h-64 relative rounded-full border-8 border-gym-700 flex items-center justify-center bg-gym-900 shadow-inner">
                         <div className="absolute inset-0 rounded-full bg-gym-accent opacity-20 transition-all duration-75" style={{ transform: `scale(${0.2 + (mainMetric * 0.8)})` }}></div>
                         <div className="z-10 text-center">
                             <h2 className="text-8xl font-black text-white">{reps}</h2>
                             <p className="text-gray-400 font-bold uppercase tracking-wider text-sm mt-2">{feedback}</p>
                         </div>
                         {velocity > 0.5 && <ArrowUp className="absolute top-4 text-green-500 animate-bounce" size={32} />}
                         {velocity < -0.5 && <ArrowDown className="absolute bottom-4 text-blue-500 animate-bounce" size={32} />}
                     </div>
                     <button onClick={onClose} className="mt-8 px-8 py-3 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full font-bold">Stop</button>
                </div>
            )}
        </div>
    </div>
  );
};

export default MotionTracker;
