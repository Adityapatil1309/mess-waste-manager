import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineStar, HiStar, HiChartBar, HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

export default function FoodFeedbackDashboard() {
  const [summary, setSummary] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [mealFilter, setMealFilter] = useState('');

  useEffect(() => { loadData(); }, [days, mealFilter]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      params.append('days', days);
      if (mealFilter) params.append('meal', mealFilter);
      
      const [sumRes, statsRes] = await Promise.all([
        API.get(`/food-feedback/summary?${params.toString()}`),
        API.get(`/food-feedback/stats?days=${days}`)
      ]);
      setSummary(sumRes.data);
      setStats(statsRes.data);
    } catch (err) { 
      console.error('Failed to load feedback:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingLabel = (rating) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Good';
    if (rating >= 2.5) return 'Average';
    return 'Poor';
  };

  const RatingBar = ({ breakdown }) => {
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    
    return (
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-8">{star} ★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiChartBar className="text-yellow-500" /> Food Feedback Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Student feedback analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="input-field"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineStar className="text-yellow-500" />
              <span className="text-sm text-gray-500">Total Feedback</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_feedback}</p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <HiStar className="text-yellow-500" />
              <span className="text-sm text-gray-500">Average Rating</span>
            </div>
            <p className={`text-3xl font-bold ${getRatingColor(stats.average_rating)}`}>
              {stats.average_rating.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{getRatingLabel(stats.average_rating)}</p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <HiTrendingUp className="text-green-500" />
              <span className="text-sm text-gray-500">Best Meal</span>
            </div>
            {stats.by_meal && Object.entries(stats.by_meal).length > 0 ? (
              <>
                <p className="text-xl font-bold text-gray-900 capitalize">
                  {Object.entries(stats.by_meal).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {Object.entries(stats.by_meal).sort((a, b) => b[1] - a[1])[0]?.[1].toFixed(1)}
                </p>
              </>
            ) : (
              <p className="text-gray-400">No data</p>
            )}
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <HiTrendingDown className="text-red-500" />
              <span className="text-sm text-gray-500">Needs Improvement</span>
            </div>
            {stats.by_meal && Object.entries(stats.by_meal).length > 0 ? (
              <>
                <p className="text-xl font-bold text-gray-900 capitalize">
                  {Object.entries(stats.by_meal).sort((a, b) => a[1] - b[1])[0]?.[0] || '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {Object.entries(stats.by_meal).sort((a, b) => a[1] - b[1])[0]?.[1].toFixed(1)}
                </p>
              </>
            ) : (
              <p className="text-gray-400">No data</p>
            )}
          </div>
        </div>
      )}

      {/* Food Item Summary Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Food Item Ratings</h2>
          <p className="text-sm text-gray-500">Average rating by food item</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Food Item</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Avg Rating</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Total Feedback</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 w-48">Rating Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No feedback data available for this period.
                  </td>
                </tr>
              ) : (
                summary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.food_item}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${getRatingColor(item.avg_rating)}`}>
                          {item.avg_rating.toFixed(1)}
                        </span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={star <= Math.round(item.avg_rating) ? 'text-yellow-400' : 'text-gray-200'}
                            >
                              <HiStar className="w-4 h-4" />
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.total_feedback} reviews
                    </td>
                    <td className="px-6 py-4">
                      <RatingBar breakdown={item.rating_breakdown} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Trend */}
      {stats?.by_date && stats.by_date.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Feedback Trend</h2>
          <div className="space-y-3">
            {stats.by_date.slice(0, 10).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-24">{day.date}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-300"
                    style={{ width: `${(day.avg_rating / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold w-12 ${getRatingColor(day.avg_rating)}`}>
                  {day.avg_rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 w-16 text-right">
                  {day.count} reviews
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}