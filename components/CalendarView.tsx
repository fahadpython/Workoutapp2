

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Flame, Calendar, Info, Dumbbell, AlertCircle, X } from 'lucide-react';
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
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto grid-bg pb-20">
      <div className="flex items-center gap-4 mb-8 bg-black brutal-border p-4">
        <button onClick={onBack} className="text-white hover:text-gym-accent">
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-3xl font-display uppercase tracking-widest flex items-center gap-3">
           <Calendar className="text-gym-accent" size={28} /> Tracker
        </h2>
      </div>

      {/* STREAK HEADER */}
      <div className="bg-gym-warning/20 border-4 border-gym-warning p-6 text-center mb-10 relative overflow-hidden brutal-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm mix-blend-overlay">
              <Flame size={150} />
          </div>
          <p className="text-white font-mono font-bold uppercase tracking-widest text-xs mb-2">Current Streak</p>
          <div className="flex items-end justify-center gap-3">
              <h1 className="text-8xl font-display text-white drop-shadow-md leading-none">{streak}</h1>
              <Flame size={48} className="text-gym-warning animate-pulse mb-2" fill="currentColor" />
          </div>
          <p className="text-xs font-mono text-gray-300 mt-4 uppercase">Rest days (Sundays) don't break the chain.</p>
      </div>

      {/* MONTH NAV */}
      <div className="flex justify-between items-center mb-6 px-2">
          <button onClick={() => changeMonth(-1)} className="p-3 bg-black brutal-border hover:bg-gym-accent hover:text-black transition-colors"><ChevronLeft size={24}/></button>
          <h3 className="text-2xl font-display text-white uppercase tracking-wider">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-3 bg-black brutal-border hover:bg-gym-accent hover:text-black transition-colors"><ChevronRight size={24}/></button>
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-2 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center font-display text-xl text-gray-500 py-2">{d}</div>
          ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-10">
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

              let bgClass = 'bg-gym-800 border-2 border-gym-700 text-gray-400';
              if (isDone) bgClass = 'bg-gym-success text-black border-2 border-black font-black brutal-shadow';
              else if (isMissed) bgClass = 'bg-gym-warning/20 border-2 border-gym-warning text-gym-warning font-bold align-middle';
              else if (isRest) bgClass = 'bg-black border-2 border-gym-800 text-gray-600';
              if (isToday) bgClass += ' ring-4 ring-white ring-offset-2 ring-offset-black relative z-10';

              return (
                  <button 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square flex flex-col items-center justify-center transition-transform hover:scale-110 ${bgClass}`}
                  >
                      <span className="text-lg font-mono">{day}</span>
                  </button>
              );
          })}
      </div>

      {/* MONTHLY STATS */}
      <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black p-4 brutal-border text-center">
              <p className="text-[10px] uppercase font-mono font-bold text-gray-500 mb-2 mt-1">Consistency</p>
              <p className={`text-4xl font-display ${consistency >= 80 ? 'text-gym-success' : consistency >= 50 ? 'text-gym-accent' : 'text-gym-warning'}`}>
                  {consistency}%
              </p>
          </div>
          <div className="bg-black p-4 brutal-border text-center">
              <p className="text-[10px] font-mono uppercase font-bold text-gray-500 mb-2 mt-1">Missed Days</p>
              <p className="text-4xl font-display text-white">{missedCount}</p>
          </div>
      </div>

      {/* DAY DETAILS MODAL (Inline) */}
      <AnimatePresence>
      {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-black brutal-border p-6 shadow-2xl relative">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <p className="text-xl font-display text-white mb-2 uppercase">
                          {selectedDay.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono font-bold px-3 py-1 uppercase brutal-border ${
                              selectedDay.status === 'DONE' ? 'bg-gym-success text-black' :
                              selectedDay.status === 'MISSED' ? 'bg-gym-warning text-black' :
                              selectedDay.status === 'REST' ? 'bg-gray-700 text-white' : 'bg-gym-accent text-black'
                          }`}>
                              {selectedDay.status}
                          </span>
                          {selectedDay.status === 'MISSED' && <span className="text-[10px] font-mono text-gray-400 uppercase">Sch: {WORKOUT_SCHEDULE[selectedDay.date.getDay()]?.name || "Rest"}</span>}
                      </div>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white transition-colors bg-gym-900 border border-gym-700 p-2"><X size={20}/></button>
              </div>

              {selectedDay.status === 'DONE' ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                      {dailyReport.length > 0 ? (
                          dailyReport.map((log, i) => (
                              <div key={i} className="flex justify-between items-center text-sm p-4 bg-gym-900 brutal-border group hover:bg-gym-accent hover:text-black transition-colors">
                                  <span className="font-bold font-mono uppercase group-hover:text-black text-gray-300">{log.exerciseName}</span>
                                  <div className="text-right">
                                      <span className="block font-display text-2xl leading-none mb-1 group-hover:text-black text-white">{log.bestSet}</span>
                                      <span className="text-[10px] font-mono font-bold uppercase group-hover:text-black/60 text-gray-500">{log.sets} Sets</span>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs font-mono text-gray-500 uppercase text-center p-4">No detailed logs found.</p>
                      )}
                  </div>
              ) : selectedDay.status === 'MISSED' ? (
                  <div className="text-center py-8 bg-gym-warning/10 brutal-border border-gym-warning">
                      <AlertCircle className="text-gym-warning mx-auto mb-4" size={32} />
                      <p className="text-sm text-gym-warning font-mono uppercase font-bold mb-2">You missed a session.</p>
                      <p className="text-xs text-gym-warning/70 font-mono uppercase">Consistency is key. Do not break the streak.</p>
                  </div>
              ) : selectedDay.status === 'REST' ? (
                  <div className="text-center py-8 bg-gym-800 brutal-border">
                      <Dumbbell className="text-gray-600 mx-auto mb-4" size={32} />
                      <p className="text-sm font-mono uppercase font-bold text-gray-400">Rest Day.</p>
                      <p className="text-xs font-mono uppercase text-gray-500 mt-2">Recovery is growth.</p>
                  </div>
              ) : (
                  <div className="text-center py-8 bg-gym-800 brutal-border">
                      <p className="text-sm font-mono uppercase font-bold text-gray-400 mb-1">Scheduled Session</p>
                      <p className="text-2xl font-display text-gym-accent">{WORKOUT_SCHEDULE[selectedDay.date.getDay()]?.name || "Rest"}</p>
                  </div>
              )}
          </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CalendarView;