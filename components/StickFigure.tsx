
import React, { useEffect, useState, useMemo } from 'react';
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
  spineBottom: Point;
  hipL: Point;
  hipR: Point;
  kneeL: Point;
  kneeR: Point;
  ankleL: Point;
  ankleR: Point;
};

// --- MUSCLE MAPPING ---
// Maps muscle names from data to skeletal segments
const MUSCLE_MAP: Record<string, string[]> = {
  'Chest': ['torso'], 'Upper Chest': ['torso'], 'Lower Chest': ['torso'], 'Mid Chest': ['torso'],
  'Inner Chest': ['torso'],
  'Back': ['torso', 'shoulders'], 'Lats': ['torso', 'shoulders'], 'Upper Lats': ['torso'],
  'Mid Back': ['torso'], 'Upper Back': ['shoulders'], 'Traps': ['shoulders', 'neck'],
  'Shoulders': ['shoulders'], 'Front Delts': ['shoulders'], 'Side Delts': ['shoulders'], 'Rear Delts': ['shoulders'],
  'Triceps': ['upperArms'], 'Biceps': ['upperArms'], 'Brachialis': ['upperArms'],
  'Bicep Long Head': ['upperArms'], 'Bicep Short Head': ['upperArms'],
  'Forearms': ['forearms'],
  'Legs': ['thighs', 'shins', 'hips'], 'Quads': ['thighs'], 'Hamstrings': ['thighs'],
  'Glutes': ['hips'], 'Calves': ['shins'], 'Soleus': ['shins'],
  'Abs': ['spine'], 'Core': ['spine'], 'Lower Back': ['spine']
};

