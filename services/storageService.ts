
import { SessionData, UserStats, ExerciseHistory, HistoryLog, DashboardStats, MuscleGroup, Exercise, CoachRecommendation, MotionCalibration } from '../types';
import { ALL_WORKOUTS } from '../constants';

const KEYS = {
  SESSION: 'iron_guide_session_v2',
  STATS: 'iron_guide_stats_v2',
  HISTORY: 'iron_guide_history_v2',
  CALIBRATION: 'iron_guide_calibration_v1',
};

// Dynamically aggregate all exercises from the new schedule
const ALL_EXERCISES = ALL_WORKOUTS.flatMap(day => day.exercises);

export const getTodayString = () => new Date().toISOString().split('T')[0];

export const saveSession = (session: SessionData | null) => {
  if (session) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
};

export const loadSession = (): SessionData | null => {
  const data = localStorage.getItem(KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

export const saveUserStats = (stats: UserStats) => {
  localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
};

export const loadUserStats = (): UserStats => {
  const data = localStorage.getItem(KEYS.STATS);
  const defaultStats: UserStats = {
    bodyWeight: 0,
    waterIntake: 0,
    creatineTaken: false,
    creatineHistory: [],
    lastUpdated: getTodayString(),
  };

  if (!data) return defaultStats;

  const parsed = JSON.parse(data);
  // Reset daily trackers if date changed
  if (parsed.lastUpdated !== getTodayString()) {
    return {
      ...parsed,
      waterIntake: 0,
      creatineTaken: false, // Reset the daily toggle
      // Preserve history
      creatineHistory: parsed.creatineHistory || [],
      lastUpdated: getTodayString(),
    };
  }
  return {
      ...parsed,
      creatineHistory: parsed.creatineHistory || []
  };
};

// --- Helper: Calorie Calculation ---
export const calculateCalories = (metric1: number, metric2: number, metValue: number, isCardio: boolean = false) => {
    // Formula: MET * BodyWeight(kg) * Duration(hours)
    const stats = loadUserStats();
    const bw = stats.bodyWeight > 0 ? stats.bodyWeight : 75;
    
    let durationHours = 0;

    if (isCardio) {
      // Metric 2 is Time in minutes
      durationHours = metric2 / 60;
    } else {
      // Metric 2 is Reps, estimate 4s per rep
      durationHours = (metric2 * 4) / 3600; 
    }
    
    return Math.round((metValue * bw * durationHours) * 10) / 10; // Round to 1 decimal
};

// --- History Management ---

export const saveExerciseLog = (exerciseId: string, weight: number, reps: number, setNumber: number, rpe?: number) => {
  const historyRaw = localStorage.getItem(KEYS.HISTORY);
  const history = historyRaw ? JSON.parse(historyRaw) : {};
  
  if (!history[exerciseId]) history[exerciseId] = [];
  
  const newLog: HistoryLog = {
    date: getTodayString(),
    weight,
    reps,
    setNumber,
    rpe
  };
  
  // Append new log
  history[exerciseId].push(newLog);
  
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
};

export const getExerciseHistory = (exerciseId: string): ExerciseHistory | null => {
  const historyRaw = localStorage.getItem(KEYS.HISTORY);
  if (!historyRaw) return null;
  
  const fullHistory = JSON.parse(historyRaw);
  const logs = fullHistory[exerciseId] as HistoryLog[] || [];

  if (logs.length === 0) return null;

  // Find last session (not today)
  const today = getTodayString();
  const previousLogs = logs.filter(l => l.date !== today);
  
  let lastSession = undefined;
  if (previousLogs.length > 0) {
    // Sort by date desc
    previousLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastDate = previousLogs[0].date;
    const lastDateLogs = previousLogs.filter(l => l.date === lastDate);
    
    // Find best performance (highest weight, then reps)
    // We treat the "Top Set" as the one with max weight.
    lastDateLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    
    const bestLog = lastDateLogs[0];

    lastSession = {
      date: lastDate,
      topSet: { weight: bestLog.weight, reps: bestLog.reps, rpe: bestLog.rpe }
    };
  }

  return {
    logs: logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), // return all logs sorted new -> old
    lastSession
  };
};

export const checkPlateau = (exerciseId: string): { isStalled: boolean; recommendation: string | null } => {
  const historyRaw = localStorage.getItem(KEYS.HISTORY);
  if (!historyRaw) return { isStalled: false, recommendation: null };
  
  const fullHistory = JSON.parse(historyRaw);
  const logs = fullHistory[exerciseId] as HistoryLog[] || [];

  if (logs.length < 2) return { isStalled: false, recommendation: null };

  // Sort logs by date desc
  const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Get unique dates
  const uniqueDates = Array.from(new Set(sortedLogs.map(l => l.date)));
  
  // Filter out "today" to identify historical stalls
  const today = getTodayString();
  const historicalDates = uniqueDates.filter(d => d !== today);

  if (historicalDates.length < 2) return { isStalled: false, recommendation: null };

  const session1Date = historicalDates[0];
  const session2Date = historicalDates[1];

  const getTopSet = (date: string) => {
    const sessionLogs = sortedLogs.filter(l => l.date === date);
    // Sort by weight desc, then reps desc
    sessionLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    return sessionLogs[0];
  };

  const topSet1 = getTopSet(session1Date);
  const topSet2 = getTopSet(session2Date);

  if (!topSet1 || !topSet2) return { isStalled: false, recommendation: null };

  // Stalled definition: Same weight AND Same reps (or less) for top set
  if (topSet1.weight === topSet2.weight && topSet1.reps <= topSet2.reps) {
     // Suggest Deload
     const deloadWeight = Math.floor((topSet1.weight * 0.9) / 1.25) * 1.25; 
     const targetReps = Math.floor(topSet1.reps * 1.2); 
     return {
         isStalled: true,
         recommendation: `You are stalled at ${topSet1.weight}kg. Strategy: Drop weight to ${deloadWeight}kg and aim for ${targetReps} reps to reset.`
     };
  }

  return { isStalled: false, recommendation: null };
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.SESSION);
  localStorage.removeItem(KEYS.STATS);
  localStorage.removeItem(KEYS.HISTORY);
  localStorage.removeItem(KEYS.CALIBRATION);
  window.location.reload();
};

