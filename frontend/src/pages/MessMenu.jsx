import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineBookOpen } from 'react-icons/hi';

export default function MessMenu() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/student/menu')
      .then(res => setMenu(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  const mealConfig = {
    breakfast: { emoji: '🌅', color: 'from-amber-400 to-orange-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    lunch: { emoji: '☀️', color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    dinner: { emoji: '🌙', color: 'from-purple-400 to-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineBookOpen className="text-primary-500" /> Today's Mess Menu
        </h1>
        <p className="text-gray-500 mt-1">{menu?.date || 'Loading...'}</p>
      </div>

      {menu && (
        <div className="space-y-4 stagger-children">
          {Object.entries(menu.meals).map(([mealKey, mealData]) => {
            const config = mealConfig[mealKey];
            return (
              <div key={mealKey} className={`glass-card p-6 border-l-4 ${config.borderColor}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg text-xl`}>
                    {config.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg capitalize">{mealKey}</h3>
                    <p className="text-sm text-gray-500">{mealData.time}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mealData.items.map((item, i) => (
                    <div key={i} className={`${config.bgColor} px-3 py-2 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2`}>
                      <span className="w-2 h-2 bg-primary-400 rounded-full flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
