
import React, { useState, useEffect } from 'react';
import { WorkoutDay, SessionData, ExerciseType, MuscleGroup, Exercise, MotionType, PacerConfig, PendingExercise } from '../types';
import { CheckCircle, ChevronRight, Layers, PlusCircle, Footprints, Dumbbell, Activity, Eye, Zap, Wrench, RefreshCw, Star, Flame, SkipForward, X, Calendar, AlertCircle } from 'lucide-react';
import { DEFAULT_PACER_STOPWATCH, ALL_WORKOUTS } from '../constants';
import { saveSkippedExercise, getPendingExercises, getTodayString } from '../services/storageService';

interface Props {
  plan: WorkoutDay;
  session: SessionData;
  onSelectExercise: (id: string) => void;
  onFinishWorkout: () => void;
  onAddCustomExercise: (ex: Exercise) => void;
  onSwapExercise?: (originalId: string, newId: string) => void;
  onAutocompleteDay?: () => void;
}

// Skip Modal Logic
interface SkipModalProps {
    exercise: Exercise;
    onClose: () => void;
    onConfirm: (reason: string, targetWorkoutId?: string) => void;
}

const SkipModal: React.FC<SkipModalProps> = ({ exercise, onClose, onConfirm }) => {
    const [reason, setReason] = useState<string>('');
    const [action, setAction] = useState<'SKIP' | 'RESCHEDULE'>('RESCHEDULE');
    const [targetWorkoutId, setTargetWorkoutId] = useState<string>(ALL_WORKOUTS[0]?.id || '');

    const reasons = ['Time Crunch', 'Injury / Pain', 'Equipment Busy', 'Fatigue', 'Other'];

    const handleConfirm = () => {
        if (!reason) return;
        
        if (action === 'RESCHEDULE') {
            onConfirm(reason, targetWorkoutId);
        } else {
            onConfirm(reason);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-gym-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-gym-800 border border-gym-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-1">Skip {exercise.name}?</h3>
                <p className="text-gray-400 text-sm mb-4">Select a reason to track your consistency.</p>
                
                <div className="space-y-2 mb-4">
                    {reasons.map(r => (
                        <button 
                            key={r}
                            onClick={() => setReason(r)}
                            className={`w-full text-left p-3 rounded-lg border text-sm font-bold transition-all ${reason === r ? 'bg-gym-accent text-white border-gym-accent' : 'bg-gym-900 border-gym-700 text-gray-400 hover:border-gray-500'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex bg-gym-900 rounded-lg p-1 mb-4 border border-gym-700">
                    <button onClick={() => setAction('RESCHEDULE')} className={`flex-1 py-2 text-xs font-bold rounded ${action === 'RESCHEDULE' ? 'bg-gym-700 text-white' : 'text-gray-500'}`}>Reschedule</button>
                    <button onClick={() => setAction('SKIP')} className={`flex-1 py-2 text-xs font-bold rounded ${action === 'SKIP' ? 'bg-red-900/50 text-red-200' : 'text-gray-500'}`}>Skip Entirely</button>
                </div>

                {action === 'RESCHEDULE' && (
                    <div className="mb-6">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Move To Plan</label>
                        <div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto no-scrollbar">
                            {ALL_WORKOUTS.map((w) => (
                                <button 
                                    key={w.id} 
                                    onClick={() => setTargetWorkoutId(w.id)}
                                    className={`p-2 rounded text-[10px] font-bold border text-left truncate ${targetWorkoutId === w.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gym-900 border-gym-700 text-gray-400'}`}
                                >
                                    {w.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold text-sm">Cancel</button>
                    <button onClick={handleConfirm} disabled={!reason} className="flex-1 py-3 bg-white text-gym-900 font-bold rounded-xl disabled:opacity-50">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const WorkoutView: React.FC<Props> = ({ plan, session, onSelectExercise, onFinishWorkout, onAddCustomExercise, onSwapExercise, onAutocompleteDay }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [exerciseToSkip, setExerciseToSkip] = useState<Exercise | null>(null);
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]); // Locally track skipped in this view

  // Fetch pending exercises on mount, filtering for THIS workout ID
  useEffect(() => {
      setPendingExercises(getPendingExercises(plan.id));
  }, [plan.id]);
  
  // Basic Info
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<ExerciseType>('weighted');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Other');
  
  // Advanced Info (Lifting Only)
  const [customMotion, setCustomMotion] = useState<MotionType>('press');
  const [customSetup, setCustomSetup] = useState('');
  const [customVisualize, setCustomVisualize] = useState('');
  const [customAction, setCustomAction] = useState('');
  const [customCues, setCustomCues] = useState('');

  // Merge plan exercises with custom ones for this session
  const displayExercises: Exercise[] = [...plan.exercises];
  
  // Map standard plan exercises to their swapped versions if applicable
  const renderedExercises = displayExercises.map(ex => {
      const swappedId = session.swaps?.[ex.id];
      if (swappedId && ex.alternatives) {
          const alt = ex.alternatives.find(a => a.id === swappedId);
          if (alt) return { ...alt, originalId: ex.id }; // Attach originalId to swap back
      }
      return { ...ex, originalId: ex.id };
  });

  // MERGE PENDING EXERCISES
  // We filter out pending items that are already in the session (customExercises) to avoid dupes
  const activePending = pendingExercises.filter(p => !session.customExercises.find(c => c.id === p.exerciseId));

  const fullList = [...renderedExercises, ...(session.customExercises || [])];

  const warmups = fullList.filter(e => e.isWarmup && !skippedIds.includes(e.id));
  const mainLifts = fullList.filter(e => !e.isWarmup && !skippedIds.includes(e.id));

  // Determine if all *visible* exercises are complete
  const isAllComplete = fullList.filter(e => !skippedIds.includes(e.id)).every(ex => {
    const logs = session.completedExercises[ex.id] || [];
    return logs.length >= ex.sets;
  });

  const getPacerForMotion = (motion: MotionType): PacerConfig => {
      switch (motion) {
          case 'press': 
          case 'hinge':
             return { startDelay: 3, phases: [
                { action: 'LOWER', duration: 3, voiceCue: 'Control Down', breathing: 'Inhale' },
                { action: 'STRETCH', duration: 1, voiceCue: 'Stretch', breathing: 'Hold' },
                { action: 'DRIVE', duration: 1, voiceCue: 'Explode Up', breathing: 'Exhale' }
             ]};
          case 'pull':
          case 'curl':
             return { startDelay: 3, phases: [
                { action: 'PULL', duration: 1, voiceCue: 'Pull Hard', breathing: 'Exhale' },
                { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' },
                { action: 'RELEASE', duration: 3, voiceCue: 'Slow Release', breathing: 'Inhale' }
             ]};
          case 'raise':
          case 'fly':
          case 'hold':
             return { startDelay: 3, phases: [
                { action: 'CONTRACT', duration: 1, voiceCue: 'Contract', breathing: 'Exhale' },
                { action: 'HOLD', duration: 2, voiceCue: 'Hold', breathing: 'Hold' },
                { action: 'RETURN', duration: 2, voiceCue: 'Control', breathing: 'Inhale' }
             ]};
          default:
             return { startDelay: 2, phases: [{ action: 'GO', duration: 1, voiceCue: 'Rep', breathing: 'Exhale' }] };
      }
  };

  const handleCreateExercise = () => {
      if (!customName) return;
      
      const isCardio = customType === 'cardio';

      const newEx: Exercise = {
          id: `custom_${Date.now()}`,
          name: customName,
          type: customType,
          sets: 3,
          reps: isCardio ? '10 mins' : '10',
          restSeconds: 60,
          cues: customCues || 'Custom Exercise',
          setup: customSetup,
          visualize: customVisualize,
          action: customAction,
          muscleFocus: customMuscle,
          targetGroup: customMuscle,
          feeling: 'N/A',
          metValue: isCardio ? 8 : 4,
          muscleSplit: { [customMuscle]: 100 }, 
          motionType: isCardio ? 'cardio' : customMotion,
          pacer: isCardio ? DEFAULT_PACER_STOPWATCH : getPacerForMotion(customMotion),
          isCompound: ['Chest', 'Back', 'Legs'].includes(customMuscle)
      };
      
      onAddCustomExercise(newEx);
      
      setIsAdding(false);
      setCustomName('');
      setCustomCues('');
      setCustomSetup('');
      setCustomVisualize('');
      setCustomAction('');
      setCustomMotion('press');
  };

  const handleSkipConfirm = (reason: string, targetWorkoutId?: string) => {
      if (!exerciseToSkip) return;
      
      saveSkippedExercise(exerciseToSkip.id, reason, targetWorkoutId);
      
      // Hide locally
      setSkippedIds([...skippedIds, exerciseToSkip.id]);
      setExerciseToSkip(null);
  };

  const handleAddPending = (pending: PendingExercise) => {
      // Find full definition from ALL_WORKOUTS import
      const allEx = ALL_WORKOUTS.flatMap(w => w.exercises);
      const found = allEx.find(e => e.id === pending.exerciseId);
      if (found) {
          const exerciseToAdd = { ...found, pendingReason: pending.reason };
          onAddCustomExercise(exerciseToAdd);
          // Remove from pending list locally
          setPendingExercises(prev => prev.filter(p => p.exerciseId !== pending.exerciseId));
      }
  };

  const muscleOptions: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Abs', 'Other'];
  const motionOptions: MotionType[] = ['press', 'pull', 'hinge', 'curl', 'raise', 'fly', 'hold'];

  const ExerciseItem: React.FC<{ exercise: Exercise, index: number }> = ({ exercise, index }) => {
      const logs = session.completedExercises[exercise.id] || [];
      const isComplete = logs.length >= exercise.sets;
      const isStarted = logs.length > 0 && !isComplete;
      const hasMonster = logs.some(l => l.isMonsterSet);
      const isCardio = exercise.type === 'cardio';
      
      const originalId = (exercise as any).originalId || exercise.id;
      const originalExercise = plan.exercises.find(e => e.id === originalId);
      const hasAlternatives = originalExercise?.alternatives && originalExercise.alternatives.length > 0;
      const isSwapped = originalId !== exercise.id;

      return (
        <div className="relative group mb-3">
            <button
            onClick={() => onSelectExercise(exercise.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between z-10 relative
                ${isComplete 
                ? 'bg-gym-800/40 border-gym-700 opacity-60' 
                : isStarted 
                    ? 'bg-gym-800 border-gym-accent/50 shadow-sm' 
                    : exercise.isWarmup ? 'bg-orange-900/10 border-orange-500/20 hover:border-orange-500/40' : 'bg-gym-800 border-gym-700 hover:border-gym-600'
                }
            `}
            >
            <div className="flex items-center gap-4">
                <div className={`font-mono text-sm w-4 ${exercise.isWarmup ? 'text-orange-500 font-bold' : 'text-gray-500'}`}>{index + 1}</div>
                <div>
                <h3 className={`font-bold ${isComplete ? 'text-gray-400 line-through' : exercise.isWarmup ? 'text-orange-100' : 'text-white'}`}>
                    {exercise.name}
                </h3>
                {exercise.pendingReason && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-300 font-bold uppercase tracking-wider">
                        <Calendar size={10} /> Pending: {exercise.pendingReason}
                    </div>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {isCardio && <Footprints size={12} className="text-blue-400"/>}
                    <p className={`text-xs ${exercise.isWarmup ? 'text-orange-400/70' : 'text-gray-400'}`}>
                        {logs.length}/{exercise.sets} Sets • {exercise.reps} {isCardio ? '' : 'Reps'}
                    </p>
                    {hasMonster && <span className="text-[10px] px-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center gap-0.5"><Layers size={8}/> Monster</span>}
                    {isSwapped && <span className="text-[10px] px-1 rounded bg-gym-accent/20 text-gym-accent border border-gym-accent/40 flex items-center gap-0.5"><Star size={8} fill="currentColor"/> {exercise.swapLabel || 'Modified'}</span>}
                </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {!isComplete && !exercise.isWarmup && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); setExerciseToSkip(exercise); }}
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-gym-700 rounded-full transition-colors"
                        title="Skip Exercise"
                    >
                        <SkipForward size={18} />
                    </div>
                )}
                <div className={`${exercise.isWarmup ? 'text-orange-500' : 'text-gray-500'} group-hover:text-white transition-colors`}>
                    {isComplete ? <CheckCircle className="text-gym-success" size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>
            </button>
            
            {hasAlternatives && onSwapExercise && !exercise.isWarmup && (
                <div className="absolute top-4 right-20 z-20">
                    {isSwapped ? (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onSwapExercise(originalId, originalId); }}
                            className="p-1.5 bg-gym-700 rounded-full text-gray-400 hover:text-white hover:bg-gym-600 shadow-md border border-gym-600"
                            title="Revert to Original"
                         >
                            <RefreshCw size={14} />
                         </button>
                    ) : (
                         <div className="flex gap-1">
                            {originalExercise!.alternatives!.map(alt => (
                                <button 
                                    key={alt.id}
                                    onClick={(e) => { e.stopPropagation(); onSwapExercise(originalId, alt.id); }}
                                    className="px-2 py-1 bg-gym-800/80 backdrop-blur rounded-md border border-gym-600 text-[10px] font-bold text-gym-accent hover:bg-gym-700 hover:text-white shadow-sm"
                                >
                                    Swap: {alt.name}
                                </button>
                            ))}
                         </div>
                    )}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
        <p className="text-sm text-gym-accent">{plan.focus}</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        
        {/* PENDING EXERCISES SECTION */}
        {activePending.length > 0 && (
            <div className="mb-6 bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 animate-in slide-in-from-top-4">
                <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={12} /> Pending From Past Sessions
                </h3>
                <div className="space-y-2">
                    {activePending.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gym-900/80 p-3 rounded-lg border border-gym-700">
                            <div>
                                <p className="text-xs text-white font-bold">{p.exerciseId.split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')}</p>
                                <p className="text-[10px] text-gray-500">Reason: {p.reason}</p>
                            </div>
                            <button 
                                onClick={() => handleAddPending(p)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-500"
                            >
                                Add to Today
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Warmups */}
        {warmups.length > 0 && (
            <div className="mb-6 animate-in slide-in-from-left-2">
                <h3 className="text-orange-400 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                    <Flame size={12} fill="currentColor" /> Warmup Routine
                </h3>
                {warmups.map((ex, i) => <ExerciseItem key={ex.id} exercise={ex} index={i} />)}
            </div>
        )}

        {/* Main Workout */}
        <div>
            <h3 className="text-gym-accent font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                <Dumbbell size={12} fill="currentColor" /> Main Workout
            </h3>
            {mainLifts.map((ex, i) => <ExerciseItem key={ex.id} exercise={ex} index={i} />)}
        </div>

        {/* --- ADD CUSTOM EXERCISE SECTION --- */}
        <div className="pt-4 border-t border-gym-700 mt-4">
           {!isAdding ? (
               <button 
                 onClick={() => setIsAdding(true)}
                 className="w-full py-3 bg-gym-800 border border-gym-700 border-dashed rounded-xl text-gray-400 hover:text-white hover:border-gym-500 flex items-center justify-center gap-2 text-sm font-bold"
               >
                 <PlusCircle size={18} /> Add Custom Exercise
               </button>
           ) : (
               <div className="bg-gym-800 p-4 rounded-xl border border-gym-700 animate-in slide-in-from-bottom-2">
                   <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                       <PlusCircle size={14} className="text-gym-accent"/> Create New Exercise
                   </h4>
                   
                   {/* Name & Type */}
                   <input 
                     type="text" 
                     placeholder="Exercise Name (e.g. Boxing)" 
                     className="w-full bg-gym-900 border border-gym-600 rounded-lg p-3 text-white text-sm mb-3 focus:border-gym-accent focus:outline-none"
                     value={customName}
                     onChange={e => setCustomName(e.target.value)}
                   />
                   
                   <div className="flex gap-2 mb-3">
                       <button 
                         onClick={() => setCustomType('weighted')}
                         className={`flex-1 py-2 rounded text-xs font-bold border flex items-center justify-center gap-2 ${customType === 'weighted' ? 'bg-gym-accent border-blue-400 text-white' : 'bg-gym-900 border-gym-700 text-gray-400'}`}
                       >
                           <Dumbbell size={14} /> Lifting
                       </button>
                       <button 
                         onClick={() => setCustomType('cardio')}
                         className={`flex-1 py-2 rounded text-xs font-bold border flex items-center justify-center gap-2 ${customType === 'cardio' ? 'bg-gym-accent border-blue-400 text-white' : 'bg-gym-900 border-gym-700 text-gray-400'}`}
                       >
                           <Footprints size={14} /> Cardio
                       </button>
                   </div>

                   {/* Advanced Lifting Fields */}
                   {customType === 'weighted' && (
                       <div className="space-y-3 mb-3 p-3 bg-gym-900/50 rounded-lg border border-gym-700/50">
                           {/* Selectors */}
                           <div className="flex gap-2">
                               <div className="flex-1">
                                   <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Muscle Group</label>
                                   <select 
                                     value={customMuscle} 
                                     onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                                     className="w-full bg-gym-800 text-white text-xs p-2 rounded border border-gym-600 focus:outline-none"
                                   >
                                       {muscleOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                   </select>
                               </div>
                               <div className="flex-1">
                                   <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Motion / Tempo</label>
                                   <select 
                                     value={customMotion} 
                                     onChange={(e) => setCustomMotion(e.target.value as MotionType)}
                                     className="w-full bg-gym-800 text-white text-xs p-2 rounded border border-gym-600 focus:outline-none"
                                   >
                                       {motionOptions.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                                   </select>
                               </div>
                           </div>

                           {/* Pro Cues */}
                           <div>
                               <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Wrench size={10}/> Setup</label>
                               <input 
                                 type="text" 
                                 placeholder="e.g. Bench at 30 degrees..." 
                                 value={customSetup}
                                 onChange={e => setCustomSetup(e.target.value)}
                                 className="w-full bg-gym-800 border border-gym-600 rounded p-2 text-xs text-white"
                               />
                           </div>
                           <div>
                               <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Eye size={10}/> Visualize</label>
                               <input 
                                 type="text" 
                                 placeholder="e.g. Squeezing a pencil..." 
                                 value={customVisualize}
                                 onChange={e => setCustomVisualize(e.target.value)}
                                 className="w-full bg-gym-800 border border-gym-600 rounded p-2 text-xs text-white"
                               />
                           </div>
                           <div>
                               <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Zap size={10}/> Action</label>
                               <input 
                                 type="text" 
                                 placeholder="e.g. Drive elbows down..." 
                                 value={customAction}
                                 onChange={e => setCustomAction(e.target.value)}
                                 className="w-full bg-gym-800 border border-gym-600 rounded p-2 text-xs text-white"
                               />
                           </div>
                       </div>
                   )}
                   
                   <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">General Tips</label>
                   <textarea
                     placeholder="Quick tips (Optional)"
                     className="w-full bg-gym-900 border border-gym-600 rounded-lg p-3 text-white text-sm mb-3 focus:border-gym-accent focus:outline-none min-h-[50px]"
                     value={customCues}
                     onChange={e => setCustomCues(e.target.value)}
                   />

                   <div className="flex gap-2">
                       <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-gym-700 text-gray-300 rounded-lg text-xs font-bold">Cancel</button>
                       <button onClick={handleCreateExercise} className="flex-1 py-2 bg-gym-success text-white rounded-lg text-xs font-bold">Create Exercise</button>
                   </div>
               </div>
           )}
        </div>
      </div>

      <div className="mt-auto pt-4 pb-8 safe-pb z-20 bg-gym-900 border-t border-gym-800 flex flex-col gap-2">
        {!isAllComplete && onAutocompleteDay && (
           <button
             onClick={onAutocompleteDay}
             className="w-full py-3 bg-gym-800 border border-gym-700 hover:border-gym-600 text-gray-300 font-bold rounded-lg uppercase tracking-wider text-sm transition-all"
           >
              Autocomplete Remaining Day
           </button>
        )}
        <button
          onClick={onFinishWorkout}
          className={`w-full py-4 font-bold rounded-lg uppercase tracking-wider shadow-lg transition-all
            ${isAllComplete 
              ? 'bg-gym-success hover:bg-green-600 text-white' 
              : 'bg-gym-700 text-gray-400 hover:bg-gym-600 hover:text-white'
            }`}
        >
          {isAllComplete ? 'Finish Workout' : 'End Workout Early'}
        </button>
      </div>

      {exerciseToSkip && (
          <SkipModal 
            exercise={exerciseToSkip} 
            onClose={() => setExerciseToSkip(null)} 
            onConfirm={handleSkipConfirm} 
          />
      )}
    </div>
  );
};

export default WorkoutView;
