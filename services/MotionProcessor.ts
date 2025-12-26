
import { Exercise } from '../types';

export type Position = 'POCKET' | 'HAND' | 'CHEST';
export type MotionPhase = 'IDLE' | 'ECCENTRIC' | 'BOTTOM_HOLD' | 'CONCENTRIC' | 'TOP_HOLD' | 'CALIBRATING';
export type FeedbackType = 'PERFECT' | 'TOO_FAST' | 'TOO_SLOW' | 'GOOD';

export interface TempoConfig {
  eccentric: number; // Seconds down
  bottom: number;    // Seconds hold
  concentric: number;// Seconds up
  top: number;       // Seconds reset
}

export interface MotionEvent {
  phase: MotionPhase;
  progress: number; // 0.0 to 1.0 (Normalized ROM)
  repCount: number;
  feedback?: string;
  feedbackType?: FeedbackType;
}

export class MotionProcessor {
  // Configuration
  private position: Position;
  private tempo: TempoConfig;
  private exerciseName: string;

  // State
  private currentPhase: MotionPhase = 'IDLE';
  private lastPhaseChangeTime: number = 0;
  private repCount: number = 0;
  
  // Calibration (Range of Motion)
  private minRawValue: number = Infinity;
  private maxRawValue: number = -Infinity;
  private calibratedMin: number = 0;
  private calibratedMax: number = 0;
  private isCalibrated: boolean = false;

  // Smoothing
  private lastSmoothedValue: number = 0;
  private velocity: number = 0; // rate of change of position per frame
  private smoothingFactor: number = 0.1; // Low pass filter alpha

  // Callbacks
  private onUpdate: (event: MotionEvent) => void;

  constructor(
    exercise: Exercise, 
    position: Position, 
    onUpdate: (event: MotionEvent) => void
  ) {
    this.exerciseName = exercise.name.toLowerCase();
    this.position = position;
    this.onUpdate = onUpdate;
    
    // Parse Tempo from Pacer (default to 3-1-1-1 if missing)
    const phases = exercise.pacer.phases;
    this.tempo = {
      eccentric: phases.find(p => ['LOWER', 'DOWN'].some(k => p.action.includes(k)))?.duration || 3,
      bottom: phases.find(p => ['STRETCH', 'HOLD', 'BOTTOM'].some(k => p.action.includes(k)))?.duration || 1,
      concentric: phases.find(p => ['PRESS', 'PULL', 'UP', 'DRIVE'].some(k => p.action.includes(k)))?.duration || 1,
      top: 1
    };
  }

  /**
   * Main Input Loop: Feeds raw sensor data into the processor.
   * Call this from DeviceOrientationEvent listener.
   */
  public process(alpha: number | null, beta: number | null, gamma: number | null) {
    if (alpha === null || beta === null || gamma === null) return;

    // 1. Axis Remapping: Get the relevant axis value based on context
    const rawValue = this.getRelevantAxisValue(beta, gamma);

    // 2. Smoothing (Low Pass Filter)
    // smoothed = prev + alpha * (new - prev)
    const smoothedValue = this.lastSmoothedValue + this.smoothingFactor * (rawValue - this.lastSmoothedValue);
    this.velocity = smoothedValue - this.lastSmoothedValue;
    this.lastSmoothedValue = smoothedValue;

    // 3. Logic Branch
    if (this.currentPhase === 'CALIBRATING') {
      this.handleCalibration(smoothedValue);
    } else {
      this.handleWorkoutLoop(smoothedValue);
    }
  }

  public startCalibration() {
    this.currentPhase = 'CALIBRATING';
    this.minRawValue = Infinity;
    this.maxRawValue = -Infinity;
    this.emitState(0);
  }

  public finishCalibration() {
    // Lock in the ROM
    // Add buffer to ensure we don't clip 0% or 100% too easily
    this.calibratedMin = this.minRawValue; 
    this.calibratedMax = this.maxRawValue;
    this.isCalibrated = true;
    this.currentPhase = 'IDLE';
    this.emitState(0);
  }

  /**
   * CHALLENGE 1: AXIS REMAPPING
   * Standardizes input regardless of phone position.
   */
  private getRelevantAxisValue(beta: number, gamma: number): number {
    // Beta: Front-to-Back Tilt (-180 to 180). 
    // Gamma: Left-to-Right Tilt (-90 to 90).

    if (this.position === 'POCKET') {
      // Squats/Lunges: Thigh goes vertical (90) to horizontal (0).
      // We track Beta.
      return beta; 
    } 
    
    if (this.position === 'HAND') {
      // Curls/Presses.
      if (this.exerciseName.includes('curl')) {
        // Forearm vertical down (-90) to vertical up (+90ish).
        return beta; 
      }
      if (this.exerciseName.includes('press')) {
        // Overhead press: orientation stays mostly vertical, requires acceleration.
        // Fallback to Beta for tilt detection if form breaks.
        return beta; 
      }
    }

    // Default fallback
    return beta;
  }

