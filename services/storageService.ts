
import { SessionData, UserStats, ExerciseHistory, HistoryLog, DashboardStats, MuscleGroup, Exercise, CoachRecommendation, MotionCalibration, UserProfile, SkippedEntry, PendingExercise } from '../types';
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
  CALIBRATION: 'iron_guide_calibration_v1',
  NOTES: 'iron_guide_notes_v1',
  SKIPPED: 'iron_guide_skipped_v1', // Track skip history
  PENDING: 'iron_guide_pending_v1', // Track rescheduled items
};

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
  // Reload page is often safest to reset all state hooks, but we can try to manage it via App state
};

export const getCurrentUser = (): UserProfile | null => {
  if (!currentUserId) return null;
  const users = getUsers();
  return users.find(u => u.id === currentUserId) || null;
};

export const deleteUser = (userId: string) => {
  // Remove registry entry
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(GLOBAL_KEYS.USERS_REGISTRY, JSON.stringify(users));
  
  // Remove all prefixed keys
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

// --- LEGACY MIGRATION ---
// Moves data from "root" keys to a new "Default User" if no users exist
export const checkAndMigrateLegacyData = (): boolean => {
  const users = getUsers();
  if (users.length > 0) return false; // Already have users, no auto-migration

  // Check if legacy data exists
  const hasHistory = localStorage.getItem(BASE_KEYS.HISTORY);
  const hasStats = localStorage.getItem(BASE_KEYS.STATS);

  if (hasHistory || hasStats) {
    // Create default user
    const defaultUser = createUser("Default User");
    currentUserId = defaultUser.id;
    localStorage.setItem(GLOBAL_KEYS.ACTIVE_USER_ID, defaultUser.id);

    // Helper to move key
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
    return true; // Migration happened
  }
  return false;
};

// --- BACKUP & RESTORE ---

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
        
        // Basic validation
        if (!json.userProfile || !json.data) {
          alert("Invalid backup file format.");
          return resolve(false);
        }

        // Determine target user ID (Current active user)
        if (!currentUserId) {
           alert("Please log in to a user before restoring.");
           return resolve(false);
        }

        // Restore Data keys to CURRENT user (overwriting)
        if (json.data.session) localStorage.setItem(getKey(BASE_KEYS.SESSION), json.data.session);
        if (json.data.stats) localStorage.setItem(getKey(BASE_KEYS.STATS), json.data.stats);
        if (json.data.history) localStorage.setItem(getKey(BASE_KEYS.HISTORY), json.data.history);
        if (json.data.calibration) localStorage.setItem(getKey(BASE_KEYS.CALIBRATION), json.data.calibration);
        if (json.data.notes) localStorage.setItem(getKey(BASE_KEYS.NOTES), json.data.notes);
        if (json.data.skipped) localStorage.setItem(getKey(BASE_KEYS.SKIPPED), json.data.skipped);
        if (json.data.pending) localStorage.setItem(getKey(BASE_KEYS.PENDING), json.data.pending);

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


// --- CORE STORAGE FUNCTIONS (Updated to use getKey) ---

// Dynamically aggregate all exercises from the new schedule
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

// --- NOTES FEATURE ---
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

// --- SKIPPING & PENDING LOGIC ---

export const saveSkippedExercise = (exerciseId: string, reason: string, targetWorkoutId?: string) => {
    const today = getTodayString();
    
    // 1. Save to Skipped History
    const skippedKey = getKey(BASE_KEYS.SKIPPED);
    const skippedRaw = localStorage.getItem(skippedKey);
    const skippedList: SkippedEntry[] = skippedRaw ? JSON.parse(skippedRaw) : [];
    
    skippedList.push({ exerciseId, date: today, reason });
    localStorage.setItem(skippedKey, JSON.stringify(skippedList));

    // 2. Add to Pending if rescheduled
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
    const today = getTodayString();
    
    if (currentWorkoutId) {
        // Return items specifically scheduled for this workout
        return list.filter(item => item.targetWorkoutId === currentWorkoutId);
    } else {
        // Fallback: Return items scheduled for today's date (Legacy logic)
        return list.filter(item => item.targetDate && item.targetDate <= today);
    }
};

export const completePendingExercise = (exerciseId: string) => {
    const key = getKey(BASE_KEYS.PENDING);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    
    let list: PendingExercise[] = JSON.parse(raw);
    // Remove completed item (filter out match)
    list = list.filter(item => item.exerciseId !== exerciseId);
    
    localStorage.setItem(key, JSON.stringify(list));
};

export const wasSkippedLastSession = (exerciseId: string): boolean => {
    const key = getKey(BASE_KEYS.SKIPPED);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    
    const list: SkippedEntry[] = JSON.parse(raw);
    
    // Filter for this exercise
    const mySkips = list.filter(s => s.exerciseId === exerciseId);
    if (mySkips.length === 0) return false;
    
    // Sort descending by date
    mySkips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastSkip = mySkips[0];
    const skipDate = new Date(lastSkip.date);
    const now = new Date();
    
    // Check if it was within the last 14 days (approx last "week" or session cycle)
    const diffTime = Math.abs(now.getTime() - skipDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return diffDays <= 14;
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
  const key = getKey(BASE_KEYS.HISTORY);
  const historyRaw = localStorage.getItem(key);
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
  
  localStorage.setItem(key, JSON.stringify(history));
  
  // Also clear pending if it exists
  completePendingExercise(exerciseId);
};

export const getExerciseHistory = (exerciseId: string): ExerciseHistory | null => {
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
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
  // WARMUP EXCLUSION
  const exercise = ALL_EXERCISES.find(e => e.id === exerciseId);
  if (exercise?.isWarmup) return { isStalled: false, recommendation: null };

  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
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
  // Only clear current user data
  if (currentUserId) {
      localStorage.removeItem(getKey(BASE_KEYS.SESSION));
      localStorage.removeItem(getKey(BASE_KEYS.STATS));
      localStorage.removeItem(getKey(BASE_KEYS.HISTORY));
      localStorage.removeItem(getKey(BASE_KEYS.CALIBRATION));
      localStorage.removeItem(getKey(BASE_KEYS.NOTES));
      localStorage.removeItem(getKey(BASE_KEYS.SKIPPED));
      localStorage.removeItem(getKey(BASE_KEYS.PENDING));
  }
  window.location.reload();
};

// --- Calibration Logic ---

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

// --- Analytics ---

export const getDashboardStats = (): DashboardStats => {
  const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
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

    // Skip warmups in PR/Analytics calc
    if (exerciseDef?.isWarmup) return;

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
    
    // --- CHEST ---
    if (n.includes('upper chest')) return 'chest_upper';
    if (n.includes('lower chest') || n.includes('costal') || n.includes('mid chest') || n.includes('inner chest') || n.includes('chest')) return 'chest_lower';
    
    // --- SHOULDERS ---
    if (n.includes('front delt')) return 'shoulders_front';
    if (n.includes('side delt')) return 'shoulders_side';
    if (n.includes('rear delt')) return 'shoulders_rear';
    if (n.includes('shoulder')) return 'shoulders_front'; // Default fallback
    
    // --- BACK ---
    if (n.includes('lat')) return 'lats';
    if (n.includes('lower back') || n.includes('erector')) return 'back_lower';
    if (n.includes('trap')) return 'traps';
    if (n.includes('upper back') || n.includes('mid back') || n.includes('rhomboid') || n.includes('teres') || n.includes('back')) return 'back_upper';
    
    // --- ARMS ---
    if (n.includes('long head triceps') || n.includes('tricep')) return 'triceps';
    if (n.includes('bicep') || n.includes('brachialis')) return 'biceps';
    if (n.includes('forearm') || n.includes('wrist') || n.includes('brachioradialis')) return 'forearms';
    
    // --- CORE ---
    if (n.includes('oblique')) return 'obliques';
    if (n.includes('abs') || n.includes('core')) return 'abs';
    
    // --- LEGS ---
    if (n.includes('quad')) return 'quads';
    if (n.includes('hamstring')) return 'hamstrings';
    if (n.includes('glute')) return 'glutes';
    if (n.includes('calf') || n.includes('soleus') || n.includes('gastro')) return 'calves';
    
    return 'other';
};

export const getMuscleHeatmapData = (): Record<string, { hours: number; volume: number }> => {
    const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
    const fullHistory = historyRaw ? JSON.parse(historyRaw) : {};
    
    // Store last log time (ms) and weekly volume (kg)
    const muscleStats: Record<string, { lastLog: number, volume: number }> = {};
    
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    Object.keys(fullHistory).forEach(exId => {
        const logs = fullHistory[exId] as HistoryLog[];
        if (logs.length === 0) return;
        
        const exDef = ALL_EXERCISES.find(e => e.id === exId);
        if (!exDef || !exDef.muscleSplit) return;
        
        // Sort logs desc
        const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Check all logs for volume calculation within last week
        sortedLogs.forEach(log => {
            const logDate = new Date(log.date);
            const logTime = logDate.getTime();
            
            // Iterate over all muscles involved in this exercise
            Object.keys(exDef.muscleSplit!).forEach(mName => {
                const percentage = exDef.muscleSplit![mName] || 0;
                if (percentage < 10) return; // Ignore minimal stabilizers

                const key = mapMuscleToKey(mName);
                if (key === 'other') return;

                if (!muscleStats[key]) muscleStats[key] = { lastLog: 0, volume: 0 };

                // Update Last Trained Time (if this log is more recent)
                if (logTime > muscleStats[key].lastLog) {
                    muscleStats[key].lastLog = logTime;
                }

                // Add Volume if within last 7 days
                if (logTime > oneWeekAgo) {
                    // Volume = Weight * Reps * Sets(1) * Participation %
                    // Note: This iterates per set log in history, so we just add it up
                    const setVol = log.weight * log.reps * (percentage / 100);
                    muscleStats[key].volume += setVol;
                }
            });
        });
    });
    
    // Convert to final format
    const result: Record<string, { hours: number; volume: number }> = {};
    
    // Set defaults for common groups so they aren't undefined
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
            // If never trained (lastLog=0), diff is huge.
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
  // WARMUP EXCLUSION
  if (exercise.isWarmup) {
      return { type: 'BASELINE', targetWeight: 0, targetReps: exercise.reps, reason: "Warmup set." };
  }

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
    const historyRaw = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
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
        let isWarmup = false;
        
        // Check standard
        let exDef = ALL_EXERCISES.find(e => e.id === exId);
        // Check custom
        if (!exDef) exDef = session.customExercises.find(e => e.id === exId);
        
        if (exDef) {
            name = exDef.name;
            isCardio = exDef.type === 'cardio';
            isWarmup = !!exDef.isWarmup;
        }

        // FILTER: Skip warmups in receipt
        if (isWarmup) continue;

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
