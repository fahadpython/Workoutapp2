
import { SessionData, UserStats, ExerciseHistory, HistoryLog, DashboardStats, MuscleGroup, Exercise, CoachRecommendation } from '../types';
import { ALL_WORKOUTS } from '../constants';

const KEYS = {
  SESSION: 'iron_guide_session_v2',
  STATS: 'iron_guide_stats_v2',
  HISTORY: 'iron_guide_history_v2',
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

export const saveExerciseLog = (exerciseId: string, weight: number, reps: number, setNumber: number) => {
  const historyRaw = localStorage.getItem(KEYS.HISTORY);
  const history = historyRaw ? JSON.parse(historyRaw) : {};
  
  if (!history[exerciseId]) history[exerciseId] = [];
  
  const newLog: HistoryLog = {
    date: getTodayString(),
    weight,
    reps,
    setNumber
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
    // Sort by date desc, then weight desc to find "Top Set" of last session
    previousLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastDate = previousLogs[0].date;
    const lastDateLogs = previousLogs.filter(l => l.date === lastDate);
    
    // Find best performance (highest weight, then reps)
    lastDateLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    
    lastSession = {
      date: lastDate,
      topSet: { weight: lastDateLogs[0].weight, reps: lastDateLogs[0].reps }
    };
  }

  return {
    logs: logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), // return all logs sorted new -> old
    lastSession
  };
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.SESSION);
  localStorage.removeItem(KEYS.STATS);
  localStorage.removeItem(KEYS.HISTORY);
  window.location.reload();
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
       exerciseDef = { 
         id: exerciseId, 
         name: 'Custom Exercise', 
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

// --- PROGRESSION ENGINE (Smart Algo) ---

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
  const { min, max } = parseRepRange(exercise.reps);
  
  // Logic: Double Progression
  // 1. Did we hit the top of the rep range?
  if (topSet.reps >= max) {
    // Determine weight jump based on exercise type
    const jump = exercise.isCompound ? 2.5 : 1.25; // Smaller jumps for isolation
    const newWeight = topSet.weight + jump;
    
    return {
      type: 'INCREASE',
      targetWeight: newWeight,
      targetReps: `${min}-${max}`,
      reason: `You crushed ${topSet.reps} reps last time! Increase weight by ${jump}kg.`
    };
  } else {
    // We didn't hit the top range. Stay at weight, aim for more reps.
    const target = Math.min(topSet.reps + 1, max);
    return {
      type: 'MAINTAIN',
      targetWeight: topSet.weight,
      targetReps: `${target}-${max}`,
      reason: `Last time: ${topSet.reps} reps. Keep weight, aim for ${target}+ reps today.`
    };
  }
};

export const analyzeSetPerformance = (exercise: Exercise, weight: number, reps: number): string => {
  const { min, max } = parseRepRange(exercise.reps);
  
  if (reps > max + 2) return "Too light! Increase weight by 5kg next set.";
  if (reps < min - 2) return "Too heavy. Drop weight by 10% next set.";
  if (reps >= min && reps <= max) return "Perfect weight. Keep grinding.";
  return "Good set. Adjust if needed.";
};
