
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORKOUT_SCHEDULE, ALL_WORKOUTS } from './constants';
import { SessionData, UserStats, DAYS_OF_WEEK, Exercise, UserProfile, TempoRating } from './types';
import { loadSession, saveSession, loadUserStats, saveUserStats, saveExerciseLog, clearAllData, getTodayString, getDashboardStats, getCreatineStats, calculateCalories, getMuscleHeatmapData, getSessionSummary, checkAndMigrateLegacyData, getCurrentUser, switchUser, exportUserData, importUserData, logNutrition, getUniqueWorkoutDates, syncDataToSupabase, fetchFromSupabase, restoreFromSupabaseData } from './services/storageService';
import ExerciseCard from './components/ExerciseCard';
import WorkoutView from './components/WorkoutView';
import Timer from './components/Timer';
import StatsView from './components/StatsView';
import BodyHeatmap from './components/BodyHeatmap';
import WorkoutReceipt from './components/WorkoutReceipt';
import LoginScreen from './components/LoginScreen';
import HelpView from './components/HelpView';
import CalendarView from './components/CalendarView';
import NutritionLogger from './components/NutritionLogger';
import { Droplets, Trophy, Battery, UserCircle2, ArrowRight, Settings, Trash2, Edit2, BarChart3, ArrowLeft, Flame, Clock, LogOut, Download, Upload, HelpCircle, Utensils, Plus, X, Calendar, Cloud } from 'lucide-react';