  /**
   * Normalizes raw sensor data to 0.0 - 1.0 based on calibration
   */
  private getNormalizedProgress(rawValue: number): number {
    if (!this.isCalibrated) return 0;

    // Clamp value
    const clamped = Math.max(Math.min(rawValue, this.maxRawValue), this.minRawValue);
    
    // Calculate percentage
    let pct = (clamped - this.calibratedMin) / (this.calibratedMax - this.calibratedMin);

    // INVERSION LOGIC:
    // Determine if "More Value" means "Down" or "Up".
    // Example: Squat (Pocket). Standing = 90deg (Max), Sitting = 0deg (Min).
    // So Eccentric (Going Down) means Value is DECREASING.
    // We want 0.0 = Top (Start), 1.0 = Bottom (End).
    
    const isValueDecreasingOnEccentric = (this.position === 'POCKET'); 
    
    if (isValueDecreasingOnEccentric) {
        return 1 - pct;
    }
    return pct;
  }

  /**
   * CHALLENGE 2: TEMPO POLICE & CHALLENGE 4: STATE MACHINE
   */
  private handleWorkoutLoop(rawValue: number) {
    const progress = this.getNormalizedProgress(rawValue);
    const now = Date.now();
    const phaseDuration = (now - this.lastPhaseChangeTime) / 1000; // Seconds

    // State Machine Transitions
    switch (this.currentPhase) {
      case 'IDLE':
        // Wait for movement start (cross 10% ROM)
        if (progress > 0.10) {
          this.transitionTo('ECCENTRIC');
        }
        break;

      case 'ECCENTRIC':
        // We are going down. 
        // Transition: Reached bottom (progress > 0.9) AND Velocity is near 0 or flipped
        if (progress > 0.90) {
          // Check Tempo
          const feedback = this.checkTempo(phaseDuration, this.tempo.eccentric);
          this.transitionTo('BOTTOM_HOLD', feedback);
        } else if (progress < 0.05) {
           // Aborted rep
           this.transitionTo('IDLE');
        }
        break;

      case 'BOTTOM_HOLD':
        // Holding at bottom.
        // Transition: Started moving up (progress < 0.85)
        if (progress < 0.85) {
           // We ignore hold tempo policing for MVP, strictly check if they bounced
           if (phaseDuration < this.tempo.bottom * 0.5) {
               // Bounced out of the hole
               this.transitionTo('CONCENTRIC', { type: 'TOO_FAST', msg: "Don't bounce!" });
           } else {
               this.transitionTo('CONCENTRIC');
           }
        }
        break;

      case 'CONCENTRIC':
        // Going up.
        // Transition: Reached top (progress < 0.1)
        if (progress < 0.10) {
           const feedback = this.checkTempo(phaseDuration, this.tempo.concentric, true); // True = faster is okay
           this.repCount++;
           this.transitionTo('TOP_HOLD', feedback);
        }
        break;

      case 'TOP_HOLD':
        // Reset or Next Rep
        if (phaseDuration > this.tempo.top) {
            this.transitionTo('IDLE');
        }
        break;
    }

    this.emitState(progress);
  }

  private handleCalibration(val: number) {
    if (val < this.minRawValue) this.minRawValue = val;
    if (val > this.maxRawValue) this.maxRawValue = val;
    // Just pass raw 0-1 mock for UI visualization during calib
    this.emitState(0.5); 
  }

  private transitionTo(newPhase: MotionPhase, feedback?: { type: FeedbackType; msg: string }) {
    this.currentPhase = newPhase;
    this.lastPhaseChangeTime = Date.now();
    
    if (feedback) {
        this.emitState(0, feedback.msg, feedback.type);
    }
  }

  private checkTempo(actual: number, target: number, fastIsOk: boolean = false): { type: FeedbackType; msg: string } {
    // Tolerance: 20%
    const min = target * 0.8; 
    
    if (actual < min && !fastIsOk) {
        return { type: 'TOO_FAST', msg: 'Slow Down!' };
    }
    // We generally don't punish "Too Slow" for hypertrophy unless it's excessive
    return { type: 'PERFECT', msg: 'Good Tempo' };
  }

  private emitState(progress: number, feedbackMsg?: string, feedbackType?: FeedbackType) {
    this.onUpdate({
      phase: this.currentPhase,
      progress,
      repCount: this.repCount,
      feedback: feedbackMsg,
      feedbackType
    });
  }
}
