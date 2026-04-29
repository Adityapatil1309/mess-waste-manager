import { useState, useEffect } from 'react';
import API from '../api/axios';
import { differenceInSeconds, set } from 'date-fns';
import { HiOutlineClock, HiOutlineFire, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';

const DEFAULT_SCHEDULE = [
  { id: 'breakfast', name: 'Breakfast', emoji: '🌅', startH: 7, startM: 30, endH: 9, endM: 0 },
  { id: 'lunch', name: 'Lunch', emoji: '☀️', startH: 12, startM: 0, endH: 14, endM: 0 },
  { id: 'dinner', name: 'Dinner', emoji: '🌙', startH: 19, startM: 0, endH: 21, endM: 0 },
];

export default function LiveMealWidget({ menu, todayStatus, isStudent = false, mlStats = null }) {
  const [now, setNow] = useState(new Date());
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  const parseTimings = (apiTimings) => {
    return DEFAULT_SCHEDULE.map(def => {
      const apiTiming = apiTimings.find(t => t.meal_type === def.id);
      if (apiTiming && apiTiming.start_time && apiTiming.end_time) {
        const [sh, sm] = apiTiming.start_time.split(':').map(Number);
        const [eh, em] = apiTiming.end_time.split(':').map(Number);
        return { ...def, startH: sh, startM: sm, endH: eh, endM: em };
      }
      return def;
    });
  };

  const loadTimings = async () => {
    try {
      const res = await API.get('/meal-timings');
      if (res.data && res.data.length > 0) {
        setSchedule(parseTimings(res.data));
      }
    } catch (err) {
      console.error('Failed to load live timings, using defaults', err);
    }
  };

  useEffect(() => {
    loadTimings();

    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000/api';
    const ws = new WebSocket(`${wsUrl}/ws/meal-timings`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TIMINGS_UPDATED') {
          loadTimings();
        }
      } catch(e) {}
    };

    // Update every second
    const interval = setInterval(() => setNow(new Date()), 1000);
    
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);


  const getCurrentOrNextMeal = () => {
    const currentTime = now;
    let ongoingMeal = null;
    let nextMeal = null;
    let targetTime = null;

    for (const meal of schedule) {
      const start = set(currentTime, { hours: meal.startH, minutes: meal.startM, seconds: 0, milliseconds: 0 });
      const end = set(currentTime, { hours: meal.endH, minutes: meal.endM, seconds: 0, milliseconds: 0 });

      if (currentTime >= start && currentTime < end) {
        ongoingMeal = meal;
        targetTime = end;
        break;
      }
    }

    if (!ongoingMeal) {
      for (const meal of schedule) {
        const start = set(currentTime, { hours: meal.startH, minutes: meal.startM, seconds: 0, milliseconds: 0 });
        if (currentTime < start) {
          nextMeal = meal;
          targetTime = start;
          break;
        }
      }

      if (!nextMeal) {
        nextMeal = schedule[0];
        targetTime = set(currentTime, { hours: nextMeal.startH, minutes: nextMeal.startM, seconds: 0, milliseconds: 0 });
        targetTime.setDate(targetTime.getDate() + 1);
      }
    }

    return { ongoingMeal, nextMeal, targetTime };
  };

  const { ongoingMeal, nextMeal, targetTime } = getCurrentOrNextMeal();
  const mealInfo = ongoingMeal || nextMeal;
  const isOngoing = !!ongoingMeal;

  const diffInSeconds = Math.max(0, differenceInSeconds(targetTime, now));
  const h = Math.floor(diffInSeconds / 3600);
  const m = Math.floor((diffInSeconds % 3600) / 60);
  const s = diffInSeconds % 60;
  
  const pad = (num) => String(num).padStart(2, '0');
  
  // Extracting details safely
  const menuItems = menu?.meals?.[mealInfo.id]?.items || [];
  let rsvpStatus = null;
  if (isStudent && todayStatus?.meals_marked) {
    rsvpStatus = todayStatus.meals_marked[mealInfo.id];
  }

  return (
    <div className={`glass-card p-6 overflow-hidden relative border-2 ${isOngoing ? 'border-green-400 shadow-green-500/20' : 'border-amber-400 shadow-amber-500/20'}`}>
      {/* Background decoration */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isOngoing ? 'bg-green-500' : 'bg-amber-500'}`}></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        
        {/* Left Side: Meal Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOngoing ? 'bg-green-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isOngoing ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isOngoing ? 'text-green-600' : 'text-amber-600'}`}>
              {isOngoing ? 'Serving Now' : 'Upcoming Meal'}
            </span>
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            {mealInfo.emoji} {mealInfo.name}
          </h2>
          
          {isStudent && (
            <div className="mt-3">
              {rsvpStatus === 'coming' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
                  <HiOutlineCheckCircle size={18} /> Marked Coming
                </div>
              ) : rsvpStatus === 'not_coming' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                  <HiOutlineXCircle size={18} /> Not Coming
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200">
                  <HiOutlineClock size={18} /> Not Marked
                </div>
              )}
            </div>
          )}

          {!isStudent && mlStats && mlStats.active_meal === mealInfo.id && (
            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold border border-primary-200 shadow-sm shadow-primary-100">
                <HiOutlineCheckCircle size={18} /> AI Expects: {mlStats.predicted_attendance} Students
              </div>
            </div>
          )}
        </div>

        {/* Center: Menu Snippet */}
        {menuItems.length > 0 && (
          <div className="hidden lg:block flex-1 max-w-sm mx-4 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <HiOutlineFire /> On The Menu
            </p>
            <p className="text-sm text-gray-800 font-medium">
              {menuItems.join(', ')}
            </p>
          </div>
        )}

        {/* Right Side: Timer */}
        <div className={`flex flex-col items-end p-4 rounded-2xl bg-gradient-to-br ${isOngoing ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600'} text-white shadow-lg shrink-0 w-full md:w-auto`}>
          <p className="text-sm font-medium opacity-90 mb-1">
            {isOngoing ? 'Ends in' : 'Starts in'}
          </p>
          <div className="flex items-baseline gap-1 font-mono">
            <div className="text-4xl font-black">{pad(h)}</div><span className="text-lg opacity-75 mr-1">h</span>
            <div className="text-4xl font-black">{pad(m)}</div><span className="text-lg opacity-75 mr-1">m</span>
            <div className="text-4xl font-black">{pad(s)}</div><span className="text-lg opacity-75">s</span>
          </div>
        </div>

      </div>

      {/* Mobile Menu (shows on small screens) */}
      {menuItems.length > 0 && (
        <div className="mt-4 lg:hidden bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">On The Menu</p>
          <p className="text-sm text-gray-800 font-medium">{menuItems.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
