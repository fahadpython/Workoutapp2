
import { Exercise, MotionType } from '../types';

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
  rawDebug?: string;
}

export class MotionProcessor {
  // Configuration
  private position: Position;
  private tempo: TempoConfig;
  private motionType: MotionType;
  private exerciseName: string;

  // State
  private currentPhase: MotionPhase = 'IDLE';
  private lastPhaseChangeTime: number = 0;
  private repCount: number = 0;
  private repStartTime: number = 0;
  
  // Rep Logic
  private hasReachedBottom: boolean = false;
  private hasReachedTop: boolean = false;
  
  // Calibration (Range of Motion)
  private minRawValue: number = Infinity;
  private maxRawValue: number = -Infinity;
  private calibratedMin: number = 0;
  private calibratedMax: number = 0;
  private isCalibrated: boolean = false;
  private calibrationDirection: 'NORMAL' | 'INVERTED' = 'NORMAL'; // Normal = Increasing Value goes DOWN

  // Smoothing
  private lastSmoothedValue: number = 0;
  private velocity: number = 0; 
  private smoothingFactor: number = 0.15; // Increased smoothing

  // Fatigue Management
  private fatigueFactor: number = 0; // Increases by 0.05 per rep

  // Callbacks
  private onUpdate: (event: MotionEvent) => void;

  constructor(
    exercise: Exercise, 
    position: Position, 
    onUpdate: (event: MotionEvent) => void
  ) {
    this.exerciseName = exercise.name.toLowerCase();
    this.motionType = exercise.motionType || 'press';
    this.position = position;
    this.onUpdate = onUpdate;
    
    // Parse Tempo
    const phases = exercise.pacer.phases;
    this.tempo = {
      eccentric: phases.find(p => ['LOWER', 'DOWN', 'OPEN'].some(k => p.action.includes(k)))?.duration || 3,
      bottom: phases.find(p => ['STRETCH', 'HOLD', 'BOTTOM'].some(k => p.action.includes(k)))?.duration || 1,
      concentric: phases.find(p => ['PRESS', 'PULL', 'UP', 'DRIVE', 'CURL'].some(k => p.action.includes(k)))?.duration || 1.5,
      top: 1
    };
  }

  public process(alpha: number | null, beta: number | null, gamma: number | null) {
    if (alpha === null || beta === null || gamma === null) return;

    // 1. Get Axis
    const rawValue = this.getRelevantAxisValue(beta, gamma);

    // 2. Smoothing
    const smoothedValue = this.lastSmoothedValue + this.smoothingFactor * (rawValue - this.lastSmoothedValue);
    this.velocity = smoothedValue - this.lastSmoothedValue;
    this.lastSmoothedValue = smoothedValue;

    // 3. Logic Branch
    if (this.currentPhase === 'CALIB_RECORDING') {
      this.handleCalibrationRecording(smoothedValue);
    } else if (this.currentPhase !== 'CALIB_COUNTDOWN') {
      this.handleWorkoutLoop(smoothedValue);
    }
  }

  public startCalibrationCountdown() {
    this.currentPhase = 'CALIB_COUNTDOWN';
    this.repCount = 0;
    // Emit initial event to UI
    this.emitState(0, "Get Ready...", 'WARNING');
  }

  public startCalibrationRecording() {
    this.currentPhase = 'CALIB_RECORDING';
    this.minRawValue = Infinity;
    this.maxRawValue = -Infinity;
    // Reset ROM
    this.emitState(0, this.getStartCue(), 'WARNING');
  }

  public finishCalibration() {
    // Add buffer
    const range = this.maxRawValue - this.minRawValue;
    if (range < 10) {
        // Did not move enough
        this.emitState(0, "Movement too small. Try again.", "WARNING");
        return false;
    }

    // Determine Direction automatically
    // If we assume user starts at TOP/START position
    // For Squat (Pocket): Stand (90) -> Sit (0). Value Decreases.
    // For Curl (Hand): Hang (-90) -> Curl (45). Value Increases.
    
    // We define: Progress 0 = Start Position, Progress 1 = Max Stretch/Contraction
    // Logic: If the LAST recorded value is closer to MAX, then Start must be MIN (Normal).
    // If LAST recorded value is closer to MIN, then Start must be MAX (Inverted).
    // Actually, simple heuristic:
    // Pocket/Squat: Decreasing = Down.
    // Hand/Curl: Increasing = Up.
    
    if (this.position === 'POCKET') {
        this.calibrationDirection = 'INVERTED'; // 90(Start) -> 0(End)
    } else {
        this.calibrationDirection = 'NORMAL'; // -90(Start) -> 90(End)
    }

    this.calibratedMin = this.minRawValue;
    this.calibratedMax = this.maxRawValue;
    this.isCalibrated = true;
    this.currentPhase = 'IDLE';
    this.hasReachedBottom = false;
    this.hasReachedTop = true;
    this.emitState(0, "Ready. Go!", "GOOD");
    return true;
  }

  private getRelevantAxisValue(beta: number, gamma: number): number {
    // Pocket: Beta (Tilt forward/back)
    if (this.position === 'POCKET') return beta;
    // Hand: Beta (Tilt of phone in hand)
    return beta; 
  }

  private getNormalizedProgress(rawValue: number): number {
    if (!this.isCalibrated) return 0;

    const clamped = Math.max(Math.min(rawValue, this.maxRawValue), this.minRawValue);
    let pct = (clamped - this.calibratedMin) / (this.calibratedMax - this.calibratedMin);

    if (this.calibrationDirection === 'INVERTED') {
        return 1 - pct;
    }
    return pct;
  }

