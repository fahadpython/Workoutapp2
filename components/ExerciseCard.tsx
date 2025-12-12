import React, { useState, useEffect, useRef } from 'react';
import { Exercise, SetLog, ExerciseHistory, PacerPhase, MotionType, CoachRecommendation } from '../types';
import { getExerciseHistory, calculateCalories, getProgressionRecommendation, analyzeSetPerformance, checkPlateau } from '../services/storageService';
import { Info, CheckCircle, ChevronDown, ChevronUp, Dumbbell, ArrowLeft, History, Mic, Square, Layers, Wind, Flame, Volume2, VolumeX, Timer, Footprints, Activity, Zap, BrainCircuit, Eye, Wrench, AlertTriangle } from 'lucide-react';
import StickFigure from './StickFigure';

interface Props {
  exercise: Exercise;
  completedSets: SetLog[];
  onLogSet: (weight: number, reps: number, isDropSet: boolean, isMonsterSet: boolean) => void;
  onBack: () => void;
}

// --- SUB-COMPONENT: FORM VISUALIZER ---
const FormVisualizer: React.FC<{ type?: MotionType }> = ({ type }) => {
  if (!type) return null;

  const getAnimClass = () => {
    switch(type) {
      case 'press': return 'animate-visualizer-press';
      case 'pull': return 'animate-visualizer-pull';
      case 'hinge': return 'animate-visualizer-hinge';
      case 'curl': return 'animate-visualizer-curl';
      case 'raise': return 'animate-visualizer-raise';
      case 'fly': return 'animate-visualizer-fly';
      case 'hold': return 'animate-visualizer-hold';
      case 'cardio': return 'animate-visualizer-cardio';
      default: return '';
    }
  };

  const getLabel = () => {
      switch(type) {
        case 'press': return 'Slow Down (Stretch) → Explode Up (Squeeze)';
        case 'pull': return 'Drive Down/Back (Squeeze) → Slow Release';
        case 'hinge': return 'Hips Back (Stretch) → Drive Forward';
        case 'curl': return 'Curl Up (Squeeze) → Control Down';
        case 'raise': return 'Raise (Squeeze) → Control Down';
        case 'hold': return 'Constant Tension (No Movement)';
        case 'cardio': return 'Rhythmic Pace';
        default: return 'Control the resistance';
      }
  }

  return (
    <div className="bg-gym-800/50 rounded-xl p-4 border border-gym-700/50 mb-4 flex items-center gap-4">
      <div className="w-16 h-24 bg-gym-900 rounded-lg relative overflow-hidden border border-gym-700 flex justify-center items-center flex-shrink-0">
         {/* Static Track */}
         {type !== 'fly' && type !== 'cardio' && <div className="absolute top-2 bottom-2 w-1 bg-gym-800 rounded-full"></div>}
         
         {/* Moving Weight/Part */}
         {type === 'hold' ? (
             <div className={`w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] ${getAnimClass()}`}></div>
         ) : type === 'cardio' ? (
             <div className={`w-8 h-8 rounded-full bg-blue-500 ${getAnimClass()}`}></div>
         ) : (
             <div className={`w-8 h-4 rounded shadow-lg absolute ${type === 'fly' ? 'top-1/2' : ''} ${getAnimClass()}`}></div>
         )}
      </div>
      <div>
         <p className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
            <Activity size={12} className="text-gym-accent" /> Bio-Mechanics
         </p>
         <p className="text-sm font-bold text-white capitalize">{type} Motion</p>
         <p className="text-[10px] text-gray-500 mt-1">{getLabel()}</p>
      </div>
      <style>{`
        /* Color Logic: Blue/Purple = Stretch (Eccentric), Red/Orange = Squeeze (Concentric) */

        @keyframes visualizer-press {
          0% { top: 10%; background-color: #ef4444; box-shadow: 0 0 10px #ef4444; } /* Top (Start) */
          60% { top: 80%; background-color: #3b82f6; box-shadow: 0 0 5px #3b82f6; } /* Down Slow (Stretch) */
          70% { top: 80%; background-color: #3b82f6; } /* Pause */
          100% { top: 10%; background-color: #ef4444; box-shadow: 0 0 15px #ef4444; } /* Up Fast (Squeeze) */
        }
        @keyframes visualizer-pull {
          0% { top: 10%; background-color: #3b82f6; } /* Top (Extended/Stretch) */
          20% { top: 80%; background-color: #f97316; box-shadow: 0 0 15px #f97316; } /* Down Fast (Squeeze) */
          40% { top: 80%; background-color: #f97316; } /* Squeeze */
          100% { top: 10%; background-color: #3b82f6; box-shadow: 0 0 5px #3b82f6; } /* Up Slow (Stretch) */
        }
        @keyframes visualizer-curl {
          0% { top: 80%; background-color: #3b82f6; } /* Bottom (Stretch) */
          30% { top: 20%; background-color: #ef4444; box-shadow: 0 0 15px #ef4444; } /* Up Fast (Squeeze) */
          50% { top: 20%; background-color: #ef4444; } /* Squeeze */
          100% { top: 80%; background-color: #3b82f6; box-shadow: 0 0 5px #3b82f6; } /* Down Slow */
        }
        @keyframes visualizer-hinge {
           0% { top: 20%; background-color: #ef4444; } /* Standing */
           60% { top: 80%; background-color: #3b82f6; box-shadow: 0 0 5px #3b82f6; } /* Hinge Down (Stretch) */
           70% { top: 80%; background-color: #3b82f6; } /* Pause */
           100% { top: 20%; background-color: #ef4444; box-shadow: 0 0 15px #ef4444; } /* Drive Up (Squeeze) */
        }
        @keyframes visualizer-raise {
           0% { top: 80%; background-color: #3b82f6; } /* Side (Bottom) */
           30% { top: 20%; background-color: #f97316; box-shadow: 0 0 15px #f97316; } /* Up (Squeeze) */
           45% { top: 20%; background-color: #f97316; } /* Pause */
           100% { top: 80%; background-color: #3b82f6; } /* Down Slow */
        }
        @keyframes visualizer-fly {
           0% { width: 90%; left: 5%; background-color: #3b82f6; } /* Wide (Stretch) */
           30% { width: 20%; left: 40%; background-color: #ef4444; box-shadow: 0 0 15px #ef4444; } /* Squeeze In */
           50% { width: 20%; left: 40%; background-color: #ef4444; } 
           100% { width: 90%; left: 5%; background-color: #3b82f6; } /* Stretch Out */
        }
        @keyframes visualizer-hold {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 20px #f97316; }
            100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes visualizer-cardio {
            0% { transform: translateX(-15px); }
            50% { transform: translateX(15px); }
            100% { transform: translateX(-15px); }
        }

        .animate-visualizer-press { animation: visualizer-press 4s infinite ease-in-out; }
        .animate-visualizer-pull { animation: visualizer-pull 4s infinite ease-in-out; }
        .animate-visualizer-curl { animation: visualizer-curl 4s infinite ease-in-out; }
        .animate-visualizer-hinge { animation: visualizer-hinge 4s infinite ease-in-out; }
        .animate-visualizer-raise { animation: visualizer-raise 4s infinite ease-in-out; }
        .animate-visualizer-hold { animation: visualizer-hold 2s infinite ease-in-out; }
        .animate-visualizer-cardio { animation: visualizer-cardio 1s infinite ease-in-out; }
        .animate-visualizer-fly { animation: visualizer-fly 4s infinite ease-in-out; position: absolute; height: 4px; top: 50%; }
      `}</style>
    </div>
  );
};

