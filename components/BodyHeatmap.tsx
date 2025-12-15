
import React, { useState } from 'react';
import { RotateCcw, Info } from 'lucide-react';

interface Props {
  recoveryStatus: Record<string, { hours: number; volume: number }>; 
}

const BodyHeatmap: React.FC<Props> = ({ recoveryStatus }) => {
  const [view, setView] = useState<'FRONT' | 'BACK'>('FRONT');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Status Logic
  const getStatus = (hours: number) => {
      if (hours === undefined || hours === Infinity) return 'FROZEN';
      if (hours < 24) return 'RECOVERING'; // Red
      if (hours < 48) return 'HEALING'; // Orange
      if (hours < 96) return 'READY'; // Yellow
      if (hours < 168) return 'FRESH'; // Slate
      return 'FROZEN'; // Blue
  };

  const getColor = (hours: number) => {
      if (hours === undefined || hours === Infinity) return '#3b82f6'; // Blue
      if (hours < 24) return '#ef4444'; // Red
      if (hours < 48) return '#f97316'; // Orange
      if (hours < 96) return '#eab308'; // Yellow
      if (hours < 168) return '#94a3b8'; // Slate
      return '#3b82f6'; // Blue
  };

  const getOpacity = (hours: number) => {
      if (hours === undefined || hours === Infinity) return 0.2;
      if (hours < 96) return 0.8;
      return 0.4;
  }

  // --- SVG PATHS (Simplified Anatomy) ---
  const PATHS = {
      front: {
          traps: "M 38 25 L 62 25 L 68 35 L 32 35 Z",
          shoulders_front: "M 25 38 Q 32 38 32 48 Q 25 55 18 48 Q 18 38 25 38 M 75 38 Q 82 38 82 48 Q 75 55 68 48 Q 68 38 75 38",
          shoulders_side: "M 18 38 Q 25 35 25 45 Q 18 52 15 45 Q 15 38 18 38 M 82 38 Q 75 35 75 45 Q 82 52 85 45 Q 85 38 82 38",
          chest_upper: "M 32 40 L 68 40 L 65 52 L 35 52 Z",
          chest_lower: "M 35 52 L 65 52 L 60 65 L 40 65 Z",
          biceps: "M 20 50 L 30 50 L 28 68 L 22 68 Z M 80 50 L 70 50 L 72 68 L 78 68 Z",
          forearms: "M 18 70 L 28 70 L 26 95 L 20 95 Z M 82 70 L 72 70 L 74 95 L 80 95 Z",
          abs: "M 42 65 L 58 65 L 56 95 L 44 95 Z",
          obliques: "M 35 65 L 42 65 L 44 95 L 38 85 Z M 65 65 L 58 65 L 56 95 L 62 85 Z",
          quads: "M 38 100 L 50 100 L 48 145 L 35 140 Z M 62 100 L 50 100 L 52 145 L 65 140 Z",
          calves: "M 36 150 L 46 150 L 44 185 L 38 180 Z M 64 150 L 54 150 L 56 185 L 62 180 Z"
      },
      back: {
          traps: "M 50 20 L 65 35 L 50 55 L 35 35 Z", // Diamond
          shoulders_rear: "M 25 38 Q 32 38 32 48 Q 25 55 18 48 Q 18 38 25 38 M 75 38 Q 82 38 82 48 Q 75 55 68 48 Q 68 38 75 38",
          shoulders_side: "M 18 38 Q 25 35 25 45 Q 18 52 15 45 Q 15 38 18 38 M 82 38 Q 75 35 75 45 Q 82 52 85 45 Q 85 38 82 38",
          back_upper: "M 35 40 L 65 40 L 60 55 L 40 55 Z", // Rhomboids
          lats: "M 35 55 L 65 55 L 55 85 L 45 85 Z M 25 55 L 35 55 L 45 85 L 30 75 Z M 75 55 L 65 55 L 55 85 L 70 75 Z", // Complex wings
          triceps: "M 20 50 L 30 50 L 28 68 L 22 68 Z M 80 50 L 70 50 L 72 68 L 78 68 Z",
          back_lower: "M 45 85 L 55 85 L 55 100 L 45 100 Z", // Erectors
          forearms: "M 18 70 L 28 70 L 26 95 L 20 95 Z M 82 70 L 72 70 L 74 95 L 80 95 Z",
          glutes: "M 35 100 L 50 100 L 50 125 L 30 120 Z M 65 100 L 50 100 L 50 125 L 70 120 Z",
          hamstrings: "M 35 125 L 48 125 L 46 155 L 37 155 Z M 65 125 L 52 125 L 54 155 L 63 155 Z",
          calves: "M 36 160 L 46 160 L 44 185 L 38 180 Z M 64 160 L 54 160 L 56 185 L 62 180 Z"
      }
  };

  const LABELS: Record<string, string> = {
      traps: "Trapezius",
      shoulders_front: "Front Delts",
      shoulders_side: "Side Delts",
      shoulders_rear: "Rear Delts",
      chest_upper: "Upper Chest",
      chest_lower: "Main Chest",
      biceps: "Biceps",
      triceps: "Triceps",
      forearms: "Forearms",
      lats: "Lats",
      back_upper: "Upper Back",
      back_lower: "Lower Back",
      abs: "Abdominals",
      obliques: "Obliques",
      quads: "Quadriceps",
      hamstrings: "Hamstrings",
      glutes: "Glutes",
      calves: "Calves"
  };

  const MusclePath: React.FC<{ id: string; path: string }> = ({ id, path }) => {
      const data = recoveryStatus[id] || { hours: Infinity, volume: 0 };
      const isSelected = selectedMuscle === id;
      
      return (
          <path 
            d={path} 
            fill={getColor(data.hours)} 
            fillOpacity={getOpacity(data.hours)}
            stroke={isSelected ? 'white' : 'transparent'}
            strokeWidth="2"
            className="transition-all duration-300 cursor-pointer hover:opacity-100"
            onClick={() => setSelectedMuscle(isSelected ? null : id)}
          />
      );
  };

  return (
    <div className="bg-gym-800 rounded-xl border border-gym-700 p-4 relative overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
        
        {/* Header Controls */}
        <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Info size={10} /> Muscle Recovery
                </span>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div><span className="text-[9px] text-gray-400">Recov</span></div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-[9px] text-gray-400">Ready</span></div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="text-[9px] text-gray-400">Fresh</span></div>
                </div>
            </div>
            <button 
               onClick={() => { setView(view === 'FRONT' ? 'BACK' : 'FRONT'); setSelectedMuscle(null); }}
               className="bg-gym-900/80 px-3 py-1 text-xs font-bold rounded-lg text-white hover:bg-gym-700 transition-colors border border-gym-600 backdrop-blur-sm flex items-center gap-2"
            >
                <RotateCcw size={12} /> Flip
            </button>
        </div>

        {/* INFO CARD OVERLAY */}
        {selectedMuscle && (
            <div className="absolute top-16 left-4 right-4 z-20 bg-gym-900/95 backdrop-blur-md p-3 rounded-lg border border-gym-600 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-white text-lg">{LABELS[selectedMuscle]}</h4>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatus(recoveryStatus[selectedMuscle]?.hours) === 'RECOVERING' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}`}>
                                {getStatus(recoveryStatus[selectedMuscle]?.hours)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {recoveryStatus[selectedMuscle]?.hours < 999 ? `${Math.round(recoveryStatus[selectedMuscle]?.hours)}h ago` : 'Long time ago'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Week Volume</p>
                        <p className="text-xl font-mono font-bold text-white">
                            {recoveryStatus[selectedMuscle]?.volume.toLocaleString()}<span className="text-sm text-gray-500">kg</span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* SVG RENDERER */}
        <div className="w-full h-64 flex items-center justify-center mt-2" onClick={(e) => { if(e.target === e.currentTarget) setSelectedMuscle(null); }}>
            <svg viewBox="0 0 100 200" className="h-full drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {view === 'FRONT' ? (
                    <g>
                        {/* Silhouette Body Background */}
                        <path d="M 50 15 L 60 25 L 90 35 L 85 90 L 90 95 L 85 110 L 65 140 L 65 180 L 55 195 L 45 195 L 35 180 L 35 140 L 15 110 L 10 95 L 15 90 L 10 35 L 40 25 Z" fill="#1e293b" />
                        
                        {Object.entries(PATHS.front).map(([id, path]) => (
                            <MusclePath key={id} id={id} path={path} />
                        ))}
                        
                        {/* Head */}
                        <circle cx="50" cy="12" r="8" fill="#475569" />
                    </g>
                ) : (
                    <g>
                        {/* Silhouette Body Background */}
                        <path d="M 50 15 L 60 25 L 90 35 L 85 90 L 90 95 L 85 110 L 65 140 L 65 180 L 55 195 L 45 195 L 35 180 L 35 140 L 15 110 L 10 95 L 15 90 L 10 35 L 40 25 Z" fill="#1e293b" />

                        {Object.entries(PATHS.back).map(([id, path]) => (
                            <MusclePath key={id} id={id} path={path} />
                        ))}

                        {/* Head */}
                        <circle cx="50" cy="12" r="8" fill="#475569" />
                    </g>
                )}
            </svg>
        </div>
        
        <p className="text-center text-[10px] text-gray-600 mt-2">
            Tap a muscle group to see detailed volume stats.
        </p>
    </div>
  );
};

export default BodyHeatmap;
