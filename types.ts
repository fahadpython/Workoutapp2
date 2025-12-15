
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Triceps' | 'Biceps' | 'Abs' | 'Warmup' | 'Cardio' | 'Other';

export type ExerciseType = 'weighted' | 'cardio';

export type MotionType = 'press' | 'pull' | 'hinge' | 'curl' | 'raise' | 'hold' | 'fly' | 'cardio' | 'squat';

export interface UserProfile {
  id: string;
  name: string;
  created: number;
}

export interface PacerPhase {
  action: string; // Display text: "Lower", "Press", "Pull"
  duration: number; // Seconds
  voiceCue: string; // TTS text
  breathing: 'Inhale' | 'Exhale' | 'Hold';
  startColor?: string; // Optional color override
}

export interface PacerConfig {
  phases: PacerPhase[];
  startDelay: number;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number;
  reps: string; // e.g., "8-10" or "10 mins"
  restSeconds: number;
  cues: string; // Short summary for list view
  setup: string; // New: Detailed Setup
  visualize: string; // New: Mental Cue
  action: string; // New: Execution instructions
  muscleFocus: string; // Display text like "Upper Chest"
  targetGroup: MuscleGroup; // For analytics aggregation
  feeling: string; // "How it should feel"
  isWarmup?: boolean;
  isTimed?: boolean; // New: For planks, wall sits, etc.
  pacer: PacerConfig; // New bio-mechanic pacer
  metValue: number; // Metabolic Equivalent for calorie calc
  muscleSplit?: Record<string, number>; // Percentage breakdown
  motionType?: MotionType; // Animation type
  isCompound?: boolean; // For algorithmic weight jumps
  alternatives?: Exercise[]; // Swappable exercises
  swapLabel?: string; // Reason for swap (e.g. "Better Isolation")
  benchAngle?: number; // Optional: Required bench angle in degrees
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g., "Push (Chest/Shoulders/Tri)"
  focus: string;
  exercises: Exercise[];
}

export interface SetLog {
  weight: number; // For cardio: Distance
  reps: number; // For cardio: Time (minutes)
  rpe?: number; // New: Rate of Perceived Exertion (1-10)
  completed: boolean;
  timestamp: number;
  isDropSet?: boolean; 
  isMonsterSet?: boolean;
  calories?: number;
}

export interface ActiveTimer {
  startTime: number;
  duration: number; // Total duration in seconds
  endTime: number; // Timestamp when it ends
  exerciseId: string;
}

export interface SessionData {
  workoutId: string;
  startTime: number;
  // exerciseId -> array of completed sets
  completedExercises: Record<string, SetLog[]>; 
  // Custom exercises added during this session
  customExercises: Exercise[];
  activeExerciseId: string | null; 
  activeTimer: ActiveTimer | null;
  isFinished: boolean;
  swaps?: Record<string, string>; // Maps originalExerciseId -> chosenExerciseId
}

export interface UserStats {
  bodyWeight: number;
  waterIntake: number; // in ml
  creatineTaken: boolean; // Daily toggle state
  creatineHistory: string[]; // Array of ISO dates (YYYY-MM-DD) for historical tracking
  lastUpdated: string; // ISO date string YYYY-MM-DD
}

export interface HistoryLog {
  date: string; // ISO date
  weight: number;
  reps: number;
  rpe?: number; // New: RPE History
  setNumber: number;
}

export interface ExerciseHistory {
  logs: HistoryLog[];
  lastSession?: {
    date: string;
    topSet: { weight: number; reps: number; rpe?: number };
  };
}

export interface DashboardStats {
  weeklyVolume: Record<string, number>; // Sets per muscle this week
  missedMuscles: string[];
  personalRecords: Record<string, { weight: number; exerciseName: string; date: string }>;
  bestLift: { weight: number; exerciseName: string } | null;
  totalCalories: number; // Weekly estimate
}

export interface CoachRecommendation {
  type: 'INCREASE' | 'MAINTAIN' | 'DECREASE' | 'BASELINE';
  targetWeight: number;
  targetReps: string;
  reason: string;
}

export interface MotionCalibration {
  exerciseId: string;
  avgTime: number; // in ms
  peakForce: number; // in G
  position: 'Pocket' | 'Armband' | 'Hand';
  calibratedAt: string; // ISO Date
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