  private handleCalibrationRecording(val: number) {
    if (val < this.minRawValue) this.minRawValue = val;
    if (val > this.maxRawValue) this.maxRawValue = val;
    
    // Visualize raw movement range
    // Since we don't know min/max yet, we just jitter or show raw
    this.emitState(0.5, "Move full range...", 'WARNING');
  }

  private handleWorkoutLoop(rawValue: number) {
    const progress = this.getNormalizedProgress(rawValue);
    const now = Date.now();
    const phaseDuration = (now - this.lastPhaseChangeTime) / 1000;

    // --- FATIGUE COMPENSATION ---
    // As reps increase, we allow slightly slower times without penalty
    // Factor: +5% allowed time per rep after rep 5
    const fatigueMultiplier = this.repCount > 5 ? 1 + ((this.repCount - 5) * 0.05) : 1.0;

    let targetProgress = 0; // For Ghost Pacer

    // --- STATE MACHINE ---
    switch (this.currentPhase) {
      case 'IDLE':
      case 'TOP_HOLD':
        targetProgress = 0;
        // Start Eccentric if we move past 15% ROM
        if (progress > 0.15) {
          this.transitionTo('ECCENTRIC');
          this.hasReachedBottom = false;
        }
        break;

      case 'ECCENTRIC':
        // Moving 0 -> 1
        // Calculate Target Pacer Progress (Linear 0 to 1 over eccentric time)
        targetProgress = Math.min(1, phaseDuration / (this.tempo.eccentric * fatigueMultiplier));
        
        // Speed Check
        if (targetProgress < progress - 0.2) {
             // You are ahead of target (Too Fast)
             this.emitState(progress, "Too Fast! Resist.", 'TOO_FAST');
        } else {
             this.emitState(progress, this.getEccentricCue(), 'PERFECT');
        }

        // Transition
        if (progress > 0.85) {
          this.hasReachedBottom = true;
          this.transitionTo('BOTTOM_HOLD');
        }
        break;

      case 'BOTTOM_HOLD':
        targetProgress = 1;
        // Holding at 1
        const requiredHold = this.tempo.bottom;
        
        if (progress < 0.80) {
            // Moved up early?
            if (phaseDuration < requiredHold * 0.5) {
                // Bounced
                this.emitState(progress, "Don't Bounce!", 'TOO_FAST');
                this.transitionTo('CONCENTRIC');
            } else {
                this.transitionTo('CONCENTRIC');
            }
        } else {
            // Still holding
            if (phaseDuration > requiredHold + 1.0) {
                 this.emitState(progress, "Power Up Now!", 'TOO_SLOW');
            } else {
                 this.emitState(progress, "Hold...", 'PERFECT');
            }
        }
        break;

      case 'CONCENTRIC':
        // Moving 1 -> 0
        targetProgress = Math.max(0, 1 - (phaseDuration / (this.tempo.concentric * fatigueMultiplier)));
        
        // Guidance
        this.emitState(progress, this.getConcentricCue(), 'PERFECT');

        // Transition
        if (progress < 0.15) {
            if (this.hasReachedBottom) {
                this.repCount++;
                this.hasReachedBottom = false;
                this.transitionTo('TOP_HOLD', { type: 'GOOD', msg: `${this.repCount} Reps` });
            } else {
                // False rep (didn't hit bottom)
                this.transitionTo('IDLE');
            }
        }
        break;
    }
    
    // Add computed target to event for Game Mode
    this.lastEvent = {
        ...this.lastEvent,
        progress,
        targetProgress
    };
    this.onUpdate(this.lastEvent);
  }

  private lastEvent: MotionEvent = { phase: 'IDLE', progress: 0, targetProgress: 0, repCount: 0 };

  private transitionTo(newPhase: MotionPhase, feedback?: { type: FeedbackType; msg: string }) {
    this.currentPhase = newPhase;
    this.lastPhaseChangeTime = Date.now();
    if (feedback) {
        this.emitState(0, feedback.msg, feedback.type); // progress gets overwritten in loop
    }
  }

  private emitState(progress: number, feedbackMsg?: string, feedbackType?: FeedbackType) {
    this.lastEvent = {
      phase: this.currentPhase,
      progress,
      targetProgress: 0, // Calculated in loop
      repCount: this.repCount,
      feedback: feedbackMsg,
      feedbackType
    };
    this.onUpdate(this.lastEvent);
  }

  // --- CUE GENERATORS ---
  private getStartCue() {
      if (this.motionType === 'press' || this.motionType === 'squat') return "Start at TOP (Lockout)";
      if (this.motionType === 'pull' || this.motionType === 'curl') return "Start at BOTTOM (Hang)";
      return "Start at Resting Pos";
  }

  private getEccentricCue() {
      if (this.motionType === 'press') return "Control Down...";
      if (this.motionType === 'squat') return "Sit Back Slow...";
      if (this.motionType === 'pull' || this.motionType === 'curl') return "Release Slowly...";
      return "Slow...";
  }

  private getConcentricCue() {
      if (this.motionType === 'press') return "DRIVE UP!";
      if (this.motionType === 'squat') return "PUSH FLOOR!";
      if (this.motionType === 'pull') return "PULL HARD!";
      if (this.motionType === 'curl') return "SQUEEZE UP!";
      return "Power!";
  }
}
