
import { Exercise, MotionType, MotionCalibration } from '../types';

export type Position = 'POCKET' | 'HAND' | 'CHEST';
export type MotionPhase = 'IDLE' | 'ECCENTRIC' | 'BOTTOM_HOLD' | 'CONCENTRIC' | 'TOP_HOLD' | 'CALIB_COUNTDOWN' | 'CALIB_RECORDING';
export type FeedbackType = 'PERFECT' | 'TOO_FAST' | 'TOO_SLOW' | 'GOOD' | 'WARNING';

export interface TempoConfig {
  eccentric: number; // Seconds down
  bottom: number;    // Seconds hold
  concentric: number;// Seconds up
  top: number;       // Seconds reset
}

export interface MotionEvent {
  phase: MotionPhase;
  progress: number; // 0.0 (Start) to 1.0 (End/Deep)
  targetProgress: number; // Where they SHOULD be (for Game Pacer)
  repCount: number;
  feedback?: string;
  feedbackType?: FeedbackType;
  debug?: string;
}

export class MotionProcessor {
  // Configuration
  private position: Position;
  private tempo: TempoConfig;
  private motionType: MotionType;
  private exerciseName: string;
  private isManualMode: boolean = false;

  // State
  private currentPhase: MotionPhase = 'IDLE';
  private lastPhaseChangeTime: number = 0;
  private repCount: number = 0;
  
  // Rep Logic
  private hasReachedBottom: boolean = false;
  
  // Calibration (Range of Motion)
  private minRawValue: number = Infinity;
  private maxRawValue: number = -Infinity;
  private calibratedMin: number = 0;
  private calibratedMax: number = 0;
  private isCalibrated: boolean = false;
  private calibrationDirection: 'NORMAL' | 'INVERTED' = 'NORMAL'; 
  
  // Start Position Logic
  private startsAtTop: boolean = true; // True = Lower first (Bench), False = Lift first (Curl)

  // Smoothing
  private lastSmoothedValue: number = 0;
  private smoothingFactor: number = 0.15; 
  private velocity: number = 0;

  // Fatigue Management
  private fatigueFactor: number = 0; 

  // Callbacks
  private onUpdate: (event: MotionEvent) => void;
  private manualInterval: any = null;

  constructor(
    exercise: Exercise, 
    onUpdate: (event: MotionEvent) => void,
    savedCalibration: MotionCalibration | null
  ) {
    this.exerciseName = exercise.name.toLowerCase();
    this.motionType = exercise.motionType || 'press';
    this.position = exercise.targetGroup === 'Legs' ? 'POCKET' : 'HAND';
    this.onUpdate = onUpdate;
    
    // Parse Tempo
    const phases = exercise.pacer.phases;
    this.tempo = {
      eccentric: phases.find(p => ['LOWER', 'DOWN', 'OPEN', 'RELEASE'].some(k => p.action.includes(k)))?.duration || 3,
      bottom: phases.find(p => ['STRETCH', 'HOLD', 'BOTTOM', 'SQUEEZE', 'PAUSE'].some(k => p.action.includes(k)))?.duration || 1,
      concentric: phases.find(p => ['PRESS', 'PULL', 'UP', 'DRIVE', 'CURL', 'RAISE'].some(k => p.action.includes(k)))?.duration || 1.5,
      top: 1
    };

    // Determine Start Position based on Phase Order
    // If first phase is LOWER -> Starts at TOP (Bench, Squat)
    // If first phase is PULL/CURL -> Starts at BOTTOM (Row, Curl)
    const firstAction = phases[0]?.action || '';
    if (['PRESS', 'PULL', 'UP', 'DRIVE', 'CURL', 'RAISE'].some(k => firstAction.includes(k))) {
        this.startsAtTop = false; // Must lift first
    } else {
        this.startsAtTop = true; // Must lower first
    }

    // Load Calibration if exists
    if (savedCalibration) {
        this.calibratedMin = savedCalibration.calibratedMin;
        this.calibratedMax = savedCalibration.calibratedMax;
        this.calibrationDirection = savedCalibration.calibrationDirection;
        this.isCalibrated = true;
        this.minRawValue = this.calibratedMin; // Initialize running min/max
        this.maxRawValue = this.calibratedMax;
    }
  }

