import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';

export default function MarkAttendance() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState({});

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const res = await API.get('/student/attendance/today');
      setTodayStatus(res.data);
    } catch (err) { console.error(err); }
  };

  const markMeal = async (meal, status) => {
    setLoading(prev => ({ ...prev, [meal + status]: true }));
    const localDate = new Date().toLocaleDateString('en-CA');
    try {
      await API.post('/student/attendance', {
        date: localDate,
        meal,
        status,
      });
      toast.success(`${meal} marked as ${status === 'coming' ? 'Coming ✅' : 'Not Coming ❌'}`);
      loadStatus();
    } catch (err) {
      toast.error('Failed to mark attendance');
    } finally {
      setLoading(prev => ({ ...prev, [meal + status]: false }));
    }
  };

  const meals = [
    { key: 'breakfast', label: 'Breakfast', emoji: '🌅', time: '7:30 AM - 9:00 AM', color: 'from-amber-400 to-orange-500' },
    { key: 'lunch', label: 'Lunch', emoji: '☀️', time: '12:00 PM - 2:00 PM', color: 'from-blue-400 to-blue-600' },
    { key: 'dinner', label: 'Dinner', emoji: '🌙', time: '7:00 PM - 9:00 PM', color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineCheckCircle className="text-primary-500" /> Mark Attendance
        </h1>
        <p className="text-gray-500 mt-1">Select your attendance for today's meals</p>
      </div>

      <div className="space-y-4 stagger-children">
        {meals.map((meal) => {
          const currentStatus = todayStatus?.meals_marked?.[meal.key];
          return (
            <div key={meal.key} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meal.color} flex items-center justify-center text-white shadow-lg text-xl`}>
                    {meal.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{meal.label}</h3>
                    <p className="text-sm text-gray-500">{meal.time}</p>
                  </div>
                </div>
                {currentStatus && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    currentStatus === 'coming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {currentStatus === 'coming' ? '✅ Coming' : '❌ Not Coming'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => markMeal(meal.key, 'coming')}
                  disabled={loading[meal.key + 'coming']}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                    currentStatus === 'coming'
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                  }`}
                  id={`mark-${meal.key}-coming`}
                >
                  <HiOutlineCheckCircle size={20} />
                  {loading[meal.key + 'coming'] ? 'Saving...' : 'Coming'}
                </button>
                <button
                  onClick={() => markMeal(meal.key, 'not_coming')}
                  disabled={loading[meal.key + 'not_coming']}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                    currentStatus === 'not_coming'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                  id={`mark-${meal.key}-not-coming`}
                >
                  <HiOutlineXCircle size={20} />
                  {loading[meal.key + 'not_coming'] ? 'Saving...' : 'Not Coming'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {todayStatus?.all_marked && (
        <div className="glass-card-green p-6 text-center animate-slide-up">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="text-xl font-bold text-primary-700">All meals marked!</h3>
          <p className="text-primary-600 text-sm mt-1">Thank you for helping reduce food waste.</p>
        </div>
      )}
    </div>
  );
}
