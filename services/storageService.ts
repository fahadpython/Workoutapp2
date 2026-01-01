
import { SessionData, UserStats, ExerciseHistory, HistoryLog, DashboardStats, MuscleGroup, Exercise, CoachRecommendation, MotionCalibration, UserProfile, SkippedEntry, PendingExercise, TempoRating, NutritionLog, ReceiptData, PacerConfig } from '../types';
import { ALL_WORKOUTS } from '../constants';

// --- KEY MANAGEMENT SYSTEM ---

const GLOBAL_KEYS = {
  USERS_REGISTRY: 'iron_guide_users_registry',
  ACTIVE_USER_ID: 'iron_guide_active_user_id',
};

// Base keys that will be prefixed with user ID
const BASE_KEYS = {
  SESSION: 'iron_guide_session_v2',
  STATS: 'iron_guide_stats_v2',
  HISTORY: 'iron_guide_history_v2',
  CALIBRATION: 'iron_guide_calibration_v2', // Updated version
  NOTES: 'iron_guide_notes_v1',
  SKIPPED: 'iron_guide_skipped_v1', 
  PENDING: 'iron_guide_pending_v1', 
  NUTRITION: 'iron_guide_nutrition_v1', 
};

// ... (Keep existing User Management, Migration, Backup logic identical) ...
// State to hold current user ID in memory
let currentUserId: string | null = localStorage.getItem(GLOBAL_KEYS.ACTIVE_USER_ID);

// Helper to get scoped key
const getKey = (baseKey: string) => {
  if (!currentUserId) return baseKey; // Fallback for legacy or error state
  return `user_${currentUserId}_${baseKey}`;
};

// --- USER MANAGEMENT ---

export const getUsers = (): UserProfile[] => {
  const raw = localStorage.getItem(GLOBAL_KEYS.USERS_REGISTRY);
  return raw ? JSON.parse(raw) : [];
};

export const createUser = (name: string): UserProfile => {
  const users = getUsers();
  const newUser: UserProfile = {
    id: Date.now().toString(),
    name,
    created: Date.now()
  };
  users.push(newUser);
  localStorage.setItem(GLOBAL_KEYS.USERS_REGISTRY, JSON.stringify(users));
  return newUser;
};

export const switchUser = (userId: string) => {
  currentUserId = userId;
  localStorage.setItem(GLOBAL_KEYS.ACTIVE_USER_ID, userId);
};

export const getCurrentUser = (): UserProfile | null => {
  if (!currentUserId) return null;
  const users = getUsers();
  return users.find(u => u.id === currentUserId) || null;
};

export const deleteUser = (userId: string) => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(GLOBAL_KEYS.USERS_REGISTRY, JSON.stringify(users));
  const prefix = `user_${userId}_`;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  });
  if (currentUserId === userId) {
    currentUserId = null;
    localStorage.removeItem(GLOBAL_KEYS.ACTIVE_USER_ID);
  }
};

export const checkAndMigrateLegacyData = (): boolean => {
  const users = getUsers();
  if (users.length > 0) return false; 
  const hasHistory = localStorage.getItem(BASE_KEYS.HISTORY);
  const hasStats = localStorage.getItem(BASE_KEYS.STATS);
  if (hasHistory || hasStats) {
    const defaultUser = createUser("Default User");
    currentUserId = defaultUser.id;
    localStorage.setItem(GLOBAL_KEYS.ACTIVE_USER_ID, defaultUser.id);
    const move = (baseKey: string) => {
      const data = localStorage.getItem(baseKey);
      if (data) {
        localStorage.setItem(getKey(baseKey), data);
        localStorage.removeItem(baseKey);
      }
    };
    move(BASE_KEYS.SESSION);
    move(BASE_KEYS.STATS);
    move(BASE_KEYS.HISTORY);
    move(BASE_KEYS.CALIBRATION);
    return true; 
  }
  return false;
};

