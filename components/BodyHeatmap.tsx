
import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  recoveryStatus: Record<string, number>; // hours since training
}

const BodyHeatmap: React.FC<Props> = ({ recoveryStatus }) => {
  const [view, setView] = useState<'FRONT' | 'BACK'>('FRONT');

  // Color Logic:
  // 0-24h: Red (Hot)
  // 24-48h: Orange (Recovering)
  // 48-96h: Yellow (Ready)
  // 96h-336h (14 days): Grey (Cold)
  // > 336h: Ice Blue (Frozen)
  const getColor = (hours: number) => {
      if (hours === undefined || hours === Infinity) return '#60a5fa'; // Ice Blue (Never trained / Frozen)
      if (hours < 24) return '#ef4444'; // Red
      if (hours < 48) return '#f97316'; // Orange
      if (hours < 96) return '#eab308'; // Yellow
      if (hours < 336) return '#475569'; // Slate (Cold)
      return '#60a5fa'; // Frozen
  };

  // Helper for glow filter
  const getFilter = (hours: number) => {
      if (hours < 24) return 'url(#glow-red)';
      if (hours < 48) return 'url(#glow-orange)';
      return '';
  };

  const colors = {
      chest: getColor(recoveryStatus.chest),
      shoulders: getColor(recoveryStatus.shoulders),
      biceps: getColor(recoveryStatus.biceps),
      abs: getColor(recoveryStatus.abs),
      quads: getColor(recoveryStatus.quads),
      back: getColor(recoveryStatus.back),
      triceps: getColor(recoveryStatus.triceps),
      hams_glutes: getColor(recoveryStatus.hams_glutes),
      calves: getColor(recoveryStatus.calves),
  };

  const filters = {
      chest: getFilter(recoveryStatus.chest),
      shoulders: getFilter(recoveryStatus.shoulders),
      biceps: getFilter(recoveryStatus.biceps),
      abs: getFilter(recoveryStatus.abs),
      quads: getFilter(recoveryStatus.quads),
      back: getFilter(recoveryStatus.back),
      triceps: getFilter(recoveryStatus.triceps),
      hams_glutes: getFilter(recoveryStatus.hams_glutes),
      calves: getFilter(recoveryStatus.calves),
  };

  return (
    <div className="bg-gym-800 rounded-xl border border-gym-700 p-4 relative overflow-hidden shadow-2xl">
        <div className="absolute top-4 right-4 z-10">
            <button 
               onClick={() => setView(view === 'FRONT' ? 'BACK' : 'FRONT')}
               className="bg-gym-900/80 p-2 rounded-full text-white hover:bg-gym-700 transition-colors border border-gym-600 backdrop-blur-sm"
            >
                <RotateCcw size={16} />
            </button>
        </div>

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Muscle Status</span>
            <div className="flex gap-2">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></div>
                    <span className="text-[9px] text-gray-400">Pumped</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-[9px] text-gray-400">Frozen</span>
                </div>
            </div>
        </div>

        <div className="w-full h-64 flex items-center justify-center mt-4">
            <svg viewBox="0 0 100 200" className="h-full drop-shadow-lg">
                <defs>
                    <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feFlood floodColor="#ef4444" floodOpacity="0.5" result="glowColor"/>
                        <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feFlood floodColor="#f97316" floodOpacity="0.4" result="glowColor"/>
                        <feComposite in="glowColor" in2="coloredBlur" operator="in" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>

                {view === 'FRONT' ? (
                    <g transform="translate(10, 10) scale(0.8)">
                        {/* HEAD */}
                        <circle cx="50" cy="20" r="12" fill="#334155" />
                        
                        {/* TRAPS/NECK */}
                        <path d="M 42 28 L 58 28 L 65 40 L 35 40 Z" fill="#334155" />

                        {/* SHOULDERS (Front) */}
                        <circle cx="30" cy="45" r="11" fill={colors.shoulders} filter={filters.shoulders} />
                        <circle cx="70" cy="45" r="11" fill={colors.shoulders} filter={filters.shoulders} />

                        {/* CHEST */}
                        <path d="M 35 45 L 65 45 L 60 70 L 40 70 Z" fill={colors.chest} filter={filters.chest} stroke="#1e293b" strokeWidth="0.5" />
                        
                        {/* ABS */}
                        <path d="M 42 72 L 58 72 L 56 100 L 44 100 Z" fill={colors.abs} filter={filters.abs} />
                        {/* Obliques */}
                        <path d="M 35 72 L 42 72 L 44 100 L 38 90 Z" fill={colors.abs} opacity="0.7" />
                        <path d="M 65 72 L 58 72 L 56 100 L 62 90 Z" fill={colors.abs} opacity="0.7" />

                        {/* BICEPS */}
                        <ellipse cx="28" cy="70" rx="7" ry="12" fill={colors.biceps} filter={filters.biceps} />
                        <ellipse cx="72" cy="70" rx="7" ry="12" fill={colors.biceps} filter={filters.biceps} />

                        {/* FOREARMS */}
                        <path d="M 25 85 L 31 85 L 29 110 L 23 110 Z" fill="#334155" />
                        <path d="M 75 85 L 69 85 L 71 110 L 77 110 Z" fill="#334155" />

                        {/* QUADS */}
                        <path d="M 38 105 L 50 105 L 48 150 L 35 145 Z" fill={colors.quads} filter={filters.quads} />
                        <path d="M 62 105 L 50 105 L 52 150 L 65 145 Z" fill={colors.quads} filter={filters.quads} />

                        {/* CALVES (Front) */}
                        <path d="M 36 155 L 46 155 L 44 190 L 38 185 Z" fill={colors.calves} filter={filters.calves} />
                        <path d="M 64 155 L 54 155 L 56 190 L 62 185 Z" fill={colors.calves} filter={filters.calves} />
                    </g>
                ) : (
                    <g transform="translate(10, 10) scale(0.8)">
                        {/* HEAD */}
                        <circle cx="50" cy="20" r="12" fill="#334155" />

                        {/* TRAPS (Back) */}
                        <path d="M 50 25 L 65 40 L 50 55 L 35 40 Z" fill={colors.back} filter={filters.back} />

                        {/* SHOULDERS (Rear) */}
                        <circle cx="30" cy="45" r="11" fill={colors.shoulders} opacity="0.9" />
                        <circle cx="70" cy="45" r="11" fill={colors.shoulders} opacity="0.9" />

                        {/* LATS */}
                        <path d="M 35 55 L 65 55 L 55 90 L 45 90 Z" fill={colors.back} filter={filters.back} />
                        <path d="M 35 55 L 25 65 L 45 90" fill={colors.back} opacity="0.8" />
                        <path d="M 65 55 L 75 65 L 55 90" fill={colors.back} opacity="0.8" />

                        {/* TRICEPS */}
                        <ellipse cx="28" cy="65" rx="7" ry="10" fill={colors.triceps} filter={filters.triceps} />
                        <ellipse cx="72" cy="65" rx="7" ry="10" fill={colors.triceps} filter={filters.triceps} />
                         {/* FOREARMS */}
                         <path d="M 25 80 L 31 80 L 29 105 L 23 105 Z" fill="#334155" />
                         <path d="M 75 80 L 69 80 L 71 105 L 77 105 Z" fill="#334155" />

                        {/* GLUTES */}
                        <path d="M 45 90 L 50 90 L 50 115 L 35 110 Z" fill={colors.hams_glutes} filter={filters.hams_glutes} />
                        <path d="M 55 90 L 50 90 L 50 115 L 65 110 Z" fill={colors.hams_glutes} filter={filters.hams_glutes} />

                        {/* HAMSTRINGS */}
                        <path d="M 36 115 L 49 115 L 47 150 L 38 150 Z" fill={colors.hams_glutes} opacity="0.8" />
                        <path d="M 64 115 L 51 115 L 53 150 L 62 150 Z" fill={colors.hams_glutes} opacity="0.8" />

                        {/* CALVES (Back) */}
                        <ellipse cx="42" cy="165" rx="7" ry="12" fill={colors.calves} filter={filters.calves} />
                        <ellipse cx="58" cy="165" rx="7" ry="12" fill={colors.calves} filter={filters.calves} />
                    </g>
                )}
            </svg>
        </div>
        
        {/* Helper Text */}
        <p className="text-center text-[10px] text-gray-500 mt-2">
            Target frozen muscles to balance your physique.
        </p>
    </div>
  );
};

export default BodyHeatmap;