const App: React.FC = () => {
  // User Management State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // App State (Lazy initialized only if user exists)
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [view, setView] = useState<'HOME' | 'WORKOUT' | 'SETTINGS' | 'STATS' | 'HELP' | 'CALENDAR'>('HOME');
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Dashboard Data
  const [bestLift, setBestLift] = useState<{weight: number, exerciseName: string} | null>(null);
  const [weeklyBurned, setWeeklyBurned] = useState(0);
  const [weeklyIn, setWeeklyIn] = useState(0);
  // UPDATED TYPE: now stores object with hours and volume
  const [heatmapData, setHeatmapData] = useState<Record<string, { hours: number; volume: number }>>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  
  const [todayIndex] = useState(new Date().getDay());
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Nutrition Input State
  const [showNutritionModal, setShowNutritionModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Check for legacy data and migrate if needed
    checkAndMigrateLegacyData();

    // 2. Check for logged in user
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadUserData();
    }
  }, []);

  const loadUserData = () => {
    // Load all data specific to the current user (storageService handles the keys now)
    const session = loadSession();
    setCurrentSession(session);
    setUserStats(loadUserStats());
    
    // If session is active, go to workout view
    if (session && !session.isFinished) {
      setView('WORKOUT');
    } else {
      setView('HOME');
    }

    refreshDashboard();
  };

  const refreshDashboard = () => {
    const stats = getDashboardStats();
    setBestLift(stats.bestLift);
    setWeeklyBurned(stats.totalCaloriesBurned);
    setWeeklyIn(stats.totalCaloriesIn);
    setHeatmapData(getMuscleHeatmapData());
    
    // Calculate simple streak for home screen (full logic in Calendar)
    const dates = getUniqueWorkoutDates();
    let streakCount = 0;
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    // Check today
    if (dates.has(checkDate.toISOString().split('T')[0])) streakCount++;
    // Check past
    checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 30; i++) {
        const iso = checkDate.toISOString().split('T')[0];
        if (dates.has(iso)) streakCount++;
        else if (checkDate.getDay() !== 0) break; // If not Sunday and missed, break
        checkDate.setDate(checkDate.getDate() - 1);
    }
    setCurrentStreak(streakCount);
  };

  // Sync view state with browser history to intercept back button
  useEffect(() => {
    // Only push state if we are navigating away from HOME
    if (view !== 'HOME') {
        window.history.pushState({ view }, '');
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
        // When user clicks the hardware back button
        if (view === 'WORKOUT') {
            // Prevent going back immediately
            window.history.pushState({ view: 'WORKOUT' }, ''); 
            
            // If they are deep inside an exercise, just go back to workout list
            if (currentSession?.activeExerciseId) {
                setCurrentSession({ ...currentSession, activeExerciseId: null });
            } else {
                // If they are on the workout list, show the exit confirmation modal
                setShowExitModal(true);
            }
        } else {
            // For other views like SETTINGS, CALENDAR, STATS, go back to HOME
            setView('HOME');
        }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, currentSession]);

  // Save session effect
  useEffect(() => {
    if (currentUser) saveSession(currentSession);
  }, [currentSession, currentUser]);

  // Save stats effect
  useEffect(() => {
    if (currentUser && userStats) saveUserStats(userStats);
  }, [userStats, currentUser]);

  // Session Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (view === 'WORKOUT' && currentSession && !currentSession.isFinished) {
        setElapsedTime(Math.floor((Date.now() - currentSession.startTime) / 1000));
        interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - currentSession.startTime) / 1000));
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, currentSession?.startTime, currentSession?.isFinished]);

  // --- HANDLERS ---

  const handleLogin = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUserData();
  };

  const handleLogout = () => {
    import('./services/supabase').then(({ supabase }) => {
        supabase.auth.signOut().catch(console.error);
    });
    setCurrentUser(null);
    setCurrentSession(null);
    setUserStats(null);
    switchUser(''); // Clear active user in storage
    window.location.reload();
  };

  const handleBackup = () => {
    exportUserData();
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await importUserData(file);
      if (success) {
        alert("Data restored successfully! The app will reload.");
        window.location.reload();
      }
    }
  };

  const handleCloudBackup = async () => {
     const result = await syncDataToSupabase();
     alert(result.message);
  };

  const handleCloudRestore = async () => {
     const result = await fetchFromSupabase();
     if (result.success && result.data) {
         const success = restoreFromSupabaseData(result.data);
         if (success) {
            alert("Data restored from Cloud! The app will reload.");
            window.location.reload();
         } else {
            alert("Failed to restore data from Cloud.");
         }
     } else {
         alert(result.message || "Failed to fetch data from Cloud.");
     }
  };

  const handleLogNutrition = (calories: number, name: string, protein?: number, carbs?: number, fat?: number) => {
      logNutrition(calories, name, protein, carbs, fat);
      setShowNutritionModal(false);
      refreshDashboard();
  };

  // Determine active plan
  const getActivePlan = () => {
    if (currentSession && !currentSession.isFinished && currentSession.workoutId) {
        return ALL_WORKOUTS.find(w => w.id === currentSession.workoutId) || null;
    }
    if (selectedWorkoutId) return ALL_WORKOUTS.find(w => w.id === selectedWorkoutId) || null;
    return WORKOUT_SCHEDULE[todayIndex];
  };

  const activePlan = getActivePlan();

  const handleStartWorkout = () => {
    if (!activePlan) return;
    const newSession: SessionData = {
      workoutId: activePlan.id,
      startTime: Date.now(),
      completedExercises: {},
      customExercises: [],
      activeExerciseId: null,
      activeTimer: null,
      isFinished: false,
      swaps: {}
    };
    setCurrentSession(newSession);
    setView('WORKOUT');
  };

  const handleSelectExercise = (id: string) => {
    if (currentSession) setCurrentSession({ ...currentSession, activeExerciseId: id });
  };

  const handleBackToWorkoutList = () => {
    if (currentSession) setCurrentSession({ ...currentSession, activeExerciseId: null });
  };

  const handleAddCustomExercise = (ex: Exercise) => {
      if (currentSession) setCurrentSession({ ...currentSession, customExercises: [...(currentSession.customExercises || []), ex] });
  };

  const handleSwapExercise = (originalId: string, newId: string) => {
    if (!currentSession) return;
    const newSwaps = { ...(currentSession.swaps || {}) };
    if (originalId === newId) delete newSwaps[originalId];
    else newSwaps[originalId] = newId;
    setCurrentSession({ ...currentSession, swaps: newSwaps });
  };

  const handleLogSet = (metric1: number, metric2: number, isDropSet: boolean = false, isMonsterSet: boolean = false, rpe?: number, tempoRating?: TempoRating) => {
    handleLogSets([{ metric1, metric2, isDropSet, isMonsterSet, rpe, tempoRating }]);
  };

  const handleLogSets = (sets: {metric1: number, metric2: number, isDropSet?: boolean, isMonsterSet?: boolean, rpe?: number, tempoRating?: TempoRating}[]) => {
    if (!currentSession || !currentSession.activeExerciseId || !activePlan) return;
    
    const exerciseId = currentSession.activeExerciseId;
    let exercise: Exercise | undefined = currentSession.customExercises?.find(e => e.id === exerciseId);
    
    if (!exercise) {
        for (const ex of activePlan.exercises) {
            if (ex.id === exerciseId) { exercise = ex; break; }
            if (ex.alternatives?.find(a => a.id === exerciseId)) { exercise = ex.alternatives.find(a => a.id === exerciseId); break; }
        }
    }
    if (!exercise) return;

    const isCardio = exercise.type === 'cardio';
    
    // We must use functional state update because we might be batching
    setCurrentSession(prevSession => {
        if (!prevSession) return null;
        
        const updatedCompleted = { ...prevSession.completedExercises };
        if (!updatedCompleted[exerciseId]) updatedCompleted[exerciseId] = [];
        
        let newTimer = prevSession.activeTimer;
        
        sets.forEach((set, index) => {
            const calories = calculateCalories(set.metric1, set.metric2, exercise.metValue, isCardio);
            const setNumber = updatedCompleted[exerciseId].length + 1;
            
            updatedCompleted[exerciseId].push({
              weight: set.metric1, reps: set.metric2, rpe: set.rpe, tempoRating: set.tempoRating, completed: true,
              timestamp: Date.now() + index * 1000, isDropSet: set.isDropSet, isMonsterSet: set.isMonsterSet, calories
            });

            saveExerciseLog(exerciseId, set.metric1, set.metric2, setNumber, set.rpe, set.tempoRating);

            const skipTimer = set.isDropSet || set.isMonsterSet;
            if (exercise.restSeconds > 0 && !skipTimer && index === sets.length - 1) { // Only set timer for the last set added
              newTimer = {
                startTime: Date.now(),
                duration: exercise.restSeconds,
                endTime: Date.now() + (exercise.restSeconds * 1000),
                exerciseId: exerciseId
              };
            } else if (skipTimer || index < sets.length - 1) {
              newTimer = null;
            }
        });

        return { ...prevSession, completedExercises: updatedCompleted, activeTimer: newTimer };
    });
  };

  const handleFinishWorkout = () => {
    if (currentSession) setCurrentSession({ ...currentSession, isFinished: true });
  };

  const handleCompleteWorkoutSummary = () => {
    setCurrentSession(null);
    setView('HOME');
    refreshDashboard();
  };

  const cancelTimer = () => {
    if (currentSession) setCurrentSession({ ...currentSession, activeTimer: null });
  };

  const updateWater = (amount: number) => {
    if (userStats) setUserStats({ ...userStats, waterIntake: userStats.waterIntake + amount });
  };

  const toggleCreatine = () => {
    if (!userStats) return;
    const isTaken = !userStats.creatineTaken;
    const today = getTodayString();
    let newHistory = [...userStats.creatineHistory];
    if (isTaken) { if (!newHistory.includes(today)) newHistory.push(today); } 
    else { newHistory = newHistory.filter(d => d !== today); }
    setUserStats({ ...userStats, creatineTaken: isTaken, creatineHistory: newHistory });
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
    return `${m}:${s<10?'0':''}${s}`;
  };

  const getProjectedEndTime = () => {
    if (!activePlan || !currentSession) return null;
    const effectiveExercises = activePlan.exercises.map(ex => {
       const swapId = currentSession.swaps?.[ex.id];
       return (swapId && ex.alternatives?.find(a => a.id === swapId)) || ex;
    }).concat(currentSession.customExercises || []);
    
    let remainingSeconds = 0;
    effectiveExercises.forEach(ex => {
        const completedCount = currentSession.completedExercises[ex.id]?.length || 0;
        const setsLeft = Math.max(0, ex.sets - completedCount);
        if (setsLeft > 0) {
            let setDuration = 45;
            if (ex.type === 'cardio') {
                 const match = ex.reps.match(/(\d+)/);
                 if (match) setDuration = parseInt(match[0]) * 60;
            }
            remainingSeconds += setsLeft * (setDuration + ex.restSeconds);
        }
    });
    if (remainingSeconds === 0) return "Finishing...";
    return new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER LOGIC ---

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (view === 'CALENDAR') {
      return <CalendarView onBack={() => { setView('HOME'); refreshDashboard(); }} />;
  }

  if (view === 'STATS') {
    return <StatsView onBack={() => setView('HOME')} />;
  }

  if (view === 'HELP') {
    return <HelpView onBack={() => setView('HOME')} />;
  }

  if (view === 'WORKOUT' && currentSession) {
    if (currentSession.isFinished) {
      return <WorkoutReceipt data={getSessionSummary(currentSession)} onClose={handleCompleteWorkoutSummary} />;
    }

    let activeExercise: Exercise | undefined = undefined;
    if (currentSession.activeExerciseId) {
        const id = currentSession.activeExerciseId;
        activeExercise = currentSession.customExercises?.find(e => e.id === id);
        if (!activeExercise && activePlan) {
             for (const ex of activePlan.exercises) {
                if (ex.id === id) { activeExercise = ex; break; }
                if (ex.alternatives?.find(a => a.id === id)) { activeExercise = ex.alternatives.find(a => a.id === id); break; }
            }
        }
    }

    return (
      <div className="min-h-screen bg-gym-900 text-white p-4 flex flex-col max-w-md mx-auto relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 z-10 bg-gym-900/90 backdrop-blur pb-2 border-b border-gym-800 sticky top-0">
           <button onClick={() => setShowExitModal(true)} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest">Exit</button>
           <div className="flex flex-col items-end">
             <div className="flex items-center gap-2">
                 <Clock size={12} className="text-gym-accent" />
                 <span className="font-mono font-bold text-sm text-white">{formatTime(elapsedTime)}</span>
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></div>
             </div>
             <span className="text-[10px] text-gray-500">Est. End: {getProjectedEndTime() || '--:--'}</span>
           </div>
        </div>
        {activeExercise ? (
          <ExerciseCard 
            exercise={activeExercise}
            completedSets={currentSession.completedExercises[activeExercise.id] || []}
            onLogSet={handleLogSet}
            onLogSets={handleLogSets}
            onBack={handleBackToWorkoutList}
            onUpdateWater={updateWater} // Pass the hydration function
          />
        ) : activePlan ? (
          <WorkoutView 
            plan={activePlan}
            session={currentSession}
            onSelectExercise={handleSelectExercise}
            onFinishWorkout={handleFinishWorkout}
            onAddCustomExercise={handleAddCustomExercise}
            onSwapExercise={handleSwapExercise}
            onAutocompleteDay={() => {
                const exercisesToFill = activePlan.exercises.map(ex => {
                   const swapId = currentSession.swaps?.[ex.id];
                   return (swapId && ex.alternatives?.find(a => a.id === swapId)) || ex;
                }).concat(currentSession.customExercises || []);

                let tempSession = { ...currentSession };
                
                // Hacky way to simulate filling all. A better way would be using context 
                // but let's just do a manual override here to instantly finish them.
                const newCompleted = { ...tempSession.completedExercises };
                exercisesToFill.forEach(ex => {
                    const existingCount = newCompleted[ex.id]?.length || 0;
                    const needed = Math.max(0, ex.sets - existingCount);
                    if (!newCompleted[ex.id]) newCompleted[ex.id] = [];
                    for(let i=0; i<needed; i++) {
                        const targetReps = ex.reps.match(/(\d+)/) ? parseInt(ex.reps.match(/(\d+)/)![0]) : 10;
                        newCompleted[ex.id].push({
                            weight: 20, reps: targetReps, rpe: 8, tempoRating: 'PERFECT',
                            completed: true, timestamp: Date.now(), isDropSet: false, isMonsterSet: false, calories: 10
                        });
                        saveExerciseLog(ex.id, 20, targetReps, existingCount + i + 1, 8, 'PERFECT');
                    }
                });
                setCurrentSession({ ...tempSession, completedExercises: newCompleted });
            }}
          />
        ) : null}
        {currentSession.activeTimer && <Timer activeTimer={currentSession.activeTimer} onCancel={cancelTimer} onComplete={cancelTimer} />}
        
        {showExitModal && (
          <div className="fixed inset-0 z-[70] bg-gym-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
             <div className="bg-gym-800 border border-gym-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                 <h3 className="text-xl font-bold text-white mb-2">Leave Workout?</h3>
                 <p className="text-gray-400 text-sm mb-6">You can minimize it to run in the background, or end it completely and lose your today's active progress.</p>
                 <div className="space-y-3">
                     <button onClick={() => { setView('HOME'); setShowExitModal(false); refreshDashboard(); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors">Keep Running (Minimize)</button>
                     <button onClick={() => { setCurrentSession(null); setView('HOME'); setShowExitModal(false); refreshDashboard(); }} className="w-full py-3 bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-500/30 hover:border-red-500/50 rounded-lg font-bold text-sm transition-colors">End & Discard Progress</button>
                     <button onClick={() => setShowExitModal(false)} className="w-full py-3 text-gray-400 hover:text-white rounded-lg font-bold text-sm transition-colors">Cancel</button>
                 </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'SETTINGS') {
    return (
      <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white"><ArrowLeft className="rotate-180" /></button>
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        
        <div className="space-y-6">
          {/* User Profile */}
          <div className="bg-gym-800 p-4 rounded-xl border border-gym-700">
             <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-gym-900 rounded-full text-gym-accent"><UserCircle2 size={24}/></div>
               <div>
                 <p className="text-xs text-gray-500 font-bold uppercase">Current Athlete</p>
                 <p className="text-xl font-bold text-white">{currentUser.name}</p>
               </div>
             </div>
             <button onClick={handleLogout} className="w-full py-2 bg-gym-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gym-600"><LogOut size={16}/> Switch User / Logout</button>
          </div>

          {/* Backup & Restore */}
          <div className="bg-gym-800 p-4 rounded-xl border border-gym-700">
            <h3 className="font-bold mb-4 text-white flex items-center gap-2">Data Management</h3>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={handleBackup} className="py-3 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg font-bold text-sm flex flex-col items-center gap-1 hover:bg-blue-600/30">
                  <Download size={20} /> Backup Data
               </button>
               <button onClick={handleRestoreClick} className="py-3 bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded-lg font-bold text-sm flex flex-col items-center gap-1 hover:bg-orange-600/30">
                  <Upload size={20} /> Restore Data
               </button>
               <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
               <button onClick={handleCloudBackup} className="py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-lg font-bold text-sm flex flex-col items-center gap-1 hover:bg-indigo-600/30">
                  <Cloud size={20} /> Cloud Sync
               </button>
               <button onClick={handleCloudRestore} className="py-3 bg-teal-600/20 text-teal-400 border border-teal-600/30 rounded-lg font-bold text-sm flex flex-col items-center gap-1 hover:bg-teal-600/30">
                  <Cloud size={20} /> Cloud Fetch
               </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Backups are specific to {currentUser.name}.</p>
          </div>

          {/* Danger Zone */}
          <div className="bg-gym-800 p-4 rounded-xl border border-gym-700">
            <h3 className="font-bold mb-2 text-red-400 flex items-center gap-2"><Trash2 size={18} /> Danger Zone</h3>
            <p className="text-sm text-gray-400 mb-4">Reset all progress for <strong>{currentUser.name}</strong>. Cannot be undone.</p>
            <button onClick={() => { if(confirm("Are you sure?")) clearAllData(); }} className="w-full py-3 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 font-bold uppercase text-sm">Reset Profile Data</button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DASHBOARD (HOME) ---
  return (
    <div className="min-h-screen grid-bg bg-gym-900 text-white pb-20 safe-pb font-sans flex flex-col relative overflow-hidden">
      
      {/* NUTRITION MODAL */}
      <AnimatePresence>
        {showNutritionModal && (
            <NutritionLogger 
              onLog={handleLogNutrition} 
              onClose={() => setShowNutritionModal(false)} 
            />
        )}
      </AnimatePresence>

      <div className="p-6 max-w-md mx-auto w-full">
        <header className="flex justify-between items-center mb-10 pt-4">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col">
            <h1 className="text-4xl font-display uppercase tracking-widest text-white leading-none">
              IRON<span className="text-gym-accent">GUIDE</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-2 bg-gym-800 brutal-border px-2 py-1 inline-flex self-start rounded-none transform -skew-x-6">
                <Flame size={14} className="text-gym-warning animate-pulse" fill="currentColor" />
                <span className="text-[10px] text-white font-mono font-bold tracking-wider uppercase">{currentStreak} Day Streak</span>
            </div>
          </motion.div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-2">
            <button onClick={() => setView('CALENDAR')} className="w-12 h-12 bg-gym-800 brutal-border flex items-center justify-center hover:bg-gym-accent hover:text-black transition-colors" title="Calendar"><Calendar size={20} /></button>
            <button onClick={() => setView('STATS')} className="w-12 h-12 bg-gym-800 brutal-border flex items-center justify-center hover:bg-gym-accent hover:text-black transition-colors"><BarChart3 size={20} /></button>
            <button onClick={() => setView('SETTINGS')} className="w-12 h-12 bg-gym-800 brutal-border flex items-center justify-center hover:bg-gym-accent hover:text-black transition-colors"><Settings size={20} /></button>
          </motion.div>
        </header>

        {/* Hero Stats */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="bg-gym-800 brutal-border brutal-shadow p-4 relative group">
             <div className="flex items-center gap-2 mb-3"><Trophy size={16} className="text-gym-accent" /><p className="text-[12px] text-gray-400 font-mono uppercase font-bold">Best Lift</p></div>
             {bestLift ? (<div><p className="text-sm font-bold text-white truncate">{bestLift.exerciseName}</p><p className="text-2xl font-display text-gym-accent mt-1">{bestLift.weight}kg</p></div>) : (<p className="text-xs text-gray-500 font-mono">No logs yet</p>)}
          </div>
          
          {/* ENERGY BALANCE CARD */}
          <div className="bg-gym-800 brutal-border brutal-shadow p-4 relative overflow-hidden group flex flex-col justify-between">
             <div className="flex items-center justify-between mb-3 relative z-10">
                 <div className="flex items-center gap-2"><Flame size={16} className="text-gym-warning" /><p className="text-[12px] text-gray-400 font-mono uppercase font-bold">Energy</p></div>
                 <button onClick={() => setShowNutritionModal(true)} className="p-1.5 bg-gym-900 border border-gym-700 hover:bg-gym-accent hover:text-black hover:border-black transition-colors"><Plus size={14} /></button>
             </div>
             <div className="relative z-10 flex justify-between items-end">
                 <div>
                     <p className="text-[10px] text-gym-warning font-mono uppercase mb-1">Burned</p>
                     <p className="text-xl font-display text-white">{weeklyBurned}</p>
                 </div>
                 <div className="h-8 w-px bg-gym-600 transform rotate-12"></div>
                 <div className="text-right">
                     <p className="text-[10px] text-gym-success font-mono uppercase mb-1">Intake</p>
                     <p className="text-xl font-display text-white">{weeklyIn}</p>
                 </div>
             </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <div className="brutal-border bg-gym-800 p-2"><BodyHeatmap recoveryStatus={heatmapData} /></div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mb-10 flex-1">
          <div className="flex justify-between items-baseline mb-4 bg-gym-900 brutal-border px-4 py-2">
            <div className="flex gap-4 items-center">
              <h2 className="text-white text-md font-mono uppercase font-bold tracking-widest">{selectedWorkoutId ? 'Custom Plan' : DAYS_OF_WEEK[todayIndex]}</h2>
              <button onClick={() => setShowWorkoutSelector(!showWorkoutSelector)} className="text-[10px] bg-gym-800 px-2 py-1 text-gym-accent font-mono uppercase flex items-center gap-1 hover:bg-gym-accent hover:text-black transition-colors border border-gym-600 hover:border-black">Change</button>
            </div>
            <span className="text-xs text-gym-accent font-mono">{getTodayString()}</span>
          </div>

          <AnimatePresence>
          {showWorkoutSelector && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mb-6 grid grid-cols-1 gap-2 overflow-hidden"
            >
              {ALL_WORKOUTS.map(w => (
                <button key={w.id} onClick={() => { setSelectedWorkoutId(w.id); setShowWorkoutSelector(false); }} className={`p-4 text-left text-sm font-mono uppercase font-bold brutal-border transition-all flex items-center justify-between ${(selectedWorkoutId === w.id) || (!selectedWorkoutId && WORKOUT_SCHEDULE[todayIndex]?.id === w.id) ? 'bg-gym-accent text-black brutal-shadow' : 'bg-gym-800 text-gray-400 hover:text-white hover:border-white'}`}>{w.name}</button>
              ))}
               <button onClick={() => { setSelectedWorkoutId(null); setShowWorkoutSelector(false); }} className="text-[10px] font-mono text-center text-gray-500 py-2 hover:text-white">Reset to Schedule</button>
            </motion.div>
          )}
          </AnimatePresence>
          
          {activePlan ? (
            <div className="bg-gym-accent text-black brutal-border brutal-shadow p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-black opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="text-5xl font-display uppercase leading-none mb-4">{activePlan.name.split(':')[0]}</h3>
                <p className="text-sm font-bold mb-8 border-l-4 border-black pl-3 py-1 uppercase">{activePlan.focus}</p>
                <div className="flex items-center gap-8 text-sm font-mono mb-10">
                   <div className="flex flex-col"><span className="font-display text-4xl leading-none">{activePlan.exercises.length}</span><span className="text-[10px] uppercase font-bold tracking-widest mt-1">Exercises</span></div>
                   <div className="w-1 h-12 bg-black/20 transform rotate-12"></div>
                   <div className="flex flex-col"><span className="font-display text-4xl leading-none">~50</span><span className="text-[10px] uppercase font-bold tracking-widest mt-1">Minutes</span></div>
                </div>
                <button onClick={handleStartWorkout} className="w-full py-5 bg-black text-white hover:bg-gym-800 transition-colors font-display text-2xl uppercase tracking-widest brutal-border flex items-center justify-center gap-3">Start Workout <ArrowRight size={24} /></button>
              </div>
            </div>
          ) : (
            <div className="bg-gym-800 brutal-border brutal-shadow p-10 text-center flex flex-col items-center justify-center">
              <Battery className="text-gym-success mb-6" size={48} />
              <h3 className="text-4xl font-display uppercase text-white mb-4">Rest & Grow</h3>
              <p className="text-gray-400 font-mono text-xs mb-8 max-w-[200px] uppercase leading-relaxed text-center">Muscle is built in the recovery, not the gym.</p>
              <button onClick={() => setShowWorkoutSelector(true)} className="text-xs font-mono font-bold text-gym-accent bg-gym-900 border border-gym-700 px-4 py-2 hover:bg-gym-accent hover:text-black transition-colors uppercase">Do a workout anyway</button>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 gap-4">
          <div className="bg-gym-800 brutal-border brutal-shadow p-4 flex flex-col justify-between h-56 relative overflow-hidden">
             <div className="absolute bottom-0 left-0 right-0 bg-blue-500/20 transition-all duration-700 ease-out" style={{ height: `${Math.min(((userStats?.waterIntake || 0) / 4000) * 100, 100)}%` }}></div>
             <div className="relative z-10 flex justify-between items-start mb-2"><div className="p-2 bg-gym-900 brutal-border"><Droplets size={20} className="text-blue-400" /></div><span className="text-[10px] font-mono text-gray-400 font-bold uppercase bg-gym-900 px-2 py-1 brutal-border">Goal: 4L</span></div>
             <div className="relative z-10 text-center my-4"><div className="text-4xl font-display text-white">{userStats?.waterIntake || 0}<span className="text-sm font-mono text-gray-500 ml-1">ml</span></div></div>
             <div className="relative z-10 grid grid-cols-3 gap-2">
               <button onClick={() => updateWater(30)} className="bg-gym-900 hover:bg-blue-600 hover:text-white text-blue-400 font-mono text-[10px] py-3 text-center border border-gym-700 font-bold transition-colors">Sip</button>
               <button onClick={() => updateWater(100)} className="bg-gym-900 hover:bg-blue-600 hover:text-white text-blue-400 font-mono text-[10px] py-3 text-center border border-gym-700 font-bold transition-colors">Gulp</button>
               <button onClick={() => updateWater(250)} className="bg-gym-900 hover:bg-blue-600 hover:text-white text-blue-400 font-mono text-[10px] py-3 text-center border border-gym-700 font-bold transition-colors">Glass</button>
             </div>
          </div>
          <button onClick={toggleCreatine} className={`p-4 border brutal-shadow transition-all h-56 flex flex-col justify-between group relative overflow-hidden ${userStats?.creatineTaken ? 'bg-gym-success text-black border-black' : 'bg-gym-800 border-gym-700 hover:border-gym-accent text-white'}`}>
             <div className="flex justify-between items-start relative z-10"><div className={`p-2 brutal-border transition-colors ${userStats?.creatineTaken ? 'bg-black text-gym-success' : 'bg-gym-900 text-gray-400'}`}><Battery size={20} /></div></div>
             <div className="relative z-10 text-left">
               <div className={`text-4xl font-display uppercase tracking-wider mb-2 ${userStats?.creatineTaken ? 'text-black' : 'text-white'}`}>{userStats?.creatineTaken ? 'Taken' : 'Creatine'}</div>
               <div className="flex gap-4 mt-4 font-mono">
                 <div className="flex flex-col"><span className={`text-[10px] uppercase font-bold ${userStats?.creatineTaken ? 'text-black/60' : 'text-gray-500'}`}>Week</span><span className={`text-lg font-bold ${userStats?.creatineTaken ? 'text-black' : 'text-white'}`}>{getCreatineStats(userStats?.creatineHistory || []).thisWeek}/7</span></div>
                 <div className={`w-0.5 transform rotate-12 ${userStats?.creatineTaken ? 'bg-black/20' : 'bg-gym-700'}`}></div>
                 <div className="flex flex-col"><span className={`text-[10px] uppercase font-bold ${userStats?.creatineTaken ? 'text-black/60' : 'text-gray-500'}`}>Month</span><span className={`text-lg font-bold ${userStats?.creatineTaken ? 'text-black' : 'text-white'}`}>{getCreatineStats(userStats?.creatineHistory || []).thisMonth}</span></div>
               </div>
             </div>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default App;
