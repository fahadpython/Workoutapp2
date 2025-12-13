
import React, { useEffect, useState } from 'react';
import { MotionType, PacerConfig } from '../types';

interface StickFigureProps {
  motionType: MotionType;
  exerciseName: string;
  muscleSplit?: Record<string, number>;
  pacer?: PacerConfig;
}

// --- TYPE DEFINITIONS ---
type Point = { x: number; y: number };
type Skeleton = {
  head: Point;
  neck: Point;
  shoulderL: Point;
  shoulderR: Point;
  elbowL: Point;
  elbowR: Point;
  wristL: Point;
  wristR: Point;
  spineTop: Point;
  spineMid: Point;
  spineBottom: Point;
  hipL: Point;
  hipR: Point;
  kneeL: Point;
  kneeR: Point;
  ankleL: Point;
  ankleR: Point;
  footL?: Point;
  footR?: Point;
  handL?: Point;
  handR?: Point;
};

// --- MUSCLE MAPPING ---
// Maps visual segment names to muscle names in the database
const MUSCLE_MAP: Record<string, string[]> = {
  'Chest': ['torsoUpper', 'upperArms', 'shoulders'], 
  'Upper Chest': ['torsoUpper', 'shoulders'], 
  'Lower Chest': ['torsoUpper'], 
  'Mid Chest': ['torsoUpper'], 
  'Inner Chest': ['torsoUpper'],
  'Back': ['torsoUpper', 'torsoLower', 'shoulders'], 
  'Lats': ['torsoUpper', 'torsoLower', 'upperArms'], 
  'Upper Lats': ['torsoUpper'],
  'Mid Back': ['torsoUpper', 'shoulders'], 
  'Upper Back': ['shoulders', 'neck'], 
  'Traps': ['shoulders', 'neck'],
  'Shoulders': ['shoulders', 'upperArms'], 
  'Front Delts': ['shoulders', 'upperArms'], 
  'Side Delts': ['shoulders', 'upperArms'], 
  'Rear Delts': ['shoulders'],
  'Rotator Cuff': ['shoulders'],
  'Triceps': ['upperArms', 'forearms'],
  'Long Head Triceps': ['upperArms'], 
  'Biceps': ['upperArms', 'forearms'], 
  'Brachialis': ['upperArms', 'forearms'],
  'Bicep Long Head': ['upperArms'], 
  'Bicep Short Head': ['upperArms'],
  'Forearms': ['forearms'],
  'Legs': ['thighs', 'shins', 'hips'], 
  'Quads': ['thighs'], 
  'Hamstrings': ['thighs', 'hips'],
  'Glutes': ['hips', 'thighs'], 
  'Calves': ['shins'], 
  'Soleus': ['shins'],
  'Abs': ['torsoLower', 'torsoUpper'], 
  'Core': ['torsoLower'], 
  'Lower Back': ['torsoLower', 'hips'],
  'Spine': ['torsoUpper', 'torsoLower']
};

