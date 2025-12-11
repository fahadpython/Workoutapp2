
import React, { useEffect, useState } from 'react';
import { MotionType } from '../types';

interface StickFigureProps {
  motionType: MotionType;
  exerciseName: string;
}

const StickFigure: React.FC<StickFigureProps> = ({ motionType, exerciseName }) => {
  const [t, setT] = useState(0);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      // 2.5 second cycle (0 to 1 to 0)
      const now = Date.now();
      const cyclePos = (now % 2500) / 2500; 
      // Sine wave for smooth back-and-forth
      const val = (Math.sin(cyclePos * Math.PI * 2 - (Math.PI/2)) + 1) / 2;
      setT(val);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const name = exerciseName.toLowerCase();
  
  const renderFigure = () => {
    // --- 1. BENCH PRESS (Lying) ---
    if (name.includes('bench') || (name.includes('press') && (name.includes('flat') || name.includes('incline')))) {
        const incline = name.includes('incline') ? 15 : 0;
        const armExt = 25 * t;
        
        return (
            <g stroke="white" strokeWidth="2" fill="none" transform="translate(10,10) scale(0.8)">
                {/* Bench */}
                <line x1="10" y1="70" x2="80" y2={70 - incline} stroke="#475569" strokeWidth="4" />
                <line x1="20" y1="70" x2="20" y2="90" stroke="#475569" />
                <line x1="70" y1={70 - incline} x2="70" y2="90" stroke="#475569" />
                
                {/* Body (Head at 20, Hips at 60) */}
                <circle cx="20" cy={65 - (incline * 0.1)} r="5" /> 
                <line x1="20" y1={65 + 5 - (incline * 0.1)} x2="55" y2={65 - (incline * 0.8)} /> {/* Torso */}
                <line x1="55" y1={65 - (incline * 0.8)} x2="65" y2={55} /> {/* Thigh */}
                <line x1="65" y1={55} x2="65" y2={75} /> {/* Shin */}
                
                {/* Arms (Shoulder approx at 30) */}
                <path d={`M 30 ${65 - (incline * 0.3)} L 30 ${55 - armExt - (incline * 0.3)} L 45 ${55 - armExt - (incline * 0.3)}`} />
                
                {/* Weight */}
                <line x1="20" y1={55 - armExt - (incline * 0.3)} x2="55" y2={55 - armExt - (incline * 0.3)} stroke="#ef4444" strokeWidth="3" />
            </g>
        );
    }
    
    // --- 2. DIPS ---
    if (name.includes('dip')) {
        const dip = 20 * (1 - t); // Go down then up
        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
                {/* Bars */}
                <line x1="10" y1="60" x2="40" y2="60" stroke="#475569" strokeWidth="3" />
                <line x1="25" y1="60" x2="25" y2="90" stroke="#475569" strokeWidth="3" />
                
                {/* Body - moves up and down */}
                <g transform={`translate(0, ${dip})`}>
                    <circle cx="35" cy="30" r="5" />
                    <line x1="35" y1="35" x2="40" y2="60" /> {/* Torso lean forward */}
                    <line x1="40" y1="60" x2="40" y2="80" /> {/* Legs */}
                    
                    {/* Arm - Forearm static on bar, Upper arm moves */}
                    {/* Shoulder at 35,35. Hand at 25,60 */}
                    <path d={`M 35 35 L 15 ${45 + (dip * 0.5)} L 25 60`} />
                </g>
             </g>
        );
    }

    // --- 3. OVERHEAD PRESS (Standing) ---
    if (name.includes('overhead') || name.includes('shoulder') || name.includes('military')) {
        const press = 30 * t;
        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
                <circle cx="40" cy="30" r="5" />
                <line x1="40" y1="35" x2="40" y2="65" />
                <line x1="40" y1="65" x2="35" y2="90" />
                <line x1="40" y1="65" x2="45" y2="90" />
                
                {/* Arms */}
                <path d={`M 40 40 L 25 ${40 - (press * 0.5)} L 25 ${30 - press}`} />
                <path d={`M 40 40 L 55 ${40 - (press * 0.5)} L 55 ${30 - press}`} />
                
                {/* DBs */}
                <circle cx="25" cy={30 - press} r="3" fill="#ef4444" stroke="none" />
                <circle cx="55" cy={30 - press} r="3" fill="#ef4444" stroke="none" />
             </g>
        );
    }

    // --- 4. RDL / HINGE ---
    if (motionType === 'hinge' || name.includes('deadlift')) {
        const hinge = 45 * (1 - t); // Angle degrees
        const rad = (hinge * Math.PI) / 180;
        
        // Hip at 40, 60
        // Head pos calculated based on angle
        const torsoLen = 30;
        const headX = 40 + Math.sin(rad) * torsoLen;
        const headY = 60 - Math.cos(rad) * torsoLen;

        // Shoulder is approx 80% up the torso
        const shoulderX = 40 + Math.sin(rad) * (torsoLen * 0.8);
        const shoulderY = 60 - Math.cos(rad) * (torsoLen * 0.8);

        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(10,10) scale(0.8)">
                {/* Legs */}
                <line x1="40" y1="60" x2="40" y2="90" />
                
                {/* Torso */}
                <line x1="40" y1="60" x2={headX} y2={headY} />
                <circle cx={headX} cy={headY} r="5" />
                
                {/* Arm hanging vertical from shoulder */}
                <line x1={shoulderX} y1={shoulderY} x2={shoulderX} y2={shoulderY + 25} />
                <circle cx={shoulderX} cy={shoulderY + 25} r="4" fill="#ef4444" stroke="none" />
             </g>
        );
    }
    
    // --- 5. SQUAT / LEG PRESS ---
    if (name.includes('squat') || name.includes('leg press')) {
        const squat = 20 * (1 - t);
        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
                 {/* Body moves straight down */}
                 <circle cx="40" cy={30 + squat} r="5" />
                 <line x1="40" y1={35 + squat} x2="40" y2={60 + squat} />
                 
                 {/* Legs fold */}
                 {/* Hip 40, 60+s. Knee moves out. Foot at 40,90 */}
                 <path d={`M 40 ${60 + squat} L 25 ${75 + (squat * 0.5)} L 40 90`} />
                 <path d={`M 40 ${60 + squat} L 55 ${75 + (squat * 0.5)} L 40 90`} />
             </g>
        );
    }

    // --- 6. CURLS ---
    if (motionType === 'curl' || name.includes('curl')) {
        const curl = t; // 0 to 1
        const handX = 40 + (15 * curl);
        const handY = 65 - (25 * curl);
        
        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
                <circle cx="40" cy="30" r="5" />
                <line x1="40" y1="35" x2="40" y2="65" />
                <line x1="40" y1="65" x2="35" y2="90" />
                <line x1="40" y1="65" x2="45" y2="90" />
                
                {/* Arm */}
                <line x1="40" y1="40" x2="40" y2="60" /> {/* Upper */}
                <line x1="40" y1="60" x2={handX} y2={handY} /> {/* Forearm */}
                
                <circle cx={handX} cy={handY} r="3" fill="#ef4444" stroke="none" />
             </g>
        );
    }
    
    // --- 7. LAT PULLDOWN ---
    if (name.includes('pulldown') || (name.includes('pull') && !name.includes('face') && !name.includes('apart'))) {
         const pull = 25 * t; // Downward
         
         return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(10,10) scale(0.8)">
                {/* Seat */}
                <line x1="30" y1="75" x2="70" y2="75" stroke="#475569" />
                
                {/* Body */}
                <circle cx="50" cy="50" r="5" />
                <line x1="50" y1="55" x2="50" y2="75" />
                <line x1="50" y1="75" x2="45" y2="90" />
                <line x1="50" y1="75" x2="55" y2="90" />
                
                {/* Arms - Start high, pull elbows down */}
                <path d={`M 50 55 L 30 ${40 + pull} L 30 ${20 + pull}`} />
                <path d={`M 50 55 L 70 ${40 + pull} L 70 ${20 + pull}`} />
                
                {/* Bar */}
                <line x1="15" y1={20 + pull} x2="85" y2={20 + pull} stroke="#ef4444" strokeWidth="3" />
             </g>
         );
    }
    
    // --- 8. ROWS ---
    if (name.includes('row')) {
         const row = 15 * t;
         
         return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(10,10) scale(0.8)">
                 {/* Seat */}
                 <line x1="20" y1="75" x2="60" y2="75" stroke="#475569" />
                 
                 {/* Body */}
                 <circle cx="40" cy="50" r="5" />
                 <line x1="40" y1="55" x2="40" y2="75" />
                 <line x1="40" y1="75" x2="60" y2="75" /> {/* Legs */}
                 
                 {/* Arms - Pull back */}
                 <line x1="40" y1="55" x2={60 - row} y2={60} />
                 <line x1={60 - row} y1={60} x2={80 - row} y2={60} />
                 
                 {/* Cable */}
                 <line x1={80 - row} y1={60} x2="90" y2="60" stroke="#475569" strokeDasharray="4 2" />
             </g>
         );
    }
    
    // --- 9. LATERAL RAISE / FLY ---
    if (name.includes('raise') || name.includes('fly') || name.includes('pec deck')) {
        const raise = 80 * t; // Angle
        const rad = (raise * Math.PI) / 180;
        
        // Pivot 40, 40
        const armLen = 25;
        const handX = 40 + Math.sin(rad) * armLen;
        const handY = 40 + Math.cos(rad) * armLen;
        
        return (
             <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
                {/* Arms */}
                <circle cx="40" cy="30" r="5" />
                <line x1="40" y1="35" x2="40" y2="65" />
                <line x1="40" y1="65" x2="35" y2="90" />
                <line x1="40" y1="65" x2="45" y2="90" />
                
                <line x1="40" y1="40" x2={40 + Math.sin(rad) * armLen} y2={40 + Math.cos(rad) * armLen} />
                <line x1="40" y1="40" x2={40 - Math.sin(rad) * armLen} y2={40 + Math.cos(rad) * armLen} />
                
                <circle cx={40 + Math.sin(rad) * armLen} cy={40 + Math.cos(rad) * armLen} r="3" fill="#ef4444" stroke="none" />
                <circle cx={40 - Math.sin(rad) * armLen} cy={40 + Math.cos(rad) * armLen} r="3" fill="#ef4444" stroke="none" />
             </g>
        );
    }
    
    // --- 10. GLUTE BRIDGE ---
    if (name.includes('bridge')) {
        const bridge = 20 * t;
        return (
            <g stroke="white" strokeWidth="2" fill="none" transform="translate(10,20) scale(0.8)">
                {/* Shoulders at 20,80. Feet at 80,80. Hips move from 80 to 60 */}
                <circle cx="15" cy="80" r="5" />
                <line x1="20" y1="80" x2="50" y2={80 - bridge} /> {/* Torso */}
                <line x1="50" y1={80 - bridge} x2="80" y2="80" /> {/* Thighs */}
                <line x1="80" y1="80" x2="80" y2="90" /> {/* Shins (verticalish) */}
                
                {/* Weight on hips */}
                 <rect x="45" y={75 - bridge} width="10" height="5" fill="#ef4444" stroke="none" />
            </g>
        )
    }

    // Default: Simple standing idle
    return (
         <g stroke="white" strokeWidth="2" fill="none" transform="translate(20,10) scale(0.8)">
            <circle cx="40" cy="30" r="5" />
            <line x1="40" y1="35" x2="40" y2="65" />
            <line x1="40" y1="65" x2="35" y2="90" />
            <line x1="40" y1="65" x2="45" y2="90" />
            <line x1="40" y1="40" x2="30" y2={50 + (5 * t)} />
            <line x1="40" y1="40" x2="50" y2={50 + (5 * t)} />
         </g>
    );
  };

  return (
    <div className="w-full h-40 flex justify-center items-center bg-gym-900/50 rounded-xl border border-gym-700 mb-4 overflow-hidden relative">
        <div className="absolute top-2 right-2 text-[10px] text-gray-500 font-mono">FORM CHECK</div>
        <svg viewBox="0 0 100 100" className="w-full h-full text-white">
            {renderFigure()}
        </svg>
    </div>
  );
};

export default StickFigure;
