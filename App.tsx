
import React, { useState, useEffect } from 'react';
import { WORKOUT_SCHEDULE, ALL_WORKOUTS } from './constants';
import { SessionData, UserStats, DAYS_OF_WEEK, Exercise } from './types';
import { loadSession, saveSession, loadUserStats, saveUserStats, saveExerciseLog, clearAllData, getTodayString, getDashboardStats, getCreatineStats, calculateCalories, getMuscleHeatmapData, getSessionSummary, ReceiptData } from './services/storageService';
import ExerciseCard from './components/ExerciseCard';
import WorkoutView from './components/WorkoutView';
import Timer from './components/Timer';
import StatsView from './components/StatsView';
import BodyHeatmap from './components/BodyHeatmap';
import WorkoutReceipt from './components/WorkoutReceipt';
import { Droplets, Trophy, Battery, UserCircle2, ArrowRight, Settings, Trash2, Edit2, BarChart3, ArrowLeft, Flame, Clock } from 'lucide-react';

const App: React.FC = () => {
  // Lazy load state to prevent reading localStorage on every render and fix flash
  const [currentSession, setCurrentSession] = useState<SessionData | null>(() => loadSession());
  const [userStats, setUserStats] = useState<UserStats>(() => loadUserStats());
  
  // Initialize view based on current session state immediately
  const [view, setView] = useState<'HOME' | 'WORKOUT' | 'SETTINGS' | 'STATS'>(() => {
    const session = loadSession();
    return (session && !session.isFinished) ? 'WORKOUT' : 'HOME';
  });
  
  const [todayIndex] = useState(new Date().getDay());
  
  // New: Override the automatic day selection
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [bestLift, setBestLift] = useState<{weight: number, exerciseName: string} | null>(null);
  const [weeklyCalories, setWeeklyCalories] = useState(0);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  // Session Timer State
  const [elapsedTime, setElapsedTime] = useState(0);

  // Load dashboard stats on mount
  useEffect(() => {
    const stats = getDashboardStats();
    setBestLift(stats.bestLift);
    setWeeklyCalories(stats.totalCalories);
    setHeatmapData(getMuscleHeatmapData());
  }, []);

  // Save session whenever it changes
  useEffect(() => {
    saveSession(currentSession);
  }, [currentSession]);

  // Save stats whenever they change
  useEffect(() => {
    saveUserStats(userStats);
  }, [userStats]);

  // Session Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (view === 'WORKOUT' && currentSession && !currentSession.isFinished) {
        // Set initial
        setElapsedTime(Math.floor((Date.now() - currentSession.startTime) / 1000));
        
        interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - currentSession.startTime) / 1000));
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, currentSession?.startTime, currentSession?.isFinished]);

  // Determine which workout plan to use
  const getActivePlan = () => {
    // 1. Critical Fix: If a session is active, ALWAYS load that plan to prevent data mismatch on refresh
    if (currentSession && !currentSession.isFinished && currentSession.workoutId) {
        const sessionPlan = ALL_WORKOUTS.find(w => w.id === currentSession.workoutId);
        if (sessionPlan) return sessionPlan;
    }

    // 2. Manual selection
    if (selectedWorkoutId) {
      return ALL_WORKOUTS.find(w => w.id === selectedWorkoutId) || null;
    }

    // 3. Default schedule
    return WORKOUT_SCHEDULE[todayIndex];
  };

  const activePlan = getActivePlan();

  const handleStartWorkout = () => {
    if (!activePlan) return;

    const newSession: SessionData = {
      workoutId: activePlan.id,
      startTime: Date.now(),
      completedExercises: {},
      customExercises: [], // Initialize custom array
      activeExerciseId: null,
      activeTimer: null,
      isFinished: false,
      swaps: {}
    };
    setCurrentSession(newSession);
    setView('WORKOUT');
  };

  const handleSelectExercise = (id: string) => {
    if (!currentSession) return;
    setCurrentSession({ ...currentSession, activeExerciseId: id });
  };

  const handleBackToWorkoutList = () => {
    if (!currentSession) return;
    setCurrentSession({ ...currentSession, activeExerciseId: null });
  };

  const handleAddCustomExercise = (ex: Exercise) => {
      if (!currentSession) return;
      setCurrentSession({
          ...currentSession,
          customExercises: [...(currentSession.customExercises || []), ex]
      });
  };

  const handleSwapExercise = (originalId: string, newId: string) => {
    if (!currentSession) return;
    const newSwaps = { ...(currentSession.swaps || {}) };
    // If swapping back to original, remove the key
    if (originalId === newId) {
        delete newSwaps[originalId];
    } else {
        newSwaps[originalId] = newId;
    }
    setCurrentSession({
        ...currentSession,
        swaps: newSwaps
    });
  };

  const handleLogSet = (metric1: number, metric2: number, isDropSet: boolean = false, isMonsterSet: boolean = false, rpe?: number) => {
    if (!currentSession || !currentSession.activeExerciseId || !activePlan) return;
    
    const exerciseId = currentSession.activeExerciseId;
    
    // Check in Plan (account for swaps), Custom exercises
    let exercise: Exercise | undefined;
    
    // Check customs first
    exercise = currentSession.customExercises?.find(e => e.id === exerciseId);
    
    if (!exercise) {
        // Check Plan exercises (and their alternatives)
        for (const ex of activePlan.exercises) {
            if (ex.id === exerciseId) {
                exercise = ex;
                break;
            }
            // Check if it matches a swap ID
            if (ex.alternatives) {
                const alt = ex.alternatives.find(a => a.id === exerciseId);
                if (alt) {
                    exercise = alt;
                    break;
                }
            }
        }
    }
    
    if (!exercise) return;

    // Calculate Calories (Metric1=Weight/Dist, Metric2=Reps/Time)
    const isCardio = exercise.type === 'cardio';
    const calories = calculateCalories(metric1, metric2, exercise.metValue, isCardio);

    // Save to session state
    const updatedCompleted = { ...currentSession.completedExercises };
    if (!updatedCompleted[exerciseId]) {
        updatedCompleted[exerciseId] = [];
    }
    
    const setNumber = updatedCompleted[exerciseId].length + 1;
    updatedCompleted[exerciseId].push({
      weight: metric1, // Or Distance
      reps: metric2,   // Or Time
      rpe,             // NEW: Store RPE
      completed: true,
      timestamp: Date.now(),
      isDropSet,
      isMonsterSet,
      calories
    });

    // Save persistent history log
    saveExerciseLog(exerciseId, metric1, metric2, setNumber, rpe);

    // Start Timer logic 
    // UPDATE: Now we trigger the timer even on the last set to serve as a "Transition Timer"
    // to the next exercise, unless it is a Drop/Monster Set (which needs no rest).
    
    const skipTimer = isDropSet || isMonsterSet;

    let newTimer = null;
    if (exercise.restSeconds > 0 && !skipTimer) {
      newTimer = {
        startTime: Date.now(),
        duration: exercise.restSeconds,
        endTime: Date.now() + (exercise.restSeconds * 1000),
        exerciseId: exerciseId
      };
    }

    setCurrentSession({
      ...currentSession,
      completedExercises: updatedCompleted,
      activeTimer: newTimer
    });
  };

  const handleFinishWorkout = () => {
    if (!currentSession) return;
    setCurrentSession({ ...currentSession, isFinished: true });
  };

  const handleCompleteWorkoutSummary = () => {
    setCurrentSession(null);
    setView('HOME');
    // Refresh stats
    const stats = getDashboardStats();
    setBestLift(stats.bestLift);
    setWeeklyCalories(stats.totalCalories);
    setHeatmapData(getMuscleHeatmapData());
  };

  const cancelTimer = () => {
    if (!currentSession) return;
    setCurrentSession({ ...currentSession, activeTimer: null });
  };

  const updateWater = (amount: number) => {
    const newAmount = userStats.waterIntake + amount;
    setUserStats({ ...userStats, waterIntake: newAmount });
  };

  const toggleCreatine = () => {
    const isTaken = !userStats.creatineTaken;
    const today = getTodayString();
    
    let newHistory = [...userStats.creatineHistory];
    
    if (isTaken) {
      if (!newHistory.includes(today)) {
        newHistory.push(today);
      }
    } else {
      newHistory = newHistory.filter(d => d !== today);
    }
    
    setUserStats({ 
      ...userStats, 
      creatineTaken: isTaken,
      creatineHistory: newHistory
    });
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
    
    // 1. Get List of Exercises (Original + Swaps + Customs)
    const effectiveExercises = activePlan.exercises.map(ex => {
       const swapId = currentSession.swaps?.[ex.id];
       if (swapId && ex.alternatives) {
           return ex.alternatives.find(a => a.id === swapId) || ex;
       }
       return ex;
    }).concat(currentSession.customExercises || []);
    
    let remainingSeconds = 0;
    
    effectiveExercises.forEach(ex => {
        const completedCount = currentSession.completedExercises[ex.id]?.length || 0;
        const setsLeft = Math.max(0, ex.sets - completedCount);
        
        if (setsLeft > 0) {
            const isCardio = ex.type === 'cardio';
            // Estimate duration per set
            let setDuration = 45; // Default lifting under tension
            if (isCardio) {
                 // Try to parse '10 mins'
                 const match = ex.reps.match(/(\d+)/);
                 if (match) setDuration = parseInt(match[0]) * 60;
            }
            
            // Add Rest Time (Rest applies after set)
            remainingSeconds += setsLeft * (setDuration + ex.restSeconds);
        }
    });

    if (remainingSeconds === 0) return "Finishing...";

    const endTime = new Date(Date.now() + remainingSeconds * 1000);
    return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const creatineStats = getCreatineStats(userStats.creatineHistory);

  // --- RENDER: STATS VIEW ---
  if (view === 'STATS') {
    return <StatsView onBack={() => setView('HOME')} />;
  }

  // --- RENDER: WORKOUT ACTIVE ---
  if (view === 'WORKOUT' && currentSession) {
    if (currentSession.isFinished) {
      // SUMMARY VIEW (RECEIPT)
      return (
          <WorkoutReceipt 
             data={getSessionSummary(currentSession)} 
             onClose={handleCompleteWorkoutSummary} 
          />
      );
    }

    // Helper to find the active exercise object
    // Safe lookup: activePlan might be null if day changed, but activeSession persists logic via getActivePlan()
    const planExercises = activePlan ? activePlan.exercises : [];
    // We need to resolve swaps for the active exercise ID lookup
    let activeExercise: Exercise | undefined = undefined;

    if (currentSession.activeExerciseId) {
        const id = currentSession.activeExerciseId;
        // Check customs
        activeExercise = currentSession.customExercises?.find(e => e.id === id);
        
        if (!activeExercise && activePlan) {
            // Check plan exercises + alternatives
             for (const ex of activePlan.exercises) {
                if (ex.id === id) { activeExercise = ex; break; }
                if (ex.alternatives) {
                    const alt = ex.alternatives.find(a => a.id === id);
                    if (alt) { activeExercise = alt; break; }
                }
            }
        }
    }

    // ACTIVE WORKOUT VIEWS
    return (
      <div className="min-h-screen bg-gym-900 text-white p-4 flex flex-col max-w-md mx-auto relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 z-10 bg-gym-900/90 backdrop-blur pb-2 border-b border-gym-800 sticky top-0">
           <button onClick={handleCompleteWorkoutSummary} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest">
             Exit
           </button>
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
            onBack={handleBackToWorkoutList}
          />
        ) : activePlan ? (
          <WorkoutView 
            plan={activePlan}
            session={currentSession}
            onSelectExercise={handleSelectExercise}
            onFinishWorkout={handleFinishWorkout}
            onAddCustomExercise={handleAddCustomExercise}
            onSwapExercise={handleSwapExercise}
          />
        ) : null}

        {/* Global Timer Overlay */}
        {currentSession.activeTimer && (
          <Timer 
            activeTimer={currentSession.activeTimer} 
            onCancel={cancelTimer}
            onComplete={cancelTimer}
          />
        )}
      </div>
    );
  }

  if (view === 'SETTINGS') {
    return (
      <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="rotate-180" />
          </button>
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        
        <div className="space-y-6">
          <div className="bg-gym-800 p-4 rounded-xl border border-gym-700">
            <h3 className="font-bold mb-2 text-red-400 flex items-center gap-2">
              <Trash2 size={18} /> Danger Zone
            </h3>
            <p className="text-sm text-gray-400 mb-4">Reset all progress, history, and stats. This cannot be undone.</p>
            <button 
              onClick={() => { if(confirm("Are you sure? This will delete all history.")) clearAllData(); }}
              className="w-full py-3 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 font-bold uppercase text-sm"
            >
              Reset All Data
            </button>
          </div>
          
          <div className="text-sm text-gray-500 p-4">
             <p className="mb-2 font-bold text-gray-300">How to Install (Local):</p>
             <ol className="list-decimal pl-4 space-y-2">
               <li>Open in Chrome/Safari on mobile.</li>
               <li>Tap "Share" (iOS) or Menu (Android).</li>
               <li>Select "Add to Home Screen".</li>
               <li>App will work offline and save data.</li>
             </ol>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DASHBOARD (HOME) ---
  return (
    <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto font-sans flex flex-col">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white italic">IRON<span className="text-gym-accent">GUIDE</span></h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase">Hypertrophy Blueprint</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('STATS')} className="w-10 h-10 rounded-full bg-gym-800 flex items-center justify-center border border-gym-700 hover:bg-gym-700 text-gym-accent">
             <BarChart3 size={20} />
          </button>
          <button onClick={() => setView('SETTINGS')} className="w-10 h-10 rounded-full bg-gym-800 flex items-center justify-center border border-gym-700 hover:bg-gym-700">
             <UserCircle2 className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Best Lift */}
        <div className="bg-gym-800/30 rounded-lg p-3 border border-gym-700">
           <div className="flex items-center gap-2 mb-2">
             <Trophy size={14} className="text-yellow-500" />
             <p className="text-[10px] text-gray-400 uppercase font-bold">Best Lift</p>
           </div>
           {bestLift ? (
               <div>
                  <p className="text-sm font-bold text-white truncate">{bestLift.exerciseName}</p>
                  <p className="text-lg font-black text-gym-accent italic">{bestLift.weight}kg</p>
               </div>
           ) : (
               <p className="text-xs text-gray-500 italic">No logs yet</p>
           )}
        </div>

        {/* Calories Burned */}
        <div className="bg-gym-800/30 rounded-lg p-3 border border-gym-700">
           <div className="flex items-center gap-2 mb-2">
             <Flame size={14} className="text-orange-500" />
             <p className="text-[10px] text-gray-400 uppercase font-bold">Week Burn</p>
           </div>
           <div>
              <p className="text-sm font-bold text-white">Total Energy</p>
              <p className="text-lg font-black text-orange-400 italic">{weeklyCalories} kcal</p>
           </div>
        </div>
      </div>

      {/* BODY HEATMAP (Visual Recovery) */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
          <BodyHeatmap recoveryStatus={heatmapData} />
      </div>

      {/* Main Workout Card */}
      <div className="mb-8 flex-1">
        <div className="flex justify-between items-baseline mb-3">
          <div className="flex gap-2 items-center">
            <h2 className="text-gray-400 text-sm uppercase font-bold tracking-wider">
               {selectedWorkoutId ? 'Custom Plan' : DAYS_OF_WEEK[todayIndex]}
            </h2>
            <button 
              onClick={() => setShowWorkoutSelector(!showWorkoutSelector)}
              className="text-xs text-gym-accent flex items-center gap-1 hover:underline"
            >
              <Edit2 size={10} /> Change
            </button>
          </div>
          <span className="text-xs text-gym-accent font-mono">{getTodayString()}</span>
        </div>

        {/* Manual Workout Selector Dropdown */}
        {showWorkoutSelector && (
          <div className="mb-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2">
            {ALL_WORKOUTS.map(w => (
              <button 
                key={w.id}
                onClick={() => { setSelectedWorkoutId(w.id); setShowWorkoutSelector(false); }}
                className={`p-3 rounded-lg text-left text-sm font-bold border transition-all flex items-center justify-between
                  ${(selectedWorkoutId === w.id) || (!selectedWorkoutId && WORKOUT_SCHEDULE[todayIndex]?.id === w.id) 
                    ? 'bg-gym-accent text-white border-blue-400' 
                    : 'bg-gym-800 text-gray-400 border-gym-700 hover:bg-gym-700'
                  }`}
              >
                {w.name}
                {(selectedWorkoutId === w.id) || (!selectedWorkoutId && WORKOUT_SCHEDULE[todayIndex]?.id === w.id) ? <CheckCircleIcon /> : null}
              </button>
            ))}
             <button 
                onClick={() => { setSelectedWorkoutId(null); setShowWorkoutSelector(false); }}
                className="text-xs text-center text-gray-500 py-1"
             >
               Reset to Schedule
             </button>
          </div>
        )}
        
        {activePlan ? (
          <div className="bg-gradient-to-br from-gym-800 to-gym-900 border border-gym-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-2 leading-none">{activePlan.name.split(':')[0]}</h3>
              <p className="text-sm text-gray-300 mb-6 font-medium border-l-2 border-gym-accent pl-3 py-1">
                {activePlan.focus}
              </p>
              
              <div className="flex items-center gap-6 text-sm text-gray-400 mb-8">
                 <div className="flex flex-col">
                   <span className="font-bold text-white text-xl">{activePlan.exercises.length}</span>
                   <span className="text-[10px] uppercase tracking-wide">Exercises</span>
                 </div>
                 <div className="w-px h-8 bg-gym-700"></div>
                 <div className="flex flex-col">
                   <span className="font-bold text-white text-xl">~50</span>
                   <span className="text-[10px] uppercase tracking-wide">Minutes</span>
                 </div>
              </div>

              <button 
                onClick={handleStartWorkout}
                className="w-full py-4 bg-gym-accent hover:bg-blue-600 active:scale-95 transition-all text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-lg"
              >
                Start Workout <ArrowRight size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gym-800 border border-gym-700 rounded-2xl p-8 text-center opacity-80 flex flex-col items-center justify-center h-64">
            <Battery className="text-gym-success mb-4" size={40} />
            <h3 className="text-2xl font-bold text-white mb-2">Rest & Grow</h3>
            <p className="text-gray-400 mb-4 max-w-[200px]">"Muscle is built in the recovery, not the gym."</p>
            <button 
               onClick={() => setShowWorkoutSelector(true)}
               className="text-sm text-gym-accent underline"
            >
              Do a workout anyway
            </button>
          </div>
        )}
      </div>

      {/* Protocols Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Advanced Water Tracker */}
        <div className="bg-gym-800 rounded-xl p-4 border border-gym-700 flex flex-col justify-between h-48 relative overflow-hidden shadow-lg">
           <div 
             className="absolute bottom-0 left-0 right-0 bg-blue-500/10 transition-all duration-700 ease-out"
             style={{ height: `${Math.min((userStats.waterIntake / 4000) * 100, 100)}%` }}
           ></div>
           
           <div className="relative z-10 flex justify-between items-start mb-2">
             <div className="p-2 bg-gym-900/50 rounded-lg">
               <Droplets size={20} className="text-blue-400" />
             </div>
             <span className="text-[10px] font-mono text-gray-400 uppercase">Goal: 4L</span>
           </div>
           
           <div className="relative z-10 text-center mb-2">
             <div className="text-2xl font-bold text-white">{userStats.waterIntake}<span className="text-sm font-normal text-gray-500">ml</span></div>
           </div>
           
           <div className="relative z-10 grid grid-cols-3 gap-1">
             <button 
               onClick={() => updateWater(30)}
               className="bg-blue-900/40 hover:bg-blue-800 text-blue-200 text-[10px] py-2 rounded font-bold border border-blue-500/20"
             >
               Sip
             </button>
             <button 
               onClick={() => updateWater(100)}
               className="bg-blue-900/40 hover:bg-blue-800 text-blue-200 text-[10px] py-2 rounded font-bold border border-blue-500/20"
             >
               Gulp
             </button>
             <button 
               onClick={() => updateWater(250)}
               className="bg-blue-900/40 hover:bg-blue-800 text-blue-200 text-[10px] py-2 rounded font-bold border border-blue-500/20"
             >
               Glass
             </button>
           </div>
        </div>

        {/* Creatine Tracker */}
        <button 
          onClick={toggleCreatine}
          className={`rounded-xl p-4 border cursor-pointer transition-all h-48 flex flex-col justify-between shadow-lg group relative overflow-hidden ${userStats.creatineTaken ? 'bg-gym-success/10 border-gym-success/30' : 'bg-gym-800 border-gym-700'}`}
        >
           {userStats.creatineTaken && <div className="absolute inset-0 bg-gym-success/5 animate-pulse"></div>}
           <div className="flex justify-between items-start relative z-10">
             <div className={`p-2 rounded-lg transition-colors ${userStats.creatineTaken ? 'bg-gym-success/20' : 'bg-gym-900/50'}`}>
               <Battery size={20} className={userStats.creatineTaken ? 'text-gym-success' : 'text-gray-400'} />
             </div>
           </div>
           
           <div className="relative z-10 text-left">
             <div className={`text-xl font-bold transition-colors ${userStats.creatineTaken ? 'text-gym-success' : 'text-gray-300'}`}>
               {userStats.creatineTaken ? 'Taken' : 'Creatine'}
             </div>
             
             {/* New Detailed Stats */}
             <div className="flex gap-2 mt-3">
               <div className="flex flex-col">
                 <span className="text-[10px] text-gray-500 uppercase">Week</span>
                 <span className="text-sm font-bold text-white">{creatineStats.thisWeek}/7</span>
               </div>
               <div className="w-px bg-gray-700"></div>
               <div className="flex flex-col">
                 <span className="text-[10px] text-gray-500 uppercase">Month</span>
                 <span className="text-sm font-bold text-white">{creatineStats.thisMonth}</span>
               </div>
             </div>
             <div className={`mt-2 h-1 rounded-full w-full ${userStats.creatineTaken ? 'bg-gym-success' : 'bg-gray-700'}`}></div>
           </div>
        </button>
      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

export default App;