// --- Calibration Logic ---

export const saveCalibration = (data: MotionCalibration) => {
  const raw = localStorage.getItem(KEYS.CALIBRATION);
  const db = raw ? JSON.parse(raw) : {};
  db[data.exerciseId] = data;
  localStorage.setItem(KEYS.CALIBRATION, JSON.stringify(db));
};

export const getCalibration = (exerciseId: string): MotionCalibration | null => {
  const raw = localStorage.getItem(KEYS.CALIBRATION);
  if (!raw) return null;
  const db = JSON.parse(raw);
  return db[exerciseId] || null;
};

// --- Analytics ---

export const getDashboardStats = (): DashboardStats => {
  const historyRaw = localStorage.getItem(KEYS.HISTORY);
  const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
  
  // 1. Weekly Volume
  const weeklyVolume: Record<string, number> = {
    Chest: 0, Back: 0, Legs: 0, Shoulders: 0, Triceps: 0, Biceps: 0, Abs: 0, Cardio: 0
  };
  
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Start from Sunday
  startOfWeek.setHours(0,0,0,0);

  // 2. PRs
  const personalRecords: Record<string, { weight: number; exerciseName: string; date: string }> = {};
  let bestLift: { weight: number; exerciseName: string } | null = null;
  
  // 3. Calories
  let totalCalories = 0;

  Object.keys(fullHistory).forEach(exerciseId => {
    const logs = fullHistory[exerciseId] as HistoryLog[];
    
    let exerciseDef = ALL_EXERCISES.find(e => e.id === exerciseId);
    
    if (!exerciseDef) {
       // Try custom if not in standard
       exerciseDef = { 
         id: exerciseId, 
         name: 'Exercise', 
         type: 'weighted', 
         sets: 3, reps: '10', 
         restSeconds: 60, cues: '', muscleFocus: 'Custom', targetGroup: 'Other', feeling: '', 
         pacer: { phases: [], startDelay: 0 }, metValue: 4 
       } as any;
    }

    let maxWeight = 0;
    let prDate = '';
    
    logs.forEach(log => {
      // PR Logic
      if (log.weight > maxWeight && exerciseDef?.type === 'weighted') {
        maxWeight = log.weight;
        prDate = log.date;
      }

      // Volume Logic
      if (new Date(log.date) >= startOfWeek) {
         if (exerciseDef?.targetGroup && weeklyVolume[exerciseDef.targetGroup] !== undefined) {
            weeklyVolume[exerciseDef.targetGroup]++;
         }
         
         const isCardio = exerciseDef?.type === 'cardio';
         const setCals = calculateCalories(log.weight, log.reps, exerciseDef?.metValue || 4, isCardio);
         totalCalories += setCals;
      }
    });

    if (maxWeight > 0 && exerciseDef?.type === 'weighted') {
      personalRecords[exerciseId] = { weight: maxWeight, exerciseName: exerciseDef?.name || 'Exercise', date: prDate };
      if (!bestLift || maxWeight > bestLift.weight) {
        bestLift = { weight: maxWeight, exerciseName: exerciseDef?.name || 'Exercise' };
      }
    }
  });

  // 3. Missed Muscles
  const trackedMuscles: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Abs'];
  const missedMuscles = trackedMuscles.filter(m => weeklyVolume[m] === 0);

  return {
    weeklyVolume,
    missedMuscles,
    personalRecords,
    bestLift,
    totalCalories: Math.round(totalCalories)
  };
};

