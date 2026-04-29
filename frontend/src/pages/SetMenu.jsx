import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineBookOpen, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSave } from 'react-icons/hi';
import { format, addDays, subDays } from 'date-fns';

export default function SetMenu() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuData, setMenuData] = useState({
    breakfast: '',
    lunch: '',
    dinner: ''
  });

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchMenu();
  }, [formattedDate]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/student/menu?date=${formattedDate}`);
      // The API returns items as arrays, we need them as comma-separated strings for the form
      const meals = res.data.meals;
      setMenuData({
        breakfast: meals.breakfast.items.join(', '),
        lunch: meals.lunch.items.join(', '),
        dinner: meals.dinner.items.join(', ')
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post('/student/manager/menu', {
        date: formattedDate,
        ...menuData
      });
      toast.success('Menu updated successfully! 🌱');
    } catch (err) {
      toast.error('Failed to update menu');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (days) => {
    setSelectedDate(prev => days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineBookOpen className="text-primary-500" /> Manage Mess Menu
          </h1>
          <p className="text-gray-500 mt-1">Set the meals students will see on their portal</p>
        </div>

        <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors">
            <HiOutlineChevronLeft size={20} />
          </button>
          <div className="px-4 font-bold text-gray-700 min-w-[140px] text-center">
            {format(selectedDate, 'EEE, dd MMM')}
          </div>
          <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors">
            <HiOutlineChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="divide-y divide-gray-100">
            {Object.entries({
              breakfast: { emoji: '🌅', label: 'Breakfast Menu', color: 'bg-amber-50 text-amber-600' },
              lunch: { emoji: '☀️', label: 'Lunch Menu', color: 'bg-blue-50 text-blue-600' },
              dinner: { emoji: '🌙', label: 'Dinner Menu', color: 'bg-purple-50 text-purple-600' }
            }).map(([key, config]) => (
              <div key={key} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl shadow-inner`}>
                    {config.emoji}
                  </div>
                  <label className="font-bold text-gray-800 text-lg capitalize">{config.label}</label>
                </div>
                <div>
                  <textarea
                    value={menuData[key]}
                    onChange={(e) => setMenuData(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Enter items separated by commas (e.g. Paratha, Curd, Poha)"
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none min-h-[100px]"
                    disabled={saving}
                  />
                  <p className="mt-2 text-xs text-gray-400">Separate items with commas</p>
                </div>
              </div>
            ))}

            <div className="p-6 bg-gray-50/50 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2 px-8 py-3"
              >
                {saving ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlineSave size={20} />
                )}
                {saving ? 'Saving...' : 'Update Menu'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex gap-3 text-primary-700">
        <div className="shrink-0 mt-0.5"><HiOutlineBookOpen size={20} /></div>
        <p className="text-sm">
          <strong>Tip:</strong> Students will see these menu items on their dashboard for the selected date. 
          Make sure to update the menu at least 12 hours in advance to help students decide their attendance.
        </p>
      </div>
    </div>
  );
}