  // --- PUBLIC METHODS ---

  public cleanup() {
      if (this.manualInterval) clearInterval(this.manualInterval);
  }

  public setManualMode(enabled: boolean) {
      this.isManualMode = enabled;
      if (enabled) {
          this.isCalibrated = true; // Bypass calibration
          this.startManualLoop();
      } else {
          this.cleanup();
      }
  }

  public getCalibrationData(): MotionCalibration {
      return {
          exerciseId: '', // Filled by consumer
          calibratedMin: this.calibratedMin,
          calibratedMax: this.calibratedMax,
          calibrationDirection: this.calibrationDirection,
          confidenceScore: 100,
          lastUpdated: Date.now()
      };
  }

  public startCalibrationCountdown() {
    this.currentPhase = 'CALIB_COUNTDOWN';
    this.repCount = 0;
    
    // Provide explicit instruction based on start pos
    const startMsg = this.startsAtTop 
        ? "Hold weight at TOP (Lockout)" 
        : "Hold weight at BOTTOM (Stretch)";
    
    this.emitState(this.startsAtTop ? 0 : 0, startMsg, 'WARNING');
  }

  public startCalibrationRecording() {
    this.currentPhase = 'CALIB_RECORDING';
    // Don't reset min/max here if we want to support re-calibration refinement
    // But for a hard reset calibration:
    this.minRawValue = Infinity;
    this.maxRawValue = -Infinity;
    
    const moveMsg = this.startsAtTop
        ? "Lower slowly... then Press up"
        : "Lift up... then Lower slowly";

    this.emitState(0, moveMsg, 'WARNING');
  }

  public finishCalibration(): boolean {
    const range = this.maxRawValue - this.minRawValue;
    if (range < 5) { // Very permissive threshold
        this.emitState(0, "Movement too small. Try again.", "WARNING");
        return false;
    }

    // Determine Direction automatically based on sensor heuristic
    if (this.position === 'POCKET') {
        this.calibrationDirection = 'INVERTED'; 
    } else {
        // For Hand:
        // If curl: Up = High Beta. Down = Low Beta.
        // If press: Up = High Beta? 
        // Heuristic: Just assume NORMAL for hand unless proved otherwise
        this.calibrationDirection = 'NORMAL'; 
    }

    this.calibratedMin = this.minRawValue;
    this.calibratedMax = this.maxRawValue;
    this.isCalibrated = true;
    this.currentPhase = 'IDLE';
    this.emitState(0, "Ready. Go!", "GOOD");
    return true;
  }

  public process(alpha: number | null, beta: number | null, gamma: number | null) {
    if (this.isManualMode) return;
    if (alpha === null || beta === null || gamma === null) return;

    // 1. Get Axis
    const rawValue = this.getRelevantAxisValue(beta, gamma);

    // 2. Smoothing
    const smoothedValue = this.lastSmoothedValue + this.smoothingFactor * (rawValue - this.lastSmoothedValue);
    this.velocity = smoothedValue - this.lastSmoothedValue;
    this.lastSmoothedValue = smoothedValue;

    // 3. Update Running Min/Max (ML Learning during set)
    // We allow the range to expand slightly if user goes deeper
    if (this.currentPhase !== 'CALIB_COUNTDOWN') {
        if (smoothedValue < this.minRawValue) this.minRawValue = smoothedValue;
        if (smoothedValue > this.maxRawValue) this.maxRawValue = smoothedValue;
        
        // Dynamic Adaptation: If saved calibration was too small, expand it on the fly
        if (this.isCalibrated) {
             if (smoothedValue < this.calibratedMin) this.calibratedMin = smoothedValue;
             if (smoothedValue > this.calibratedMax) this.calibratedMax = smoothedValue;
        }
    }

    // 4. Logic Branch
    if (this.currentPhase === 'CALIB_RECORDING') {
      // Just track min/max (handled above)
      this.emitState(0.5, "Move full range...", 'WARNING');
    } else if (this.currentPhase !== 'CALIB_COUNTDOWN') {
      this.handleWorkoutLoop(smoothedValue);
    }
  }