// --- HEATMAP ENGINE ---

const mapMuscleToKey = (detailedName: string): string => {
    const n = detailedName.toLowerCase();
    if (n.includes('chest')) return 'chest';
    if (n.includes('lat') || n.includes('back')) return 'back';
    if (n.includes('shoulder') || n.includes('delt')) return 'shoulders';
    if (n.includes('tricep')) return 'triceps';
    if (n.includes('bicep') || n.includes('brach')) return 'biceps';
    if (n.includes('abs') || n.includes('core') || n.includes('oblique')) return 'abs';
    if (n.includes('quad') || n.includes('thigh')) return 'quads';
    if (n.includes('ham') || n.includes('glute')) return 'hams_glutes';
    if (n.includes('calf') || n.includes('soleus')) return 'calves';
    return '';
};

export const getMuscleHeatmapData = (): Record<string, number> => {
    const historyRaw = localStorage.getItem(KEYS.HISTORY);
    const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
    
    const lastTrainedHours: Record<string, number> = {
        chest: Infinity, back: Infinity, shoulders: Infinity,
        triceps: Infinity, biceps: Infinity, abs: Infinity,
        quads: Infinity, hams_glutes: Infinity, calves: Infinity
    };
    
    const today = new Date();
    today.setHours(0,0,0,0); // Midnight comparison for day granularity

    Object.keys(fullHistory).forEach(exId => {
        const logs = fullHistory[exId] as HistoryLog[];
        if (logs.length === 0) return;
        
        const exDef = ALL_EXERCISES.find(e => e.id === exId);
        if (!exDef || !exDef.muscleSplit) return;
        
        // Sort logs desc
        const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastLogDateStr = sortedLogs[0].date;
        const lastLogDate = new Date(lastLogDateStr);
        lastLogDate.setHours(0,0,0,0);
        
        const diffDays = (today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24);
        const diffHours = diffDays * 24; // Approximation is fine, we care about <24, 24-48, etc.
        
        // Update muscles hit by this exercise
        Object.keys(exDef.muscleSplit).forEach(mName => {
            if ((exDef.muscleSplit![mName] || 0) > 30) { // Only count if muscle involvement > 30%
                const key = mapMuscleToKey(mName);
                if (key && diffHours < lastTrainedHours[key]) {
                    lastTrainedHours[key] = diffHours;
                }
            }
        });
    });
    
    return lastTrainedHours;
};

