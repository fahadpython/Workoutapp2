
import React, { useEffect, useState } from 'react';
import { MotionType, PacerConfig } from '../types';

interface StickFigureProps {
  motionType: MotionType;
  exerciseName: string;
  muscleSplit?: Record<string, number>;
  pacer?: PacerConfig;
}

type Point = { x: number; y: number };
type Skeleton = {
  head: Point; neck: Point;
  shoulderL: Point; shoulderR: Point;
  elbowL: Point; elbowR: Point;
  wristL: Point; wristR: Point;
  spineTop: Point; spineMid: Point; spineBottom: Point;
  hipL: Point; hipR: Point;
  kneeL: Point; kneeR: Point;
  ankleL: Point; ankleR: Point;
  view: 'FRONT' | 'SIDE';
  equipment: 'DUMBBELL' | 'BARBELL' | 'CABLE' | 'NONE';
  bench?: { x: number, y: number, angle: number, width: number };
};

const StickFigure: React.FC<StickFigureProps> = ({ motionType, exerciseName, muscleSplit, pacer }) => {
  const [animProgress, setAnimProgress] = useState(0);

  // --- ANIMATION LOOP ---
  useEffect(() => {
    if (!pacer || pacer.phases.length === 0) {
        // Default Loop
        let start = Date.now();
        const loop = () => {
            const now = Date.now();
            const t = ((now - start) % 2000) / 2000; 
            // Sine wave 0 -> 1 -> 0
            const val = (Math.sin(t * Math.PI * 2 - (Math.PI/2)) + 1) / 2;
            setAnimProgress(val);
            requestAnimationFrame(loop);
        };
        const frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }

    // Pacer Logic
    const totalDuration = pacer.phases.reduce((acc, p) => acc + p.duration, 0) * 1000;
    const animate = () => {
        const now = Date.now();
        const timeInCycle = now % totalDuration;
        let elapsed = 0;
        let currentProgress = 0;

        for (const phase of pacer.phases) {
            const phaseDur = phase.duration * 1000;
            if (timeInCycle < elapsed + phaseDur) {
                const localT = (timeInCycle - elapsed) / phaseDur; 
                const action = phase.action.toUpperCase();
                
                // MAPPING: 
                // Eccentric (Lower/Down) -> Goes towards 0
                // Concentric (Press/Pull/Up) -> Goes towards 1
                if (['LOWER', 'STRETCH', 'DOWN', 'OPEN', 'RELEASE', 'RETURN', 'HINGE'].some(k => action.includes(k))) {
                     currentProgress = 1 - localT; 
                } else {
                     currentProgress = localT; 
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

  // --- GENERIC SKELETON LOGIC ---
  const getSkeleton = (t: number): Skeleton => {
     const name = exerciseName.toLowerCase();
     const isBench = name.includes('bench') || name.includes('lying') || name.includes('skull');
     const isSquat = name.includes('squat') || name.includes('deadlift') || name.includes('rdl') || name.includes('leg press');
     const isSeated = name.includes('seated') || name.includes('pulldown') || name.includes('overhead');

     let view: 'FRONT' | 'SIDE' = (isBench || isSquat || name.includes('row')) ? 'SIDE' : 'FRONT';
     
     // Base Skeleton
     const skel: Skeleton = {
         head: {x: 50, y: 15}, neck: {x: 50, y: 22},
         shoulderL: {x: 42, y: 25}, shoulderR: {x: 58, y: 25},
         elbowL: {x: 35, y: 40}, elbowR: {x: 65, y: 40},
         wristL: {x: 30, y: 55}, wristR: {x: 70, y: 55},
         spineTop: {x: 50, y: 22}, spineMid: {x: 50, y: 35}, spineBottom: {x: 50, y: 50},
         hipL: {x: 45, y: 50}, hipR: {x: 55, y: 50},
         kneeL: {x: 45, y: 75}, kneeR: {x: 55, y: 75},
         ankleL: {x: 45, y: 95}, ankleR: {x: 55, y: 95},
         view,
         equipment: name.includes('dumb') ? 'DUMBBELL' : name.includes('cable') ? 'CABLE' : name.includes('bar') ? 'BARBELL' : 'NONE'
     };

     // Adjust Base for View/Position
     if (view === 'SIDE') {
         skel.shoulderL = skel.shoulderR = {x: 50, y: 25};
         skel.hipL = skel.hipR = {x: 50, y: 50};
         skel.kneeL = skel.kneeR = {x: 55, y: 75};
         skel.ankleL = skel.ankleR = {x: 55, y: 95};
         
         if (isBench) {
             // Lying down
             skel.head = {x: 20, y: 65}; skel.neck = {x: 25, y: 65};
             skel.shoulderL = skel.shoulderR = {x: 30, y: 65};
             skel.spineTop = {x: 30, y: 65}; skel.spineBottom = {x: 50, y: 65};
             skel.hipL = skel.hipR = {x: 50, y: 65};
             skel.kneeL = skel.kneeR = {x: 65, y: 50};
             skel.ankleL = skel.ankleR = {x: 80, y: 65};
             skel.bench = { x: 10, y: 70, width: 60, angle: 0 };
         } else if (isSeated) {
             // Seated
             skel.hipL = skel.hipR = {x: 40, y: 60};
             skel.kneeL = skel.kneeR = {x: 60, y: 60};
             skel.ankleL = skel.ankleR = {x: 60, y: 85};
             skel.bench = { x: 30, y: 65, width: 20, angle: 0 };
         }
     }

     // Motion Logic
     switch (motionType) {
         case 'press':
             if (isBench) {
                 const h = 25 + (t * 30); // 25 (Low) to 55 (High) - WAIT, press goes up (away from chest)
                 // Chest is at y=65. Up is y=35.
                 const startY = 60; const endY = 30;
                 const curY = startY - (t * (startY - endY));
                 skel.wristL = skel.wristR = {x: 30, y: curY};
                 skel.elbowL = skel.elbowR = {x: 30, y: curY + 10};
             } else {
                 // Overhead Press
                 const startY = 25; const endY = 5;
                 const curY = startY - (t * (startY - endY));
                 skel.wristL = {x: 35, y: curY}; skel.wristR = {x: 65, y: curY};
                 skel.elbowL = {x: 25, y: curY + 15}; skel.elbowR = {x: 75, y: curY + 15};
             }
             break;

         case 'pull':
             // Pulldown or Row
             if (view === 'SIDE') {
                 // Row
                 const startX = 60; const endX = 40;
                 const curX = startX - (t * (startX - endX));
                 skel.wristL = skel.wristR = {x: curX, y: 45};
                 skel.elbowL = skel.elbowR = {x: curX - 10, y: 40};
             } else {
                 // Vertical Pull
                 const startY = 10; const endY = 40;
                 const curY = startY + (t * (endY - startY));
                 skel.wristL = {x: 35, y: curY}; skel.wristR = {x: 65, y: curY};
                 skel.elbowL = {x: 25, y: curY + 10}; skel.elbowR = {x: 75, y: curY + 10};
             }
             break;

         case 'hinge':
             // RDL / Deadlift / Squat
             skel.view = 'SIDE';
             const yOffset = t * 15;
             skel.hipL = skel.hipR = {x: 50 - (t*5), y: 50 + yOffset};
             skel.spineBottom = skel.hipL;
             skel.spineTop = {x: 50 + (t*10), y: 22 + yOffset}; 
             skel.shoulderL = skel.shoulderR = skel.spineTop;
             skel.head = {x: skel.spineTop.x + 2, y: skel.spineTop.y - 7};
             skel.wristL = skel.wristR = {x: 55, y: 55 + yOffset}; // Bar follows legs
             break;

         case 'curl':
             const curlAngle = t * Math.PI; // 0 to 180
             const curlY = 55 - (Math.sin(curlAngle) * 20); // Arc
             // Simple linear for stick figure
             const startY = 55; const endY = 25;
             const cY = startY - (t * (startY - endY));
             skel.wristL = {x: 35, y: cY}; skel.wristR = {x: 65, y: cY};
             // Elbows fixed
             skel.elbowL = {x: 35, y: 40}; skel.elbowR = {x: 65, y: 40}; 
             break;
             
         case 'raise':
         case 'fly':
             // Arms go out/up
             const lift = t * 30;
             skel.wristL = {x: 30 - lift, y: 55 - (t*10)};
             skel.wristR = {x: 70 + lift, y: 55 - (t*10)};
             break;
     }

     // Interpolate spine
     skel.spineMid = {x: (skel.spineTop.x + skel.spineBottom.x)/2, y: (skel.spineTop.y + skel.spineBottom.y)/2};
     return skel;
  };

  const skel = getSkeleton(animProgress);
  
  const getMuscleColor = (segment: string) => {
      if (!muscleSplit) return '#64748b';
      if (segment === 'upperArms' && (muscleSplit['Biceps'] || muscleSplit['Triceps'] || muscleSplit['Shoulders'])) return '#3b82f6';
      if (segment === 'torsoUpper' && (muscleSplit['Chest'] || muscleSplit['Back'])) return '#ef4444';
      if ((segment === 'thighs' || segment === 'hips') && (muscleSplit['Legs'] || muscleSplit['Glutes'])) return '#f97316';
      return '#64748b';
  };

  const Bone = ({ p1, p2, type }: { p1: Point, p2: Point, type: string }) => (
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={getMuscleColor(type)} strokeWidth="4" strokeLinecap="round" />
  );
  
  const Joint = ({ p }: { p: Point }) => <circle cx={p.x} cy={p.y} r={2} fill="#cbd5e1" />;

  return (
    <div className="w-full h-56 bg-gym-900 rounded-xl border border-gym-700 mb-4 overflow-hidden relative shadow-inner">
       <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* BENCH */}
          {skel.bench && (
              <line 
                x1={skel.bench.x} y1={skel.bench.y} 
                x2={skel.bench.x + skel.bench.width} y2={skel.bench.y} 
                stroke="#1e293b" strokeWidth="6" strokeLinecap="round" 
              />
          )}

          {/* SKELETON */}
          <Bone p1={skel.head} p2={skel.neck} type="neck" />
          <Bone p1={skel.neck} p2={skel.spineTop} type="neck" />
          <Bone p1={skel.spineTop} p2={skel.spineMid} type="torsoUpper" />
          <Bone p1={skel.spineMid} p2={skel.spineBottom} type="torsoLower" />
          <Bone p1={skel.spineBottom} p2={skel.hipL} type="hips" />
          <Bone p1={skel.spineBottom} p2={skel.hipR} type="hips" />
          
          {skel.view === 'SIDE' ? (
              <>
                 <Bone p1={skel.hipL} p2={skel.kneeL} type="thighs" />
                 <Bone p1={skel.kneeL} p2={skel.ankleL} type="shins" />
                 <Bone p1={skel.neck} p2={skel.shoulderL} type="shoulders" />
                 <Bone p1={skel.shoulderL} p2={skel.elbowL} type="upperArms" />
                 <Bone p1={skel.elbowL} p2={skel.wristL} type="forearms" />
              </>
          ) : (
              <>
                 <Bone p1={skel.hipL} p2={skel.kneeL} type="thighs" />
                 <Bone p1={skel.kneeL} p2={skel.ankleL} type="shins" />
                 <Bone p1={skel.hipR} p2={skel.kneeR} type="thighs" />
                 <Bone p1={skel.kneeR} p2={skel.ankleR} type="shins" />
                 <Bone p1={skel.neck} p2={skel.shoulderL} type="shoulders" />
                 <Bone p1={skel.shoulderL} p2={skel.elbowL} type="upperArms" />
                 <Bone p1={skel.elbowL} p2={skel.wristL} type="forearms" />
                 <Bone p1={skel.neck} p2={skel.shoulderR} type="shoulders" />
                 <Bone p1={skel.shoulderR} p2={skel.elbowR} type="upperArms" />
                 <Bone p1={skel.elbowR} p2={skel.wristR} type="forearms" />
              </>
          )}

          <circle cx={skel.head.x} cy={skel.head.y} r={4} fill="#cbd5e1" />

          {/* EQUIPMENT */}
          {skel.equipment === 'DUMBBELL' && (
              <>
                <circle cx={skel.wristL.x} cy={skel.wristL.y} r={3} fill="#475569" stroke="black" strokeWidth="1" />
                <circle cx={skel.wristR.x} cy={skel.wristR.y} r={3} fill="#475569" stroke="black" strokeWidth="1" />
              </>
          )}
          {skel.equipment === 'BARBELL' && (
              <line 
                 x1={skel.wristL.x - 10} y1={skel.wristL.y} 
                 x2={skel.wristR.x + 10} y2={skel.wristR.y} 
                 stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" 
              />
          )}
       </svg>
    </div>
  );
};

export default StickFigure;
