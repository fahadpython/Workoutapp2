
import { WorkoutDay, Exercise, PacerConfig } from './types';

// --- PACER TEMPLATES ---

const PACER_PUSH: PacerConfig = {
  startDelay: 3,
  phases: [
    { action: 'LOWER', duration: 3, voiceCue: 'Control Down', breathing: 'Inhale' },
    { action: 'STRETCH', duration: 1, voiceCue: 'Stretch', breathing: 'Hold' },
    { action: 'PRESS', duration: 1, voiceCue: 'Explode Up', breathing: 'Exhale' }
  ]
};

const PACER_PULL: PacerConfig = {
  startDelay: 3,
  phases: [
    { action: 'PULL', duration: 1, voiceCue: 'Pull Hard', breathing: 'Exhale' },
    { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' },
    { action: 'RELEASE', duration: 3, voiceCue: 'Slow Release', breathing: 'Inhale' }
  ]
};

const PACER_ISO_HOLD: PacerConfig = {
  startDelay: 3,
  phases: [
    { action: 'CONTRACT', duration: 1, voiceCue: 'Contract', breathing: 'Exhale' },
    { action: 'HOLD', duration: 2, voiceCue: 'Hold it', breathing: 'Hold' },
    { action: 'RETURN', duration: 2, voiceCue: 'Control', breathing: 'Inhale' }
  ]
};

const PACER_FAST: PacerConfig = {
  startDelay: 2,
  phases: [
    { action: 'GO', duration: 1, voiceCue: 'Rep', breathing: 'Exhale' },
    { action: 'RESET', duration: 1, voiceCue: '', breathing: 'Inhale' }
  ]
};

const PACER_STOPWATCH: PacerConfig = {
  startDelay: 0,
  phases: [] // Special case for stopwatch logic
};

export const DEFAULT_PACER_STOPWATCH = PACER_STOPWATCH;

// --- DATA ---

const WARMUP_EXERCISES: Exercise[] = [
  { 
    id: 'wu_1', name: 'Arm Circles', type: 'weighted', sets: 1, reps: '20', restSeconds: 0, 
    cues: 'Big circles to loosen up shoulders.', 
    setup: 'Stand with feet shoulder-width apart.', 
    visualize: 'Drawing giant circles on the walls.', 
    action: 'Rotate arms forward 20 times, then backward 20 times.',
    muscleFocus: 'Shoulders', targetGroup: 'Warmup', feeling: 'Warmth in shoulder joints', isWarmup: true, pacer: PACER_FAST, metValue: 3.0, muscleSplit: { 'Shoulders': 100 }, motionType: 'raise', isCompound: false 
  },
  { 
    id: 'wu_2', name: 'Band Pull-Aparts', type: 'weighted', sets: 2, reps: '15', restSeconds: 30, 
    cues: 'Squeeze shoulder blades together. Do not shrug.', 
    setup: 'Hold a light band with hands shoulder-width apart.', 
    visualize: 'Trying to touch your shoulder blades together.', 
    action: 'Pull the band apart until it touches your chest. Control the return.',
    muscleFocus: 'Rear Delts', targetGroup: 'Warmup', feeling: 'Burn in upper back', isWarmup: true, pacer: PACER_ISO_HOLD, metValue: 3.0, muscleSplit: { 'Rear Delts': 70, 'Mid Back': 30 }, motionType: 'fly', isCompound: false 
  },
  { 
    id: 'wu_3', name: 'Cat-Cow Stretch', type: 'weighted', sets: 1, reps: '10', restSeconds: 0, 
    cues: 'Move spine through full range of motion.', 
    setup: 'On hands and knees (tabletop position).', 
    visualize: 'A wave moving through your spine.', 
    action: 'Arch back up (Cat), then drop belly down (Cow).',
    muscleFocus: 'Spine', targetGroup: 'Warmup', feeling: 'Loosening of the back', isWarmup: true, pacer: PACER_FAST, metValue: 2.5, muscleSplit: { 'Spine': 100 }, motionType: 'hold', isCompound: false 
  },
  { 
    id: 'wu_4', name: 'Bodyweight RDLs', type: 'weighted', sets: 1, reps: '15', restSeconds: 0, 
    cues: 'Hinge hip back. Wake up hamstrings.', 
    setup: 'Stand on one leg or both. Soft knees.', 
    visualize: 'Closing a car door with your butt.', 
    action: 'Push hips back. Feel hamstring stretch. Stand up.',
    muscleFocus: 'Hamstrings', targetGroup: 'Warmup', feeling: 'Stretch in back of legs', isWarmup: true, pacer: PACER_FAST, metValue: 3.0, muscleSplit: { 'Hamstrings': 80, 'Glutes': 20 }, motionType: 'hinge', isCompound: false 
  },
  { 
    id: 'wu_5', name: 'Wrist Rotations', type: 'weighted', sets: 1, reps: '30 sec', restSeconds: 0, 
    cues: 'Roll wrists in both directions.', 
    setup: 'Clasp hands together.', 
    visualize: 'Lubricating the joints.', 
    action: 'Roll wrists in circles for 30 seconds.',
    muscleFocus: 'Wrists', targetGroup: 'Warmup', feeling: 'Lubricated joints', isWarmup: true, pacer: PACER_FAST, metValue: 2.0, muscleSplit: { 'Forearms': 100 }, motionType: 'curl', isCompound: false 
  },
];

export const PUSH_A_DAY: WorkoutDay = {
  id: 'push_a',
  name: 'PUSH A: Upper Chest & Triceps',
  focus: 'Upper Chest & Side Delts (The "V" Look)',
  exercises: [
    ...WARMUP_EXERCISES,
    { 
      id: 'pa_1', name: 'Incline Dumbbell Press', type: 'weighted', sets: 3, reps: '8-10', restSeconds: 180, 
      cues: 'Arch back slightly. Touch biceps to chest. Pause.', 
      setup: 'Bench at 30° (low incline).',
      visualize: 'Arch back slightly. Lower weights slowly until they touch your outer chest. Pause 1 sec.',
      action: 'Drive up, but stop 1 inch before dumbbells touch at the top. Keep tension on the chest.',
      muscleFocus: 'Upper Chest', targetGroup: 'Chest', feeling: 'Deep stretch across upper pecs.', 
      pacer: PACER_PUSH, metValue: 6.0, muscleSplit: { 'Upper Chest': 80, 'Front Delts': 15, 'Triceps': 5 }, motionType: 'press', isCompound: true,
      benchAngle: 30
    },
    { 
      id: 'pa_2', name: 'Weighted Dips', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120, 
      cues: 'Lean forward. Drive elbows down. Go deep.', 
      setup: 'Parallel bars (or machine).',
      visualize: 'Lean torso forward (look at the floor).',
      action: 'Lower yourself until shoulders are below elbows. Drive elbows down to push back up.',
      muscleFocus: 'Lower Chest', targetGroup: 'Chest', feeling: 'Lower chest activation.', 
      pacer: PACER_PUSH, metValue: 7.0, muscleSplit: { 'Costal Chest': 70, 'Triceps': 20, 'Front Delts': 10 }, motionType: 'press', isCompound: true 
    },
    { 
      id: 'pa_3', name: 'Cable Lateral Raise (Behind)', type: 'weighted', sets: 4, reps: '12-15', restSeconds: 120, 
      cues: 'Cable at wrist height. Hand is a hook. Pull OUT.', 
      setup: 'Cable pulley at wrist height. Stand sideways, cable running behind your legs.',
      visualize: 'Your hand is a hook.',
      action: 'Drag the weight OUT towards the wall, not up. Stop when arm is parallel to floor.',
      muscleFocus: 'Side Delts', targetGroup: 'Shoulders', feeling: 'Deep burn on side delt cap.', 
      pacer: PACER_ISO_HOLD, metValue: 4.0, muscleSplit: { 'Side Delts': 100 }, motionType: 'raise', isCompound: false 
    },
    { 
      id: 'pa_4', name: 'Dumbbell Overhead Extension', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120, 
      cues: 'Elbows points up. Lower dumbbell behind head.', 
      setup: 'Sit on bench with back support. Hold DB with both hands.',
      visualize: 'Stretching the tricep like a rubber band.',
      action: 'Lower weight behind head until deep stretch. Press up to ceiling.',
      muscleFocus: 'Tricep Long Head', targetGroup: 'Triceps', feeling: 'Stretch in back of arm.', 
      pacer: { startDelay: 3, phases: [{ action: 'LOWER', duration: 3, voiceCue: 'Down Slow', breathing: 'Inhale' }, { action: 'STRETCH', duration: 1, voiceCue: 'Stretch', breathing: 'Hold' }, { action: 'PRESS', duration: 1, voiceCue: 'Up', breathing: 'Exhale' }] }, 
      metValue: 4.0, muscleSplit: { 'Long Head Triceps': 80, 'Triceps': 20 }, motionType: 'press', isCompound: false,
      alternatives: [
        {
            id: 'pa_4_alt_1', name: 'Cable Rope Overhead Ext.', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120,
            cues: 'Elbows glued to ears. Deep stretch behind head.',
            setup: 'Rope attachment high. Turn away from machine.',
            visualize: 'Elbows glued to your ears.',
            action: 'Let the rope pull your hands deep behind your head for a painful stretch. Extend forward.',
            muscleFocus: 'Tricep Long Head', targetGroup: 'Triceps', feeling: 'Tearing sensation in tricep.',
            pacer: { startDelay: 3, phases: [{ action: 'STRETCH', duration: 3, voiceCue: 'Stretch Back', breathing: 'Inhale' }, { action: 'HOLD', duration: 1, voiceCue: 'Deep Stretch', breathing: 'Hold' }, { action: 'EXPLODE', duration: 1, voiceCue: 'Fire', breathing: 'Exhale' }] },
            metValue: 4.0, muscleSplit: { 'Long Head Triceps': 90, 'Triceps': 10 }, motionType: 'press', isCompound: false,
            swapLabel: 'BETTER (Smoother Tension)'
        }
      ]
    },
    { 
      id: 'pa_5', name: 'Dumbbell Flys', type: 'weighted', sets: 3, reps: '15', restSeconds: 90, 
      cues: 'Slight bend in elbows. Hug a tree.', 
      setup: 'Flat bench. Dumbbells up.',
      visualize: 'Hugging a giant tree trunk.',
      action: 'Open arms wide until chest stretches. Squeeze back to top.',
      muscleFocus: 'Inner Chest', targetGroup: 'Chest', feeling: 'Chest stretch.', 
      pacer: { startDelay: 3, phases: [{ action: 'OPEN', duration: 3, voiceCue: 'Open Wide', breathing: 'Inhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Exhale' }, { action: 'CLOSE', duration: 1, voiceCue: 'Return', breathing: 'Inhale' }] }, 
      metValue: 4.5, muscleSplit: { 'Chest': 100 }, motionType: 'fly', isCompound: false,
      alternatives: [
          {
              id: 'pa_5_alt_1', name: 'Pec Deck Machine', type: 'weighted', sets: 3, reps: '15', restSeconds: 90,
              cues: 'Keep tension constant. Squeeze inner chest hard.',
              setup: 'Seat height so handles are at chest level.',
              visualize: 'Hugging a giant tree trunk.',
              action: 'Open arms wide (3s). Don\'t let weight stack touch. Squeeze at center (1s).',
              muscleFocus: 'Inner Chest', targetGroup: 'Chest', feeling: 'Intense contraction.',
              pacer: { startDelay: 3, phases: [{ action: 'OPEN', duration: 3, voiceCue: 'Open Wide', breathing: 'Inhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Exhale' }, { action: 'CLOSE', duration: 1, voiceCue: 'Return', breathing: 'Inhale' }] },
              metValue: 4.5, muscleSplit: { 'Chest': 100 }, motionType: 'fly', isCompound: false,
              swapLabel: 'BETTER (Constant Tension)'
          }
      ]
    },
  ]
};

export const PULL_A_DAY: WorkoutDay = {
  id: 'pull_a',
  name: 'PULL A: Lat Width & Bicep Peak',
  focus: 'Wide Lats & Thickness',
  exercises: [
    ...WARMUP_EXERCISES,
    { 
      id: 'pla_1', name: 'Wide Grip Lat Pulldown', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 180, 
      cues: 'Thumbless grip. Drive elbows into back pockets.', 
      setup: 'Thumbless grip (hooks).',
      visualize: 'Your hands are just hooks connecting the bar to your elbows.',
      action: 'Drive elbows down into your back pockets. Let shoulders rise to ears at the top for a full stretch.',
      muscleFocus: 'Upper Lats', targetGroup: 'Back', feeling: 'Wings opening up.', 
      pacer: PACER_PULL, metValue: 6.0, muscleSplit: { 'Upper Lats': 80, 'Teres Major': 10, 'Biceps': 10 }, motionType: 'pull', isCompound: true 
    },
    { 
      id: 'pla_2', name: 'Incline Dumbbell Row', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120, 
      cues: 'Chest on bench. Pull elbows back.', 
      setup: 'Incline bench at 30-45 degrees. Chest supported.',
      visualize: 'Driving elbows to ceiling.',
      action: 'Pull dumbbells towards hips. Squeeze back. Lower fully.',
      muscleFocus: 'Mid-Back', targetGroup: 'Back', feeling: 'Back thickness.', 
      pacer: PACER_PULL, metValue: 6.0, muscleSplit: { 'Mid Back': 70, 'Lats': 20, 'Biceps': 10 }, motionType: 'pull', isCompound: true,
      benchAngle: 45,
      alternatives: [
          {
              id: 'pla_2_alt_1', name: 'Seated Cable Row (Triangle)', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120,
              cues: 'Sit tall. Crack a walnut with blades.',
              setup: 'Triangle handle. Sit with slight arch.',
              visualize: 'Cracking a walnut between your shoulder blades.',
              action: 'Pull handle to stomach (1s). Squeeze (1s). Release forward (3s).',
              muscleFocus: 'Mid-Back', targetGroup: 'Back', feeling: 'Pinching a pencil between blades.',
              pacer: { startDelay: 3, phases: [{ action: 'PULL', duration: 1, voiceCue: 'Pull', breathing: 'Exhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' }, { action: 'RELEASE', duration: 3, voiceCue: 'Release', breathing: 'Inhale' }] },
              metValue: 6.0, muscleSplit: { 'Mid Back': 70, 'Lats': 20, 'Biceps': 10 }, motionType: 'pull', isCompound: true,
              swapLabel: 'ALTERNATIVE (Equal)'
          }
      ]
    },
    { 
      id: 'pla_3', name: 'Face Pulls', type: 'weighted', sets: 4, reps: '15-20', restSeconds: 90, 
      cues: 'Pull rope apart. Thumbs to wall behind you.', 
      setup: 'Rope at eye level.',
      visualize: 'Trying to rip the rope apart.',
      action: 'Pull rope to your forehead while pulling hands apart. Thumbs should point to the wall behind you.',
      muscleFocus: 'Rear Delts', targetGroup: 'Shoulders', feeling: 'Burn in rear delts.', 
      pacer: PACER_ISO_HOLD, metValue: 4.5, muscleSplit: { 'Rear Delts': 70, 'Rotator Cuff': 30 }, motionType: 'pull', isCompound: false 
    },
    { 
      id: 'pla_4', name: 'Incline DB Curls', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120, 
      cues: 'Sit back. Elbows frozen behind ribs. No swinging.', 
      setup: 'Bench at 60° (high incline). Sit back.',
      visualize: 'Arms dead-hanging behind you.',
      action: 'Keep elbows locked in place. Curl up without swinging. Squeeze peak at the top.',
      muscleFocus: 'Bicep Long Head', targetGroup: 'Biceps', feeling: 'Stretch in bicep near shoulder.', 
      pacer: { ...PACER_PULL, phases: [{ action: 'CURL', duration: 1, voiceCue: 'Curl Up', breathing: 'Exhale' }, { action: 'LOWER', duration: 3, voiceCue: 'Slow Down', breathing: 'Inhale' }] }, 
      metValue: 4.0, muscleSplit: { 'Bicep Long Head': 80, 'Biceps': 20 }, motionType: 'curl', isCompound: false,
      benchAngle: 60
    },
    { 
      id: 'pla_5', name: 'Barbell Preacher Curl', type: 'weighted', sets: 3, reps: '12', restSeconds: 90, 
      cues: 'Armpits over pad. Do not rock back.', 
      setup: 'Sit at preacher bench. Hold EZ Bar.',
      visualize: 'Isolating the biceps completely.',
      action: 'Curl weight up. Lower slowly until arms are straight.',
      muscleFocus: 'Bicep Short Head', targetGroup: 'Biceps', feeling: 'Bicep burn.', 
      pacer: { startDelay: 3, phases: [{ action: 'CURL', duration: 1, voiceCue: 'Curl', breathing: 'Exhale' }, { action: 'LOWER', duration: 3, voiceCue: 'Control', breathing: 'Inhale' }] }, 
      metValue: 4.0, muscleSplit: { 'Bicep Short Head': 80, 'Brachialis': 20 }, motionType: 'curl', isCompound: false,
      alternatives: [
          {
              id: 'pla_5_alt_1', name: 'Seated Bicep Curl Machine', type: 'weighted', sets: 3, reps: '12', restSeconds: 90,
              cues: 'Drive triceps into pad. Do not extend fully.',
              setup: 'Adjust seat so armpit is snug over pad.',
              visualize: 'Driving triceps into the pad.',
              action: 'Curl up (1s). Lower slowly (3s). Keep a slight bend at bottom to maintain tension.',
              muscleFocus: 'Bicep Short Head', targetGroup: 'Biceps', feeling: 'Isolated bicep pump.',
              pacer: { startDelay: 3, phases: [{ action: 'CURL', duration: 1, voiceCue: 'Curl', breathing: 'Exhale' }, { action: 'LOWER', duration: 3, voiceCue: 'Control', breathing: 'Inhale' }] },
              metValue: 4.0, muscleSplit: { 'Bicep Short Head': 80, 'Brachialis': 20 }, motionType: 'curl', isCompound: false,
              swapLabel: 'BETTER (Locked Axis)'
          }
      ]
    },
  ]
};

export const LEGS_DAY: WorkoutDay = {
  id: 'legs',
  name: 'LEGS: Knee-Safe Posterior',
  focus: 'Hamstrings, Glutes, Calves & Core',
  exercises: [
    ...WARMUP_EXERCISES,
    { 
      id: 'l_1', name: 'Romanian Deadlift (RDL)', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 180, 
      cues: 'Push hips back to close door. Stop when hips stop.', 
      setup: 'Feet hip-width. Knees slightly bent and LOCKED.',
      visualize: 'Your hands are hooks holding the bar; your hips are the engine.',
      action: 'Push hips back to close a car door behind you. Bar drags against thighs. Stop when hips stop moving back. Squeeze glutes to stand up.',
      muscleFocus: 'Hamstrings/Glutes', targetGroup: 'Legs', feeling: 'Intense stretch in hams.', 
      pacer: { ...PACER_PUSH, phases: [{ action: 'HINGE', duration: 3, voiceCue: 'Hips Back', breathing: 'Inhale' }, { action: 'DRIVE', duration: 1, voiceCue: 'Hips Forward', breathing: 'Exhale' }] }, 
      metValue: 8.0, muscleSplit: { 'Hamstrings': 60, 'Glutes': 30, 'Lower Back': 10 }, motionType: 'hinge', isCompound: true 
    },
    { 
      id: 'l_2', name: 'Weighted Glute Bridge', type: 'weighted', sets: 4, reps: '12-15', restSeconds: 120, 
      cues: 'Drive through heels. Ugly squeeze at top for 2 seconds.', 
      setup: 'Upper back on floor/bench. Weight on hips.',
      visualize: 'A straight line from knees to shoulders.',
      action: 'Drive through heels. Thrust hips to ceiling. Squeeze butt ugly hard for 2 seconds at top.',
      muscleFocus: 'Glutes', targetGroup: 'Legs', feeling: 'Glute cramping.', 
      pacer: PACER_ISO_HOLD, metValue: 6.5, muscleSplit: { 'Glutes': 100 }, motionType: 'hinge', isCompound: true 
    },
    { 
      id: 'l_3', name: 'Seated Calf Raise', type: 'weighted', sets: 4, reps: '15-20', restSeconds: 60, 
      cues: 'Pause at bottom stretch for 2 seconds. No bounce.', 
      setup: 'Pads on knees.',
      visualize: 'Stretching your heel to the floor.',
      action: 'Drop heels deep. PAUSE 2 seconds at the bottom. Explode up on toes.',
      muscleFocus: 'Soleus', targetGroup: 'Legs', feeling: 'Fire in lower legs.', 
      pacer: { ...PACER_ISO_HOLD, phases: [{ action: 'RAISE', duration: 1, voiceCue: 'Up', breathing: 'Exhale' }, { action: 'HOLD', duration: 1, voiceCue: 'Hold', breathing: 'Hold' }, { action: 'LOWER', duration: 2, voiceCue: 'Down', breathing: 'Inhale' }, { action: 'STRETCH', duration: 2, voiceCue: 'Stretch', breathing: 'Hold' }] }, 
      metValue: 4.0, muscleSplit: { 'Soleus': 100 }, motionType: 'raise', isCompound: false 
    },
    { 
      id: 'l_4', name: 'Dead Bugs', type: 'weighted', sets: 3, reps: '15', restSeconds: 60, 
      cues: 'Lower opposite arm/leg slowly. Keep back glued to floor.', 
      setup: 'Back flat on floor.',
      visualize: 'Gluing lower back to the mat.',
      action: 'Lower opposite arm/leg slowly. Keep lower back glued to floor.',
      muscleFocus: 'Deep Core', targetGroup: 'Abs', feeling: 'Abs shaking.', 
      pacer: PACER_PUSH, metValue: 3.5, muscleSplit: { 'Core': 100 }, motionType: 'hold', isCompound: false 
    },
    { 
      id: 'l_5', name: 'Plank', type: 'weighted', sets: 3, reps: 'Fail', restSeconds: 60, 
      cues: 'Squeeze glutes and abs. Pull elbows to toes.', 
      setup: 'Elbows under shoulders.',
      visualize: 'Creating full body tension.',
      action: 'Squeeze glutes and abs. Pull elbows towards toes isometrically.',
      muscleFocus: 'Stability', targetGroup: 'Abs', feeling: 'Whole body tension.', 
      pacer: { ...PACER_ISO_HOLD, startDelay: 0, phases: [{ action: 'HOLD', duration: 10, voiceCue: 'Hold Strong', breathing: 'Hold' }] }, 
      metValue: 4.0, muscleSplit: { 'Abs': 60, 'Glutes': 20, 'Shoulders': 20 }, motionType: 'hold', isCompound: false 
    },
  ]
};

export const PUSH_B_DAY: WorkoutDay = {
  id: 'push_b',
  name: 'PUSH B: Thickness & Power',
  focus: 'Chest Thickness & 3D Shoulders',
  exercises: [
    ...WARMUP_EXERCISES,
    { 
      id: 'pb_1', name: 'Flat Dumbbell Press', type: 'weighted', sets: 3, reps: '8-10', restSeconds: 180, 
      cues: 'Tuck elbows (arrow shape). Drive biceps together at top.', 
      setup: 'Flat bench.',
      visualize: 'Driving your biceps together.',
      action: 'Lower slowly. Tuck elbows slightly (arrow shape). Power up explosively.',
      muscleFocus: 'Mid Chest', targetGroup: 'Chest', feeling: 'Heavy load on chest.', 
      pacer: PACER_PUSH, metValue: 6.0, muscleSplit: { 'Mid Chest': 80, 'Triceps': 15, 'Front Delts': 5 }, motionType: 'press', isCompound: true 
    },
    { 
      id: 'pb_2', name: 'Seated/Standing Overhead Press', type: 'weighted', sets: 3, reps: '8-10', restSeconds: 180, 
      cues: 'Push head through window at top. Don\'t arch back.', 
      setup: 'Barbell or Dumbbells at shoulder level.',
      visualize: 'Pushing your head through a window.',
      action: 'Press straight up. As bar clears head, push head forward slightly. Lock out at top.',
      muscleFocus: 'Front Delts', targetGroup: 'Shoulders', feeling: 'Shoulder fatigue.', 
      pacer: PACER_PUSH, metValue: 6.0, muscleSplit: { 'Front Delts': 70, 'Side Delts': 15, 'Triceps': 15 }, motionType: 'press', isCompound: true 
    },
    { 
      id: 'pb_3', name: 'Dumbbell Lateral Raise', type: 'weighted', sets: 4, reps: '15', restSeconds: 90, 
      cues: 'Lead with elbows. Pour water from a jug. Do not swing.', 
      setup: 'Standing. Slight forward lean.',
      visualize: 'Pouring water out of a jug.',
      action: 'Lead with elbows. Raise arms to side until parallel to floor. Do not use momentum.',
      muscleFocus: 'Side Delts', targetGroup: 'Shoulders', feeling: 'Burn on sides.', 
      pacer: PACER_ISO_HOLD, metValue: 4.0, muscleSplit: { 'Side Delts': 100 }, motionType: 'raise', isCompound: false 
    },
    { 
      id: 'pb_4', name: 'Skull Crushers', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120, 
      cues: 'Lower bar to hairline (not nose). Hinge only at elbow.', 
      setup: 'EZ Bar. Lying on flat bench.',
      visualize: 'Hinging only at the elbow.',
      action: 'Lower bar to your hairline (not nose). Drive bar back up to ceiling.',
      muscleFocus: 'Triceps (Power)', targetGroup: 'Triceps', feeling: 'Tricep belly stretch.', 
      pacer: PACER_PUSH, metValue: 5.0, muscleSplit: { 'Triceps': 100 }, motionType: 'press', isCompound: false 
    },
    { 
      id: 'pb_5', name: 'Pec Deck Fly', type: 'weighted', sets: 3, reps: '15', restSeconds: 90, 
      cues: 'Keep tension constant. Squeeze inner chest hard.', 
      setup: 'Seat height so handles are at chest level.',
      visualize: 'Hugging a giant tree trunk.',
      action: 'Open arms wide (3s). Don\'t let weight stack touch. Squeeze at center (1s).',
      muscleFocus: 'Inner Chest', targetGroup: 'Chest', feeling: 'Intense contraction.', 
      pacer: { startDelay: 3, phases: [{ action: 'OPEN', duration: 3, voiceCue: 'Open Wide', breathing: 'Inhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Exhale' }, { action: 'CLOSE', duration: 1, voiceCue: 'Return', breathing: 'Inhale' }] }, 
      metValue: 4.5, muscleSplit: { 'Chest': 100 }, motionType: 'fly', isCompound: false 
    },
  ]
};

export const PULL_B_DAY: WorkoutDay = {
  id: 'pull_b',
  name: 'PULL B: Back Thickness',
  focus: 'Detailed Back & Forearms',
  exercises: [
    ...WARMUP_EXERCISES,
    { 
      id: 'plb_1', name: 'Neutral Grip Pulldown', type: 'weighted', sets: 3, reps: 'Failure', restSeconds: 180, 
      cues: 'Palms face each other. Drive elbows down. Arch back.', 
      setup: 'V-Bar handle or parallel grips.',
      visualize: 'Stretching the lats from the armpit to the hip.',
      action: 'Pull handle to upper chest. Arch back slightly. Squeeze hard.',
      muscleFocus: 'Lower Lats', targetGroup: 'Back', feeling: 'Lower back/lats engaging.', 
      pacer: PACER_PULL, metValue: 6.0, muscleSplit: { 'Lats (Lower)': 90, 'Biceps': 10 }, motionType: 'pull', isCompound: true 
    },
    { 
      id: 'plb_2', name: 'Wide Grip Barbell Row', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120, 
      cues: 'Hinge forward. Pull bar to sternum.', 
      setup: 'Feet shoulder width. Overhand grip.',
      visualize: 'Driving elbows to ceiling.',
      action: 'Explode up to lower chest. Control down.',
      muscleFocus: 'Upper Back', targetGroup: 'Back', feeling: 'Upper back thickness.', 
      pacer: { startDelay: 3, phases: [{ action: 'PULL', duration: 1, voiceCue: 'Pull', breathing: 'Exhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' }, { action: 'RELEASE', duration: 3, voiceCue: 'Release', breathing: 'Inhale' }] }, 
      metValue: 6.0, muscleSplit: { 'Upper Back': 80, 'Rear Delts': 20 }, motionType: 'pull', isCompound: true,
      alternatives: [
          {
              id: 'plb_2_alt_1', name: 'Seated Cable Row (Wide)', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120,
              cues: 'Grip wide. Pull to upper abs. Flare elbows out.',
              setup: 'Wide Lat bar attachment.',
              visualize: 'Spreading your elbows wide.',
              action: 'Pull bar to upper abs/lower chest (1s). Keep elbows flared (1s). Release (3s).',
              muscleFocus: 'Upper Back', targetGroup: 'Back', feeling: 'Upper back thickness.',
              pacer: { startDelay: 3, phases: [{ action: 'PULL', duration: 1, voiceCue: 'Pull', breathing: 'Exhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' }, { action: 'RELEASE', duration: 3, voiceCue: 'Release', breathing: 'Inhale' }] },
              metValue: 6.0, muscleSplit: { 'Upper Back': 80, 'Rear Delts': 20 }, motionType: 'pull', isCompound: true,
              swapLabel: 'ALTERNATIVE (Safer for Lower Back)'
          }
      ]
    },
    { 
      id: 'plb_3', name: 'Bent-Over Dumbbell Reverse Flys', type: 'weighted', sets: 4, reps: '15-20', restSeconds: 90, 
      cues: 'Hinge forward. Fly arms out like wings.', 
      setup: 'Standing bent over or chest supported on bench.',
      visualize: 'Trying to fly away.',
      action: 'Raise DBs out to side. Squeeze rear delts. Control down.',
      muscleFocus: 'Rear Delts', targetGroup: 'Shoulders', feeling: 'Rear shoulder burn.', 
      pacer: PACER_ISO_HOLD, metValue: 4.5, muscleSplit: { 'Rear Delts': 100 }, motionType: 'fly', isCompound: false,
      alternatives: [
          {
              id: 'plb_3_alt_1', name: 'Reverse Pec Deck', type: 'weighted', sets: 4, reps: '15', restSeconds: 90,
              cues: 'Push knuckles OUT to walls, not just back.',
              setup: 'Facing the machine.',
              visualize: 'Trying to touch the side walls with your knuckles.',
              action: 'Push hands back (2s). Hold (1s). Forward (1s). Don\'t shrug.',
              muscleFocus: 'Rear Delts', targetGroup: 'Shoulders', feeling: 'Rear shoulder isolation.',
              pacer: { startDelay: 3, phases: [{ action: 'BACK', duration: 2, voiceCue: 'Push Back', breathing: 'Exhale' }, { action: 'HOLD', duration: 1, voiceCue: 'Hold', breathing: 'Hold' }, { action: 'RETURN', duration: 1, voiceCue: 'Return', breathing: 'Inhale' }] },
              metValue: 4.5, muscleSplit: { 'Rear Delts': 100 }, motionType: 'fly', isCompound: false,
              swapLabel: 'BETTER (Isolates Rear Delt)'
          }
      ]
    },
    { 
      id: 'plb_4', name: 'Hammer Curls', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120, 
      cues: 'Thumbs up. Squeeze handle hard. Hits side of arm.', 
      setup: 'Standing. Dumbbells at sides.',
      visualize: 'Holding a hammer.',
      action: 'Curl dumbbell across the body towards opposite pectoral. Squeeze handle tight.',
      muscleFocus: 'Brachialis', targetGroup: 'Biceps', feeling: 'Forearm/Side Arm.', 
      pacer: PACER_PULL, metValue: 4.0, muscleSplit: { 'Brachialis': 60, 'Forearms': 40 }, motionType: 'curl', isCompound: false 
    },
    { 
      id: 'plb_5', name: 'Cable Bicep Curls', type: 'weighted', sets: 3, reps: '12', restSeconds: 90, 
      cues: 'Elbows forward. Constant tension. Squeeze.', 
      setup: 'Straight bar attached to low pulley.',
      visualize: 'Constant tension.',
      action: 'Step back. Curl to chin. Lower slowly. Don\'t let the weight stack touch.',
      muscleFocus: 'Bicep Short Head', targetGroup: 'Biceps', feeling: 'Inner bicep pump.', 
      pacer: PACER_PULL, metValue: 4.0, muscleSplit: { 'Bicep Short Head': 100 }, motionType: 'curl', isCompound: false 
    },
  ]
};

export const WORKOUT_SCHEDULE: Record<number, WorkoutDay | null> = {
  0: null, // Sunday: Rest
  1: PUSH_A_DAY, // Monday
  2: PULL_A_DAY, // Tuesday
  3: LEGS_DAY, // Wednesday
  4: PUSH_B_DAY, // Thursday
  5: PULL_B_DAY, // Friday
  6: LEGS_DAY, // Saturday
};

export const ALL_WORKOUTS = [PUSH_A_DAY, PULL_A_DAY, LEGS_DAY, PUSH_B_DAY, PULL_B_DAY];