  // --- INTERNAL LOGIC ---

  private getRelevantAxisValue(beta: number, gamma: number): number {
    return beta; // Beta (Tilt) is almost always the primary driver for gym motions
  }

  private getNormalizedProgress(rawValue: number): number {
    if (!this.isCalibrated) return 0;

    const clamped = Math.max(Math.min(rawValue, this.calibratedMax), this.calibratedMin);
    let pct = (clamped - this.calibratedMin) / (this.calibratedMax - this.calibratedMin);

    if (this.calibrationDirection === 'INVERTED') {
        return 1 - pct;
    }
    return pct;
  }

  private startManualLoop() {
      // Manual Mode: Simulate a perfect rep loop based on tempo
      this.currentPhase = 'IDLE';
      this.transitionTo(this.startsAtTop ? 'ECCENTRIC' : 'CONCENTRIC');
      
      let startTime = Date.now();
      
      this.manualInterval = setInterval(() => {
          const now = Date.now();
          const phaseDuration = (now - this.lastPhaseChangeTime) / 1000;
          let progress = 0;
          let targetProgress = 0;

          // Simple State Machine for Manual
          switch(this.currentPhase) {
              case 'ECCENTRIC':
                  progress = Math.min(1, phaseDuration / this.tempo.eccentric);
                  targetProgress = progress;
                  if (progress >= 1) this.transitionTo('BOTTOM_HOLD');
                  break;
              case 'BOTTOM_HOLD':
                  progress = 1;
                  targetProgress = 1;
                  if (phaseDuration >= this.tempo.bottom) this.transitionTo('CONCENTRIC');
                  break;
              case 'CONCENTRIC':
                  progress = Math.max(0, 1 - (phaseDuration / this.tempo.concentric));
                  targetProgress = progress;
                  if (progress <= 0) {
                      this.repCount++;
                      this.transitionTo('TOP_HOLD', { type: 'GOOD', msg: `${this.repCount}` });
                  }
                  break;
              case 'TOP_HOLD':
                  progress = 0;
                  targetProgress = 0;
                  if (phaseDuration >= this.tempo.top) this.transitionTo('ECCENTRIC');
                  break;
          }

          this.emitState(progress, this.getPhaseCue(this.currentPhase), 'PERFECT');
      }, 50);
  }

  private handleWorkoutLoop(rawValue: number) {
    const progress = this.getNormalizedProgress(rawValue);
    const now = Date.now();
    const phaseDuration = (now - this.lastPhaseChangeTime) / 1000;
    const fatigueMultiplier = this.repCount > 5 ? 1 + ((this.repCount - 5) * 0.05) : 1.0;

    // Determine Logic based on Exercise Type (Start Top vs Start Bottom)
    // Standard (Bench): Idle -> Eccentric (Down) -> Bottom -> Concentric (Up)
    // Inverted (Curl): Idle -> Concentric (Up) -> Top -> Eccentric (Down)

    if (this.startsAtTop) {
        this.handleStandardLoop(progress, phaseDuration, fatigueMultiplier);
    } else {
        this.handleInvertedLoop(progress, phaseDuration, fatigueMultiplier);
    }
  }