export const exportUserData = () => {
  if (!currentUserId) return null;
  const backup = {
    userProfile: getCurrentUser(),
    timestamp: Date.now(),
    data: {
      session: localStorage.getItem(getKey(BASE_KEYS.SESSION)),
      stats: localStorage.getItem(getKey(BASE_KEYS.STATS)),
      history: localStorage.getItem(getKey(BASE_KEYS.HISTORY)),
      calibration: localStorage.getItem(getKey(BASE_KEYS.CALIBRATION)),
      notes: localStorage.getItem(getKey(BASE_KEYS.NOTES)),
      skipped: localStorage.getItem(getKey(BASE_KEYS.SKIPPED)),
      pending: localStorage.getItem(getKey(BASE_KEYS.PENDING)),
      nutrition: localStorage.getItem(getKey(BASE_KEYS.NUTRITION)),
    }
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  const date = new Date().toISOString().split('T')[0];
  downloadAnchorNode.setAttribute("download", `ironguide_backup_${getCurrentUser()?.name}_${date}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

export const importUserData = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.userProfile || !json.data) {
          alert("Invalid backup file format.");
          return resolve(false);
        }
        if (!currentUserId) {
           alert("Please log in to a user before restoring.");
           return resolve(false);
        }
        if (json.data.session) localStorage.setItem(getKey(BASE_KEYS.SESSION), json.data.session);
        if (json.data.stats) localStorage.setItem(getKey(BASE_KEYS.STATS), json.data.stats);
        if (json.data.history) localStorage.setItem(getKey(BASE_KEYS.HISTORY), json.data.history);
        if (json.data.calibration) localStorage.setItem(getKey(BASE_KEYS.CALIBRATION), json.data.calibration);
        if (json.data.notes) localStorage.setItem(getKey(BASE_KEYS.NOTES), json.data.notes);
        if (json.data.skipped) localStorage.setItem(getKey(BASE_KEYS.SKIPPED), json.data.skipped);
        if (json.data.pending) localStorage.setItem(getKey(BASE_KEYS.PENDING), json.data.pending);
        if (json.data.nutrition) localStorage.setItem(getKey(BASE_KEYS.NUTRITION), json.data.nutrition);
        resolve(true);
      } catch (e) {
        console.error(e);
        alert("Failed to parse backup file.");
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
};

const ALL_EXERCISES = ALL_WORKOUTS.flatMap(day => day.exercises);
export const getTodayString = () => new Date().toISOString().split('T')[0];

export const saveSession = (session: SessionData | null) => {
  const key = getKey(BASE_KEYS.SESSION);
  if (session) {
    localStorage.setItem(key, JSON.stringify(session));
  } else {
    localStorage.removeItem(key);
  }
};

export const loadSession = (): SessionData | null => {
  const data = localStorage.getItem(getKey(BASE_KEYS.SESSION));
  return data ? JSON.parse(data) : null;
};

export const saveUserStats = (stats: UserStats) => {
  localStorage.setItem(getKey(BASE_KEYS.STATS), JSON.stringify(stats));
};

export const loadUserStats = (): UserStats => {
  const data = localStorage.getItem(getKey(BASE_KEYS.STATS));
  const defaultStats: UserStats = {
    bodyWeight: 0,
    waterIntake: 0,
    creatineTaken: false,
    creatineHistory: [],
    lastUpdated: getTodayString(),
  };
  if (!data) return defaultStats;
  const parsed = JSON.parse(data);
  if (parsed.lastUpdated !== getTodayString()) {
    return {
      ...parsed,
      waterIntake: 0,
      creatineTaken: false,
      creatineHistory: parsed.creatineHistory || [],
      lastUpdated: getTodayString(),
    };
  }
  return { ...parsed, creatineHistory: parsed.creatineHistory || [] };
};

export const logNutrition = (calories: number, name: string) => {
    const key = getKey(BASE_KEYS.NUTRITION);
    const raw = localStorage.getItem(key);
    const logs: NutritionLog[] = raw ? JSON.parse(raw) : [];
    const newLog: NutritionLog = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        date: getTodayString(),
        calories,
        name: name || "Snack"
    };
    logs.push(newLog);
    localStorage.setItem(key, JSON.stringify(logs));
    return newLog;
};

export const getNutritionLogs = (): NutritionLog[] => {
    const raw = localStorage.getItem(getKey(BASE_KEYS.NUTRITION));
    return raw ? JSON.parse(raw) : [];
};

export const getTodayNutritionTotal = (): number => {
    const logs = getNutritionLogs();
    const today = getTodayString();
    return logs.filter(l => l.date === today).reduce((sum, l) => sum + l.calories, 0);
};

export const saveExerciseNote = (exerciseId: string, note: string) => {
    const key = getKey(BASE_KEYS.NOTES);
    const raw = localStorage.getItem(key);
    const db = raw ? JSON.parse(raw) : {};
    db[exerciseId] = note;
    localStorage.setItem(key, JSON.stringify(db));
};

export const getExerciseNote = (exerciseId: string): string => {
    const key = getKey(BASE_KEYS.NOTES);
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    const db = JSON.parse(raw);
    return db[exerciseId] || "";
};

export const saveSkippedExercise = (exerciseId: string, reason: string, targetWorkoutId?: string) => {
    const today = getTodayString();
    const skippedKey = getKey(BASE_KEYS.SKIPPED);
    const skippedRaw = localStorage.getItem(skippedKey);
    const skippedList: SkippedEntry[] = skippedRaw ? JSON.parse(skippedRaw) : [];
    skippedList.push({ exerciseId, date: today, reason });
    localStorage.setItem(skippedKey, JSON.stringify(skippedList));
    if (targetWorkoutId) {
        const pendingKey = getKey(BASE_KEYS.PENDING);
        const pendingRaw = localStorage.getItem(pendingKey);
        const pendingList: PendingExercise[] = pendingRaw ? JSON.parse(pendingRaw) : [];
        pendingList.push({
            exerciseId,
            originalDate: today,
            targetWorkoutId: targetWorkoutId,
            reason
        });
        localStorage.setItem(pendingKey, JSON.stringify(pendingList));
    }
};

export const getPendingExercises = (currentWorkoutId?: string): PendingExercise[] => {
    const key = getKey(BASE_KEYS.PENDING);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: PendingExercise[] = JSON.parse(raw);
    if (currentWorkoutId) {
        return list.filter(item => item.targetWorkoutId === currentWorkoutId);
    } else {
        const today = getTodayString();
        return list.filter(item => item.targetDate && item.targetDate <= today);
    }
};

export const completePendingExercise = (exerciseId: string) => {
    const key = getKey(BASE_KEYS.PENDING);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let list: PendingExercise[] = JSON.parse(raw);
    list = list.filter(item => item.exerciseId !== exerciseId);
    localStorage.setItem(key, JSON.stringify(list));
};

export const wasSkippedLastSession = (exerciseId: string): boolean => {
    const key = getKey(BASE_KEYS.SKIPPED);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const list: SkippedEntry[] = JSON.parse(raw);
    const mySkips = list.filter(s => s.exerciseId === exerciseId);
    if (mySkips.length === 0) return false;
    mySkips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastSkip = mySkips[0];
    const skipDate = new Date(lastSkip.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - skipDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 14;
};

// --- ADVANCED HYPERTROPHY CALORIE ALGORITHM ---
export const calculateHypertrophyCalories = (
    weightLifted: number,
    reps: number,
    rpe: number,
    pacer: PacerConfig,
    tempoRating: TempoRating | undefined,
    userBodyWeight: number = 75,
    isCompound: boolean = false
): { total: number, active: number, epoc: number } => {
    
    // 1. Calculate Active Burn (During Set)
    
    // Step A: Parse Tempo & Calculate TUT
    let repDuration = 0;
    let eccentricDuration = 0;

    if (pacer && pacer.phases) {
        pacer.phases.forEach(p => {
            repDuration += p.duration;
            // Identify eccentric phase for EPOC damage calculation
            if (['LOWER', 'DOWN', 'ECCENTRIC', 'OPEN'].some(k => p.action.toUpperCase().includes(k))) {
                eccentricDuration += p.duration;
            }
        });
    } else {
        repDuration = 4; // Default 4s per rep (standard control)
        eccentricDuration = 2; 
    }

    // Apply User Performance Rating to TUT
    let performanceMultiplier = 1.0;
    if (tempoRating === 'FAST') performanceMultiplier = 0.6; // Rushed reps
    else if (tempoRating === 'CHEATED') performanceMultiplier = 0.4; // Very poor control
    
    const tutSeconds = repDuration * reps * performanceMultiplier;
    const effectiveEccentric = eccentricDuration * performanceMultiplier;

    // Step B: Calculate Modified MET
    // Standard MET for "Weight Lifting" is ~3.5 to 6.0. 
    // We scale this based on Intensity (RPE).
    
    const baseMET = 6.0;
    
    // RPE Scaling (Exponential): 
    // RPE 5 = 1.25x Base
    // RPE 8 = 2.28x Base
    // RPE 10 = 3.0x Base
    // Formula: 1 + (RPE^2 / 50)
    const rpeFactor = 1 + (Math.pow(rpe, 2) / 50);
    
    const compoundFactor = isCompound ? 1.4 : 1.0; // More muscle mass = more oxygen
    
    const finalMET = baseMET * rpeFactor * compoundFactor;
    
    // Metabolic Cost formula: kcal = MET * BW * Duration(hr)
    const metabolicCost = finalMET * userBodyWeight * (tutSeconds / 3600);

    // Step C: Mechanical Work (Physics)
    // Reward moving heavy weight even if RPE is low or TUT is short.
    // Factor: 0.05 kcal per 1000kg moved (approximated physics work)
    const mechanicalWork = (weightLifted * reps) * 0.00005 * 1000; // Simplified scaling

    const activeBurn = metabolicCost + mechanicalWork;

    // 2. Calculate Future Burn (EPOC / Repair)
    // Represents energy to repair micro-tears and restore homeostasis.
    
    let epocMultiplier = 0;

    // Intensity Bonus (Non-linear)
    if (rpe >= 7) {
        // +5% to +20%
        epocMultiplier += 0.05 + ((rpe - 7) * 0.05); 
    }

    // Muscle Damage Bonus (Slow Eccentric)
    if (effectiveEccentric >= 3) {
        epocMultiplier += 0.10; // More micro-tears
    }

    // CNS / Systemic Bonus
    if (isCompound && rpe >= 8) {
        epocMultiplier += 0.10; // Systemic recovery cost
    }

    const epocBurn = activeBurn * epocMultiplier;
    const totalBurn = activeBurn + epocBurn;

    return {
        total: Math.round(totalBurn * 10) / 10,
        active: Math.round(activeBurn * 10) / 10,
        epoc: Math.round(epocBurn * 10) / 10
    };
};

export const calculateCalories = (metric1: number, metric2: number, metValue: number, isCardio: boolean = false) => {
    // Legacy / Fallback wrapper
    const stats = loadUserStats();
    const bw = stats.bodyWeight > 0 ? stats.bodyWeight : 75;
    
    if (isCardio) {
        const durationHours = metric2 / 60;
        return Math.round((metValue * bw * durationHours) * 10) / 10;
    } else {
        // Use generic values if specific params aren't passed (fallback)
        // Assume RPE 8, Standard Tempo
        const res = calculateHypertrophyCalories(metric1, metric2, 8, {phases: [], startDelay:0}, 'PERFECT', bw, false);
        return res.total;
    }
};

export const saveExerciseLog = (exerciseId: string, weight: number, reps: number, setNumber: number, rpe?: number, tempoRating?: TempoRating) => {
  const key = getKey(BASE_KEYS.HISTORY);
  const historyRaw = localStorage.getItem(key);
  const history = historyRaw ? JSON.parse(historyRaw) : {};
  if (!history[exerciseId]) history[exerciseId] = [];
  const newLog: HistoryLog = {
    date: getTodayString(),
    weight,
    reps,
    setNumber,
    rpe,
    tempoRating
  };
  history[exerciseId].push(newLog);
  localStorage.setItem(key, JSON.stringify(history));
  completePendingExercise(exerciseId);
};

export const getExerciseHistory = (exerciseId: string): ExerciseHistory | null => {
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
  if (!historyRaw) return null;
  const fullHistory = JSON.parse(historyRaw);
  const logs = fullHistory[exerciseId] as HistoryLog[] || [];
  if (logs.length === 0) return null;
  const today = getTodayString();
  const previousLogs = logs.filter(l => l.date !== today);
  let lastSession = undefined;
  if (previousLogs.length > 0) {
    previousLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastDate = previousLogs[0].date;
    const lastDateLogs = previousLogs.filter(l => l.date === lastDate);
    lastDateLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    const bestLog = lastDateLogs[0];
    lastSession = {
      date: lastDate,
      topSet: { weight: bestLog.weight, reps: bestLog.reps, rpe: bestLog.rpe, tempoRating: bestLog.tempoRating }
    };
  }
  return {
    logs: logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    lastSession
  };
};

// ... (Rest of existing functions unchanged: getUniqueWorkoutDates, getLogsForDate, checkPlateau, etc.) ...
// Ensure other exports like getUniqueWorkoutDates are preserved below.

// Get all dates where ANY workout was performed
export const getUniqueWorkoutDates = (): Set<string> => {
    const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
    if (!historyRaw) return new Set();
    const fullHistory = JSON.parse(historyRaw);
    const dates = new Set<string>();
    
    Object.values(fullHistory).forEach((logs: any) => {
        if (Array.isArray(logs)) {
            logs.forEach(log => {
                if (log.date) dates.add(log.date);
            });
        }
    });
    return dates;
};

// Get a summary of what was done on a specific date
export const getLogsForDate = (dateStr: string): { exerciseName: string; sets: number; bestSet: string }[] => {
    const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
    if (!historyRaw) return [];
    const fullHistory = JSON.parse(historyRaw);
    const summary: { exerciseName: string; sets: number; bestSet: string }[] = [];

    Object.keys(fullHistory).forEach(exId => {
        const logs = (fullHistory[exId] as HistoryLog[]).filter(l => l.date === dateStr);
        if (logs.length > 0) {
            const exDef = ALL_EXERCISES.find(e => e.id === exId) || { name: 'Unknown Exercise', type: 'weighted' };
            const isCardio = (exDef as any).type === 'cardio';
            
            // Find best set
            let bestSet = '';
            if (isCardio) {
                const maxDist = Math.max(...logs.map(l => l.weight));
                const totalTime = logs.reduce((sum, l) => sum + l.reps, 0);
                bestSet = `${maxDist}km / ${totalTime}min`;
            } else {
                const maxWeight = Math.max(...logs.map(l => l.weight));
                bestSet = `${maxWeight}kg`;
            }

            summary.push({
                exerciseName: exDef.name,
                sets: logs.length,
                bestSet
            });
        }
    });
    return summary;
};

export const checkPlateau = (exerciseId: string): { isStalled: boolean; recommendation: string | null } => {
  const exercise = ALL_EXERCISES.find(e => e.id === exerciseId);
  if (exercise?.isWarmup) return { isStalled: false, recommendation: null };
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
  if (!historyRaw) return { isStalled: false, recommendation: null };
  const fullHistory = JSON.parse(historyRaw);
  const logs = fullHistory[exerciseId] as HistoryLog[] || [];
  if (logs.length < 2) return { isStalled: false, recommendation: null };
  const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const uniqueDates = Array.from(new Set(sortedLogs.map(l => l.date)));
  const today = getTodayString();
  const historicalDates = uniqueDates.filter(d => d !== today);
  if (historicalDates.length < 2) return { isStalled: false, recommendation: null };
  const session1Date = historicalDates[0];
  const session2Date = historicalDates[1];
  const getTopSet = (date: string) => {
    const sessionLogs = sortedLogs.filter(l => l.date === date);
    sessionLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    return sessionLogs[0];
  };
  const topSet1 = getTopSet(session1Date);
  const topSet2 = getTopSet(session2Date);
  if (!topSet1 || !topSet2) return { isStalled: false, recommendation: null };
  if (topSet1.weight === topSet2.weight && topSet1.reps <= topSet2.reps) {
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
  if (currentUserId) {
      localStorage.removeItem(getKey(BASE_KEYS.SESSION));
      localStorage.removeItem(getKey(BASE_KEYS.STATS));
      localStorage.removeItem(getKey(BASE_KEYS.HISTORY));
      localStorage.removeItem(getKey(BASE_KEYS.CALIBRATION));
      localStorage.removeItem(getKey(BASE_KEYS.NOTES));
      localStorage.removeItem(getKey(BASE_KEYS.SKIPPED));
      localStorage.removeItem(getKey(BASE_KEYS.PENDING));
      localStorage.removeItem(getKey(BASE_KEYS.NUTRITION));
  }
  window.location.reload();
};

export const saveCalibration = (data: MotionCalibration) => {
  const key = getKey(BASE_KEYS.CALIBRATION);
  const raw = localStorage.getItem(key);
  const db = raw ? JSON.parse(raw) : {};
  db[data.exerciseId] = data;
  localStorage.setItem(key, JSON.stringify(db));
};

export const getCalibration = (exerciseId: string): MotionCalibration | null => {
  const raw = localStorage.getItem(getKey(BASE_KEYS.CALIBRATION));
  if (!raw) return null;
  const db = JSON.parse(raw);
  return db[exerciseId] || null;
};

export const getDashboardStats = (): DashboardStats => {
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
  const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
  const weeklyVolume: Record<string, number> = {
    Chest: 0, Back: 0, Legs: 0, Shoulders: 0, Triceps: 0, Biceps: 0, Abs: 0, Cardio: 0
  };
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); 
  startOfWeek.setHours(0,0,0,0);
  const personalRecords: Record<string, { weight: number; exerciseName: string; date: string }> = {};
  let bestLift: { weight: number; exerciseName: string } | null = null;
  let totalCaloriesBurned = 0;
  Object.keys(fullHistory).forEach(exerciseId => {
    const logs = fullHistory[exerciseId] as HistoryLog[];
    let exerciseDef = ALL_EXERCISES.find(e => e.id === exerciseId);
    if (!exerciseDef) {
       exerciseDef = { 
         id: exerciseId, name: 'Exercise', type: 'weighted', sets: 3, reps: '10', 
         restSeconds: 60, cues: '', muscleFocus: 'Custom', targetGroup: 'Other', feeling: '', 
         pacer: { phases: [], startDelay: 0 }, metValue: 4 
       } as any;
    }
    if (exerciseDef?.isWarmup) return;
    let maxWeight = 0;
    let prDate = '';
    logs.forEach(log => {
      if (log.weight > maxWeight && exerciseDef?.type === 'weighted') {
        maxWeight = log.weight;
        prDate = log.date;
      }
      if (new Date(log.date) >= startOfWeek) {
         if (exerciseDef?.targetGroup && weeklyVolume[exerciseDef.targetGroup] !== undefined) {
            weeklyVolume[exerciseDef.targetGroup]++;
         }
         const isCardio = exerciseDef?.type === 'cardio';
         // Use existing calc for history aggregation, but we might want to store the real value in HistoryLog in future
         // For now, re-calculating using old method for stats, or ideally use saved 'calories' if available
         // Let's assume HistoryLog has calories property in future, but for now fallback to calc
         const setCals = calculateCalories(log.weight, log.reps, exerciseDef?.metValue || 4, isCardio);
         totalCaloriesBurned += setCals;
      }
    });
    if (maxWeight > 0 && exerciseDef?.type === 'weighted') {
      personalRecords[exerciseId] = { weight: maxWeight, exerciseName: exerciseDef?.name || 'Exercise', date: prDate };
      if (!bestLift || maxWeight > bestLift.weight) {
        bestLift = { weight: maxWeight, exerciseName: exerciseDef?.name || 'Exercise' };
      }
    }
  });
  const trackedMuscles: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Abs'];
  const missedMuscles = trackedMuscles.filter(m => weeklyVolume[m] === 0);
  const nutritionLogs = getNutritionLogs();
  const weekNutritionLogs = nutritionLogs.filter(l => new Date(l.date) >= startOfWeek);
  const totalCaloriesIn = weekNutritionLogs.reduce((sum, log) => sum + log.calories, 0);
  const recentLogs = nutritionLogs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 20);
  return {
    weeklyVolume,
    missedMuscles,
    personalRecords,
    bestLift,
    totalCaloriesBurned: Math.round(totalCaloriesBurned),
    totalCaloriesIn: Math.round(totalCaloriesIn),
    nutritionLogs: recentLogs
  };
};

const mapMuscleToKey = (detailedName: string): string => {
    const n = detailedName.toLowerCase();
    if (n.includes('upper chest')) return 'chest_upper';
    if (n.includes('lower chest') || n.includes('costal') || n.includes('mid chest') || n.includes('inner chest') || n.includes('chest')) return 'chest_lower';
    if (n.includes('front delt')) return 'shoulders_front';
    if (n.includes('side delt')) return 'shoulders_side';
    if (n.includes('rear delt')) return 'shoulders_rear';
    if (n.includes('shoulder')) return 'shoulders_front';
    if (n.includes('lat')) return 'lats';
    if (n.includes('lower back') || n.includes('erector')) return 'back_lower';
    if (n.includes('trap')) return 'traps';
    if (n.includes('upper back') || n.includes('mid back') || n.includes('rhomboid') || n.includes('teres') || n.includes('back')) return 'back_upper';
    if (n.includes('long head triceps') || n.includes('tricep')) return 'triceps';
    if (n.includes('bicep') || n.includes('brachialis')) return 'biceps';
    if (n.includes('forearm') || n.includes('wrist') || n.includes('brachioradialis')) return 'forearms';
    if (n.includes('oblique')) return 'obliques';
    if (n.includes('abs') || n.includes('core')) return 'abs';
    if (n.includes('quad')) return 'quads';
    if (n.includes('hamstring')) return 'hamstrings';
    if (n.includes('glute')) return 'glutes';
    if (n.includes('calf') || n.includes('soleus') || n.includes('gastro')) return 'calves';
    return 'other';
};

export const getMuscleHeatmapData = (): Record<string, { hours: number; volume: number }> => {
    const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
    const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
    const muscleStats: Record<string, { lastLog: number, volume: number }> = {};
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    Object.keys(fullHistory).forEach(exId => {
        const logs = fullHistory[exId] as HistoryLog[];
        if (logs.length === 0) return;
        const exDef = ALL_EXERCISES.find(e => e.id === exId);
        if (!exDef || !exDef.muscleSplit) return;
        const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        sortedLogs.forEach(log => {
            const logDate = new Date(log.date);
            const logTime = logDate.getTime();
            Object.keys(exDef.muscleSplit!).forEach(mName => {
                const percentage = exDef.muscleSplit![mName] || 0;
                if (percentage < 10) return; 
                const key = mapMuscleToKey(mName);
                if (key === 'other') return;
                if (!muscleStats[key]) muscleStats[key] = { lastLog: 0, volume: 0 };
                if (logTime > muscleStats[key].lastLog) {
                    muscleStats[key].lastLog = logTime;
                }
                if (logTime > oneWeekAgo) {
                    const setVol = log.weight * log.reps * (percentage / 100);
                    muscleStats[key].volume += setVol;
                }
            });
        });
    });
    const result: Record<string, { hours: number; volume: number }> = {};
    const commonKeys = [
        'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'shoulders_rear',
        'lats', 'back_upper', 'back_lower', 'traps', 
        'biceps', 'triceps', 'forearms', 
        'abs', 'obliques', 
        'quads', 'hamstrings', 'glutes', 'calves'
    ];
    commonKeys.forEach(k => {
        if (muscleStats[k]) {
            const diffMs = now - muscleStats[k].lastLog;
            const hours = muscleStats[k].lastLog === 0 ? Infinity : diffMs / (1000 * 60 * 60);
            result[k] = { hours, volume: Math.round(muscleStats[k].volume) };
        } else {
            result[k] = { hours: Infinity, volume: 0 };
        }
    });
    return result;
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

export const getSessionSummary = (session: SessionData): ReceiptData => {
  const startTime = session.startTime;
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);
  const durationStr = `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  const dateStr = new Date(startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  let totalVolume = 0;
  const exercisesSummary: ReceiptData['exercises'] = [];
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
  const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
  const today = getTodayString();
  Object.entries(session.completedExercises).forEach(([exId, logs]) => {
    if (logs.length === 0) return;
    let exerciseName = "Unknown Exercise";
    let isCardio = false;
    let foundEx = session.customExercises?.find(e => e.id === exId);
    if (!foundEx) {
        foundEx = ALL_WORKOUTS.flatMap(w => w.exercises).find(e => e.id === exId);
    }
    if (foundEx) {
        exerciseName = foundEx.name;
        isCardio = foundEx.type === 'cardio';
    }
    let bestWeight = 0;
    logs.forEach(l => {
        if (!isCardio) {
            totalVolume += l.weight * l.reps;
        } else {
             totalVolume += l.weight; 
        }
        if (l.weight > bestWeight) bestWeight = l.weight;
    });
    const prevHistory = (fullHistory[exId] as HistoryLog[]) || [];
    const historicalLogs = prevHistory.filter(h => h.date !== today);
    const historicalBest = historicalLogs.reduce((max, h) => h.weight > max ? h.weight : max, 0);
    const isPR = !isCardio && bestWeight > historicalBest && historicalBest > 0;
    exercisesSummary.push({
        name: exerciseName,
        sets: logs.length,
        bestWeight,
        isPR,
        isCardio
    });
  });
  const quotes = [
      "Light weight, baby!", "Yeah buddy!", "Ain't nothing but a peanut.", "Go hard or go home.",
      "Pain is weakness leaving the body.", "Discipline equals freedom.", "One more rep.",
      "The only bad workout is the one that didn't happen."
  ];
  return {
      date: dateStr,
      duration: durationStr,
      totalVolume: Math.round(totalVolume),
      exercises: exercisesSummary,
      quote: quotes[Math.floor(Math.random() * quotes.length)]
  };
};

export const getProgressionRecommendation = (exercise: Exercise): CoachRecommendation => {
    const history = getExerciseHistory(exercise.id);
    if (!history || !history.lastSession) {
        return { type: 'BASELINE', targetWeight: 0, targetReps: exercise.reps, reason: "Establish baseline." };
    }
    const lastTop = history.lastSession.topSet;
    const repMatch = exercise.reps.match(/(\d+)/);
    const targetRepsInt = repMatch ? parseInt(repMatch[0]) : 10;
    if (lastTop.rpe && lastTop.rpe <= 7) {
        return { type: 'INCREASE', targetWeight: lastTop.weight + 2.5, targetReps: exercise.reps, reason: `Last session was RPE ${lastTop.rpe} (Easy). Time to add weight.` };
    }
    if (lastTop.reps >= targetRepsInt + 2) {
         return { type: 'INCREASE', targetWeight: lastTop.weight + 2.5, targetReps: exercise.reps, reason: `You exceeded the rep target (${lastTop.reps} vs ${targetRepsInt}). Level up.` };
    }
    if ((lastTop.rpe && lastTop.rpe >= 9.5 && lastTop.reps < targetRepsInt) || lastTop.reps < targetRepsInt - 2) {
        return { type: 'DECREASE', targetWeight: Math.max(0, lastTop.weight - 2.5), targetReps: exercise.reps, reason: "Hit failure early last time. Pull back slightly to recover form." };
    }
    return { type: 'MAINTAIN', targetWeight: lastTop.weight, targetReps: exercise.reps, reason: "Good intensity. Consolidate gains at this weight." };
};

export const analyzeSetPerformance = (exercise: Exercise, weight: number, reps: number): string => {
    const repMatch = exercise.reps.match(/(\d+)/);
    const targetRepsInt = repMatch ? parseInt(repMatch[0]) : 10;
    if (reps >= targetRepsInt + 4) return "Way too light! Add weight immediately.";
    if (reps >= targetRepsInt + 2) return "Strong! You can handle more weight.";
    if (reps >= targetRepsInt) return "Target hit. Good job.";
    if (reps < targetRepsInt - 3) return "Struggling? Rest longer or drop weight.";
    return "Solid effort.";
};