// --- SUB-COMPONENT: MUSCLE BREAKDOWN ---
const MuscleBreakdown: React.FC<{ split?: Record<string, number> }> = ({ split }) => {
  if (!split) return null;

  return (
    <div className="mb-4">
      <h4 className="text-xs text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
        <Zap size={12} className="text-yellow-500" /> Muscle Activation
      </h4>
      <div className="space-y-2">
        {Object.entries(split).map(([muscle, pct], idx) => (
          <div key={muscle} className="flex items-center gap-2">
            <span className="text-xs text-gray-300 w-24 truncate">{muscle}</span>
            <div className="flex-1 h-2 bg-gym-900 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full ${idx === 0 ? 'bg-gym-accent' : 'bg-gym-600'}`} 
                 style={{ width: `${pct}%` }}
               ></div>
            </div>
            <span className="text-xs font-mono font-bold text-gray-400 w-8 text-right">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: PRO CUES ---
const ProCues: React.FC<{ setup: string, visualize: string, action: string }> = ({ setup, visualize, action }) => {
  if (!setup && !visualize && !action) return null;
  
  return (
    <div className="mb-4 bg-gym-900 rounded-xl border border-gym-700 overflow-hidden">
      <div className="bg-gym-800 p-2 border-b border-gym-700">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={14} className="text-gym-success" /> Professional Guidance
        </h4>
      </div>
      <div className="p-4 space-y-4">
        {setup && (
          <div className="flex gap-3 items-start">
             <div className="mt-0.5 p-1 bg-blue-900/30 rounded text-blue-400">
                <Wrench size={14} />
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Setup</p>
                <p className="text-sm text-gray-300 leading-snug">{setup}</p>
             </div>
          </div>
        )}
        {visualize && (
          <div className="flex gap-3 items-start">
             <div className="mt-0.5 p-1 bg-purple-900/30 rounded text-purple-400">
                <Eye size={14} />
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Visualize</p>
                <p className="text-sm text-gray-300 leading-snug">{visualize}</p>
             </div>
          </div>
        )}
        {action && (
          <div className="flex gap-3 items-start">
             <div className="mt-0.5 p-1 bg-yellow-900/30 rounded text-yellow-400">
                <Zap size={14} />
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Action</p>
                <p className="text-sm text-gray-300 leading-snug">{action}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ExerciseCard: React.FC<Props> = ({ 
  exercise, 
  completedSets, 
  onLogSet,
  onBack
}) => {
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [metric1, setMetric1] = useState<string>(''); // Weight or Distance
  const [metric2, setMetric2] = useState<string>(''); // Reps or Time
  const [setMode, setSetMode] = useState<0 | 1 | 2>(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [estCalories, setEstCalories] = useState(0);
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [showMonsterPrompt, setShowMonsterPrompt] = useState(false);
  const [plateauAlert, setPlateauAlert] = useState<string | null>(null);

  // --- PACER ENGINE STATE ---
  const [isPacing, setIsPacing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pacerRepCount, setPacerRepCount] = useState(0); 
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [pacerStatus, setPacerStatus] = useState<'IDLE' | 'COUNTDOWN' | 'ACTIVE'>('IDLE');
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const pacerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  const isCardio = exercise.type === 'cardio';

  useEffect(() => {
    const hist = getExerciseHistory(exercise.id);
    setHistory(hist);
    
    // AI Coach Logic
    if (!isCardio && !exercise.isWarmup) {
        const rec = getProgressionRecommendation(exercise);
        setRecommendation(rec);
    }
    
    // Check for Plateau
    const pCheck = checkPlateau(exercise.id);
    if (pCheck.isStalled) {
        setPlateauAlert(pCheck.recommendation);
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => stopPacer();
  }, [exercise.id, completedSets.length]);

  useEffect(() => {
    const m1 = parseFloat(metric1) || 0;
    const m2 = parseFloat(metric2) || 0; 
    if (m1 > 0 || m2 > 0) {
        setEstCalories(calculateCalories(m1, m2, exercise.metValue, isCardio));
    } else {
        setEstCalories(0);
    }
  }, [metric1, metric2, exercise.metValue, isCardio]);

  const vibrate = (pattern: number | number[]) => {
      if ('vibrate' in navigator) {
          navigator.vibrate(pattern);
      }
  };

  const speak = (text: string, rate: number = 1.2, pitch: number = 1) => {
    if (isMuted) return;
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate; 
    utterance.pitch = pitch;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
    if (preferred) utterance.voice = preferred;
    synthRef.current.speak(utterance);
  };

  const startPacer = () => {
    setIsPacing(true);
    setPacerStatus('COUNTDOWN');
    setPacerRepCount(0);
    setCurrentPhaseIndex(0);
    
    let countdown = 3;
    speak(`Starting in ${countdown}`);
    vibrate(50); // Small pulse

    pacerTimerRef.current = setInterval(() => {
       countdown--;
       if (countdown > 0) {
           speak(countdown.toString());
           vibrate(50);
       } else if (countdown === 0) {
           setPacerStatus('ACTIVE');
           vibrate(200); // Long pulse on START
           if (isCardio) {
               startStopwatch();
           } else {
               runPhase(0);
           }
       }
    }, 1000);
  };

  const startStopwatch = () => {
      if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
      speak("Go!");
      
      let seconds = 0;
      pacerTimerRef.current = setInterval(() => {
          seconds++;
          setPacerRepCount(seconds);
          if (seconds % 60 === 0) {
              const mins = seconds / 60;
              speak(`${mins} minutes`);
              vibrate(100);
          }
      }, 1000);
  };

  const stopPacer = () => {
    if (isCardio && isPacing && pacerStatus === 'ACTIVE') {
        const mins = Math.ceil(pacerRepCount / 60);
        setMetric2(mins.toString());
    }

    setIsPacing(false);
    setPacerStatus('IDLE');
    if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
    synthRef.current?.cancel();

    // Context-Aware Voice Cues
    if (setMode === 1) {
        setTimeout(() => speak("Drop the weight! Keep going!", 1.3, 1.2), 300);
    } else if (setMode === 2) {
        setTimeout(() => speak("Superset! Move to next exercise!", 1.3, 1.2), 300);
    }
  };

  const runPhase = (phaseIdx: number) => {
      if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);

      const phases = exercise.pacer.phases;
      if (!phases || phases.length === 0) return;

      const currentPhase = phases[phaseIdx];
      setCurrentPhaseIndex(phaseIdx);
      
      // Calculate times using real Date timestamps for smooth high-framerate updates
      const durationMs = currentPhase.duration * 1000;
      const startTime = Date.now();
      
      setPhaseTimeLeft(currentPhase.duration); // Init display

      // --- PHASE START HAPTICS ---
      const action = currentPhase.action.toUpperCase();
      
      // 1. Concentric / Explosive (GO) - Sharp, Strong
      if (['PRESS', 'DRIVE', 'PULL', 'UP', 'EXPLODE', 'CURL', 'CONTRACT', 'CLOSE'].some(k => action.includes(k))) {
          vibrate(150); 
      } 
      // 2. Isometric / Hold (STOP/SQUEEZE) - Double Pulse
      else if (['HOLD', 'SQUEEZE', 'PAUSE', 'STRETCH'].some(k => action.includes(k))) {
          vibrate([70, 50, 70]);
      } 
      // 3. Eccentric / Lower (SLOW) - Small tick to start
      else {
          vibrate(30);
      }

      if (currentPhase.voiceCue) {
          if (phaseIdx === 0 && pacerRepCount > 0) {
              speak(`${pacerRepCount + 1}. ${currentPhase.voiceCue}`, 1.3);
          } else {
              speak(currentPhase.voiceCue);
          }
      }
      
      lastTickRef.current = Math.ceil(currentPhase.duration);

      // High-speed timer for smooth UI (~30fps)
      pacerTimerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;
          const remainingMs = Math.max(0, durationMs - elapsed);
          const remainingSec = remainingMs / 1000;
          
          setPhaseTimeLeft(remainingSec);
          
          // --- RHYTHMIC METRONOME HAPTICS ---
          // Check if we crossed a second boundary for tick
          const currentCeil = Math.ceil(remainingSec);
          if (currentCeil < lastTickRef.current) {
               lastTickRef.current = currentCeil;
               // Tick only on lowering phases for rhythm
               if (['LOWER', 'DOWN', 'STRETCH', 'RELEASE', 'OPEN'].some(k => currentPhase.action.toUpperCase().includes(k))) {
                  if (remainingSec > 0.1) {
                      vibrate(20); 
                  }
               }
          }

          if (remainingMs <= 0) {
              // Fix: cast to any or check existence to avoid NodeJS namespace error in browser
              if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
              
              const nextPhaseIdx = phaseIdx + 1;
              if (nextPhaseIdx < phases.length) {
                  runPhase(nextPhaseIdx);
              } else {
                  setPacerRepCount(prev => prev + 1);
                  runPhase(0);
              }
          }
      }, 33); // 33ms ~ 30fps update rate for smoothness
  };

  const handleFinishSet = () => {
    const m1 = parseFloat(metric1) || 0;
    const m2 = parseFloat(metric2) || 0;
    
    const isDrop = setMode === 1;
    const isMonster = setMode === 2;

    onLogSet(m1, m2, isDrop, isMonster);
    
    // Provide Coach Feedback
    if (!exercise.isWarmup && !isCardio) {
        const feedback = analyzeSetPerformance(exercise, m1, m2);
        setCoachFeedback(feedback);
        setTimeout(() => setCoachFeedback(null), 4000);
    }
    
    if (isPacing) stopPacer();
    
    // LOGIC: Monster Set = Prompt next exercise. Drop Set = Prompt new weight (same exercise).
    if (isMonster) {
        setShowMonsterPrompt(true);
    } else if (isDrop) {
        // Drop Set Logic: Reduce weight automatically by ~20%
        if (m1 > 0) {
            const droppedWeight = Math.max(0, Math.floor((m1 * 0.8) / 1.25) * 1.25); // Drop 20%, snap to 1.25kg
            setMetric1(droppedWeight.toString());
            setCoachFeedback(`Weight dropped to ${droppedWeight}kg. GO AGAIN!`);
            setTimeout(() => setCoachFeedback(null), 3000);
        } else {
             setCoachFeedback("Drop weight! GO AGAIN!");
        }
        // Keep in Drop Mode for chaining
    } else {
        setSetMode(0); 
    }
  };

  const toggleSetMode = () => {
      setSetMode((prev) => (prev + 1) % 3 as 0 | 1 | 2);
  };

  const getSetModeStyle = () => {
      switch (setMode) {
          case 1: return 'bg-red-500/20 border-red-500 text-red-400';
          case 2: return 'bg-purple-500/20 border-purple-500 text-purple-400';
          default: return 'bg-gym-900 border-gym-600 text-gray-400';
      }
  };

  const getSetModeText = () => {
      switch (setMode) {
          case 1: return 'Drop Set (No Rest)';
          case 2: return 'Monster Set (No Rest)';
          default: return 'Normal Set';
      }
  };

  const getPhaseColor = (phase: PacerPhase) => {
      switch (phase.breathing) {
          case 'Exhale': return 'text-gym-success'; 
          case 'Inhale': return 'text-blue-400'; 
          default: return 'text-yellow-400'; 
      }
  };

  // --- GAMIFICATION LOGIC ---
  const getLastSessionValues = () => {
      if (history && history.lastSession) {
          return history.lastSession.topSet;
      }
      return null;
  }
  const lastSession = getLastSessionValues();

  const getGamificationStatus = () => {
      if (!lastSession || !metric1 || !metric2) return 'neutral';
      const currentWeight = parseFloat(metric1);
      const currentReps = parseFloat(metric2);
      
      if (currentWeight > lastSession.weight) return 'improved';
      if (currentWeight === lastSession.weight && currentReps > lastSession.reps) return 'improved';
      if (currentWeight === lastSession.weight && currentReps === lastSession.reps) return 'neutral';
      
      return 'regression';
  }

  const status = getGamificationStatus();
  const inputBorderClass = status === 'improved' ? 'border-green-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                           status === 'regression' ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                           'border-gym-600';

  const activePhase: PacerPhase = exercise.pacer.phases[currentPhaseIndex] || { 
      action: 'GO', 
      breathing: 'Hold',
      duration: 1,
      voiceCue: ''
  };
  const totalBurned = completedSets.reduce((acc, s) => acc + (s.calories || 0), 0);
  
  const formatStopwatch = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 relative">
      {/* Top Navigation */}
      <div className="flex items-center gap-4 mb-4 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white leading-tight pr-2">{exercise.name}</h2>
          <div className="flex items-center gap-2">
             <span className="text-[10px] px-1.5 py-0.5 rounded bg-gym-700 text-gray-300 font-bold uppercase">{isCardio ? 'Cardio' : 'Lifting'}</span>
             <p className="text-sm text-gym-accent font-medium">{exercise.muscleFocus}</p>
             {totalBurned > 0 && (
                <span className="text-xs text-orange-400 flex items-center gap-1">
                    <Flame size={10} fill="currentColor" /> {Math.round(totalBurned)} kcal
                </span>
             )}
          </div>
        </div>
      </div>

      {/* --- PLATEAU ALERT --- */}
      {plateauAlert && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-3 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
             <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
             <div>
                 <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Plateau Detected</p>
                 <p className="text-sm text-gray-300">{plateauAlert}</p>
             </div>
          </div>
      )}

      {/* --- SMART COACH BANNER --- */}
      {recommendation && recommendation.type !== 'BASELINE' && completedSets.length < exercise.sets && !plateauAlert && (
        <div className={`mb-4 p-3 rounded-lg border flex items-start gap-3 animate-in fade-in slide-in-from-top-1
            ${recommendation.type === 'INCREASE' ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/30 border-blue-500/30' : 'bg-gym-800 border-gym-700'}
        `}>
            <div className="p-2 bg-gym-900 rounded-full border border-gym-600">
                <BrainCircuit size={16} className="text-gym-accent" />
            </div>
            <div>
                <p className="text-xs font-bold text-gym-accent uppercase tracking-wider mb-1">Smart Coach</p>
                <p className="text-sm text-white font-medium mb-1">{recommendation.reason}</p>
                <p className="text-xs text-gray-400">
                   Target: <span className="text-white font-bold">{recommendation.targetWeight}kg</span> for <span className="text-white font-bold">{recommendation.targetReps} reps</span>
                </p>
            </div>
        </div>
      )}

      {/* --- COACH FEEDBACK TOAST --- */}
      {coachFeedback && (
          <div className="absolute top-20 left-4 right-4 z-50 bg-gym-success text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in slide-in-from-top-4 fade-out duration-500">
             <CheckCircle size={24} />
             <p className="font-bold">{coachFeedback}</p>
          </div>
      )}

      {/* --- MONSTER SET NAVIGATION PROMPT --- */}
      {showMonsterPrompt && (
        <div className="absolute inset-0 z-50 bg-gym-900/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
            <div className="bg-purple-500/20 p-6 rounded-full mb-6 border-2 border-purple-500 animate-pulse">
                <Layers size={48} className="text-purple-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2 uppercase italic text-center">Superset Active</h3>
            <p className="text-gray-400 mb-8 text-center text-lg">Timer Skipped. Move immediately to your paired exercise.</p>
            
            <button 
                onClick={onBack}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/40 mb-4 flex items-center justify-center gap-2"
            >
                <ArrowLeft size={20} /> Select Next Exercise
            </button>
            
            <button 
                onClick={() => setShowMonsterPrompt(false)}
                className="text-gray-500 font-bold hover:text-white transition-colors"
            >
                Stay on {exercise.name}
            </button>
        </div>
      )}

      {/* --- ACTIVE PACER OVERLAY --- */}
      {isPacing && (
        <div className="absolute inset-0 z-50 bg-gym-900 flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
           
           <button 
             onClick={() => setIsMuted(!isMuted)}
             className="absolute top-6 right-6 p-3 bg-gym-800 rounded-full border border-gym-700 text-white"
           >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
           </button>

           {pacerStatus === 'COUNTDOWN' && (
               <div className="text-center">
                   <p className="text-2xl text-gray-400 mb-4">Get Ready</p>
                   <div className="text-8xl font-black text-white animate-pulse">...</div>
               </div>
           )}

           {pacerStatus === 'ACTIVE' && (
               <>
                <div className="mb-6 text-center w-full">
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-2">{isCardio ? 'Duration' : 'Repetition'}</p>
                    <h1 className="text-9xl font-black text-white mb-2 font-mono leading-none">
                        {isCardio ? formatStopwatch(pacerRepCount) : pacerRepCount + 1}
                    </h1>
                </div>

                {!isCardio ? (
                    <>
                        <div className={`w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center relative mb-8 transition-all duration-300 ease-linear
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
                        <div className="w-full bg-gym-800 rounded-full h-4 mb-8 overflow-hidden">
                            <div 
                                className={`h-full ${activePhase.breathing === 'Exhale' ? 'bg-gym-success' : 'bg-blue-500'}`}
                                style={{ width: `${(phaseTimeLeft / activePhase.duration) * 100}%` }}
                            ></div>
                        </div>
                    </>
                ) : (
                    <div className="w-64 h-64 rounded-full border-8 border-gym-accent flex items-center justify-center mb-8 animate-pulse bg-gym-accent/10">
                        <Footprints size={64} className="text-gym-accent" />
                        <p className="absolute bottom-10 text-sm font-bold text-gym-accent">KEEP MOVING</p>
                    </div>
                )}
               </>
           )}

           <button 
             onClick={stopPacer}
             className="bg-red-500/20 text-red-500 border border-red-500/50 px-8 py-4 rounded-full font-bold flex items-center gap-2"
           >
             <Square size={20} fill="currentColor" /> {isCardio ? 'Finish' : 'Stop Set'}
           </button>
        </div>
      )}

      {/* --- INFO / CUES / ANALYTICS --- */}
      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="mb-4 flex items-center justify-between bg-gym-800/50 p-3 rounded-lg border border-gym-700 text-sm text-gray-300"
      >
        <span className="flex items-center gap-2"><Info size={16}/> Tech & Form</span>
        {showInfo ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      
      {showInfo && (
        <div className="mb-4 p-4 bg-gym-800/30 rounded-lg text-sm text-gray-300 border border-gym-700/50 animate-in fade-in slide-in-from-top-2">
           
           {/* Stick Figure Animation */}
           <StickFigure 
             motionType={exercise.motionType} 
             exerciseName={exercise.name} 
             muscleSplit={exercise.muscleSplit}
             pacer={exercise.pacer}
           />

           {/* Visualizer & Muscle Breakdown */}
           <FormVisualizer type={exercise.motionType} />
           <ProCues setup={exercise.setup} visualize={exercise.visualize} action={exercise.action} />
           <MuscleBreakdown split={exercise.muscleSplit} />

           <div className="pt-3 border-t border-gray-700 mt-3">
             <p className="mb-2"><strong className="text-white">Summary Cues:</strong> {exercise.cues}</p>
             {!isCardio && (
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Tempo Protocol:</p>
                  <div className="flex gap-2 text-xs flex-wrap">
                      {exercise.pacer.phases.map((p, i) => (
                          <span key={i} className="px-2 py-1 bg-gym-900 rounded border border-gym-700">
                              {p.duration}s {p.action}
                          </span>
                      ))}
                  </div>
                </div>
             )}
           </div>
        </div>
      )}

      {/* --- MAIN INPUT CARD --- */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
          
          {/* Active Set Card */}
          {!isPacing && completedSets.length < exercise.sets && (
              <div className="bg-gym-800 p-5 rounded-2xl border border-gym-700 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      {isCardio ? <Footprints size={100} /> : <Dumbbell size={100} />}
                  </div>

                  <div className="flex justify-between items-end mb-6 relative z-10">
                      <div>
                          <span className="text-gym-accent font-bold tracking-wider text-xs uppercase">Current Set</span>
                          <h3 className="text-3xl font-bold text-white">Set {completedSets.length + 1}</h3>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-400">Target</p>
                          <p className="text-xl font-bold text-white">{exercise.reps} {isCardio ? '' : 'Reps'}</p>
                      </div>
                  </div>

                  {/* Weight/Rep Inputs */}
                  <div className="flex gap-4 mb-4 relative z-10">
                    {/* Hide Weight Input for Warmups as requested */}
                    {!exercise.isWarmup && (
                        <div className="w-1/2">
                            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">
                                {isCardio ? 'Distance (km)' : 'Weight (kg)'}
                            </label>
                            <input 
                                type="number" 
                                step={isCardio ? "0.1" : "1"}
                                value={metric1}
                                onChange={e => setMetric1(e.target.value)}
                                placeholder={lastSession ? `${lastSession.weight}` : recommendation?.targetWeight ? `${recommendation.targetWeight}` : '-'}
                                className={`w-full bg-gym-900 border rounded-xl p-4 text-2xl text-white text-center font-bold focus:outline-none transition-all ${inputBorderClass}`}
                            />
                        </div>
                    )}
                    <div className={!exercise.isWarmup ? "w-1/2" : "w-full"}>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">
                            {isCardio ? 'Time (mins)' : 'Reps'}
                        </label>
                        <input 
                            type="number" 
                            value={metric2}
                            onChange={e => setMetric2(e.target.value)}
                            placeholder={lastSession ? `${lastSession.reps}` : isCardio ? '10' : (pacerRepCount > 0 ? pacerRepCount.toString() : "-")}
                            className={`w-full bg-gym-900 border rounded-xl p-4 text-2xl text-white text-center font-bold focus:outline-none transition-all ${inputBorderClass}`}
                        />
                    </div>
                  </div>
                  
                  {status === 'improved' && (
                      <p className="text-[10px] text-green-400 font-bold text-center mb-2 uppercase animate-pulse">Record Broken!</p>
                  )}
                  {status === 'regression' && (
                      <p className="text-[10px] text-red-400 font-bold text-center mb-2 uppercase">Below Last Session</p>
                  )}

                  {/* Estimated Calories */}
                  <div className="mb-4 text-center z-10 relative">
                     <span className="text-xs font-mono text-orange-400 flex items-center justify-center gap-1">
                         <Flame size={12} fill="currentColor"/> Est. Burn: {estCalories} kcal
                     </span>
                  </div>

                  {/* Set Mode Toggle */}
                  <div className="mb-6 flex items-center gap-3 relative z-10">
                      <button 
                        onClick={toggleSetMode}
                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 text-sm font-bold transition-all ${getSetModeStyle()}`}
                      >
                          <Layers size={18} />
                          {getSetModeText()}
                      </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                      <button 
                        onClick={startPacer}
                        className="py-4 bg-gym-700 hover:bg-gym-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                      >
                          {isCardio ? <Timer size={20} /> : <Mic size={20} />} 
                          {isCardio ? 'Stopwatch' : 'Pacer'}
                      </button>
                      <button 
                        onClick={handleFinishSet}
                        // For warmups, weight (metric1) is optional, so we only check metric2
                        disabled={!exercise.isWarmup ? (!metric1 && !metric2) : !metric2}
                        className="py-4 bg-gym-accent hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                      >
                          Log Set
                      </button>
                  </div>
              </div>
          )}

          {/* Completed Sets History for this session */}
          <div className="space-y-2">
            {completedSets.map((set, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gym-800/50 rounded-xl border border-gym-700/50">
                 <div className="flex items-center gap-3">
                     <span className="w-8 h-8 rounded-full bg-gym-900 flex items-center justify-center text-xs font-bold text-gray-500">
                         {idx + 1}
                     </span>
                     <div className="flex flex-col">
                         <span className="text-white font-bold">
                             {exercise.isWarmup ? '' : (isCardio ? `${set.weight}km` : `${set.weight}kg`)}
                             {!exercise.isWarmup && ' × '}
                             {isCardio ? `${set.reps}min` : `${set.reps} reps`}
                         </span>
                         <div className="flex gap-2">
                            {set.isDropSet && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Drop Set</span>}
                            {set.isMonsterSet && <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Monster Set</span>}
                            {set.calories && <span className="text-[10px] text-orange-400 flex items-center gap-1"><Flame size={8} fill="currentColor"/> {set.calories}</span>}
                         </div>
                     </div>
                 </div>
                 <CheckCircle size={18} className="text-gym-success" />
              </div>
            ))}
          </div>

          {completedSets.length >= exercise.sets && (
              <div className="p-6 bg-gym-success/10 border border-gym-success/30 rounded-2xl text-center animate-in zoom-in">
                 <h3 className="text-xl font-bold text-gym-success mb-2">Exercise Complete!</h3>
                 <p className="text-gray-400 text-sm mb-4">Great work. Move to the next one.</p>
                 <button onClick={onBack} className="bg-gym-success text-white px-6 py-2 rounded-lg font-bold">
                     Back to Workout
                 </button>
              </div>
          )}
      </div>

       {/* History Modal */}
       {showHistoryModal && history && (
        <div className="absolute inset-0 z-50 bg-gym-900/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white">Log History</h3>
             <button onClick={() => setShowHistoryModal(false)} className="text-gray-400">Close</button>
           </div>
           <div className="overflow-y-auto flex-1 space-y-4">
             {history.logs.map((log, i) => (
               <div key={i} className="flex justify-between items-center p-3 bg-gym-800 rounded border border-gym-700">
                 <span className="text-sm text-gray-400">{log.date}</span>
                 <span className="font-mono text-white font-bold">
                    {isCardio ? `${log.weight}km in ${log.reps}min` : `${log.weight}kg × ${log.reps}`}
                 </span>
               </div>
             ))}
           </div>
        </div>
      )}

       {/* Top Right History Button */}
       {history && (
         <button 
           onClick={() => setShowHistoryModal(true)} 
           className="absolute top-4 right-0 p-2 text-gray-400 hover:text-white z-20 bg-gym-900/50 rounded-full"
         >
           <History size={20} />
         </button>
       )}
    </div>
  );
};

export default ExerciseCard;