  private handleStandardLoop(progress: number, phaseDuration: number, fatigue: number) {
      // 0 = Top, 1 = Bottom
      switch (this.currentPhase) {
          case 'IDLE':
          case 'TOP_HOLD':
            if (progress > 0.15) this.transitionTo('ECCENTRIC');
            break;
          case 'ECCENTRIC': // Going 0 -> 1
            const target = Math.min(1, phaseDuration / (this.tempo.eccentric * fatigue));
            this.checkSpeed(progress, target, 0.2);
            if (progress > 0.85) this.transitionTo('BOTTOM_HOLD');
            break;
          case 'BOTTOM_HOLD': // Holding at 1
            if (progress < 0.80 && phaseDuration > 0.5) this.transitionTo('CONCENTRIC');
            break;
          case 'CONCENTRIC': // Going 1 -> 0
            if (progress < 0.15) {
                this.repCount++;
                this.transitionTo('TOP_HOLD', { type: 'GOOD', msg: `${this.repCount}` });
            }
            break;
      }
      this.emitState(progress, this.getPhaseCue(this.currentPhase), this.lastEvent.feedbackType);
  }

  private handleInvertedLoop(progress: number, phaseDuration: number, fatigue: number) {
      // 0 = Bottom (Start), 1 = Top (Peak)
      switch (this.currentPhase) {
          case 'IDLE':
          case 'TOP_HOLD': // Actually Bottom in this context, confusing naming but "Rest" phase
             if (progress > 0.15) this.transitionTo('CONCENTRIC');
             break;
          case 'CONCENTRIC': // Going 0 -> 1 (Lifting)
             const target = Math.min(1, phaseDuration / (this.tempo.concentric * fatigue));
             // Don't penalize fast concentric usually
             if (progress > 0.85) this.transitionTo('BOTTOM_HOLD'); // Peak Hold
             break;
          case 'BOTTOM_HOLD': // Holding at 1 (Peak)
             if (progress < 0.80 && phaseDuration > 0.5) this.transitionTo('ECCENTRIC');
             break;
          case 'ECCENTRIC': // Going 1 -> 0 (Lowering)
             const eccTarget = Math.max(0, 1 - (phaseDuration / (this.tempo.eccentric * fatigue)));
             // Speed check: If progress (real) is lower than target, we dropped too fast
             if (progress < eccTarget - 0.2) this.lastEvent.feedbackType = 'TOO_FAST';
             else this.lastEvent.feedbackType = 'PERFECT';

             if (progress < 0.15) {
                 this.repCount++;
                 this.transitionTo('TOP_HOLD', { type: 'GOOD', msg: `${this.repCount}` });
             }
             break;
      }
      this.emitState(progress, this.getPhaseCue(this.currentPhase), this.lastEvent.feedbackType);
  }

  private checkSpeed(actual: number, target: number, tol: number) {
      // Standard: target increases 0->1. If actual > target + tol, Too Fast.
      if (actual > target + tol) this.lastEvent.feedbackType = 'TOO_FAST';
      else this.lastEvent.feedbackType = 'PERFECT';
  }

  private lastEvent: MotionEvent = { phase: 'IDLE', progress: 0, targetProgress: 0, repCount: 0 };

  private transitionTo(newPhase: MotionPhase, feedback?: { type: FeedbackType; msg: string }) {
    this.currentPhase = newPhase;
    this.lastPhaseChangeTime = Date.now();
    if (feedback) {
        this.emitState(this.lastEvent.progress, feedback.msg, feedback.type); 
    }
  }

  private emitState(progress: number, feedbackMsg?: string, feedbackType?: FeedbackType) {
    this.lastEvent = {
      phase: this.currentPhase,
      progress,
      targetProgress: 0, // Calculated by GamePacer usually, or could be passed here
      repCount: this.repCount,
      feedback: feedbackMsg,
      feedbackType: feedbackType || this.lastEvent.feedbackType,
      debug: `Raw: ${this.lastSmoothedValue.toFixed(0)}`
    };
    this.onUpdate(this.lastEvent);
  }

  private getPhaseCue(phase: MotionPhase): string {
      switch(phase) {
          case 'ECCENTRIC': return "Control Down...";
          case 'CONCENTRIC': return "Power!";
          case 'BOTTOM_HOLD': return "Hold...";
          case 'TOP_HOLD': return "Reset";
          default: return "";
      }
  }
}
