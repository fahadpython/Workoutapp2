
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

const PACER_BREATHING: PacerConfig = {
    startDelay: 3,
    phases: [
        { action: 'BREATHE IN', duration: 4, voiceCue: 'Inhale', breathing: 'Inhale' },
        { action: 'HOLD', duration: 4, voiceCue: 'Hold', breathing: 'Hold' },
        { action: 'BREATHE OUT', duration: 4, voiceCue: 'Exhale', breathing: 'Exhale' },
        { action: 'HOLD', duration: 4, voiceCue: 'Hold', breathing: 'Hold' }
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

// Custom Pacers for Legs
const PACER_DEADLIFT: PacerConfig = {
  startDelay: 3,
  phases: [
    { action: 'DRIVE', duration: 1, voiceCue: 'Drive', breathing: 'Exhale' },
    { action: 'RESET', duration: 1, voiceCue: 'Reset', breathing: 'Inhale' }
  ]
};

const PACER_CONTROLLED_HINGE: PacerConfig = { // 3-1-1
  startDelay: 3,
  phases: [
    { action: 'LOWER', duration: 3, voiceCue: 'Hips Back', breathing: 'Inhale' },
    { action: 'STRETCH', duration: 1, voiceCue: 'Stretch', breathing: 'Hold' },
    { action: 'UP', duration: 1, voiceCue: 'Drive', breathing: 'Exhale' }
  ]
};

const PACER_CALVES: PacerConfig = { // 2-2-1
  startDelay: 3,
  phases: [
    { action: 'LOWER', duration: 2, voiceCue: 'Down', breathing: 'Inhale' },
    { action: 'PAUSE', duration: 2, voiceCue: 'Hold', breathing: 'Hold' },
    { action: 'UP', duration: 1, voiceCue: 'Drive', breathing: 'Exhale' }
  ]
};

const PACER_CHOP: PacerConfig = {
  startDelay: 2,
  phases: [
    { action: 'CHOP', duration: 1, voiceCue: 'Chop', breathing: 'Exhale' },
    { action: 'RETURN', duration: 2, voiceCue: 'Return', breathing: 'Inhale' }
  ]
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
  { 
    id: 'wu_pushups', name: 'Push Ups (Warmup)', type: 'weighted', sets: 2, reps: '15', restSeconds: 45, 
    cues: 'Chest to floor. Core tight.', 
    setup: 'Plank position. Hands shoulder width.', 
    visualize: 'Pushing the earth away.', 
    action: 'Lower chest to floor. Press up explosively.',
    muscleFocus: 'Chest/Tris', targetGroup: 'Warmup', feeling: 'Upper body pump', isWarmup: true, pacer: PACER_FAST, metValue: 3.8, muscleSplit: { 'Chest': 60, 'Triceps': 20, 'Shoulders': 20 }, motionType: 'press', isCompound: true 
  },
  { 
    id: 'wu_pullups', name: 'Pull Ups (Assisted/BW)', type: 'weighted', sets: 2, reps: '8-10', restSeconds: 45, 
    cues: 'Chin over bar. Control the drop.', 
    setup: 'Grip bar slightly wider than shoulders.', 
    visualize: 'Driving elbows into back pockets.', 
    action: 'Pull chin over bar. Lower fully.',
    muscleFocus: 'Lats', targetGroup: 'Warmup', feeling: 'Back activation', isWarmup: true, pacer: PACER_PULL, metValue: 5.0, muscleSplit: { 'Lats': 80, 'Biceps': 20 }, motionType: 'pull', isCompound: true 
  },
  { 
    id: 'wu_punching', name: 'Shadow Boxing', type: 'cardio', sets: 1, reps: '2 mins', restSeconds: 30, 
    cues: 'Keep moving on toes. Snap punches.', 
    setup: 'Staggered stance. Hands up.', 
    visualize: 'Fighting an opponent.', 
    action: 'Throw 1-2 combos (Jab, Cross). Move head.',
    muscleFocus: 'Full Body', targetGroup: 'Warmup', feeling: 'Elevated heart rate', isWarmup: true, pacer: PACER_FAST, metValue: 8.0, muscleSplit: { 'Shoulders': 40, 'Core': 30, 'Legs': 30 }, motionType: 'cardio', isCompound: true 
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
      benchAngle: 30,
      facts: ["The clavicular head (upper chest) is best activated between 30° and 45° incline.", "Dumbbells allow for a greater range of motion than barbells, potentially increasing hypertrophy."],
      detailedSteps: [
          "Set the bench to a 30-degree incline. Higher angles shift too much to shoulders.",
          "Sit back and retract your shoulder blades. Keep them pinched throughout the set.",
          "Kick the dumbbells up to your starting position. Palms facing forward, elbows at a 45-degree angle (not flared out 90 degrees).",
          "Lower the weights slowly (3 seconds) until you feel a deep stretch in your upper chest. Your hands should be near your armpits.",
          "Pause for 1 second at the bottom. Do not bounce.",
          "Drive the weights up explosively. Imagine bringing your biceps together.",
          "Stop 1 inch before the dumbbells touch to maintain tension on the pecs."
      ]
    },
    { 
      id: 'pa_2', name: 'Weighted Dips', type: 'weighted', sets: 3, reps: '10-12', restSeconds: 120, 
      cues: 'Lean forward. Drive elbows down. Go deep.', 
      setup: 'Parallel bars (or machine).',
      visualize: 'Lean torso forward (look at the floor).',
      action: 'Lower yourself until shoulders are below elbows. Drive elbows down to push back up.',
      muscleFocus: 'Lower Chest', targetGroup: 'Chest', feeling: 'Lower chest activation.', 
      pacer: PACER_PUSH, metValue: 7.0, muscleSplit: { 'Costal Chest': 70, 'Triceps': 20, 'Front Delts': 10 }, motionType: 'press', isCompound: true,
      facts: ["Dips recruit the lower pectoralis major heavily due to the arm position relative to the torso.", "Keeping your elbows slightly wider than shoulder-width increases chest activation over triceps."],
      detailedSteps: [
          "Grip the bars firmly. Jump up and stabilize your body.",
          "Lean your torso forward significantly (about 45 degrees). This targets the chest instead of triceps.",
          "Cross your legs behind you or keep them straight, but keep your core tight.",
          "Lower your body slowly. Allow your elbows to flare slightly naturally.",
          "Go deep—aim for your shoulders to dip below your elbows.",
          "At the bottom, feel the stretch in your lower chest.",
          "Press back up by driving your hands into the bars, keeping the forward lean.",
          "Squeeze your chest at the top. Do not lock out your elbows completely."
      ]
    },
    { 
      id: 'pa_3', name: 'Cable Lateral Raise (Behind)', type: 'weighted', sets: 4, reps: '12-15', restSeconds: 120, 
      cues: 'Cable at wrist height. Hand is a hook. Pull OUT.', 
      setup: 'Cable pulley at wrist height. Stand sideways, cable running behind your legs.',
      visualize: 'Your hand is a hook.',
      action: 'Drag the weight OUT towards the wall, not up. Stop when arm is parallel to floor.',
      muscleFocus: 'Side Delts', targetGroup: 'Shoulders', feeling: 'Deep burn on side delt cap.', 
      pacer: PACER_ISO_HOLD, metValue: 4.0, muscleSplit: { 'Side Delts': 100 }, motionType: 'raise', isCompound: false,
      facts: ["Performing raises from behind the back puts the side delt in a more stretched position at the start.", "Using cables provides constant tension throughout the entire range of motion, unlike dumbbells."],
      detailedSteps: [
          "Set the cable pulley to wrist height (low).",
          "Stand sideways to the machine. Grab the handle with the hand furthest away.",
          "Run the cable behind your legs. This allows for a better stretch without hitting your hips.",
          "Lean slightly away from the machine.",
          "Think of your hand as a hook. Do not grip too tightly.",
          "Raise your arm outward towards the wall, leading with your elbow.",
          "Stop when your arm is parallel to the floor.",
          "Lower slowly under control. Do not let the weight stack touch down between reps."
      ] 
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
      facts: ["The long head of the triceps is the only head that crosses the shoulder joint, meaning it is stretched most in the overhead position.", "Full range of motion in this exercise has been shown to increase hypertrophy significantly."],
      detailedSteps: [
          "Sit on a bench with vertical back support.",
          "Cup one dumbbell head with both hands (diamond grip) and press it overhead.",
          "Keep your elbows pointing as vertically as possible. They can flare slightly, but not too wide.",
          "Lower the dumbbell behind your head slowly. Go deep to stretch the long head of the tricep.",
          "At the bottom, feel the stretch near your armpits.",
          "Press the weight back up to the ceiling using only your triceps.",
          "Keep your head neutral. Do not bob your head forward."
      ],
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
            swapLabel: 'BETTER (Smoother Tension)',
            detailedSteps: [
                "Attach a rope to a high pulley.",
                "Grab the rope overhead and turn away from the machine.",
                "Stagger your stance and lean forward slightly.",
                "Keep your elbows close to your ears.",
                "Allow the cable to pull your hands back behind your head for a deep stretch.",
                "Extend your arms forward until straight.",
                "Split the rope apart at the end of the movement for extra contraction."
            ]
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
      facts: ["Fly movements isolate the pectorals by removing the triceps from the equation.", "Focus on the stretch at the bottom; this is where the most muscle damage for growth occurs."],
      detailedSteps: [
          "Lie flat on the bench. Press the dumbbells up to start.",
          "Unlock your elbows (slight bend) and freeze them in that angle.",
          "Lower the weights out to the sides in a wide arc.",
          "Imagine you are opening your arms to hug a giant tree.",
          "Go down until you feel a comfortable stretch in your chest.",
          "Bring the weights back up in the same wide arc.",
          "Squeeze your chest muscles hard at the top. Do not bang the weights together."
      ],
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
      pacer: PACER_PULL, metValue: 6.0, muscleSplit: { 'Upper Lats': 80, 'Teres Major': 10, 'Biceps': 10 }, motionType: 'pull', isCompound: true,
      facts: ["A wide grip emphasizes the teres major and upper lats, contributing to a wider V-taper look.", "Using a thumbless 'hook' grip reduces bicep involvement."],
      detailedSteps: [
          "Adjust the thigh pad so your legs are locked in tight.",
          "Grab the bar wider than shoulder width using a thumbless grip (thumbs over the bar).",
          "Sit down and lean back slightly.",
          "Initiate the pull by depressing your shoulder blades down.",
          "Drive your elbows down towards your hips (back pockets).",
          "Pull the bar to your upper chest/collarbone area.",
          "Control the weight on the way up. Let your shoulders rise fully to your ears for a max stretch."
      ]
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
      facts: ["Chest-supported rows eliminate momentum, ensuring the back muscles do 100% of the work.", "Pulling towards the hips engages the lats more, while pulling higher engages the upper back."],
      detailedSteps: [
          "Set bench to a 45-degree incline.",
          "Lie face down with your chest supported by the pad.",
          "Plant your feet firmly for stability.",
          "Let your arms hang straight down to start.",
          "Pull the dumbbells up and back towards your hips, not your armpits.",
          "Drive your elbows past your torso and squeeze your shoulder blades together.",
          "Lower slowly to a full dead hang."
      ],
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
      pacer: PACER_ISO_HOLD, metValue: 4.5, muscleSplit: { 'Rear Delts': 70, 'Rotator Cuff': 30 }, motionType: 'pull', isCompound: false,
      facts: ["Face pulls are crucial for shoulder health, offsetting the internal rotation caused by pressing movements.", "This exercise primarily targets the rear delts and external rotators."],
      detailedSteps: [
          "Set the cable pulley to eye level or slightly higher.",
          "Grab the rope with palms facing each other.",
          "Step back to create tension.",
          "Pull the center of the rope towards the bridge of your nose.",
          "Simultaneously, pull your hands apart as wide as possible.",
          "Think about rotating your hands so your thumbs point to the wall behind you.",
          "Hold the contraction for 1 second.",
          "Return slowly."
      ]
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
      benchAngle: 60,
      facts: ["The incline position places the shoulder in extension, which maximally stretches the long head of the biceps.", "This exercise is excellent for building the 'peak' of the bicep."],
      detailedSteps: [
          "Set bench to 60 degrees.",
          "Sit back and let your arms hang straight down behind your torso.",
          "This position stretches the long head of the bicep.",
          "Curl the weights up while keeping your elbows frozen in space. Do not pull elbows forward.",
          "Squeeze hard at the top.",
          "Lower all the way down to a full stretch."
      ]
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
      facts: ["Preacher curls prevent momentum and isolate the short head of the biceps.", "Fully extending the arm at the bottom is safe and necessary for full range of motion."],
      detailedSteps: [
          "Adjust the seat so your armpits sit comfortably over the top of the pad.",
          "Grab the EZ bar with an underhand grip.",
          "Curl the weight up towards your shoulders.",
          "Stop just before your forearms become vertical to keep tension on the muscle.",
          "Lower the bar slowly until your arms are fully straight.",
          "Keep your triceps glued to the pad at all times."
      ],
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

export const LEGS_POWER_DAY: WorkoutDay = {
  id: 'legs_power',
  name: 'LEGS: Power & Strength',
  focus: 'Posterior Chain Explosiveness',
  exercises: [
    ...WARMUP_EXERCISES,
    {
      id: 'lp_1', name: 'Conventional Deadlift', type: 'weighted', sets: 3, reps: '5', restSeconds: 180,
      cues: 'Slack out. Push floor. Stand tall. Dead stop.',
      setup: 'Bar on floor. Feet hip-width. Shins touching the bar.',
      visualize: 'Push the floor away with your feet. Do not pull with your arms.',
      action: 'Take slack out of bar (click). Drive feet down. Stand tall. Lock hips. Reset completely on floor.',
      muscleFocus: 'Posterior Chain', targetGroup: 'Legs', feeling: 'Total body tension.',
      pacer: PACER_DEADLIFT, metValue: 8.0, muscleSplit: { 'Hamstrings': 35, 'Glutes': 35, 'Quads': 20, 'Lower Back': 10 }, motionType: 'hinge', isCompound: true,
      facts: ["The deadlift recruits more muscle mass than almost any other exercise.", "Starting from a 'dead stop' eliminates the stretch reflex, building pure concentric strength."],
      detailedSteps: [
          "Stand with feet hip-width apart, mid-foot under the bar.",
          "Hinge at hips to grab the bar just outside your legs.",
          "Bring your shins to the bar.",
          "Lift your chest and straighten your back (engage lats).",
          "Pull the 'slack' out of the bar (hear the click) without lifting it yet.",
          "Drive your feet through the floor to stand up.",
          "Squeeze glutes at the top. Do not lean back excessively.",
          "Lower the bar under control.",
          "Let the weight come to a dead stop before the next rep."
      ]
    },
    {
      id: 'lp_2', name: 'Dumbbell RDL', type: 'weighted', sets: 3, reps: '8-10', restSeconds: 120,
      cues: 'Soft knees. Hips back. Close car door.',
      setup: 'Hold DBs in front. Knees soft & locked. Feet hip-width.',
      visualize: 'Painting your legs with the dumbbells. Keep them touching your pants.',
      action: 'Push hips back until hamstrings are tight. Stop when hips stop moving. Squeeze glutes to return.',
      muscleFocus: 'Hamstrings', targetGroup: 'Legs', feeling: 'Deep hamstring stretch.',
      pacer: PACER_CONTROLLED_HINGE, metValue: 6.0, muscleSplit: { 'Hamstrings': 70, 'Glutes': 20, 'Lower Back': 10 }, motionType: 'hinge', isCompound: true,
      facts: ["The RDL (Romanian Deadlift) focuses on the eccentric (lowering) phase, which is key for hamstring growth.", "Never lower the weight by rounding your back; stop when your flexibility limits you."],
      detailedSteps: [
          "Stand tall holding dumbbells in front of your thighs.",
          "Unlock your knees (slight bend) and keep them frozen there.",
          "Initiate movement by pushing your hips backwards.",
          "Keep the dumbbells close to your legs (shaving your legs).",
          "Lower until you feel a deep stretch in your hamstrings or your back starts to round.",
          "Usually this is just below the knees.",
          "Drive your hips forward to return to standing."
      ]
    },
    {
      id: 'lp_3', name: 'Seated Calf Raise', type: 'weighted', sets: 4, reps: '12-15', restSeconds: 90,
      cues: 'Deep drop. Pause 2 seconds. No bounce.',
      setup: 'Pads on knees. Balls of feet on ledge.',
      visualize: 'Trying to touch your heels to the floor.',
      action: 'Drop heels deep. PAUSE. Drive up onto big toe.',
      muscleFocus: 'Soleus', targetGroup: 'Legs', feeling: 'Fire in lower calves.',
      pacer: PACER_CALVES, metValue: 3.0, muscleSplit: { 'Soleus': 100 }, motionType: 'raise', isCompound: false
    },
    {
      id: 'lp_4', name: 'Hanging Leg Raises', type: 'weighted', sets: 3, reps: '10-15', restSeconds: 90,
      cues: 'Don\'t swing. Curl pelvis up. Control down.',
      setup: 'Hang from pull-up bar. Shoulders down (packed).',
      visualize: 'Show the bottom of your feet to the wall in front of you.',
      action: 'Curl knees/legs up. Round your lower back slightly at top. Lower slowly without swinging.',
      muscleFocus: 'Lower Abs', targetGroup: 'Abs', feeling: 'Deep abdominal crunch.',
      pacer: { startDelay: 2, phases: [{ action: 'CURL UP', duration: 2, voiceCue: 'Curl', breathing: 'Exhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' }, { action: 'LOWER', duration: 2, voiceCue: 'Control', breathing: 'Inhale' }] }, 
      metValue: 4.0, muscleSplit: { 'Abs': 80, 'Hip Flexors': 20 }, motionType: 'hold', isCompound: false
    },
    {
      id: 'lp_5', name: 'Cable Woodchoppers', type: 'weighted', sets: 3, reps: '12-15', restSeconds: 60,
      cues: 'Twist torso. Slash down. Control back.',
      setup: 'Cable pulley high. Stand sideways.',
      visualize: 'Slashing a sword across your body.',
      action: 'Pull handle diagonally down to opposite knee. Twist torso. Return slowly.',
      muscleFocus: 'Obliques', targetGroup: 'Abs', feeling: 'Side core burn.',
      pacer: PACER_CHOP, metValue: 4.0, muscleSplit: { 'Obliques': 80, 'Abs': 20 }, motionType: 'pull', isCompound: false
    }
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
      pacer: PACER_PUSH, metValue: 6.0, muscleSplit: { 'Mid Chest': 80, 'Triceps': 15, 'Front Delts': 5 }, motionType: 'press', isCompound: true,
      facts: ["Dumbbells require more stabilization than barbells, activating more synergistic muscle fibers.", "Tucking the elbows slightly (arrow shape) protects the shoulder joint while maintaining chest activation."]
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
      pacer: PACER_PULL, metValue: 6.0, muscleSplit: { 'Lats (Lower)': 90, 'Biceps': 10 }, motionType: 'pull', isCompound: true,
      facts: ["A neutral grip puts the shoulder in a mechanically strong position, often allowing you to pull heavier weights.", "Pulling lower (to the sternum) emphasizes the lower lats."]
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

export const LEGS_HYPERTROPHY_DAY: WorkoutDay = {
  id: 'legs_hyper',
  name: 'LEGS: Hypertrophy',
  focus: 'Volume & Detail',
  exercises: [
    ...WARMUP_EXERCISES,
    {
      id: 'lh_1', name: 'Barbell RDL', type: 'weighted', sets: 4, reps: '10-12', restSeconds: 120,
      cues: 'Hips back. Bar close. Feel hamstring stretch.',
      setup: 'Barbell. Feet hip-width. Knees slightly bent and frozen.',
      visualize: 'Your hands are hooks. Your hips are the engine.',
      action: 'Send hips back. Bar drags down thighs. Stop at mid-shin. Drive hips forward to lock out.',
      muscleFocus: 'Hamstrings', targetGroup: 'Legs', feeling: 'Stretch in hams.',
      pacer: PACER_CONTROLLED_HINGE, metValue: 7.0, muscleSplit: { 'Hamstrings': 60, 'Glutes': 30, 'Lower Back': 10 }, motionType: 'hinge', isCompound: true
    },
    {
      id: 'lh_2', name: 'Hyperextensions', type: 'weighted', sets: 3, reps: '15', restSeconds: 90,
      cues: 'Hinge at hips. Don\'t over-arch spine. Squeeze glutes.',
      setup: '45° Roman Chair. Pad just below hips.',
      visualize: 'Use your hamstrings to pull you up, not your lower back.',
      action: 'Hug plate to chest. Lower until stretch felt. Pull up until body is straight line.',
      muscleFocus: 'Posterior Chain', targetGroup: 'Back', feeling: 'Glute/Ham/Lower Back pump.',
      pacer: { startDelay: 2, phases: [{ action: 'LOWER', duration: 2, voiceCue: 'Down', breathing: 'Inhale' }, { action: 'STRETCH', duration: 1, voiceCue: 'Stretch', breathing: 'Hold' }, { action: 'UP', duration: 1, voiceCue: 'Up', breathing: 'Exhale' }] },
      metValue: 4.5, muscleSplit: { 'Hamstrings': 40, 'Glutes': 40, 'Lower Back': 20 }, motionType: 'hinge', isCompound: false
    },
    {
      id: 'lh_3', name: 'Seated Calf Raise', type: 'weighted', sets: 4, reps: '15-20', restSeconds: 60,
      cues: 'Heels down. 2-sec pause. Explode.',
      setup: 'Pads on knees.',
      visualize: 'Dead stop at the bottom.',
      action: 'Lower fully. Wait for count of two. Explode up.',
      muscleFocus: 'Soleus', targetGroup: 'Legs', feeling: 'Deep burn.',
      pacer: PACER_CALVES, metValue: 3.0, muscleSplit: { 'Soleus': 100 }, motionType: 'raise', isCompound: false
    },
    {
      id: 'lh_4', name: 'Hanging Leg Raises', type: 'weighted', sets: 3, reps: 'Failure', restSeconds: 90,
      cues: 'No momentum. Curl up. Slow down.',
      setup: 'Hang from bar.',
      visualize: 'Curling your tailbone to your belly button.',
      action: 'Lift legs. Focus on the pelvic curl at the top. Lower with control.',
      muscleFocus: 'Abs', targetGroup: 'Abs', feeling: 'Abdominal cramping.',
      pacer: { startDelay: 2, phases: [{ action: 'CURL UP', duration: 1, voiceCue: 'Curl', breathing: 'Exhale' }, { action: 'SQUEEZE', duration: 1, voiceCue: 'Squeeze', breathing: 'Hold' }, { action: 'LOWER', duration: 2, voiceCue: 'Control', breathing: 'Inhale' }] },
      metValue: 4.0, muscleSplit: { 'Abs': 100 }, motionType: 'hold', isCompound: false
    },
    {
      id: 'lh_5', name: 'Plank', type: 'weighted', sets: 3, reps: 'Failure', restSeconds: 60,
      cues: 'Glutes tight. Pull elbows down. Breathe.',
      setup: 'Elbows under shoulders. Toes on floor.',
      visualize: 'Pulling your elbows to your toes (scrunching the floor).',
      action: 'Squeeze glutes. Squeeze abs. Pull elbows down isometrically to increase tension.',
      muscleFocus: 'Core', targetGroup: 'Abs', feeling: 'Whole body shaking.',
      pacer: PACER_BREATHING, isTimed: true,
      metValue: 3.5, muscleSplit: { 'Abs': 60, 'Glutes': 20, 'Shoulders': 20 }, motionType: 'hold', isCompound: false
    }
  ]
};

export const WORKOUT_SCHEDULE: Record<number, WorkoutDay | null> = {
  0: null, // Sunday: Rest
  1: PUSH_A_DAY, // Monday
  2: PULL_A_DAY, // Tuesday
  3: LEGS_POWER_DAY, // Wednesday
  4: PUSH_B_DAY, // Thursday
  5: PULL_B_DAY, // Friday
  6: LEGS_HYPERTROPHY_DAY, // Saturday
};

export const ALL_WORKOUTS = [PUSH_A_DAY, PULL_A_DAY, LEGS_POWER_DAY, PUSH_B_DAY, PULL_B_DAY, LEGS_HYPERTROPHY_DAY];