export const getCreatineStats = (history: string[]) => {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); 
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);

  const thisWeek = history.filter(date => new Date(date) >= startOfWeek).length;
  const thisMonth = history.filter(date => date.startsWith(currentMonth)).length;

  return { thisWeek, thisMonth };
};

// --- PROGRESSION ENGINE (Linear Progression - Auto Pilot) ---

const parseRepRange = (repStr: string): { min: number, max: number } => {
  // Handles "8-10", "15", "Failure"
  if (repStr.toLowerCase().includes('fail')) return { min: 8, max: 99 };
  if (repStr.includes('-')) {
    const [min, max] = repStr.split('-').map(Number);
    return { min, max };
  }
  const val = parseInt(repStr);
  return { min: val, max: val };
};

const roundToPlate = (weight: number) => {
    // Rounds to nearest 1.25kg (standard fractional plate logic)
    return Math.round(weight / 1.25) * 1.25;
};

export const getProgressionRecommendation = (exercise: Exercise): CoachRecommendation => {
  const history = getExerciseHistory(exercise.id);
  
  // Default for new exercise
  if (!history || !history.lastSession) {
    return {
      type: 'BASELINE',
      targetWeight: 0,
      targetReps: exercise.reps,
      reason: "No history found. Find a weight where you reach failure within the target range."
    };
  }

  const { topSet } = history.lastSession;
  const { min } = parseRepRange(exercise.reps);
  
  // If no RPE recorded yet, fallback to old logic (Did we hit target reps?)
  if (topSet.rpe === undefined) {
      if (topSet.reps >= min) {
          const jump = exercise.isCompound ? 2.5 : 1.25;
          return {
              type: 'INCREASE',
              targetWeight: topSet.weight + jump,
              targetReps: exercise.reps,
              reason: `History found (No RPE). You hit ${topSet.reps} reps. Increase weight by ${jump}kg.`
          };
      } else {
          return {
              type: 'MAINTAIN',
              targetWeight: topSet.weight,
              targetReps: exercise.reps,
              reason: "History found (No RPE). Maintain weight until you hit target reps."
          };
      }
  }

  const rpe = topSet.rpe;

  // --- AUTO-PILOT ALGORITHM ---

  // 1. Missed Reps (Failure)
  if (topSet.reps < min) {
      const newWeight = roundToPlate(topSet.weight * 0.90); // -10% Deload
      return {
          type: 'DECREASE',
          targetWeight: newWeight,
          targetReps: exercise.reps,
          reason: `Missed reps (${topSet.reps} vs ${min}). Auto-Deload -10% to reset form.`
      };
  }

  // 2. Too Easy (RPE < 7)
  if (rpe < 7) {
      const newWeight = roundToPlate(topSet.weight * 1.05); // +5%
      return {
          type: 'INCREASE',
          targetWeight: newWeight,
          targetReps: exercise.reps,
          reason: `RPE ${rpe} (Too Easy). Auto-Pilot increasing load by +5%.`
      };
  }

  // 3. Perfect (RPE 7-8)
  if (rpe >= 7 && rpe <= 8) {
      const newWeight = roundToPlate(topSet.weight * 1.025); // +2.5%
      return {
          type: 'INCREASE',
          targetWeight: newWeight,
          targetReps: exercise.reps,
          reason: `RPE ${rpe} (Perfect Zone). Auto-Pilot Micro-loading +2.5%.`
      };
  }

  // 4. Grind (RPE 9-10)
  // Logic: Keep weight same next session to consolidate strength
  return {
      type: 'MAINTAIN',
      targetWeight: topSet.weight,
      targetReps: exercise.reps,
      reason: `RPE ${rpe} (Grind). Maintain weight to consolidate strength.`
  };
};

