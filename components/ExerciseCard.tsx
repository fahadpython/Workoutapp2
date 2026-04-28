
import React, { useState, useEffect, useRef } from 'react';
import { Exercise, SetLog, ExerciseHistory, PacerPhase, MotionType, CoachRecommendation, TempoRating } from '../types';
import { getExerciseHistory, calculateHypertrophyCalories, calculateCalories, getProgressionRecommendation, analyzeSetPerformance, checkPlateau, saveExerciseNote, getExerciseNote, wasSkippedLastSession, saveSkippedExercise, loadUserStats } from '../services/storageService';
import { Info, CheckCircle, ChevronDown, ChevronUp, Dumbbell, ArrowLeft, History, Mic, Square, Layers, Wind, Flame, Volume2, VolumeX, Timer, Footprints, Activity, Zap, BrainCircuit, Eye, Wrench, AlertTriangle, Ruler, Smartphone, Play, Crown, TrendingUp, Calculator, ArrowDownCircle, Gauge, BookOpen, Edit3, X, HelpCircle, Lightbulb, AlertOctagon, MicOff, AlertCircle, Film, ExternalLink, RefreshCw, BarChart2 } from 'lucide-react';
import StickFigure from './StickFigure';
import BenchLeveler from './BenchLeveler';
import MotionTracker from './MotionTracker';
import WaterReminder from './WaterReminder';

interface Props {
  exercise: Exercise;
  completedSets: SetLog[];
  onLogSet: (weight: number, reps: number, isDropSet: boolean, isMonsterSet: boolean, rpe?: number, tempoRating?: TempoRating) => void;
  onLogSets?: (sets: {metric1: number, metric2: number, isDropSet?: boolean, isMonsterSet?: boolean, rpe?: number, tempoRating?: TempoRating}[]) => void;
  onBack: () => void;
  onUpdateWater: (amount: number) => void;
}

// ... (Rest of getInputHelpers, SmartLogBar, PyramidCalculator, FormVisualizer, MuscleBreakdown, ProCues components - No Changes needed) ...
// NOTE: Re-inserting the component code above for context, but truncated for brevity in this output block.
// Assuming the developer prompt implies keeping the rest.
// For the sake of the XML output, I must include the full file content or the diff won't apply correctly if I truncate.
// I will include the full ExerciseCard.tsx with the logic changes.

// --- HELPER TEXT LOGIC ---
const getInputHelpers = (exercise: Exercise) => {
    const name = exercise.name.toLowerCase();
    const isCardio = exercise.type === 'cardio';
    
    if (isCardio) {
        return { 
            weightHelper: "Total Distance", 
            repsHelper: "Total Time" 
        };
    }

    let weightHelper = "Total Weight";
    let repsHelper = "Total Reps";

    // --- WEIGHT RULES ---
    if (name.includes('dumb') || name.includes('db') || name.includes('hammer')) {
        weightHelper = "Weight of ONE Dumbbell";
    } else if (name.includes('barbell') || name.includes('deadlift') || name.includes('bench') || name.includes('squat') || name.includes('skull')) {
        weightHelper = "Total (Bar + Plates)";
    } else if (name.includes('cable') || name.includes('pulldown') || name.includes('row') || name.includes('pec deck') || name.includes('extension') || name.includes('face pull') || name.includes('machine') || name.includes('pressdown')) {
        weightHelper = "Stack Weight";
    } else if (name.includes('leg raise') || name.includes('bodyweight') || name.includes('dip') || name.includes('pull up') || name.includes('chin up') || name.includes('plank')) {
        weightHelper = "Added Weight (0 if none)";
    } else if (name.includes('hyperextension')) {
        weightHelper = "Weight of Plate Held";
    } else if (name.includes('overhead press')) {
        weightHelper = "Total (Bar) or One DB";
    }

    // Specific Overrides
    if (name.includes('cable crossover')) weightHelper = "Weight of One Stack";

    // --- REPS RULES ---
    if (name.includes('lateral') || name.includes('woodchop') || name.includes('hammer') || (name.includes('curl') && (name.includes('db') || name.includes('dumb')))) {
        repsHelper = "Reps per ONE Arm/Side";
    } else if (exercise.isTimed || name.includes('plank')) {
        repsHelper = "Time in Seconds";
    }

    return { weightHelper, repsHelper };
};

// ... (SmartLogBar, PyramidCalculator, FormVisualizer, MuscleBreakdown, ProCues components are assumed to be here as defined in previous file state) ...
// RE-DECLARING SUB-COMPONENTS TO ENSURE FULL FILE INTEGRITY

