

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Flame, Calendar, Info, Dumbbell, AlertCircle } from 'lucide-react';
import { getUniqueWorkoutDates, getLogsForDate, getTodayString } from '../services/storageService';
import { WORKOUT_SCHEDULE } from '../constants';

interface Props {
  onBack: () => void;
}

const CalendarView: React.FC<Props> = ({ onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ date: Date; status: 'DONE' | 'MISSED' | 'REST' | 'FUTURE' } | null>(null);
  const [dailyReport, setDailyReport] = useState<{ exerciseName: string; sets: number; bestSet: string }[]>([]);
  
  // Stats
  const [streak, setStreak] = useState(0);
  const [consistency, setConsistency] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    const dates = getUniqueWorkoutDates();
    setWorkoutDates(dates);
    calculateStats(dates);
  }, []);

  const calculateStats = (dates: Set<string>) => {
      // 1. Calculate Streak
      // Logic: Iterate backwards from today. 
      // If Today is done, count it. If not, start from yesterday.
      // If Sunday (0), ignore (don't break, don't increment).
      // If Date in Set, streak++.
      // If Date NOT in Set and NOT Sunday, break.
      
      let streakCount = 0;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      // Check today first
      let checkDate = new Date(today);
      if (dates.has(checkDate.toISOString().split('T')[0])) {
          streakCount++;
      }
      
      // Go back in time
      checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday
      
      // Safety limit: 365 days back
      for (let i = 0; i < 365; i++) {
          const iso = checkDate.toISOString().split('T')[0];
          const dayOfWeek = checkDate.getDay();
          
          if (dates.has(iso)) {
              streakCount++;
          } else if (dayOfWeek === 0) {
              // It's Sunday and we didn't work out. 
              // Does not break streak, but does not add to it.
              // Just continue to Saturday.
          } else {
              // Missed a workout day -> Streak broken
              break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
      }
      setStreak(streakCount);

      // 2. Calculate Monthly Consistency
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayIso = getTodayString();
      
      let planned = 0;
      let completed = 0;
      let missed = 0;

      for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month, d);
          const iso = dateObj.toISOString().split('T')[0];
          if (iso > todayIso) break; // Don't count future

          const dayOfWeek = dateObj.getDay();
          const isRestDay = dayOfWeek === 0; // Sunday
          
          if (dates.has(iso)) {
              completed++;
              if (!isRestDay) planned++;
          } else if (!isRestDay) {
              planned++;
              missed++;
          }
      }
      setConsistency(planned > 0 ? Math.round((completed / planned) * 100) : 0);
      setMissedCount(missed);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDay };
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
  };

  const handleDayClick = (day: number) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const iso = date.toISOString().split('T')[0];
      const todayIso = getTodayString();
      
      let status: 'DONE' | 'MISSED' | 'REST' | 'FUTURE' = 'FUTURE';
      if (iso > todayIso) status = 'FUTURE';
      else if (workoutDates.has(iso)) status = 'DONE';
      else if (date.getDay() === 0) status = 'REST';
      else status = 'MISSED';

      setSelectedDay({ date, status });
      
      if (status === 'DONE') {
          const logs = getLogsForDate(iso);
          setDailyReport(logs);
      } else {
          setDailyReport([]);
      }
  };

  const { daysInMonth, firstDay } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto animate-in slide-in-from-right">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <Calendar className="text-gym-accent" /> Attendance
        </h2>
      </div>

      {/* STREAK HEADER */}
      <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/30 rounded-2xl p-6 text-center mb-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Flame size={120} />
          </div>
          <p className="text-orange-400 font-bold uppercase tracking-widest text-xs mb-1">Current Streak</p>
          <div className="flex items-center justify-center gap-2">
              <h1 className="text-6xl font-black text-white drop-shadow-md">{streak}</h1>
              <Flame size={40} className="text-orange-500 animate-pulse" fill="currentColor" />
          </div>
          <p className="text-xs text-gray-400 mt-2">Rest days (Sundays) don't break the chain!</p>
      </div>

      {/* MONTH NAV */}
      <div className="flex justify-between items-center mb-4 px-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-gym-800 rounded-full hover:bg-gym-700 text-gray-400"><ChevronLeft size={20}/></button>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 bg-gym-800 rounded-full hover:bg-gym-700 text-gray-400"><ChevronRight size={20}/></button>
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>
          ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-6">
          {/* Empty cells for padding */}
          {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} />)}
          
          {/* Days */}
          {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const iso = date.toISOString().split('T')[0];
              const todayIso = getTodayString();
              const isToday = iso === todayIso;
              
              const isDone = workoutDates.has(iso);
              const isRest = date.getDay() === 0;
              const isFuture = iso > todayIso;
              const isMissed = !isDone && !isRest && !isFuture;

              let bgClass = 'bg-gym-800 border-gym-700 text-gray-400';
              if (isDone) bgClass = 'bg-green-900/50 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]';
              else if (isMissed) bgClass = 'bg-red-900/20 border-red-500/50 text-red-300';
              else if (isRest) bgClass = 'bg-gym-900 border-gym-800 text-gray-600';
              if (isToday) bgClass += ' ring-2 ring-white';

              return (
                  <button 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative ${bgClass}`}
                  >
                      <span className="text-sm font-bold">{day}</span>
                      {isDone && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1"></div>}
                      {isMissed && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1"></div>}
                  </button>
              );
          })}
      </div>

      {/* MONTHLY STATS */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gym-800 p-3 rounded-xl border border-gym-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-500">Consistency</p>
              <p className={`text-xl font-black ${consistency >= 80 ? 'text-green-400' : consistency >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {consistency}%
              </p>
          </div>
          <div className="bg-gym-800 p-3 rounded-xl border border-gym-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-500">Missed Days</p>
              <p className="text-xl font-black text-white">{missedCount}</p>
          </div>
      </div>

      {/* DAY DETAILS MODAL (Inline) */}
      {selectedDay && (
          <div className="bg-gym-800 rounded-xl border border-gym-700 p-4 animate-in slide-in-from-bottom-2 shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-sm font-bold text-white mb-1">
                          {selectedDay.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              selectedDay.status === 'DONE' ? 'bg-green-900 text-green-400' :
                              selectedDay.status === 'MISSED' ? 'bg-red-900 text-red-400' :
                              selectedDay.status === 'REST' ? 'bg-gray-700 text-gray-300' : 'bg-blue-900 text-blue-300'
                          }`}>
                              {selectedDay.status}
                          </span>
                          {selectedDay.status === 'MISSED' && <span className="text-[10px] text-gray-500">Scheduled: {WORKOUT_SCHEDULE[selectedDay.date.getDay()]?.name || "Rest"}</span>}
                      </div>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white"><XCircle size={20}/></button>
              </div>

              {selectedDay.status === 'DONE' ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                      {dailyReport.length > 0 ? (
                          dailyReport.map((log, i) => (
                              <div key={i} className="flex justify-between items-center text-xs p-2 bg-gym-900 rounded border border-gym-700">
                                  <span className="font-bold text-gray-300">{log.exerciseName}</span>
                                  <div className="text-right">
                                      <span className="block font-bold text-white">{log.bestSet}</span>
                                      <span className="text-gray-500">{log.sets} Sets</span>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs text-gray-500 italic">No detailed logs found.</p>
                      )}
                  </div>
              ) : selectedDay.status === 'MISSED' ? (
                  <div className="text-center py-4 bg-red-900/10 rounded-lg border border-red-500/20">
                      <AlertCircle className="text-red-500 mx-auto mb-2" size={24} />
                      <p className="text-xs text-red-300 font-bold">You missed a scheduled session.</p>
                      <p className="text-[10px] text-red-400/70 mt-1">Consistency is key. Don't miss two in a row.</p>
                  </div>
              ) : selectedDay.status === 'REST' ? (
                  <div className="text-center py-4">
                      <Dumbbell className="text-gray-600 mx-auto mb-2" size={24} />
                      <p className="text-xs text-gray-400">Rest Day. Recovery is when growth happens.</p>
                  </div>
              ) : (
                  <div className="text-center py-4">
                      <p className="text-xs text-gray-400">Scheduled: {WORKOUT_SCHEDULE[selectedDay.date.getDay()]?.name || "Rest"}</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default CalendarView;