export const analyzeSetPerformance = (exercise: Exercise, weight: number, reps: number): string => {
  const { min, max } = parseRepRange(exercise.reps);
  
  if (reps > max + 2) return "Too light! Increase weight by 5kg next set.";
  if (reps < min - 2) return "Too heavy. Drop weight by 10% next set.";
  if (reps >= min && reps <= max) return "Perfect weight. Keep grinding.";
  return "Good set. Adjust if needed.";
};

// --- RECEIPT & PR GENERATOR ---

export interface ReceiptData {
    duration: string;
    totalVolume: number;
    exercises: {
        name: string;
        sets: number;
        bestWeight: number;
        isPR: boolean;
        isCardio: boolean;
    }[];
    date: string;
    quote: string;
}

const MOTIVATIONAL_QUOTES = [
    "PAIN IS TEMPORARY.",
    "LIGHT WEIGHT BABY!",
    "BUILD THE MONUMENT.",
    "DISCIPLINE > MOTIVATION",
    "THE IRON NEVER LIES.",
    "EARNED. NOT GIVEN.",
    "ONE MORE REP.",
    "SACRIFICE FOR GLORY.",
    "CONQUER YOURSELF.",
    "NO SHORTCUTS."
];

export const getSessionSummary = (session: SessionData): ReceiptData => {
    const historyRaw = localStorage.getItem(KEYS.HISTORY);
    const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
    
    // Calculate Duration
    const durationMs = Date.now() - session.startTime;
    const minutes = Math.floor(durationMs / 60000);
    const durationStr = `${Math.floor(minutes/60)}h ${minutes%60}m`;
    
    let totalVolume = 0;
    const exerciseSummaries = [];
    const today = getTodayString();
    
    // Process Exercises
    for (const exId of Object.keys(session.completedExercises)) {
        const sets = session.completedExercises[exId];
        if (sets.length === 0) continue;
        
        // Find Exercise Name
        let name = "Unknown Exercise";
        let isCardio = false;
        
        // Check standard
        let exDef = ALL_EXERCISES.find(e => e.id === exId);
        // Check custom
        if (!exDef) exDef = session.customExercises.find(e => e.id === exId);
        
        if (exDef) {
            name = exDef.name;
            isCardio = exDef.type === 'cardio';
        }

        // Calculate Session Best & Volume
        let sessionBestWeight = 0;
        
        sets.forEach(s => {
            if (!isCardio) {
                totalVolume += s.weight * s.reps;
                if (s.weight > sessionBestWeight) sessionBestWeight = s.weight;
            } else {
                 // Cardio volume is distance
                 totalVolume += s.weight; 
                 if (s.weight > sessionBestWeight) sessionBestWeight = s.weight;
            }
        });
        
        // Check for PR (History vs Session)
        const logs = fullHistory[exId] as HistoryLog[] || [];
        const previousLogs = logs.filter(l => l.date !== today);
        
        let previousMax = 0;
        previousLogs.forEach(l => {
            if (l.weight > previousMax) previousMax = l.weight;
        });
        
        // If session best > previous max, it is a TRUE PR.
        const isPR = sessionBestWeight > previousMax && previousMax > 0;
        
        exerciseSummaries.push({
            name,
            sets: sets.length,
            bestWeight: sessionBestWeight,
            isPR,
            isCardio
        });
    }
    
    return {
        duration: durationStr,
        totalVolume: Math.round(totalVolume),
        exercises: exerciseSummaries,
        date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase(),
        quote: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
    };
};
