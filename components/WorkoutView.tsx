
import React, { useState } from 'react';
import { WorkoutDay, SessionData, ExerciseType, MuscleGroup, Exercise, MotionType, PacerConfig } from '../types';
import { CheckCircle, ChevronRight, Layers, PlusCircle, Footprints, Dumbbell, Activity, Eye, Zap, Wrench } from 'lucide-react';
import { DEFAULT_PACER_STOPWATCH } from '../constants';

interface Props {
  plan: WorkoutDay;
  session: SessionData;
  onSelectExercise: (id: string) => void;
  onFinishWorkout: () => void;
  onAddCustomExercise: (ex: Exercise) => void;
}

const WorkoutView: React.FC<Props> = ({ plan, session, onSelectExercise, onFinishWorkout, onAddCustomExercise }) => {
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
  const displayExercises = [...plan.exercises, ...(session.customExercises || [])];

  const isAllComplete = displayExercises.every(ex => {
    const logs = session.completedExercises[ex.id] || [];
    return logs.length >= ex.sets;
  });

  const getPacerForMotion = (motion: MotionType): PacerConfig => {
      // Auto-generate tempo protocol based on bio-mechanics
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
          
          // Advanced Details
          setup: customSetup,
          visualize: customVisualize,
          action: customAction,
          muscleFocus: customMuscle,
          targetGroup: customMuscle,
          
          // Auto-generated analytics
          feeling: 'N/A',
          metValue: isCardio ? 8 : 4,
          muscleSplit: { [customMuscle]: 100 }, // Assume 100% focus on selected group
          motionType: isCardio ? 'cardio' : customMotion,
          
          // Tempo Protocol
          pacer: isCardio ? DEFAULT_PACER_STOPWATCH : getPacerForMotion(customMotion),
          isCompound: ['Chest', 'Back', 'Legs'].includes(customMuscle) // Auto-detect likely compound
      };
      
      onAddCustomExercise(newEx);
      
      // Reset Form
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

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
        <p className="text-sm text-gym-accent">{plan.focus}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-32 no-scrollbar">
        {displayExercises.map((exercise, index) => {
          const logs = session.completedExercises[exercise.id] || [];
          const isComplete = logs.length >= exercise.sets;
          const isStarted = logs.length > 0 && !isComplete;
          const hasMonster = logs.some(l => l.isMonsterSet);
          const isCardio = exercise.type === 'cardio';

          return (
            <button
              key={exercise.id}
              onClick={() => onSelectExercise(exercise.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group
                ${isComplete 
                  ? 'bg-gym-800/40 border-gym-700 opacity-60' 
                  : isStarted 
                    ? 'bg-gym-800 border-gym-accent/50 shadow-sm' 
                    : 'bg-gym-800 border-gym-700 hover:border-gym-600'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-500 font-mono text-sm w-4">{index + 1}</div>
                <div>
                  <h3 className={`font-bold ${isComplete ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {exercise.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {isCardio && <Footprints size={12} className="text-blue-400"/>}
                    <p className="text-xs text-gray-400">
                        {logs.length}/{exercise.sets} Sets • {exercise.reps} {isCardio ? '' : 'Reps'}
                    </p>
                    {hasMonster && <span className="text-[10px] px-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center gap-0.5"><Layers size={8}/> Monster</span>}
                  </div>
                </div>
              </div>
              
              <div className="text-gray-500 group-hover:text-white transition-colors">
                 {isComplete ? <CheckCircle className="text-gym-success" size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>
          );
        })}

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
