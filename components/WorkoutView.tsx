import React, { useState } from 'react';
import { WorkoutDay, SessionData, ExerciseType, MuscleGroup, Exercise, MotionType, PacerConfig } from '../types';
import { CheckCircle, ChevronRight, Layers, PlusCircle, Footprints, Dumbbell, Activity, Eye, Zap, Wrench, RefreshCw, Star, Flame } from 'lucide-react';
import { DEFAULT_PACER_STOPWATCH } from '../constants';

interface Props {
  plan: WorkoutDay;
  session: SessionData;
  onSelectExercise: (id: string) => void;
  onFinishWorkout: () => void;
  onAddCustomExercise: (ex: Exercise) => void;
  onSwapExercise?: (originalId: string, newId: string) => void;
}

const WorkoutView: React.FC<Props> = ({ plan, session, onSelectExercise, onFinishWorkout, onAddCustomExercise, onSwapExercise }) => {
  const [isAdding, setIsAdding] = useState(false);
  
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

  const fullList = [...renderedExercises, ...(session.customExercises || [])];

  const warmups = fullList.filter(e => e.isWarmup);
  const mainLifts = fullList.filter(e => !e.isWarmup);

  const isAllComplete = fullList.every(ex => {
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
            
            <div className={`${exercise.isWarmup ? 'text-orange-500' : 'text-gray-500'} group-hover:text-white transition-colors`}>
                {isComplete ? <CheckCircle className="text-gym-success" size={20} /> : <ChevronRight size={20} />}
            </div>
            </button>
            
            {hasAlternatives && onSwapExercise && !exercise.isWarmup && (
                <div className="absolute top-4 right-12 z-20">
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

      <div className="mt-auto pt-4 pb-8 safe-pb z-20 bg-gym-900 border-t border-gym-800">
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
    </div>
  );
};

export default WorkoutView;