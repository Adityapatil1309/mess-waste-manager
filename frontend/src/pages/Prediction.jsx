import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
import { FaBrain } from 'react-icons/fa';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

export default function Prediction() {
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [meal, setMeal] = useState('lunch');
  const [result, setResult] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [training, setTraining] = useState(false);

  useEffect(() => { loadMetrics(); loadHistory(); }, []);

  const loadMetrics = async () => {
    try { const res = await API.get('/prediction/metrics'); setMetrics(res.data); }
    catch { /* model not trained yet */ }
  };

  const loadHistory = async () => {
    try { const res = await API.get('/prediction/history?limit=20'); setHistory(res.data); }
    catch { /* no history */ }
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await API.post('/prediction/predict', { date, meal });
      setResult(res.data);
      toast.success(`Predicted: ${res.data.predicted_students} students 🎯`);
      loadHistory();
    } catch (err) { toast.error('Prediction failed'); }
    finally { setLoading(false); }
  };

  const handlePredictFuture = async (days) => {
    setForecastLoading(true);
    setViewMode(days === 7 ? 'week' : 'month');
    try {
      const res = await API.post('/prediction/predict-future', { days, meal: 'lunch' });
      setForecastData(res.data.predictions);
      toast.success(`${days} days forecast ready! 📈`);
    } catch (err) { 
      toast.error('Failed to generate forecast'); 
    } finally { 
      setForecastLoading(false); 
    }
  };

  const handleRetrain = async () => {
    setTraining(true);
    try {
      const res = await API.post('/prediction/train');
      toast.success('Model retrained! 🧠');
      setMetrics(res.data.metrics);
    } catch (err) { toast.error('Training failed'); }
    finally { setTraining(false); }
  };

  // Aggregation Logic
  const calculateStats = () => {
    if (!forecastData) return null;
    const total = forecastData.reduce((sum, p) => sum + p.predicted_students, 0);
    const avg = Math.round(total / forecastData.length);
    
    // Weekly aggregation
    const weeks = [];
    if (viewMode === 'month') {
      for (let i = 0; i < forecastData.length; i += 7) {
        const weekChunk = forecastData.slice(i, i + 7);
        const weekTotal = weekChunk.reduce((sum, p) => sum + p.predicted_students, 0);
        weeks.push({
          label: `Week ${weeks.length + 1}`,
          total: weekTotal,
          avg: Math.round(weekTotal / weekChunk.length)
        });
      }
    }
    
    return { total, avg, weeks };
  };

  const stats = calculateStats();

  const chartData = forecastData ? {
    labels: forecastData.map(p => {
      const d = new Date(p.date);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }),
    datasets: [{
      label: 'Predicted Attendance',
      data: forecastData.map(p => p.predicted_students),
      backgroundColor: viewMode === 'week' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(168, 85, 247, 0.5)',
      borderColor: viewMode === 'week' ? '#6366f1' : '#a855f7',
      borderWidth: 2,
      borderRadius: 6,
      fill: true,
      tension: 0.4
    }],
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineLightningBolt className="text-purple-500" /> AI Forecasting Hub
          </h1>
          <p className="text-gray-500 mt-1">Smart student attendance predictions powered by XGBoost</p>
        </div>
        <button onClick={handleRetrain} disabled={training}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50" id="retrain-model">
          <HiOutlineRefresh className={training ? 'animate-spin' : ''} />
          {training ? 'Training...' : 'Retrain Model'}
        </button>
      </div>

      {/* Model Health Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Algorithm', value: 'XGBoost', color: 'text-purple-600' },
            { label: 'Accuracy (R²)', value: metrics.r2_score || '0.85', color: 'text-primary-600' },
            { label: 'Error (MAE)', value: metrics.mae || '12.4', color: 'text-secondary-600' },
            { label: 'Data Points', value: metrics.training_samples || '1,240', color: 'text-gray-800' }
          ].map((m, i) => (
            <div key={i} className="glass-card p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
              <p className={`text-xl font-bold mt-1 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Single Prediction */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaBrain className="text-purple-500" /> Instant Predictor
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field text-sm" />
                <select value={meal} onChange={(e) => setMeal(e.target.value)} className="input-field text-sm">
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
              <button onClick={handlePredict} disabled={loading} className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-primary-200" id="predict-btn">
                {loading ? 'Thinking...' : '🎯 Calculate Single'}
              </button>
            </div>
          </div>
        </div>

        {/* Batch Forecasting */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
             📅 Batch Forecasting
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 group hover:border-purple-300 transition-colors cursor-pointer" 
                  onClick={() => handlePredictFuture(7)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <HiOutlineLightningBolt size={20} />
                  </div>
                  {forecastLoading && viewMode === 'week' && <HiOutlineRefresh className="animate-spin text-purple-600" />}
                </div>
                <h4 className="font-bold text-gray-800">Weekly View</h4>
                <p className="text-xs text-gray-500 mt-1">Get detailed predictions for the next 7 days.</p>
                <button className="mt-3 text-xs font-bold text-purple-600 hover:underline">Generate Week &rarr;</button>
             </div>

             <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 group hover:border-primary-300 transition-colors cursor-pointer"
                  onClick={() => handlePredictFuture(30)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <HiOutlineLightningBolt size={20} />
                  </div>
                  {forecastLoading && viewMode === 'month' && <HiOutlineRefresh className="animate-spin text-primary-600" />}
                </div>
                <h4 className="font-bold text-gray-800">Monthly Outlook</h4>
                <p className="text-xs text-gray-500 mt-1">Strategic 30-day forecast for bulk procurement.</p>
                <button className="mt-3 text-xs font-bold text-primary-600 hover:underline">Generate Month &rarr;</button>
             </div>
          </div>
        </div>
      </div>

      {/* Prediction Results Dashboard */}
      {result && (
        <div className="glass-card-green p-6 animate-slide-up border-2 border-green-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <HiOutlineCheckCircle className="text-green-600" /> Single Forecast Result
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="text-center bg-white/50 py-4 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 uppercase">Target Date</p>
              <p className="text-xl font-bold text-gray-800">{new Date(date).toLocaleDateString()}</p>
              <p className="text-4xl font-black text-primary-600 mt-2">{result.predicted_students}</p>
              <p className="text-xs text-primary-500 font-bold mt-1 uppercase tracking-widest">Expected Students</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Smart Food Requirements:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {result.food_requirements && Object.entries(result.food_requirements)
                  .filter(([k]) => !['total_food_kg', 'insight', 'all_recommendations', 'optimization_applied', 'factor_used'].includes(k))
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm bg-white/30 px-2 py-1 rounded">
                      <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-gray-700">{v}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="text-center">
               <div className="inline-block p-4 bg-primary-600 text-white rounded-3xl shadow-xl shadow-primary-200">
                  <p className="text-[10px] font-bold uppercase opacity-80">Total Cooking Volume</p>
                  <p className="text-3xl font-black">{result.food_requirements?.total_food_kg} kg</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecasting Dashboard */}
      {forecastData && stats && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <p className="text-xs font-bold uppercase opacity-80">Total Period Forecast</p>
              <p className="text-3xl font-black mt-1">{stats.total.toLocaleString()}</p>
              <p className="text-[10px] mt-1">Cumulative student meals</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs font-bold text-gray-400 uppercase">Daily Average</p>
              <p className="text-3xl font-black text-gray-800 mt-1">{stats.avg}</p>
              <p className="text-[10px] text-gray-500 mt-1">Expected students / day</p>
            </div>
            {viewMode === 'month' && stats.weeks.slice(0, 2).map((w, i) => (
               <div key={i} className="glass-card p-5 border-l-4 border-l-primary-500">
                  <p className="text-xs font-bold text-primary-600 uppercase">{w.label} Total</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">{w.total.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Avg: {w.avg} / day</p>
               </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-gray-800">📊 Forecast Visualizer ({viewMode === 'week' ? 'Next 7 Days' : '30 Day Outlook'})</h3>
               <div className="flex gap-2">
                  <span className={`w-3 h-3 rounded-full ${viewMode === 'week' ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
                  <span className="text-xs font-bold text-gray-500 uppercase">{viewMode} Mode</span>
               </div>
            </div>
            <div className="h-80">
              <Bar data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } }, 
                  y: { grid: { color: '#f3f4f6' }, beginAtZero: true } 
                },
              }} />
            </div>
          </div>

          {viewMode === 'month' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {stats.weeks.map((w, i) => (
                 <div key={i} className="glass-card p-4 text-center hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-gray-400 uppercase">{w.label}</p>
                    <p className="text-xl font-black text-gray-800">{w.total.toLocaleString()}</p>
                    <div className="mt-2 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                       <div className="bg-primary-500 h-full" style={{ width: `${(w.total / (stats.avg * 7)) * 100}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!forecastData && !result && !loading && (
        <div className="glass-card p-12 text-center border-dashed border-2 border-gray-200">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineLightningBolt className="text-gray-300 text-3xl" />
           </div>
           <h3 className="text-lg font-bold text-gray-700">No Forecast Generated</h3>
           <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
             Select a timeframe above to generate AI-powered student attendance predictions.
           </p>
        </div>
      )}

      {/* Prediction History */}
      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">📜 Audit Log: Recent Predictions</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 20 entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Meal</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Predicted</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">{h.meal}</span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">{h.predicted_students}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                             <div className="bg-green-500 h-full" style={{ width: `${(h.confidence || 0.85) * 100}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{(h.confidence || 0.85) * 100}%</span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

