import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineClock, HiOutlineSave } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ManageTimings() {
  const [timings, setTimings] = useState([
    { meal_type: 'breakfast', name: 'Breakfast', start_time: '', end_time: '' },
    { meal_type: 'lunch', name: 'Lunch', start_time: '', end_time: '' },
    { meal_type: 'dinner', name: 'Dinner', start_time: '', end_time: '' },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTimings();
  }, []);

  const loadTimings = async () => {
    try {
      const res = await API.get('/meal-timings');
      // Merge with default names
      const data = res.data;
      setTimings(prev => prev.map(t => {
        const found = data.find(d => d.meal_type === t.meal_type);
        return found ? { ...t, start_time: found.start_time, end_time: found.end_time } : t;
      }));
    } catch (err) {
      toast.error('Failed to load meal timings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimingChange = (meal_type, field, value) => {
    setTimings(prev => prev.map(t => t.meal_type === meal_type ? { ...t, [field]: value } : t));
  };

  const handleSave = async (meal) => {
    if (!meal.start_time || !meal.end_time) {
      toast.error('Both start and end times are required');
      return;
    }
    
    if (meal.start_time >= meal.end_time) {
      toast.error('Start time must be before end time');
      return;
    }

    setSaving(true);
    try {
      await API.post('/meal-timings', {
        meal_type: meal.meal_type,
        start_time: meal.start_time,
        end_time: meal.end_time
      });
      toast.success(`${meal.name} timing updated successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update timing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineClock className="text-primary-600" />
          Manage Meal Timings
        </h1>
        <p className="text-gray-500 mt-1">Adjust the exact serving windows for all meals. These will instantly reflect for all students.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {timings.map((meal) => (
          <div key={meal.meal_type} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-gray-800 capitalize mb-4 flex items-center gap-2">
              {meal.meal_type === 'breakfast' ? '🌅' : meal.meal_type === 'lunch' ? '☀️' : '🌙'} {meal.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={meal.start_time}
                  onChange={(e) => handleTimingChange(meal.meal_type, 'start_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={meal.end_time}
                  onChange={(e) => handleTimingChange(meal.meal_type, 'end_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <button
                onClick={() => handleSave(meal)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                <HiOutlineSave size={20} />
                Save {meal.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
