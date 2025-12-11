import React, { useEffect, useState } from 'react';
import { DashboardStats } from '../types';
import { getDashboardStats } from '../services/storageService';
import { ArrowLeft, AlertTriangle, Medal, BarChart3 } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const StatsView: React.FC<Props> = ({ onBack }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    setStats(getDashboardStats());
  }, []);

  if (!stats) return <div className="p-6 text-center text-gray-500">Loading Stats...</div>;

  const getHeatmapColor = (sets: number) => {
    if (sets === 0) return 'bg-gym-800 border-gym-700 text-gray-500';
    if (sets < 5) return 'bg-blue-900/40 border-blue-500/50 text-blue-200';
    if (sets < 10) return 'bg-blue-600/40 border-blue-400 text-white';
    return 'bg-gym-accent border-blue-200 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]';
  };

  // Explicitly type the records to handle 'unknown' type inference from Object.values
  const records = Object.values(stats.personalRecords) as Array<{ weight: number; exerciseName: string; date: string }>;

  return (
    <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto animate-in slide-in-from-right">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <BarChart3 className="text-gym-accent" /> Analytics
        </h2>
      </div>

      {/* Missed Muscles Alert */}
      {stats.missedMuscles.length > 0 && (
        <div className="mb-6 bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-red-400 font-bold uppercase text-xs tracking-wider">
            <AlertTriangle size={16} /> Attention Needed
          </div>
          <p className="text-sm text-gray-300 mb-2">You haven't trained these muscles this week:</p>
          <div className="flex flex-wrap gap-2">
            {stats.missedMuscles.map(m => (
              <span key={m} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Muscle Heatmap */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Weekly Volume (Sets)</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.weeklyVolume).map(([muscle, sets]) => (
            <div key={muscle} className={`p-3 rounded-lg border flex justify-between items-center transition-all ${getHeatmapColor(sets as number)}`}>
               <span className="font-bold">{muscle}</span>
               <span className="text-xl font-mono">{sets}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hall of Fame */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Medal className="text-yellow-500" /> All-Time Best (PRs)
        </h3>
        
        {records.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Log your first workout to see records here.</p>
        ) : (
          <div className="space-y-3">
            {records
              .sort((a, b) => b.weight - a.weight) // Heaviest first
              .map((record, idx) => (
              <div key={idx} className="bg-gym-800 p-4 rounded-xl border border-gym-700 flex items-center justify-between">
                <div>
                   <p className="font-bold text-white">{record.exerciseName}</p>
                   <p className="text-xs text-gray-500">{record.date}</p>
                </div>
                <div className="flex items-end gap-1">
                   <span className="text-2xl font-bold text-gym-accent">{record.weight}</span>
                   <span className="text-xs text-gray-400 mb-1">kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;