const StickFigure: React.FC<StickFigureProps> = ({ motionType, exerciseName, muscleSplit, pacer }) => {
  const [animProgress, setAnimProgress] = useState(0);

  // --- TEMPO CALCULATOR ---
  useEffect(() => {
    // If no pacer, simple breathing loop
    if (!pacer || pacer.phases.length === 0) {
        let start = Date.now();
        const loop = () => {
            const now = Date.now();
            const t = ((now - start) % 3000) / 3000; 
            const val = (Math.sin(t * Math.PI * 2 - (Math.PI/2)) + 1) / 2;
            setAnimProgress(val);
            requestAnimationFrame(loop);
        };
        const frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }

    const totalDuration = pacer.phases.reduce((acc, p) => acc + p.duration, 0) * 1000;
    
    const animate = () => {
        const now = Date.now();
        const timeInCycle = now % totalDuration;
        
        let elapsed = 0;
        let currentProgress = 0;

        for (const phase of pacer.phases) {
            const phaseDur = phase.duration * 1000;
            if (timeInCycle < elapsed + phaseDur) {
                const localT = (timeInCycle - elapsed) / phaseDur; // 0 to 1 within this phase
                const action = phase.action.toUpperCase();
                
                // MAPPING LOGIC:
                // For PRESS/SQUAT/HINGE: t=0 is EXTENDED/TOP, t=1 is FLEXED/BOTTOM/DEEP
                // For PULL/CURL/RAISE/FLY: t=0 is EXTENDED/START, t=1 is CONTRACTED/SQUEEZE
                
                if (['LOWER', 'STRETCH', 'DOWN', 'OPEN', 'RELEASE', 'RETURN', 'HINGE'].some(k => action.includes(k))) {
                    // Eccentric Phase
                    // Press/Squat: Lowering weight (Top -> Bottom) => 0 -> 1
                    // Pull/Curl: Releasing weight (Contracted -> Extended) => 1 -> 0
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                         currentProgress = localT; 
                    } else {
                         currentProgress = 1 - localT; 
                    }
                } else if (['PRESS', 'PULL', 'DRIVE', 'UP', 'CURL', 'RAISE', 'CONTRACT', 'CLOSE', 'EXPLODE', 'BACK'].some(k => action.includes(k))) {
                    // Concentric Phase
                    // Press/Squat: Pushing weight (Bottom -> Top) => 1 -> 0
                    // Pull/Curl: Curling/Pulling (Extended -> Contracted) => 0 -> 1
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                        currentProgress = 1 - localT; 
                    } else {
                        currentProgress = localT; 
                    }
                } else {
                    // Holds
                    // Hold the position of the previous action target
                    // Usually Peak Contraction or Peak Stretch
                    const isBottomHold = ['STRETCH', 'BOTTOM'].some(k => action.includes(k));
                    const isTopHold = ['SQUEEZE', 'PEAK', 'CONTRACT', 'TOP'].some(k => action.includes(k));
                    
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                        // Press: Bottom is t=1, Top is t=0
                        if (isBottomHold) currentProgress = 1; 
                        else currentProgress = 0; // Default lock out
                        // Override for specific keywords like "Stretch" in Press (Dip/Bench) = Bottom = 1
                        if (action.includes('STRETCH') || action.includes('HOLD')) currentProgress = 1; 
                    } else {
                        // Pull: Contracted is t=1, Extended is t=0
                         if (isTopHold || action.includes('SQUEEZE') || action.includes('HOLD')) currentProgress = 1;
                         else currentProgress = 0;
                    }
                }
                break;
            }
            elapsed += phaseDur;
        }
        
        setAnimProgress(currentProgress);
        requestAnimationFrame(animate);
    };
    
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [pacer, motionType]);

  // --- SKELETON GENERATOR ---
  const getSkeleton = (t: number): Skeleton => {
     // t: 0 to 1. 
     // For Press/Squat/Hinge: 0 = Top/Start/Extended, 1 = Bottom/Deep/Flexed
     // For Pull/Curl/Raise: 0 = Bottom/Start/Extended, 1 = Top/Contracted/Flexed
     
     const name = exerciseName.toLowerCase();
     
     // Detect Context
     const isBench = name.includes('bench') || (name.includes('press') && name.includes('dumb') && !name.includes('standing') && !name.includes('seated') && !name.includes('overhead'));
     const isOhp = name.includes('overhead') || name.includes('military') || (name.includes('press') && (name.includes('standing') || name.includes('seated')) && !name.includes('leg'));
     const isSeated = name.includes('seated') || name.includes('pulldown') || name.includes('row') || name.includes('machine') || name.includes('pec deck') || name.includes('preacher');
     const isSquat = name.includes('squat') || name.includes('leg press');
     const isHinge = motionType === 'hinge' || name.includes('deadlift') || name.includes('row') && !isSeated; 
     const isCurl = motionType === 'curl';
     const isFly = motionType === 'fly' || name.includes('pec deck') || name.includes('fly');
     const isSkullCrusher = name.includes('skull') || name.includes('extension') || name.includes('crusher');
     const isDip = name.includes('dip');

     // --- DEFAULT SKELETON (Standing Front) ---
     let skel: Skeleton = {
         head: {x: 50, y: 15}, neck: {x: 50, y: 22},
         shoulderL: {x: 42, y: 25}, shoulderR: {x: 58, y: 25},
         elbowL: {x: 35, y: 40}, elbowR: {x: 65, y: 40},
         wristL: {x: 30, y: 55}, wristR: {x: 70, y: 55},
         spineTop: {x: 50, y: 22}, spineMid: {x: 50, y: 35}, spineBottom: {x: 50, y: 50},
         hipL: {x: 45, y: 50}, hipR: {x: 55, y: 50},
         kneeL: {x: 45, y: 75}, kneeR: {x: 55, y: 75},
         ankleL: {x: 45, y: 95}, ankleR: {x: 55, y: 95},
     };

     if (isBench || (isSkullCrusher && !name.includes('standing'))) {
         // SIDE VIEW: Lying on Bench
         // Head Left (20), Feet Right (80)
         const bodyY = 65;
         const shoulderX = 30; const shoulderY = bodyY;
         
         skel.head = {x: 20, y: bodyY - 5};
         skel.neck = {x: 25, y: bodyY};
         skel.spineTop = {x: 25, y: bodyY}; skel.spineMid = {x: 35, y: bodyY}; skel.spineBottom = {x: 45, y: bodyY};
         skel.hipL = {x: 45, y: bodyY}; skel.hipR = {x: 45, y: bodyY};
         skel.kneeL = {x: 60, y: bodyY - 10}; skel.kneeR = {x: 60, y: bodyY - 10};
         skel.ankleL = {x: 75, y: bodyY + 15}; skel.ankleR = {x: 75, y: bodyY + 15};
         skel.shoulderL = {x: shoulderX, y: shoulderY}; skel.shoulderR = skel.shoulderL;

         if (isSkullCrusher) {
             // Skull Crusher: Elbows fixed vertical, Forearms hinge
             // t=0 (Top/Extended), t=1 (Bottom/Forehead)
             const elbowX = shoulderX; 
             const elbowY = shoulderY - 25; // Vertical upper arm
             skel.elbowL = {x: elbowX, y: elbowY}; skel.elbowR = skel.elbowL;
             
             // Forearm moves from Vertical (Top) to Horizontal (Head)
             // t=0 -> Wrist above Elbow. t=1 -> Wrist near Head (Left of Elbow)
             const angle = (t * 90) * (Math.PI/180); // 0 to 90 deg
             const forearmLen = 20;
             skel.wristL = {
                 x: elbowX - (Math.sin(angle) * forearmLen),
                 y: elbowY - (Math.cos(angle) * forearmLen) + (t * 5) // Slight dip
             };
             skel.wristR = skel.wristL;
         } else {
             // Standard Bench Press
             // t=0 (Top/Extended), t=1 (Chest/Bottom)
             const startY = shoulderY - 30; // High
             const endY = shoulderY - 5; // Low (Chest)
             const currentY = startY + (t * (endY - startY));
             
             skel.wristL = {x: shoulderX, y: currentY}; skel.wristR = skel.wristL;
             // Elbow flares out/down
             skel.elbowL = {x: shoulderX + 5 + (t*5), y: (shoulderY + currentY)/2 + 5}; 
             skel.elbowR = skel.elbowL;
         }
     } 
     else if (isOhp) {
         // FRONT VIEW: Standing/Seated Press
         // t=0 (Top/Extended), t=1 (Bottom/Shoulders)
         // NOTE: Fixed inverted logic here
         
         const topY = 5; // Overhead
         const bottomY = 35; // Shoulders
         const currentY = topY + (t * (bottomY - topY)); // Linear Interp
         
         skel.wristL = {x: 40, y: currentY}; skel.wristR = {x: 60, y: currentY};
         
         // Elbows flare out as bar comes down
         const elbowWidth = 35 + (t * 10); // Wider at bottom
         const elbowY = currentY + 15;
         skel.elbowL = {x: 50 - (elbowWidth/2), y: elbowY}; 
         skel.elbowR = {x: 50 + (elbowWidth/2), y: elbowY};
         
         // Adjust shoulders to connect
         skel.shoulderL = {x: 42, y: 25}; skel.shoulderR = {x: 58, y: 25};
     }
     else if (isSquat) {
         // FRONT VIEW: Squat
         // t=0 (Stand/Top), t=1 (Squat/Bottom)
         const drop = t * 25;
         
         skel.head = {x: 50, y: 15 + drop};
         skel.neck = {x: 50, y: 22 + drop};
         skel.spineTop = {x: 50, y: 22 + drop};
         skel.spineBottom = {x: 50, y: 50 + drop};
         skel.shoulderL = {x: 42, y: 25 + drop}; skel.shoulderR = {x: 58, y: 25 + drop};
         
         // Hips drop
         skel.hipL = {x: 45, y: 50 + drop}; skel.hipR = {x: 55, y: 50 + drop};
         
         // Knees bend out
         skel.kneeL = {x: 40 - (t*8), y: 75 + (drop/2)}; 
         skel.kneeR = {x: 60 + (t*8), y: 75 + (drop/2)};
         
         // Ankles fixed
         skel.ankleL = {x: 45, y: 95}; skel.ankleR = {x: 55, y: 95};
         
         // Arms holding bar (if barbell) or dumbbells
         skel.elbowL = {x: 35, y: 35 + drop}; skel.elbowR = {x: 65, y: 35 + drop};
         skel.wristL = {x: 40, y: 28 + drop}; skel.wristR = {x: 60, y: 28 + drop};
     }
     else if (isSeated) {
         // SIDE VIEW: Seated Row/Pulldown
         // Facing Right. Seat at X=40, Y=60
         const seatH = 60; const backX = 40;
         
         skel.head = {x: backX, y: seatH - 37};
         skel.neck = {x: backX, y: seatH - 30};
         skel.spineTop = skel.neck; skel.spineMid = {x: backX, y: seatH - 15}; skel.spineBottom = {x: backX, y: seatH};
         skel.hipL = {x: backX, y: seatH}; skel.hipR = skel.hipL;
         skel.kneeL = {x: backX + 20, y: seatH}; skel.kneeR = skel.kneeL;
         skel.ankleL = {x: backX + 20, y: seatH + 25}; skel.ankleR = skel.ankleL;
         
         skel.shoulderL = {x: backX, y: seatH - 28}; skel.shoulderR = skel.shoulderL;

         if (name.includes('row')) {
             // Row: t=0 (Extended), t=1 (Contracted)
             const reach = 35 * (1-t); // 35 -> 0
             skel.wristL = {x: backX + 10 + reach, y: seatH - 20}; skel.wristR = skel.wristL;
             skel.elbowL = {x: backX + 5 + (reach/2), y: seatH - 15}; skel.elbowR = skel.elbowL;
         } 
         else if (name.includes('pulldown')) {
             // Pulldown: t=0 (Up/Extended), t=1 (Down/Contracted)
             const upY = seatH - 60; // High
             const downY = seatH - 28; // Chin
             const currY = upY + (t * (downY - upY));
             
             // In side view, arm is roughly vertical but angled forward
             skel.wristL = {x: backX + 15, y: currY}; skel.wristR = skel.wristL;
             skel.elbowL = {x: backX + 5, y: (currY + seatH - 28)/2}; skel.elbowR = skel.elbowL;
         }
         else if (isCurl) {
             // Preacher Curl: t=0 (Down), t=1 (Up)
             const padX = backX + 15; const padY = seatH - 20;
             skel.elbowL = {x: padX, y: padY}; skel.elbowR = skel.elbowL;
             const angle = (45 + (t * 100)) * (Math.PI/180); // 45 -> 145 deg
             const len = 20;
             skel.wristL = {x: padX - (Math.cos(angle)*len) + 10, y: padY - (Math.sin(angle)*len)}; // Arcs up/back
             skel.wristR = skel.wristL;
         }
     }
     else if (isHinge) {
         // SIDE VIEW: RDL/Deadlift
         // t=0 (Stand), t=1 (Bent)
         const hipX = 40; const hipY = 50;
         
         skel.hipL = {x: hipX, y: hipY}; skel.hipR = skel.hipL;
         skel.kneeL = {x: hipX + 5, y: 75}; skel.kneeR = skel.kneeL; // Soft knee
         skel.ankleL = {x: hipX + 5, y: 95}; skel.ankleR = skel.ankleL;
         
         const bendAngle = (t * 80) * (Math.PI/180); // 0 to 80 deg
         const torsoLen = 30;
         
         const neckX = hipX + (Math.sin(bendAngle) * torsoLen);
         const neckY = hipY - (Math.cos(bendAngle) * torsoLen);
         
         skel.spineBottom = skel.hipL;
         skel.neck = {x: neckX, y: neckY};
         skel.head = {x: neckX + (Math.sin(bendAngle) * 5), y: neckY - (Math.cos(bendAngle) * 5)};
         skel.spineTop = skel.neck;
         skel.spineMid = {x: (hipX + neckX)/2, y: (hipY + neckY)/2};
         
         skel.shoulderL = skel.neck; skel.shoulderR = skel.shoulderL;
         // Arms hang gravity
         skel.wristL = {x: neckX, y: neckY + 25}; skel.wristR = skel.wristL;
         skel.elbowL = {x: neckX, y: neckY + 12}; skel.elbowR = skel.elbowL;
     }
     else if (isDip) {
         // SIDE VIEW: Dip
         // t=0 (Top), t=1 (Bottom)
         const drop = t * 20;
         const bodyY = 40 + drop;
         const handY = 60; // Bar is fixed
         
         skel.wristL = {x: 45, y: handY}; skel.wristR = skel.wristL;
         skel.shoulderL = {x: 40, y: bodyY}; skel.shoulderR = skel.shoulderL;
         // Elbow is pivot behind
         skel.elbowL = {x: 25, y: (bodyY + handY)/2}; skel.elbowR = skel.elbowL;
         
         skel.head = {x: 45, y: bodyY - 10};
         skel.neck = {x: 45, y: bodyY};
         skel.spineTop = {x: 40, y: bodyY}; skel.spineBottom = {x: 40, y: bodyY + 25};
         skel.hipL = {x: 40, y: bodyY + 25};
         // Legs curled back
         skel.kneeL = {x: 40, y: bodyY + 45}; 
         skel.ankleL = {x: 25, y: bodyY + 45};
     }
     else {
         // STANDING FRONT DEFAULT (Curls, Raises, Face Pulls)
         if (isCurl) {
             // Standing Curl: t=0 (Down), t=1 (Up)
             skel.elbowL = {x: 40, y: 50}; skel.elbowR = {x: 60, y: 50}; // Fixed at sides
             skel.wristL = {x: 40 - (t*5), y: 75 - (t*40)}; 
             skel.wristR = {x: 60 + (t*5), y: 75 - (t*40)};
         } 
         else if (motionType === 'raise') {
             // Lateral Raise: t=0 (Down), t=1 (Up)
             skel.elbowL = {x: 35 - (t*20), y: 50 - (t*10)};
             skel.elbowR = {x: 65 + (t*20), y: 50 - (t*10)};
             skel.wristL = {x: 30 - (t*35), y: 70 - (t*35)};
             skel.wristR = {x: 70 + (t*35), y: 70 - (t*35)};
         }
         else if (motionType === 'pull' && name.includes('face')) {
             // Face Pull: t=0 (Extended), t=1 (Face)
             // Side View better? Let's do Front View
             skel.elbowL = {x: 35, y: 35}; skel.elbowR = {x: 65, y: 35}; // Elbows high
             // Hands move from center (extended forward/in) to ears
             const width = t * 15;
             skel.wristL = {x: 50 - width, y: 40 - (t*15)}; 
             skel.wristR = {x: 50 + width, y: 40 - (t*15)};
         }
         else if (isFly) {
             // Standing Fly / Pec Deck (Front View)
             // t=0 (Open), t=1 (Closed)
             // Wait, Fly: Concentric is 0->1 (Squeeze). So 0=Open, 1=Closed.
             const width = 35 * (1-t); // 35 -> 0
             skel.wristL = {x: 50 - width - 5, y: 40};
             skel.wristR = {x: 50 + width + 5, y: 40};
             skel.elbowL = {x: 50 - width - 15, y: 40};
             skel.elbowR = {x: 50 + width + 15, y: 40};
         }
     }
     
     // Interpolate hands/feet if not set (default extension)
     if (!skel.handL) skel.handL = skel.wristL;
     if (!skel.handR) skel.handR = skel.wristR;
     if (!skel.footL) skel.footL = {x: skel.ankleL.x-2, y: skel.ankleL.y+2};
     if (!skel.footR) skel.footR = {x: skel.ankleR.x+2, y: skel.ankleR.y+2};
     if (!skel.spineMid) skel.spineMid = {x: (skel.spineTop.x + skel.spineBottom.x)/2, y: (skel.spineTop.y + skel.spineBottom.y)/2};

     return skel;
  };

  const skel = getSkeleton(animProgress);

  // --- RENDERING HELPERS ---
  const getMuscleColor = (segmentName: string) => {
      if (!muscleSplit) return { stroke: '#334155', width: 3, filter: '' }; // Default Slate-700

      // Strictly find Top 3
      const sortedMuscles = Object.entries(muscleSplit).sort((a,b) => (b[1] as number) - (a[1] as number));
      
      let rank = -1;
      
      for (let i = 0; i < sortedMuscles.length; i++) {
          if (i > 2) break; // Only top 3
          const [mName, _] = sortedMuscles[i];
          const mappedSegments = MUSCLE_MAP[mName] || [];
          
          if (mappedSegments.includes(segmentName)) {
              rank = i;
              break; 
          }
      }

      // Stronger Visuals
      if (rank === 0) return { stroke: '#ef4444', width: 6, filter: 'url(#glow-primary)' }; // Red
      if (rank === 1) return { stroke: '#f97316', width: 5, filter: 'url(#glow-secondary)' }; // Orange
      if (rank === 2) return { stroke: '#3b82f6', width: 4, filter: 'url(#glow-tertiary)' }; // Blue
      
      return { stroke: '#334155', width: 3, filter: '' }; 
  };

  const Bone = ({ p1, p2, type }: { p1: Point, p2: Point, type: string }) => {
      const style = getMuscleColor(type);
      return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={style.stroke} strokeWidth={style.width} strokeLinecap="round" filter={style.filter} />;
  };

  const Joint = ({ p }: { p: Point }) => (
      <circle cx={p.x} cy={p.y} r={2} fill="#0f172a" stroke="#64748b" strokeWidth="1" />
  );

  return (
    <div className="w-full h-56 bg-gym-900 rounded-xl border border-gym-700 mb-4 overflow-hidden relative shadow-inner">
       <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <filter id="glow-primary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
               <feFlood floodColor="#ef4444" floodOpacity="0.8" result="glowColor"/>
               <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-secondary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
               <feFlood floodColor="#f97316" floodOpacity="0.6" result="glowColor"/>
               <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-tertiary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
               <feFlood floodColor="#3b82f6" floodOpacity="0.5" result="glowColor"/>
               <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* --- ENVIRONMENT VISUALS --- */}
          {(exerciseName.toLowerCase().includes('bench') || (exerciseName.toLowerCase().includes('press') && exerciseName.toLowerCase().includes('dumb') && !exerciseName.toLowerCase().includes('standing'))) && (
             <line x1="10" y1="65" x2="90" y2="65" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" /> /* Bench */
          )}
          {(exerciseName.toLowerCase().includes('seated') || exerciseName.toLowerCase().includes('pec deck') || exerciseName.toLowerCase().includes('pulldown') || exerciseName.toLowerCase().includes('row')) && (
             <path d="M 40 90 L 40 60 L 60 60 L 60 90 M 40 60 L 40 40" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" /> /* Chair */
          )}
          {(!exerciseName.toLowerCase().includes('bench') && !exerciseName.toLowerCase().includes('seated')) && (
             <line x1="10" y1="95" x2="90" y2="95" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" /> /* Floor */
          )}

          {/* --- SKELETON BONES --- */}
          {/* Head & Neck */}
          <Bone p1={skel.head} p2={skel.neck} type="neck" />
          <Bone p1={skel.neck} p2={skel.spineTop} type="neck" />
          
          {/* Spine & Hips */}
          <Bone p1={skel.spineTop} p2={skel.spineMid} type="torsoUpper" />
          <Bone p1={skel.spineMid} p2={skel.spineBottom} type="torsoLower" />
          <Bone p1={skel.spineBottom} p2={skel.hipL} type="hips" />
          <Bone p1={skel.spineBottom} p2={skel.hipR} type="hips" />
          
          {/* Arms */}
          <Bone p1={skel.neck} p2={skel.shoulderL} type="shoulders" />
          <Bone p1={skel.neck} p2={skel.shoulderR} type="shoulders" />
          <Bone p1={skel.shoulderL} p2={skel.elbowL} type="upperArms" />
          <Bone p1={skel.shoulderR} p2={skel.elbowR} type="upperArms" />
          <Bone p1={skel.elbowL} p2={skel.wristL} type="forearms" />
          <Bone p1={skel.elbowR} p2={skel.wristR} type="forearms" />
          
          {/* Legs */}
          <Bone p1={skel.hipL} p2={skel.kneeL} type="thighs" />
          <Bone p1={skel.hipR} p2={skel.kneeR} type="thighs" />
          <Bone p1={skel.kneeL} p2={skel.ankleL} type="shins" />
          <Bone p1={skel.kneeR} p2={skel.ankleR} type="shins" />

          {/* Head Circle */}
          <circle cx={skel.head.x} cy={skel.head.y} r={3.5} fill="#cbd5e1" />

          {/* Joints */}
          <Joint p={skel.shoulderL} /> <Joint p={skel.shoulderR} />
          <Joint p={skel.elbowL} /> <Joint p={skel.elbowR} />
          <Joint p={skel.wristL} /> <Joint p={skel.wristR} />
          <Joint p={skel.hipL} /> <Joint p={skel.hipR} />
          <Joint p={skel.kneeL} /> <Joint p={skel.kneeR} />
          <Joint p={skel.ankleL} /> <Joint p={skel.ankleR} />

          {/* Props (Barbell/Dumbbell) */}
          {/* Only show "weights" on wrists if weighted exercise */}
          {motionType !== 'cardio' && (
              <>
                <circle cx={skel.wristL.x} cy={skel.wristL.y} r={3.5} fill="#475569" opacity="0.9" />
                <circle cx={skel.wristR.x} cy={skel.wristR.y} r={3.5} fill="#475569" opacity="0.9" />
              </>
          )}
       </svg>
       
       {/* Labels */}
       <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bio-Mechanics</span>
          {muscleSplit && (
             <div className="flex gap-2 items-center bg-gym-900/80 px-2 py-1 rounded border border-gym-700/50">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                <span className="text-[9px] text-gray-400">Primary</span>
                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316] ml-1"></span>
                <span className="text-[9px] text-gray-400">Assist</span>
             </div>
          )}
       </div>
    </div>
  );
};

export default StickFigure;