const SmartLogBar: React.FC<{
    lastWeight: number;
    lastReps: number;
    onFill: (w: number, r: number, rpe?: number, tempo?: TempoRating) => void;
}> = ({ lastWeight, lastReps, onFill }) => {
    // ... (Same implementation as previous file) ...
    const [isListening, setIsListening] = useState(false);
    const [supportError, setSupportError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { setSupportError("Voice not supported in this browser"); }
    }, []);
    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Voice input is not supported."); return; }
        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
            setIsListening(true); setSupportError(null);
            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript.toLowerCase();
                let detectedTempo: TempoRating | undefined;
                if (text.includes('cheat')) detectedTempo = 'CHEATED';
                else if (text.includes('fast')) detectedTempo = 'FAST';
                else if (text.includes('perfect')) detectedTempo = 'PERFECT';
                const numbers = text.match(/(\d+(\.\d+)?)/g)?.map(Number);
                if (numbers && numbers.length > 0) {
                    let w = 0, r = 0, rpe = undefined;
                    if (numbers.length >= 3) { w = numbers[0]; r = numbers[1]; if (numbers[2] <= 10) rpe = numbers[2]; } 
                    else if (numbers.length === 2) { w = numbers[0]; r = numbers[1]; } 
                    else if (numbers.length === 1) { w = numbers[0]; r = lastReps || 0; }
                    onFill(w, r, rpe, detectedTempo);
                } else { setSupportError("Didn't catch numbers."); setTimeout(() => setSupportError(null), 3000); }
                setIsListening(false);
            };
            recognition.onerror = () => { setIsListening(false); setSupportError("Error listening."); setTimeout(() => setSupportError(null), 3000); };
            recognition.onend = () => setIsListening(false);
            recognition.start();
        } catch (e) { setIsListening(false); }
    };
    return (
        <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
                <button onClick={startListening} disabled={!!supportError && supportError.includes("not supported")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gym-800 text-gym-accent border border-gym-accent/30'}`}>
                    {isListening ? <MicOff size={14}/> : <Mic size={14}/>} {isListening ? 'Listening...' : 'Smart Mic'}
                </button>
                <button onClick={() => setShowHelp(!showHelp)} className="p-2 text-gray-500 hover:text-white"><HelpCircle size={16} /></button>
                {lastWeight > 0 && (<><button onClick={() => onFill(lastWeight, lastReps)} className="px-3 py-2 bg-gym-800 border border-gym-700 text-gray-300 rounded-lg text-xs font-bold whitespace-nowrap">Last: {lastWeight}x{lastReps}</button><button onClick={() => onFill(lastWeight + 2.5, lastReps)} className="px-3 py-2 bg-gym-800 border border-gym-700 text-green-400 rounded-lg text-xs font-bold whitespace-nowrap">+2.5kg</button><button onClick={() => onFill(lastWeight - 2.5, lastReps)} className="px-3 py-2 bg-gym-800 border border-gym-700 text-orange-400 rounded-lg text-xs font-bold whitespace-nowrap">-2.5kg</button></>)}
            </div>
            {supportError && <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1 animate-in fade-in"><AlertCircle size={10} /> {supportError}</div>}
            {showHelp && <div className="mt-2 bg-gym-800 p-3 rounded-lg border border-gym-700 text-xs text-gray-300 animate-in fade-in"><p className="font-bold text-white mb-1">Voice Commands:</p><ul className="list-disc list-inside mt-1 text-[10px] text-gray-400 space-y-1"><li>"<strong>80</strong> kg <strong>10</strong> reps"</li><li>"<strong>100</strong> <strong>5</strong> RPE <strong>9</strong>"</li><li>"<strong>20</strong> <strong>12</strong> <strong>Perfect</strong>"</li></ul></div>}
        </div>
    );
};

const PyramidCalculator: React.FC<{ currentBest: number, workingSetsCount: number, onFill: (w: number, r: number) => void }> = ({ currentBest, workingSetsCount, onFill }) => {
    const [targetWeight, setTargetWeight] = useState(currentBest > 0 ? currentBest : 60);
    const [targetReps, setTargetReps] = useState(8);
    const round = (num: number) => Math.round(num / 1.25) * 1.25;
    const workingSets = [];
    const stepSize = 0.1;
    for (let i = 0; i < workingSetsCount; i++) {
        const setsFromEnd = (workingSetsCount - 1) - i;
        const pct = 1.0 - (setsFromEnd * stepSize);
        const safePct = Math.max(0.5, pct); 
        const isTopSet = i === workingSetsCount - 1;
        workingSets.push({ type: isTopSet ? 'Top' : 'Build', label: isTopSet ? 'TOP SET (Target)' : `Set ${i + 1}: Build-up`, weight: round(targetWeight * safePct), reps: isTopSet ? targetReps : targetReps + (setsFromEnd * 2), pct: `${Math.round(safePct * 100)}%` });
    }
    return (
        <div className="mb-4 bg-gym-900 rounded-xl border border-gym-700 overflow-hidden animate-in slide-in-from-top-2">
            <div className="bg-gym-800 p-3 border-b border-gym-700 flex justify-between items-center"><h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Calculator size={14} className="text-gym-accent" /> Pyramid Planner</h4><span className="text-[10px] text-gray-500">{workingSetsCount} Sets</span></div>
            <div className="p-4"><div className="flex gap-4 mb-4 items-end"><div className="flex-1"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Desired Top Weight</label><input type="number" value={targetWeight} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)} className="w-full bg-gym-800 border border-gym-600 rounded p-2 text-white font-bold text-center focus:border-gym-accent focus:outline-none"/></div><div className="flex-1"><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Goal Reps</label><input type="number" value={targetReps} onChange={(e) => setTargetReps(parseFloat(e.target.value) || 0)} className="w-full bg-gym-800 border border-gym-600 rounded p-2 text-white font-bold text-center focus:border-gym-accent focus:outline-none"/></div></div>
            <div className="space-y-1"><div className="text-[10px] text-gym-accent uppercase font-bold mb-1">Working Sets</div>{workingSets.map((set, i) => (<div key={`wk-${i}`} className={`flex justify-between items-center p-2 rounded hover:bg-gym-800/50 group ${set.type === 'Top' ? 'bg-gym-accent/10 border border-gym-accent/20' : ''}`}><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${set.type === 'Top' ? 'bg-gym-accent' : 'bg-green-500'}`}></div><div><p className={`text-xs font-bold ${set.type === 'Top' ? 'text-white' : 'text-gray-300'}`}>{set.label}</p><p className="text-[10px] text-gray-500">{set.pct}</p></div></div><div className="flex items-center gap-3"><span className={`font-mono text-sm font-bold ${set.type === 'Top' ? 'text-gym-accent' : 'text-white'}`}>{set.weight}kg x {set.reps}</span><button onClick={() => onFill(set.weight, set.reps)} className="text-gray-500 hover:text-white"><ArrowDownCircle size={14} /></button></div></div>))}</div></div>
        </div>
    );
};

const FormVisualizer: React.FC<{ type?: MotionType }> = ({ type }) => {
  if (!type) return null;
  const getAnimClass = () => { switch(type) { case 'press': return 'animate-visualizer-press'; case 'pull': return 'animate-visualizer-pull'; case 'hinge': return 'animate-visualizer-hinge'; case 'curl': return 'animate-visualizer-curl'; case 'raise': return 'animate-visualizer-raise'; case 'fly': return 'animate-visualizer-fly'; case 'hold': return 'animate-visualizer-hold'; case 'cardio': return 'animate-visualizer-cardio'; default: return ''; } };
  const getLabel = () => { switch(type) { case 'press': return 'Slow Down (Stretch) → Explode Up (Squeeze)'; case 'pull': return 'Drive Down/Back (Squeeze) → Slow Release'; case 'hinge': return 'Hips Back (Stretch) → Drive Forward'; case 'curl': return 'Curl Up (Squeeze) → Control Down'; case 'raise': return 'Raise (Squeeze) → Control Down'; case 'hold': return 'Constant Tension (No Movement)'; case 'cardio': return 'Rhythmic Pace'; default: return 'Control the resistance'; } }
  return (
    <div className="bg-gym-800/50 rounded-xl p-4 border border-gym-700/50 mb-4 flex items-center gap-4">
      <div className="w-16 h-24 bg-gym-900 rounded-lg relative overflow-hidden border border-gym-700 flex justify-center items-center flex-shrink-0">
         {type !== 'fly' && type !== 'cardio' && <div className="absolute top-2 bottom-2 w-1 bg-gym-800 rounded-full"></div>}
         {type === 'hold' ? (<div className={`w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] ${getAnimClass()}`}></div>) : type === 'cardio' ? (<div className={`w-8 h-8 rounded-full bg-blue-500 ${getAnimClass()}`}></div>) : (<div className={`w-8 h-4 rounded shadow-lg absolute ${type === 'fly' ? 'top-1/2' : ''} ${getAnimClass()}`}></div>)}
      </div>
      <div><p className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Activity size={12} className="text-gym-accent" /> Bio-Mechanics</p><p className="text-sm font-bold text-white capitalize">{type} Motion</p><p className="text-[10px] text-gray-500 mt-1">{getLabel()}</p></div>
      <style>{`@keyframes visualizer-press { 0% { top: 10%; background-color: #ef4444; } 60% { top: 80%; background-color: #3b82f6; } 100% { top: 10%; background-color: #ef4444; } } @keyframes visualizer-pull { 0% { top: 10%; background-color: #3b82f6; } 20% { top: 80%; background-color: #f97316; } 100% { top: 10%; background-color: #3b82f6; } } @keyframes visualizer-curl { 0% { top: 80%; background-color: #3b82f6; } 30% { top: 20%; background-color: #ef4444; } 100% { top: 80%; background-color: #3b82f6; } } @keyframes visualizer-hinge { 0% { top: 20%; background-color: #ef4444; } 60% { top: 80%; background-color: #3b82f6; } 100% { top: 20%; background-color: #ef4444; } } .animate-visualizer-press { animation: visualizer-press 4s infinite ease-in-out; } .animate-visualizer-pull { animation: visualizer-pull 4s infinite ease-in-out; } .animate-visualizer-curl { animation: visualizer-curl 4s infinite ease-in-out; } .animate-visualizer-hinge { animation: visualizer-hinge 4s infinite ease-in-out; }`}</style>
    </div>
  );
};

const MuscleBreakdown: React.FC<{ split?: Record<string, number> }> = ({ split }) => {
  if (!split) return null;
  return (<div className="mb-4"><h4 className="text-xs text-gray-400 font-bold uppercase mb-2 flex items-center gap-1"><Zap size={12} className="text-yellow-500" /> Muscle Activation</h4><div className="space-y-2">{Object.entries(split).map(([muscle, pct], idx) => (<div key={muscle} className="flex items-center gap-2"><span className="text-xs text-gray-300 w-24 truncate">{muscle}</span><div className="flex-1 h-2 bg-gym-900 rounded-full overflow-hidden"><div className={`h-full rounded-full ${idx === 0 ? 'bg-gym-accent' : 'bg-gym-600'}`} style={{ width: `${pct}%` }}></div></div><span className="text-xs font-mono font-bold text-gray-400 w-8 text-right">{pct}%</span></div>))}</div></div>);
};

const ProCues: React.FC<{ setup: string, visualize: string, action: string }> = ({ setup, visualize, action }) => {
  if (!setup && !visualize && !action) return null;
  return (<div className="mb-4 bg-gym-900 rounded-xl border border-gym-700 overflow-hidden"><div className="bg-gym-800 p-2 border-b border-gym-700"><h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><CheckCircle size={14} className="text-gym-success" /> Professional Guidance</h4></div><div className="p-4 space-y-4">{setup && (<div className="flex gap-3 items-start"><div className="mt-0.5 p-1 bg-blue-900/30 rounded text-blue-400"><Wrench size={14} /></div><div><p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Setup</p><p className="text-sm text-gray-300 leading-snug">{setup}</p></div></div>)}{visualize && (<div className="flex gap-3 items-start"><div className="mt-0.5 p-1 bg-purple-900/30 rounded text-purple-400"><Eye size={14} /></div><div><p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Visualize</p><p className="text-sm text-gray-300 leading-snug">{visualize}</p></div></div>)}{action && (<div className="flex gap-3 items-start"><div className="mt-0.5 p-1 bg-yellow-900/30 rounded text-yellow-400"><Zap size={14} /></div><div><p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Action</p><p className="text-sm text-gray-300 leading-snug">{action}</p></div></div>)}</div></div>);
}

const ExerciseCard: React.FC<Props> = ({ 
  exercise, 
  completedSets, 
  onLogSet,
  onLogSets,
  onBack,
  onUpdateWater
}) => {
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [metric1, setMetric1] = useState<string>(''); // Weight or Distance
  const [metric2, setMetric2] = useState<string>(''); // Reps or Time
  const [rpe, setRpe] = useState<number>(8); // Default RPE
  const [tempoRating, setTempoRating] = useState<TempoRating>('PERFECT'); // NEW: Tempo Rating
  const [setMode, setSetMode] = useState<0 | 1 | 2>(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showPyramidCalc, setShowPyramidCalc] = useState(false);
  const [showRpeInfo, setShowRpeInfo] = useState(false); // RPE Tooltip
  
  // New Calories State
  const [energyData, setEnergyData] = useState<{ total: number, active: number, epoc: number }>({ total: 0, active: 0, epoc: 0 });
  
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [showMonsterPrompt, setShowMonsterPrompt] = useState(false);
  const [plateauAlert, setPlateauAlert] = useState<string | null>(null);
  const [showLeveler, setShowLeveler] = useState(false);
  const [showMotionTracker, setShowMotionTracker] = useState(false);
  const [sessionBest1RM, setSessionBest1RM] = useState(0); // Track Best 1RM of CURRENT session
  const [showFacts, setShowFacts] = useState(false);
  const [showPenaltyPrompt, setShowPenaltyPrompt] = useState(false);
  const [skippedAlert, setSkippedAlert] = useState(false);
  
  // Penalty / Volume Check State
  const [penaltyData, setPenaltyData] = useState<{ type: string; message: string; prescription: string } | null>(null);

  // Hydration State
  const [waterDebt, setWaterDebt] = useState(0);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const [waterReminderAmount, setWaterReminderAmount] = useState(0);

  // Notes State
  const [note, setNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Next Set Recommendation (Intra-set)
  const [nextSetSuggestion, setNextSetSuggestion] = useState<string | null>(null);

  // Animation Modal
  const [showAnimation, setShowAnimation] = useState(false);

  // Dynamic Input Helpers
  const { weightHelper, repsHelper } = getInputHelpers(exercise);

  const isCardio = exercise.type === 'cardio';
  // If it's timed (like Plank), treat metric2 as Time
  const isTimed = exercise.isTimed || isCardio;

  useEffect(() => {
    const hist = getExerciseHistory(exercise.id);
    setHistory(hist);
    setNote(getExerciseNote(exercise.id));
    
    // Check skipped status
    if (wasSkippedLastSession(exercise.id)) {
        setSkippedAlert(true);
    }
    
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
  }, [exercise.id, completedSets.length, isCardio]);

  // Updated Calorie Estimator Hook
  useEffect(() => {
    const m1 = parseFloat(metric1) || 0;
    const m2 = parseFloat(metric2) || 0; 
    
    if (isCardio) {
        const cals = calculateCalories(m1, m2, exercise.metValue, true);
        setEnergyData({ total: cals, active: cals, epoc: 0 });
    } else if (m1 > 0 && m2 > 0) {
        const stats = loadUserStats();
        const bw = stats.bodyWeight > 0 ? stats.bodyWeight : 75;
        
        const data = calculateHypertrophyCalories(
            m1, 
            m2, 
            rpe, 
            exercise.pacer, 
            tempoRating, 
            bw, 
            exercise.isCompound
        );
        setEnergyData(data);
    } else {
        setEnergyData({ total: 0, active: 0, epoc: 0 });
    }
  }, [metric1, metric2, rpe, tempoRating, exercise.metValue, exercise.pacer, exercise.isCompound, isCardio]);

  // Parse target reps for the tracker
  const getTargetRepsInt = () => {
      if (!exercise.reps) return 10;
      const match = exercise.reps.match(/(\d+)/);
      return match ? parseInt(match[0]) : 10;
  };

  const calculateWaterLoss = (m1: number, m2: number) => {
      let loss = 0;
      if (isCardio) {
          loss = m2 * 10; 
      } else {
          const vol = m1 * m2;
          const compoundMult = exercise.isCompound ? 1.5 : 1.0;
          loss = vol * 0.04 * compoundMult;
      }
      return Math.round(loss);
  };

  const checkPenaltyCondition = (m1: number, m2: number, currentRpe: number): { type: string; message: string; prescription: string } | null => {
      if (exercise.isWarmup || isCardio) return null;
      if (completedSets.length !== exercise.sets - 1) return null; // Only trigger on final set (before logging it)
      
      let targetWeight = recommendation?.targetWeight || (history?.lastSession?.topSet.weight || 0);
      // Fallback if no target weight (new exercise), try to infer from first set or just use current as baseline
      if (targetWeight === 0 && completedSets.length > 0) targetWeight = completedSets[0].weight;
      
      let targetReps = getTargetRepsInt();
      
      // Rule 1: The "Sandbagging" Check (Laziness)
      // actualReps < (targetReps - 2) AND actualRPE < 8
      if (m2 < (targetReps - 2) && currentRpe < 8) {
          return {
              type: "LAZINESS_PENALTY",
              message: "Intensity Too Low. You stopped with fuel in the tank.",
              prescription: "Perform 1 'Makeup Set' with the SAME weight to failure."
          };
      }

      // Rule 2: The "Fatigue" Check (Genuine Failure)
      // actualReps < (targetReps - 2) AND actualRPE >= 9
      if (m2 < (targetReps - 2) && currentRpe >= 9) {
          return {
              type: "DROP_SET_FIX",
              message: "Target missed due to fatigue. Let's get volume safely.",
              prescription: "Drop Weight by 20% and perform 1 AMRAP set (As Many Reps As Possible)."
          };
      }

      // Rule 3: The "Intensity Drop" Check (Lowered Weight)
      // actualWeight < (targetWeight * 0.9)
      if (targetWeight > 0 && m1 < (targetWeight * 0.9)) {
          // Calculate RequiredReps = targetReps * (targetWeight / actualWeight)
          const requiredReps = Math.ceil(targetReps * (targetWeight / Math.max(1, m1)));
          
          if (m2 < requiredReps) {
              return {
                  type: "COMPENSATION_SET",
                  message: "Weight drop detected. You didn't do enough reps to compensate.",
                  prescription: "Perform 1 extra set of this weight to failure."
              };
          }
      }

      return null;
  };

  const commitSet = (m1: number, m2: number) => {
    // --- 1RM SESSION TRACKING ---
    if (!isCardio && !exercise.isWarmup && m1 > 0 && m2 > 0) {
        // Epley Formula: w * (1 + r/30)
        const current1RM = Math.round(m1 * (1 + (m2 / 30)));
        if (current1RM > sessionBest1RM) {
            setSessionBest1RM(current1RM);
        }
    }

    // --- HYDRATION LOGIC ---
    if (!exercise.isWarmup) {
        const loss = calculateWaterLoss(m1, m2);
        const newDebt = waterDebt + loss;
        setWaterDebt(newDebt);

        // Lower threshold to 80ml (~3 sips) to make it more frequent and visible
        if (newDebt > 80) {
            setWaterReminderAmount(Math.ceil(newDebt / 50) * 50); 
            setShowWaterReminder(true);
        }
    }

    // --- NEXT SET SUGGESTION LOGIC ---
    if (!exercise.isWarmup && !isCardio) {
        let suggestion = "";
        const targetReps = getTargetRepsInt();
        // Simple logic based on RPE
        if (rpe <= 6) {
            suggestion = `Next: ${m1 + 2.5}kg for ${targetReps} reps`;
        } else if (rpe >= 9) {
            suggestion = `Next: ${m1}kg or Drop to ${m1 - 2.5}kg for ${targetReps} reps`;
        } else {
            suggestion = `Next: Keep ${m1}kg for ${targetReps} reps`;
        }
        setNextSetSuggestion(suggestion);
    }

    const isDrop = setMode === 1;
    const isMonster = setMode === 2;

    // Use current Calculated Energy data
    // Note: onLogSet signature handles saving this to state/localStorage
    // But onLogSet in App.tsx typically calculates calories itself. 
    // We should ensure App.tsx uses this refined calculation or pass it directly.
    // The current Props: onLogSet(weight, reps, isDrop, isMonster, rpe, tempoRating)
    // It seems onLogSet inside App.tsx does its own calculation. 
    // Ideally, we should pass the calculated calories up, but we can't change the signature easily without updating App.tsx too.
    // For now, App.tsx's log function will need to use the new calculator logic too (which we updated in storageService).
    
    onLogSet(m1, m2, isDrop, isMonster, rpe, tempoRating); 
    setShowMotionTracker(false);
    
    if (!exercise.isWarmup && !isCardio) {
        const feedback = analyzeSetPerformance(exercise, m1, m2);
        setCoachFeedback(feedback);
        setTimeout(() => setCoachFeedback(null), 4000);
    }
    
    if (isMonster) {
        setShowMonsterPrompt(true);
    } else if (isDrop) {
        if (m1 > 0) {
            const droppedWeight = Math.max(0, Math.floor((m1 * 0.8) / 1.25) * 1.25);
            setMetric1(droppedWeight.toString());
            setCoachFeedback(`Weight dropped to ${droppedWeight}kg. GO AGAIN!`);
            setTimeout(() => setCoachFeedback(null), 3000);
        } else {
             setCoachFeedback("Drop weight! GO AGAIN!");
        }
    } else {
        setSetMode(0); 
    }
    
    // Reset defaults for next set
    setTempoRating('PERFECT');
  };

  const confirmPenaltySet = () => {
      // 1. Log the current "failed" set
      let m1 = parseFloat(metric1) || 0;
      let m2 = parseFloat(metric2) || 0;
      if (exercise.isWarmup) { m1=0; m2=getTargetRepsInt(); }
      
      commitSet(m1, m2);

      // 2. Set up for the bonus set based on prescription
      setShowPenaltyPrompt(false);
      setCoachFeedback(penaltyData?.message || "Bonus Set Unlocked");
      setTimeout(() => setCoachFeedback(null), 4000);

      // Rule 2 Prescription: Drop weight logic
      if (penaltyData?.type === 'DROP_SET_FIX') {
          const newWeight = Math.round((m1 * 0.8) / 1.25) * 1.25;
          setMetric1(newWeight.toString());
          setMetric2(""); // AMRAP usually means unknown target
      }
      // Rule 1 & 3 usually keep same weight
  };

  const handleFinishSet = () => {
    let m1 = parseFloat(metric1) || 0;
    let m2 = parseFloat(metric2) || 0;
    
    if (exercise.isWarmup) {
        m1 = 0; 
        m2 = getTargetRepsInt(); 
    }

    // --- PENALTY CHECK INTERCEPT ---
    const penalty = checkPenaltyCondition(m1, m2, rpe);
    if (penalty && !showPenaltyPrompt) {
        setPenaltyData(penalty);
        setShowPenaltyPrompt(true);
        return; // Stop here, wait for user input
    }

    commitSet(m1, m2);
  };

  const handleAutocomplete = () => {
      if (!onLogSets) return;
      const setsLeft = Math.max(0, exercise.sets - completedSets.length);
      const targetReps = getTargetRepsInt();
      const targetWeight = lastSession?.weight || 20;

      const sets = Array.from({ length: setsLeft }).map(() => ({
          metric1: targetWeight,
          metric2: targetReps,
          isDropSet: false,
          isMonsterSet: false,
          rpe: 8,
          tempoRating: 'PERFECT' as TempoRating
      }));
      onLogSets(sets);
  };

  const handleSaveNote = () => {
      saveExerciseNote(exercise.id, note);
      // Optional feedback
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

  const totalBurned = completedSets.reduce((acc, s) => acc + (s.calories || 0), 0);
  
  // --- 1RM LIVE CALCULATION ---
  const currentWeight = parseFloat(metric1) || 0;
  const currentReps = parseFloat(metric2) || 0;
  const projected1RM = (!exercise.isWarmup && !isCardio && currentWeight > 0 && currentReps > 0)
     ? Math.round(currentWeight * (1 + (currentReps / 30)))
     : 0;
  
  // Only display if this is the "Top Set" (i.e., heavier than previous recorded best in session)
  // OR if no session best yet.
  const isBestSet = projected1RM > sessionBest1RM;

  // Calculate historic best for PR check
  const historicBest1RM = history?.logs.reduce((max, log) => {
     // Skip cardio logs for 1RM calculation if types mixed, though unlikely with same ID
     const e1rm = Math.round(log.weight * (1 + (log.reps / 30)));
     return e1rm > max ? e1rm : max;
  }, 0) || 0;

  const isBreakingRecord = projected1RM > historicBest1RM && historicBest1RM > 0;
  
  const getRPEColor = (val: number) => {
      if (val < 7) return 'text-green-400';
      if (val < 9) return 'text-yellow-400';
      return 'text-red-500';
  };

  const getRPEDescription = (val: number) => {
      if (val <= 6) return "Easy";
      if (val === 7) return "Strenuous (3 left)";
      if (val === 8) return "Hard (2 left)";
      if (val === 9) return "Very Hard (1 left)";
      return "Max Effort (Failure)";
  }
  
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

      {/* ... (WaterReminder, PenaltyPrompt, AnimationModal, SkippedAlert, Leveler, MotionTracker, PlateauAlert, CoachBanner, CoachFeedback, MonsterPrompt, ButtonGrid, PyramidCalc, Notes, Steps, Facts, Info/StickFigure) ... */}
      
      {/* --- WATER REMINDER MODAL --- */}
      {showWaterReminder && (
          <WaterReminder 
              amount={waterReminderAmount}
              reason={`Based on ${completedSets.length} sets of work.`}
              onLog={() => { 
                  onUpdateWater(waterReminderAmount); 
                  setWaterDebt(0); 
                  setShowWaterReminder(false); 
              }}
              onSkip={() => {
                  setWaterDebt(prev => prev / 2);
                  setShowWaterReminder(false);
              }}
          />
      )}

      {/* --- VOLUME CHECK / STIMULUS TOP-UP MODAL --- */}
      {showPenaltyPrompt && (
          <div className="fixed inset-0 z-[75] bg-gym-900/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
              <div className={`p-6 rounded-full mb-6 border-2 animate-pulse ${penaltyData?.type === 'LAZINESS_PENALTY' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-blue-500/20 border-blue-500 text-blue-400'}`}>
                  {penaltyData?.type === 'LAZINESS_PENALTY' ? <AlertOctagon size={48} /> : <BarChart2 size={48} />}
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase text-center tracking-wider">Stimulus Check</h3>
              
              <div className="bg-gym-800 p-4 rounded-xl border border-gym-700 w-full mb-6 text-center">
                  <p className="text-lg font-bold text-white mb-1">{penaltyData?.message}</p>
                  <div className="h-px bg-gym-700 w-full my-3"></div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Prescription</p>
                  <p className="text-gym-accent font-bold text-lg leading-tight">{penaltyData?.prescription}</p>
              </div>
              
              <button 
                  onClick={confirmPenaltySet}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/40 mb-4 flex items-center justify-center gap-2"
              >
                  <CheckCircle size={20} /> Unlock Bonus Set
              </button>
              
              <button 
                  onClick={() => {
                      setShowPenaltyPrompt(false);
                      // Just log the set without bonus
                      commitSet(parseFloat(metric1)||0, parseFloat(metric2)||0);
                  }}
                  className="text-gray-500 font-bold hover:text-white transition-colors"
              >
                  Skip (Accept Defeat)
              </button>
          </div>
      )}

      {/* --- ANIMATION MODAL --- */}
      {showAnimation && (
          <div className="fixed inset-0 z-[80] bg-gym-900 flex flex-col p-6 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><Film className="text-blue-400"/> Visual Demo</h3>
                  <button onClick={() => setShowAnimation(false)} className="p-2 bg-gym-800 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  {exercise.gifUrl ? (
                      <div className="w-full bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-gym-700">
                          <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-auto object-cover" />
                      </div>
                  ) : (
                      <div className="text-center max-w-xs">
                          <div className="w-24 h-24 bg-gym-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gym-700">
                              <Film size={40} className="text-gym-600" />
                          </div>
                          <h4 className="text-lg font-bold text-white mb-2">No Built-in Animation</h4>
                          <p className="text-gray-400 text-sm mb-6">We don't have a stored animation for this specific exercise yet.</p>
                          
                          <a 
                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(exercise.name + " exercise gif")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                          >
                              <ExternalLink size={20} /> Find Animation Online
                          </a>
                          <p className="text-[10px] text-gray-600 mt-4">Opens Google Images in a new tab.</p>
                      </div>
                  )}
              </div>
              {exercise.gifUrl && (
                  <p className="text-center text-xs text-gray-500">Animation sourced from ExerciseDB</p>
              )}
          </div>
      )}

      {/* --- SKIPPED ALERT --- */}
      {skippedAlert && (
          <div className="mb-4 bg-orange-900/20 border border-orange-500/30 p-3 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
             <AlertTriangle className="text-orange-400 flex-shrink-0 mt-1" size={18} />
             <div>
                 <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Missed Session Alert</p>
                 <p className="text-sm text-gray-300">You skipped this last week. Give it 110% effort today to stay on track.</p>
             </div>
          </div>
      )}

      {/* --- LEVELER MODAL --- */}
      {showLeveler && exercise.benchAngle !== undefined && (
          <BenchLeveler 
            targetAngle={exercise.benchAngle} 
            onClose={() => setShowLeveler(false)} 
          />
      )}

      {/* --- MOTION TRACKER MODAL --- */}
      {showMotionTracker && (
          <MotionTracker 
            exercise={exercise}
            targetReps={getTargetRepsInt()}
            onRepCount={(count) => setMetric2(count.toString())}
            onClose={() => setShowMotionTracker(false)}
          />
      )}

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

      {/* --- SMART COACH BANNER (Auto-Pilot) --- */}
      {recommendation && recommendation.type !== 'BASELINE' && completedSets.length < exercise.sets && !plateauAlert && (
        <div className={`mb-4 p-3 rounded-lg border flex items-start gap-3 animate-in fade-in slide-in-from-top-1
            ${recommendation.type === 'INCREASE' ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/30 border-blue-500/30' : 
              recommendation.type === 'DECREASE' ? 'bg-orange-900/20 border-orange-500/30' : 'bg-gym-800 border-gym-700'}
        `}>
            <div className="p-2 bg-gym-900 rounded-full border border-gym-600">
                <BrainCircuit size={16} className="text-gym-accent" />
            </div>
            <div>
                <div className="flex justify-between items-center w-full mb-1">
                    <p className="text-xs font-bold text-gym-accent uppercase tracking-wider">Auto-Pilot</p>
                    {recommendation.type === 'INCREASE' && <span className="text-[10px] text-green-400 font-bold bg-green-900/40 px-1 rounded">PROGRESSIVE OVERLOAD</span>}
                    {recommendation.type === 'DECREASE' && <span className="text-[10px] text-orange-400 font-bold bg-orange-900/40 px-1 rounded">DELOAD</span>}
                </div>
                <p className="text-sm text-white font-medium mb-1">{recommendation.reason}</p>
                <p className="text-xs text-gray-400">
                   Target: <span className="text-white font-bold text-lg">{recommendation.targetWeight}kg</span> for <span className="text-white font-bold">{recommendation.targetReps} reps</span>
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

      {/* --- BUTTON GRID: Bench Angle / Pyramid / Steps / Notes / Demo --- */}
      <div className="grid grid-cols-2 gap-2 mb-4">
          {exercise.benchAngle !== undefined && (
              <button 
                onClick={() => setShowLeveler(true)}
                className="col-span-2 py-3 bg-gym-800 border border-gym-700 text-gym-accent font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
              >
                 <Ruler size={18} /> Calibrate Bench ({exercise.benchAngle}°)
              </button>
          )}

          {!isCardio && !exercise.isWarmup && (
              <button 
                onClick={() => setShowPyramidCalc(!showPyramidCalc)}
                className={`py-3 border border-gym-700 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-xs
                    ${showPyramidCalc ? 'bg-gym-accent border-gym-accent text-white' : 'bg-gym-800 text-gym-accent'}
                `}
              >
                 <Calculator size={16} /> Pyramid Calc
              </button>
          )}

          <button 
            onClick={() => setShowStepsModal(true)}
            className="py-3 bg-gym-800 border border-gym-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-xs hover:bg-gym-700"
          >
             <BookOpen size={16} className="text-orange-400" /> Step-by-Step
          </button>

          <button 
            onClick={() => setShowAnimation(true)}
            className="py-3 bg-gym-800 border border-gym-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-xs hover:bg-gym-700"
          >
             <Film size={16} className="text-blue-400" /> Watch Demo
          </button>

          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`py-3 border border-gym-700 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-xs
                ${showNotes ? 'bg-gym-700 text-white' : 'bg-gym-800 text-gray-300'}
            `}
          >
             <Edit3 size={16} /> My Notes
          </button>
      </div>
      
      {/* PYRAMID CALCULATOR COMPONENT */}
      {showPyramidCalc && (
          <PyramidCalculator 
             currentBest={recommendation?.targetWeight || lastSession?.weight || 0}
             workingSetsCount={exercise.sets} 
             onFill={(w, r) => { setMetric1(w.toString()); setMetric2(r.toString()); }}
          />
      )}

      {/* NOTES COMPONENT */}
      {showNotes && (
          <div className="mb-4 bg-gym-800/50 p-3 rounded-xl border border-gym-700 animate-in slide-in-from-top-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Personal Notes</label>
              <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleSaveNote}
                  placeholder="Add cues, seat settings, or reminders..."
                  className="w-full bg-gym-900 border border-gym-600 rounded p-3 text-sm text-white focus:border-gym-accent focus:outline-none min-h-[80px]"
              />
          </div>
      )}

      {/* STEPS MODAL */}
      {showStepsModal && (
          <div className="fixed inset-0 z-[80] bg-gym-900 flex flex-col p-6 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="text-orange-400"/> Execution Guide</h3>
                  <button onClick={() => setShowStepsModal(false)} className="p-2 bg-gym-800 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                  {exercise.detailedSteps && exercise.detailedSteps.length > 0 ? (
                      exercise.detailedSteps.map((step, idx) => (
                          <div key={idx} className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gym-800 border border-gym-700 flex items-center justify-center font-bold text-gym-accent text-sm">
                                  {idx + 1}
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed pt-1.5">{step}</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-center text-gray-500 italic mt-10">Detailed steps not available for this exercise yet.</p>
                  )}
              </div>
              <button onClick={() => setShowStepsModal(false)} className="mt-4 w-full py-4 bg-gym-accent text-white font-bold rounded-xl">Got it</button>
          </div>
      )}

      {/* FACTS SECTION */}
      {exercise.facts && exercise.facts.length > 0 && (
          <div className="mb-4">
              <button 
                onClick={() => setShowFacts(!showFacts)}
                className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                  <Lightbulb size={14} /> Did You Know?
              </button>
              {showFacts && (
                  <div className="mt-2 bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg animate-in fade-in">
                      <ul className="list-disc list-inside space-y-1">
                          {exercise.facts.map((fact, i) => (
                              <li key={i} className="text-xs text-blue-200 leading-relaxed">{fact}</li>
                          ))}
                      </ul>
                  </div>
              )}
          </div>
      )}

      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="mb-4 w-full flex items-center justify-between bg-gym-800/50 p-3 rounded-lg border border-gym-700 text-sm text-gray-300"
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
          {completedSets.length < exercise.sets && (
              <div className="bg-gym-800 p-5 rounded-2xl border border-gym-700 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      {isCardio ? <Footprints size={100} /> : <Dumbbell size={100} />}
                  </div>

                  <div className="flex justify-between items-end mb-6 relative z-10">
                      <div>
                          <span className="text-gym-accent font-bold tracking-wider text-xs uppercase">Current Set</span>
                          <h3 className="text-3xl font-bold text-white">Set {completedSets.length + 1}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                          <button onClick={handleAutocomplete} className="px-2 py-1 bg-gym-700/50 hover:bg-gym-700 text-gray-400 text-[10px] font-bold rounded uppercase tracking-wider border border-gym-600 transition-colors">Auto-fill Rest</button>
                          <div className="text-right">
                              <p className="text-xs text-gray-400">Target</p>
                              <p className="text-xl font-bold text-white">{exercise.reps} {isCardio ? '' : 'Reps'}</p>
                          </div>
                      </div>
                  </div>

                  {/* INPUTS: HIDDEN IF WARMUP */}
                  {!exercise.isWarmup ? (
                      <>
                        {/* SMART LOG TOOLBAR */}
                        <SmartLogBar 
                            lastWeight={lastSession?.weight || 0}
                            lastReps={lastSession?.reps || 0}
                            onFill={(w, r, newRpe, newTempo) => { 
                                setMetric1(w.toString()); 
                                setMetric2(r.toString());
                                if (newRpe !== undefined) setRpe(newRpe);
                                if (newTempo !== undefined) setTempoRating(newTempo);
                            }}
                        />

                        <div className="flex gap-4 mb-4 relative z-10">
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
                              <p className="text-[9px] text-gray-500 mt-1 text-center font-bold">{isCardio ? 'Total Distance' : weightHelper}</p>
                          </div>
                          <div className="w-1/2">
                              <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">
                                  {isTimed ? 'Time (sec)' : (isCardio ? 'Time (mins)' : 'Reps')}
                              </label>
                              <input 
                                  type="number" 
                                  value={metric2}
                                  onChange={e => setMetric2(e.target.value)}
                                  placeholder={lastSession ? `${lastSession.reps}` : isCardio ? '10' : (exercise.reps || "-")}
                                  className={`w-full bg-gym-900 border rounded-xl p-4 text-2xl text-white text-center font-bold focus:outline-none transition-all ${inputBorderClass}`}
                              />
                              <p className="text-[9px] text-gray-500 mt-1 text-center font-bold">{isCardio ? 'Total Time' : (isTimed ? 'Seconds' : repsHelper)}</p>
                          </div>
                        </div>

                        {/* RPE & TEMPO SLIDERS */}
                        {!isCardio && (
                            <div className="mb-4 relative z-10 space-y-4">
                                {/* RPE Control */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1 cursor-pointer" onClick={() => setShowRpeInfo(!showRpeInfo)}>
                                            <Gauge size={12}/> RPE (Effort) <HelpCircle size={10} className="text-gym-accent" />
                                        </label>
                                        <span className={`text-xs font-bold ${getRPEColor(rpe)}`}>
                                            {rpe} / 10 - {getRPEDescription(rpe)}
                                        </span>
                                    </div>
                                    {showRpeInfo && (
                                        <div className="bg-gym-900/90 p-2 rounded border border-gym-700 text-[10px] text-gray-300 mb-2 animate-in fade-in">
                                            <strong>RPE (Rate of Perceived Exertion)</strong>
                                            <br/>10 = Failure (No reps left).
                                            <br/>9 = 1 Rep in Reserve (Could do 1 more).
                                            <br/>8 = 2 Reps in Reserve (Could do 2 more).
                                        </div>
                                    )}
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        step="0.5"
                                        value={rpe}
                                        onChange={(e) => setRpe(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gym-700 rounded-lg appearance-none cursor-pointer accent-gym-accent"
                                    />
                                    <div className="flex justify-between px-1 mt-1">
                                        <span className="text-[9px] text-gray-600">Easy</span>
                                        <span className="text-[9px] text-gray-600">Failure</span>
                                    </div>
                                </div>
                                
                                {/* TEMPO Quality Gate UI */}
                                <div>
                                     <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1">
                                            <Activity size={12}/> Tempo Quality
                                        </label>
                                    </div>
                                    <div className="flex bg-gym-900 rounded-lg p-1 border border-gym-700">
                                        <button 
                                            onClick={() => setTempoRating('PERFECT')}
                                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase transition-all ${tempoRating === 'PERFECT' ? 'bg-gym-success text-white shadow' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Perfect (3-1-1)
                                        </button>
                                        <button 
                                            onClick={() => setTempoRating('FAST')}
                                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase transition-all ${tempoRating === 'FAST' ? 'bg-yellow-500 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Fast
                                        </button>
                                        <button 
                                            onClick={() => setTempoRating('CHEATED')}
                                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase transition-all ${tempoRating === 'CHEATED' ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Cheated
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NEXT SET SUGGESTION (If Intra-Set) */}
                        {nextSetSuggestion && completedSets.length > 0 && (
                            <div className="mb-4 relative z-10 bg-blue-900/30 border border-blue-500/30 p-2 rounded-lg text-center animate-in fade-in">
                                <p className="text-xs text-blue-200 font-bold">{nextSetSuggestion}</p>
                            </div>
                        )}

                        {/* 1RM PROJECTOR (Only show if this set is significant or top set) */}
                        {!isCardio && (isBestSet || completedSets.length === 0) && (
                            <div className={`mb-6 relative z-10 p-2 rounded-lg border transition-all duration-300 flex items-center justify-center gap-3 ${isBreakingRecord ? 'bg-gym-accent/20 border-gym-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gym-900/50 border-gym-700/50'}`}>
                                <Crown size={18} className={isBreakingRecord ? 'text-yellow-400 animate-bounce' : 'text-gray-600'} />
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                        Session Best e1RM
                                    </p>
                                    <p className={`text-lg font-black ${isBreakingRecord ? 'text-white' : 'text-gray-300'}`}>
                                        {projected1RM > 0 ? projected1RM : (sessionBest1RM > 0 ? sessionBest1RM : '--')} <span className="text-xs text-gray-500 font-normal">kg</span>
                                    </p>
                                </div>
                                {isBreakingRecord && (
                                    <TrendingUp size={18} className="text-green-400" />
                                )}
                            </div>
                        )}
                      </>
                  ) : (
                      // WARMUP SIMPLIFIED DISPLAY
                      <div className="mb-6 relative z-10 text-center py-4 bg-gym-900/50 rounded-xl border border-gym-700/50">
                          <p className="text-gray-400 uppercase text-xs font-bold mb-2">Target Goal</p>
                          <p className="text-4xl font-black text-white">{exercise.reps} {isCardio ? '' : 'Reps'}</p>
                      </div>
                  )}
                  
                  {status === 'improved' && !exercise.isWarmup && (
                      <p className="text-[10px] text-green-400 font-bold text-center mb-2 uppercase animate-pulse">Record Broken!</p>
                  )}
                  {status === 'regression' && !exercise.isWarmup && (
                      <p className="text-[10px] text-red-400 font-bold text-center mb-2 uppercase">Below Last Session</p>
                  )}

                  {/* Estimated Calories (Advanced Display) */}
                  <div className="mb-4 text-center z-10 relative group">
                     <span className="text-xs font-mono text-orange-400 flex items-center justify-center gap-1 cursor-pointer">
                         <Flame size={12} fill="currentColor"/> Est. Burn: {energyData.total} kcal
                     </span>
                     {/* Hover Details for Calorie Breakdown */}
                     {!isCardio && energyData.total > 0 && (
                         <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-6 bg-gym-900 border border-gym-700 p-2 rounded-lg text-[10px] w-40 text-center shadow-xl animate-in fade-in z-20">
                             <p className="text-gray-400">Active Work: <span className="text-white">{energyData.active}</span></p>
                             <p className="text-gray-400">EPOC (Repair): <span className="text-orange-400">+{energyData.epoc}</span></p>
                         </div>
                     )}
                  </div>

                  {/* Set Mode Toggle (Hide for Warmup) */}
                  {!exercise.isWarmup && (
                      <div className="mb-4 flex items-center gap-3 relative z-10">
                          <button 
                            onClick={toggleSetMode}
                            className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 text-sm font-bold transition-all ${getSetModeStyle()}`}
                          >
                              <Layers size={18} />
                              {getSetModeText()}
                          </button>
                      </div>
                  )}

                  {/* MAIN ACTION BUTTON */}
                  {!exercise.isWarmup ? (
                      <div className="grid grid-cols-2 gap-3 relative z-10">
                          <button 
                            onClick={() => setShowMotionTracker(true)}
                            className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40"
                          >
                              <Play size={20} fill="currentColor" /> {isTimed ? 'Start Timer' : 'Start Set'}
                          </button>
                          
                          <button 
                            onClick={handleFinishSet}
                            // For warmups, weight (metric1) is optional, so we only check metric2
                            disabled={!metric2}
                            className="py-4 bg-gym-800 border border-gym-600 text-gray-300 hover:bg-gym-700 font-bold rounded-xl active:scale-95 transition-all"
                          >
                              Log Manually
                          </button>
                      </div>
                  ) : (
                      <button 
                        onClick={handleFinishSet}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/40 relative z-10 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                          <CheckCircle size={20} /> Complete Set
                      </button>
                  )}
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
                             {exercise.isWarmup ? 'Warmup' : (isCardio ? `${set.weight}km` : `${set.weight}kg`)}
                             {!exercise.isWarmup && ' × '}
                             {isCardio ? `${set.reps}min` : exercise.isWarmup ? `Complete (${set.reps} reps)` : (isTimed ? `${set.reps}s` : `${set.reps} reps`)}
                         </span>
                         <div className="flex gap-2 items-center">
                            {set.rpe && <span className={`text-[10px] font-bold ${getRPEColor(set.rpe)} border border-gray-700 px-1 rounded`}>RPE {set.rpe}</span>}
                            {set.tempoRating && set.tempoRating !== 'PERFECT' && <span className={`text-[10px] font-bold ${set.tempoRating === 'CHEATED' ? 'text-red-400 border-red-500/50' : 'text-yellow-400 border-yellow-500/50'} border px-1 rounded`}>{set.tempoRating}</span>}
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
                 <div className="text-right">
                    <span className="font-mono text-white font-bold block">
                        {isCardio ? `${log.weight}km in ${log.reps}min` : `${log.weight}kg × ${log.reps}`}
                    </span>
                    <div className="flex gap-1 justify-end">
                       {log.rpe && <span className="text-[10px] text-gray-500 font-bold">RPE {log.rpe}</span>}
                       {log.tempoRating && <span className="text-[10px] text-blue-400 font-bold ml-1">{log.tempoRating.charAt(0)}</span>}
                    </div>
                 </div>
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