const StickFigure: React.FC<StickFigureProps> = ({ motionType, exerciseName, muscleSplit, pacer }) => {
  const [animProgress, setAnimProgress] = useState(0);

  // --- TEMPO CALCULATOR ---
  useEffect(() => {
    if (!pacer || pacer.phases.length === 0) {
        // Fallback loop if no pacer (2s loop)
        let start = Date.now();
        const loop = () => {
            const now = Date.now();
            const t = ((now - start) % 2000) / 2000; 
            // Sine wave 0->1->0
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
        // Global time sync based on period
        const timeInCycle = now % totalDuration;
        
        let elapsed = 0;
        let currentProgress = 0;

        for (const phase of pacer.phases) {
            const phaseDur = phase.duration * 1000;
            if (timeInCycle < elapsed + phaseDur) {
                // We are in this phase
                const localT = (timeInCycle - elapsed) / phaseDur; // 0 to 1 within phase
                
                // Determine movement based on action
                const action = phase.action.toUpperCase();
                
                // Standard: 0 = Extended/Start, 1 = Contracted/End
                if (['LOWER', 'STRETCH', 'DOWN', 'OPEN'].some(k => action.includes(k))) {
                    // Eccentric: Going towards 1 (if press) or 0 (if pull)? 
                    // Let's standarize: 0 = "Start Position" (Top of Bench), 1 = "Bottom Position" (Chest)
                    // Bench Press: Start(0) -> Lower -> End(1)
                    // Pull Down: Start(0) -> Pull -> End(1) ?? No, Pull usually starts at 0.
                    
                    // Let's map specifically by motion type
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                         currentProgress = localT; // 0 -> 1
                    } else {
                         currentProgress = 1 - localT; // Return to start
                    }
                } else if (['PRESS', 'PULL', 'DRIVE', 'UP', 'CURL', 'RAISE', 'CONTRACT', 'CLOSE', 'EXPLODE'].some(k => action.includes(k))) {
                    // Concentric
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                        currentProgress = 1 - localT; // 1 -> 0
                    } else {
                        currentProgress = localT; // 0 -> 1
                    }
                } else {
                    // Hold/Squeeze
                    // Are we holding at start or end?
                    // Usually holds are at peak contraction
                    if (motionType === 'press' || motionType === 'squat' || motionType === 'hinge') {
                        // Hold at bottom usually? Or top lockout?
                        // Context: "Pause at chest" -> Bottom (1). "Lockout" -> Top (0).
                        // Heuristic: If previous phase was eccentric (Lower), we are likely at 1.
                        // Ideally we check phase index, but stateless is harder.
                        // Default to 1 (Contraction/Stretch point) for holds usually.
                        currentProgress = 1; 
                    } else {
                        currentProgress = 1; // Hold at contraction
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
     // 0 = Neutral/Start (Standing, Arms Up). 
     // 1 = Active/Deep (Squat bottom, Bar on chest).

     const name = exerciseName.toLowerCase();
     const isBench = name.includes('bench') || (name.includes('press') && name.includes('dumb'));
     const isSeated = name.includes('seated') || name.includes('pulldown') || name.includes('row') || name.includes('machine') || name.includes('pec deck');
     const isSquat = name.includes('squat') || name.includes('leg press');
     const isHinge = motionType === 'hinge' || name.includes('deadlift') || name.includes('row'); // Bent over row is hinge-like
     const isCurl = motionType === 'curl';
     const isRaise = motionType === 'raise' || name.includes('fly');

     // Base Coordinates (Center 50, 50)
     // Standing Base
     let skel: Skeleton = {
         head: {x: 50, y: 15}, neck: {x: 50, y: 22},
         shoulderL: {x: 42, y: 25}, shoulderR: {x: 58, y: 25},
         elbowL: {x: 35, y: 40}, elbowR: {x: 65, y: 40},
         wristL: {x: 30, y: 55}, wristR: {x: 70, y: 55},
         spineTop: {x: 50, y: 22}, spineBottom: {x: 50, y: 50},
         hipL: {x: 45, y: 50}, hipR: {x: 55, y: 50},
         kneeL: {x: 45, y: 75}, kneeR: {x: 55, y: 75},
         ankleL: {x: 45, y: 95}, ankleR: {x: 55, y: 95}
     };

     if (isBench) {
         // Lying down logic (Side view ish or Top view representation)
         // Let's do Side View for Bench
         // Head Left (20), Feet Right (80)
         const incline = name.includes('incline') ? 15 : 0;
         const bodyY = 60;
         const armExt = 25 * (1 - t); // 0=Up(Extended), 1=Down(Chest)
         
         skel.head = {x: 20, y: bodyY - (incline/2)};
         skel.neck = {x: 25, y: bodyY};
         skel.spineTop = {x: 25, y: bodyY};
         skel.spineBottom = {x: 50, y: bodyY};
         skel.hipL = {x: 50, y: bodyY}; skel.hipR = {x: 50, y: bodyY};
         skel.kneeL = {x: 65, y: bodyY - 10}; skel.kneeR = {x: 65, y: bodyY - 10}; // Knees up
         skel.ankleL = {x: 80, y: bodyY + 15}; skel.ankleR = {x: 80, y: bodyY + 15}; // Feet down

         // Arms
         const shoulderX = 30; const shoulderY = bodyY;
         skel.shoulderL = {x: shoulderX, y: shoulderY}; skel.shoulderR = {x: shoulderX, y: shoulderY};
         // Elbows flare out? In 2D side view, elbows go DOWN.
         skel.elbowL = {x: shoulderX + 5, y: shoulderY - 15 + (t * 15)}; 
         skel.elbowR = skel.elbowL;
         // Wrists push up/down
         skel.wristL = {x: shoulderX, y: shoulderY - 30 + (t * 25)};
         skel.wristR = skel.wristL;
     } 
     else if (isSquat) {
         // Squat: t=0 (Stand), t=1 (Deep)
         const drop = t * 20;
         const lean = t * 10;
         
         skel.head = {x: 50 + lean, y: 15 + drop};
         skel.neck = {x: 50 + lean, y: 22 + drop};
         skel.shoulderL = {x: 42 + lean, y: 25 + drop}; skel.shoulderR = {x: 58 + lean, y: 25 + drop};
         skel.spineTop = {x: 50 + lean, y: 22 + drop};
         skel.spineBottom = {x: 50 - (t*5), y: 50 + drop}; // Hips go back
         skel.hipL = {x: 45 - (t*5), y: 50 + drop}; skel.hipR = {x: 55 - (t*5), y: 50 + drop};
         
         // Knees move forward
         skel.kneeL = {x: 45 + (t*10), y: 75 + (drop/2)}; skel.kneeR = {x: 55 + (t*10), y: 75 + (drop/2)};
         skel.ankleL = {x: 45, y: 95}; skel.ankleR = {x: 55, y: 95};

         // Arms (Holding bar on back?)
         skel.elbowL = {x: 35 + lean, y: 35 + drop}; skel.elbowR = {x: 65 + lean, y: 35 + drop};
         skel.wristL = {x: 40 + lean, y: 25 + drop}; skel.wristR = {x: 60 + lean, y: 25 + drop};
     }
     else if (isHinge) {
         // RDL: t=0 (Stand), t=1 (Bent)
         const bend = t * 80; // degrees
         const rad = (bend * Math.PI) / 180;
         
         // Pivot at hips (50, 50)
         const torsoLen = 28;
         const headX = 50 + Math.sin(rad) * torsoLen;
         const headY = 50 - Math.cos(rad) * torsoLen;
         
         skel.spineBottom = {x: 50, y: 50};
         skel.spineTop = {x: headX, y: headY + 7}; // Neck base
         skel.head = {x: headX, y: headY};
         skel.neck = skel.spineTop;
         
         // Shoulders
         skel.shoulderL = {x: headX - 8, y: headY + 5};
         skel.shoulderR = {x: headX + 8, y: headY + 5};
         
         skel.hipL = {x: 45, y: 50}; skel.hipR = {x: 55, y: 50};
         skel.kneeL = {x: 45, y: 75}; skel.kneeR = {x: 55, y: 75}; // Soft knees usually fixed
         skel.ankleL = {x: 45, y: 95}; skel.ankleR = {x: 55, y: 95};
         
         // Arms hanging
         skel.elbowL = {x: skel.shoulderL.x, y: skel.shoulderL.y + 15};
         skel.elbowR = {x: skel.shoulderR.x, y: skel.shoulderR.y + 15};
         skel.wristL = {x: skel.shoulderL.x, y: skel.shoulderL.y + 28};
         skel.wristR = {x: skel.shoulderR.x, y: skel.shoulderR.y + 28};
     }
     else if (isSeated) {
         // Seated Press/Pull/Curl
         // Hips at 50, 60. Knees 50, 75 (bent). Ankles 50, 95.
         skel.hipL = {x: 45, y: 60}; skel.hipR = {x: 55, y: 60};
         skel.spineBottom = {x: 50, y: 60};
         skel.kneeL = {x: 45, y: 75}; skel.kneeR = {x: 55, y: 75};
         skel.ankleL = {x: 45, y: 95}; skel.ankleR = {x: 55, y: 95}; // Legs usually forward or down

         // Torso Upright
         skel.spineTop = {x: 50, y: 30};
         skel.neck = {x: 50, y: 30};
         skel.head = {x: 50, y: 23};
         skel.shoulderL = {x: 42, y: 33}; skel.shoulderR = {x: 58, y: 33};

         if (name.includes('row')) {
             // Row: t=0 (Extended), t=1 (Pulled Back)
             const pull = t * 15;
             // Elbows back
             skel.elbowL = {x: 35 + ((1-t)*15), y: 45}; 
             skel.elbowR = {x: 65 + ((1-t)*15), y: 45};
             skel.wristL = {x: 42 + ((1-t)*25), y: 45};
             skel.wristR = {x: 58 + ((1-t)*25), y: 45};
         } else if (isCurl) {
             // Seated Curl
             skel.elbowL = {x: 42, y: 50}; skel.elbowR = {x: 58, y: 50}; // Fixed on pad?
             // Seated machine usually has elbows forward on pad
             skel.elbowL = {x: 42, y: 40}; skel.elbowR = {x: 58, y: 40};
             // t=0 (Down/Straight), t=1 (Up/Curled)
             const curl = t; 
             skel.wristL = {x: 42, y: 60 - (curl*25)}; // 60 -> 35
             skel.wristR = {x: 58, y: 60 - (curl*25)};
         } else if (motionType === 'fly' || name.includes('pec deck')) {
             // Pec Deck: Seated Fly
             // 0 = Open, 1 = Closed
             skel.elbowL = {x: 20 + (t*22), y: 35};
             skel.elbowR = {x: 80 - (t*22), y: 35};
             skel.wristL = {x: 15 + (t*35), y: 25}; // Hands usually higher/up
             skel.wristR = {x: 85 - (t*35), y: 25};
         } else {
             // Pulldown (Default Seated)
             const down = t; 
             skel.wristL = {x: 30, y: 10 + (down * 25)};
             skel.wristR = {x: 70, y: 10 + (down * 25)};
             skel.elbowL = {x: 35 - (down*5), y: 25 + (down * 20)};
             skel.elbowR = {x: 65 + (down*5), y: 25 + (down * 20)};
         }
     }
     else if (isCurl) {
         // Standing Curl
         skel.elbowL = {x: 42, y: 50}; skel.elbowR = {x: 58, y: 50};
         skel.wristL = {x: 42, y: 75 - (t*35)}; skel.wristR = {x: 58, y: 75 - (t*35)};
         // Bring wrists closer to shoulders
         if (t > 0.5) {
             skel.wristL.x += 5 * (t-0.5); // Curl in
             skel.wristR.x -= 5 * (t-0.5);
         }
     }
     else if (isRaise || motionType === 'fly') {
         // Lateral Raise: t=0 (Down), t=1 (Up side)
         // Fly: t=0 (Open), t=1 (Closed front)
         if (motionType === 'fly') {
             // 0 = Open Wide, 1 = Hands Touch
             skel.wristL = {x: 10 + (t*40), y: 40};
             skel.wristR = {x: 90 - (t*40), y: 40};
             skel.elbowL = {x: 20 + (t*22), y: 40};
             skel.elbowR = {x: 80 - (t*22), y: 40};
         } else {
             // Raise
             skel.elbowL = {x: 35 - (t*15), y: 40 - (t*10)};
             skel.elbowR = {x: 65 + (t*15), y: 40 - (t*10)};
             skel.wristL = {x: 30 - (t*25), y: 55 - (t*30)};
             skel.wristR = {x: 70 + (t*25), y: 55 - (t*30)};
         }
     }
     else {
         // Generic Press
         const press = t * 30;
         skel.wristL = {x: 42, y: 35 - press}; skel.wristR = {x: 58, y: 35 - press};
         skel.elbowL = {x: 35, y: 45 - (press/2)}; skel.elbowR = {x: 65, y: 45 - (press/2)};
     }

     return skel;
  };

  const skel = getSkeleton(animProgress);

  // --- RENDERING HELPERS ---
  const getMuscleColor = (segmentName: string) => {
      if (!muscleSplit) return { stroke: '#64748b', width: 4, filter: '' };

      const sortedMuscles = Object.entries(muscleSplit).sort((a,b) => (b[1] as number) - (a[1] as number));
      
      let rank = -1;
      sortedMuscles.forEach(([mName, _pct], idx) => {
          if (idx > 2) return; 
          const mappedSegments = MUSCLE_MAP[mName] || [];
          if (segmentName === 'torso' && mappedSegments.includes('torso')) rank = idx;
          if (segmentName === 'shoulders' && mappedSegments.includes('shoulders')) rank = idx;
          if (segmentName === 'upperArms' && mappedSegments.includes('upperArms')) rank = idx;
          if (segmentName === 'forearms' && mappedSegments.includes('forearms')) rank = idx;
          if (segmentName === 'thighs' && mappedSegments.includes('thighs')) rank = idx;
          if (segmentName === 'shins' && mappedSegments.includes('shins')) rank = idx;
          if (segmentName === 'hips' && mappedSegments.includes('hips')) rank = idx;
      });

      if (rank === 0) return { stroke: '#ef4444', width: 6, filter: 'url(#glow-primary)' }; // Red
      if (rank === 1) return { stroke: '#f97316', width: 5, filter: 'url(#glow-secondary)' }; // Orange
      if (rank === 2) return { stroke: '#3b82f6', width: 4, filter: 'url(#glow-tertiary)' }; // Blue
      
      return { stroke: '#475569', width: 4, filter: '' }; 
  };

  const Bone = ({ p1, p2, type }: { p1: Point, p2: Point, type: string }) => {
      const style = getMuscleColor(type);
      return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={style.stroke} strokeWidth={style.width} strokeLinecap="round" filter={style.filter} />;
  };

  const Joint = ({ p }: { p: Point }) => (
      <circle cx={p.x} cy={p.y} r={2.5} fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
  );

  return (
    <div className="w-full h-48 bg-gym-900 rounded-xl border border-gym-700 mb-4 overflow-hidden relative shadow-inner">
       <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <filter id="glow-primary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-secondary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-tertiary" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
               <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Environment / Context */}
          {(exerciseName.toLowerCase().includes('bench') || (exerciseName.toLowerCase().includes('press') && exerciseName.toLowerCase().includes('dumb'))) && (
             <line x1="10" y1="65" x2="90" y2="65" stroke="#334155" strokeWidth="4" strokeLinecap="round" /> /* Bench */
          )}
          {(exerciseName.toLowerCase().includes('seated') || exerciseName.toLowerCase().includes('pec deck')) && (
             <path d="M 35 90 L 35 60 L 65 60 L 65 90" stroke="#334155" strokeWidth="2" fill="none" /> /* Seat */
          )}

          {/* Skeleton Bones */}
          <Bone p1={skel.head} p2={skel.neck} type="spine" />
          <Bone p1={skel.neck} p2={skel.spineBottom} type="torso" />
          
          <Bone p1={skel.neck} p2={skel.shoulderL} type="shoulders" />
          <Bone p1={skel.neck} p2={skel.shoulderR} type="shoulders" />
          
          <Bone p1={skel.shoulderL} p2={skel.elbowL} type="upperArms" />
          <Bone p1={skel.shoulderR} p2={skel.elbowR} type="upperArms" />
          
          <Bone p1={skel.elbowL} p2={skel.wristL} type="forearms" />
          <Bone p1={skel.elbowR} p2={skel.wristR} type="forearms" />
          
          <Bone p1={skel.spineBottom} p2={skel.hipL} type="hips" />
          <Bone p1={skel.spineBottom} p2={skel.hipR} type="hips" />
          
          <Bone p1={skel.hipL} p2={skel.kneeL} type="thighs" />
          <Bone p1={skel.hipR} p2={skel.kneeR} type="thighs" />
          
          <Bone p1={skel.kneeL} p2={skel.ankleL} type="shins" />
          <Bone p1={skel.kneeR} p2={skel.ankleR} type="shins" />

          {/* Head Circle */}
          <circle cx={skel.head.x} cy={skel.head.y} r={4} fill="#cbd5e1" />

          {/* Joints */}
          <Joint p={skel.shoulderL} /> <Joint p={skel.shoulderR} />
          <Joint p={skel.elbowL} /> <Joint p={skel.elbowR} />
          <Joint p={skel.kneeL} /> <Joint p={skel.kneeR} />

          {/* Props (Barbell, Dumbbell) */}
          <circle cx={skel.wristL.x} cy={skel.wristL.y} r={3} fill="#ef4444" />
          <circle cx={skel.wristR.x} cy={skel.wristR.y} r={3} fill="#ef4444" />
       </svg>
       
       {/* Labels */}
       <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Form Check</span>
          {muscleSplit && (
             <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></span>
                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span>
             </div>
          )}
       </div>
    </div>
  );
};

export default StickFigure;
