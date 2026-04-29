import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUserGroup, HiOutlineLightningBolt, HiOutlineTrash, HiOutlineScale, HiOutlineClipboardCopy, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import SetupWizard from '../components/SetupWizard';
import ProfileUploadWidget from '../components/ProfileUploadWidget';
import LiveMealWidget from '../components/LiveMealWidget';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const getKpiCards = (activeMeal = 'Meal') => [
  { key: 'today_attendance', label: `${activeMeal} Attendance`, icon: HiOutlineUserGroup, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  { key: 'predicted_attendance', label: `Predicted (${activeMeal})`, icon: HiOutlineLightningBolt, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
  { key: 'efficiency_pct', label: 'Day Efficiency', icon: HiOutlineTrash, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', suffix: '%' },
  { key: 'food_required_kg', label: 'Total Required (kg)', icon: HiOutlineScale, color: 'from-primary-500 to-emerald-500', shadow: 'shadow-primary-500/20' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [setupStatus, setSetupStatus] = useState({ has_data: true });
  const [attTrend, setAttTrend] = useState([]);
  const [wasteTrend, setWasteTrend] = useState([]);
  const [foodVsWaste, setFoodVsWaste] = useState([]);
  const [studentSummary, setStudentSummary] = useState(null);
  const [liveDetails, setLiveDetails] = useState([]);
  const [menu, setMenu] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictLoading, setPredictLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // WebSocket for real-time updates
    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000/api';
    const ws = new WebSocket(`${wsUrl}/ws/meal-timings`); // Reuse the same endpoint for refresh signals
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'DASHBOARD_REFRESH') {
          // Trigger a refresh of the dashboard data
          loadDashboardData(true); // pass true to indicate silent refresh
        }
      } catch(e) {}
    };

    return () => ws.close();
  }, []);

  const loadDashboardData = async (silent = false) => {
    setSyncError(null);
    if (!silent) setLoading(true);
    
    try {
      const setupRes = await API.get('/analytics/setup-status');
      setSetupStatus(setupRes.data);
      
      if (!setupRes.data.has_data) {
        setLoading(false);
        return;
      }

      // If has data, load the rest
      const coreRes = await Promise.all([
        API.get('/analytics/dashboard'),
        API.get('/analytics/attendance-trend?days=30'),
        API.get('/analytics/waste-trend?days=30'),
        API.get('/analytics/food-vs-waste?days=30'),
        API.get('/student/menu').catch(() => ({ data: null })), // Managers can view today's menu too
      ]);
      setStats(coreRes[0].data);
      setAttTrend(coreRes[1].data);
      setWasteTrend(coreRes[2].data);
      setFoodVsWaste(coreRes[3].data);
      setMenu(coreRes[4].data);
    } catch (err) {
      console.error('Dashboard Load Fail:', err);
    }

    // 2. Fetch Student Summary (soft-fail)
    try {
      const summaryRes = await API.get('/student/manager/summary');
      if (summaryRes.data) {
        setStudentSummary(summaryRes.data);
      } else {
        setSyncError('Backend returned empty summary data');
      }
    } catch (err) {
      console.error('Summary fetch error:', err);
      setSyncError(err.response?.data?.detail || err.message);
    }

    // 3. Fetch Live Details (soft-fail)
    try {
      const detailsRes = await API.get('/student/manager/live-details');
      setLiveDetails(detailsRes.data || []);
    } catch (err) {
      console.error('Live details error:', err);
    }

    setLoading(false);
  };

  const handleManualPredict = async () => {
    if (predictLoading) return;
    setPredictLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await API.post('/prediction/predict', {
        date: today,
        meal: stats.active_meal || 'lunch'
      });
      // Refresh dashboard data to reflect new prediction
      const dashRes = await API.get('/analytics/dashboard');
      setStats(dashRes.data);
      toast.success(`AI Prediction updated for ${stats.active_meal}!`);
    } catch (err) {
      console.error('Prediction failed:', err);
      toast.error('AI prediction failed to recalculate');
    } finally {
      setPredictLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 15, font: { size: 12, family: 'Inter' } } },
      tooltip: {
        backgroundColor: '#1f2937',
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        cornerRadius: 10,
        padding: 12,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Inter', size: 11 } } },
    },
  };

  const attChartData = {
    labels: attTrend.map(d => d.date?.slice(5)),
    datasets: [{
      label: 'Students',
      data: attTrend.map(d => d.students),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
    }],
  };

  const wasteChartData = {
    labels: wasteTrend.map(d => d.date?.slice(5)),
    datasets: [{
      label: 'Waste (kg)',
      data: wasteTrend.map(d => d.waste_kg),
      backgroundColor: 'rgba(239,68,68,0.7)',
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const efficiencyData = {
    labels: ['Consumed', 'Wasted'],
    datasets: [{
      data: [
        stats.today_food_kg ? stats.today_food_kg - (stats.today_waste_kg || 0) : 85,
        stats.today_waste_kg || 15,
      ],
      backgroundColor: ['#16a34a', '#ef4444'],
      borderWidth: 0,
      cutout: '70%',
    }],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!setupStatus.has_data) {
    return <SetupWizard onDataUploaded={loadDashboardData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, <span className="text-primary-600">{user?.name || 'Manager'}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your mess management overview for today.</p>
          {(user?.invite_code || user?.org_code) && (
            <div className="mt-3 inline-flex items-center gap-2 bg-gray-100 rounded-lg py-1.5 px-3 border border-gray-200">
               <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Org Code:</span>
               <span className="text-sm font-mono font-bold tracking-wider text-primary-700 bg-white px-2 py-0.5 rounded border border-gray-200">{user.invite_code || user.org_code}</span>
               <button onClick={() => {
                 navigator.clipboard.writeText(user.invite_code || user.org_code);
                 toast.success('Organization Code copied!');
               }} className="ml-1 text-gray-400 hover:text-primary-600 transition-colors" title="Copy to clipboard">
                 <HiOutlineClipboardCopy size={18} />
               </button>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <ProfileUploadWidget user={user} />
        </div>
      </div>

      {/* Live Next Meal Widget */}
      <LiveMealWidget menu={menu} todayStatus={null} isStudent={false} mlStats={stats} />

      {/* Smart Insight Banner */}
      {stats.insight && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-4 md:p-6 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <HiOutlineLightningBolt size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30">
                <HiOutlineLightningBolt className="text-white text-2xl animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg md:text-xl">Smart Recommendation</h3>
                <p className="text-primary-100 text-sm md:text-base mt-0.5 opacity-90 max-w-2xl">{stats.insight}</p>
              </div>
            </div>
            <button 
                onClick={() => window.location.href = '/procurement'}
                className="bg-white text-primary-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-50 transition-colors shadow-lg"
            >
              Take Action
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {getKpiCards(stats.active_meal ? stats.active_meal.charAt(0).toUpperCase() + stats.active_meal.slice(1) : 'Today').map((card) => (
          <div key={card.key} className="glass-card p-5 flex items-start gap-4 hover:shadow-xl transition-shadow relative group">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} ${card.shadow} shadow-lg flex items-center justify-center flex-shrink-0`}>
              <card.icon className="text-white text-xl" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                {card.key === 'predicted_attendance' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleManualPredict(); }}
                    disabled={predictLoading}
                    className={`p-1.5 rounded-lg hover:bg-purple-100 text-purple-600 transition-all ${predictLoading ? 'animate-spin opacity-50' : ''}`}
                    title="Recalculate AI Prediction"
                  >
                    <HiOutlineRefresh size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {stats[card.key] ?? '—'}{card.suffix || ''}
                </p>
                {card.key === 'predicted_attendance' && stats.prediction_confidence && (
                  <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {Math.round(stats.prediction_confidence * 100)}% Conf.
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Attendance Trend (30 days)</h3>
          <div className="h-64">
            <Line data={attChartData} options={chartOptions} />
          </div>
        </div>

        {/* Waste Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🗑️ Waste Trend (30 days)</h3>
          <div className="h-64">
            <Bar data={wasteChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Student RSVP Summary */}
      <div className="glass-card p-6">
        {studentSummary ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">📱 Live Student RSVPs</h3>
                <p className="text-sm text-gray-500">Real-time status of student attendance for today.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                  {studentSummary.total_students_registered} Students Linked (Code: {user?.organization_code || 'None'})
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {['breakfast', 'lunch', 'dinner'].map(meal => {
                const data = studentSummary.meals?.[meal] || { coming: 0, not_coming: 0, total_marked: 0 };
                return (
                  <div key={meal} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-primary-200 transition-colors">
                    <h4 className="font-bold text-gray-800 capitalize mb-4 flex items-center gap-2">
                      {meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : '🌙'} {meal}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Coming</span>
                        <span className="font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">{data.coming}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Not Coming</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">{data.not_coming}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-gray-100">
                         <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Total Votes</span>
                          <span className="text-gray-900 font-semibold">{data.total_marked} / {studentSummary.total_students_registered}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {liveDetails.length > 0 ? (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h4 className="text-sm font-bold text-gray-700 mb-4 ml-1">Individual Student Roll-Call</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-3 font-bold">Student Name</th>
                        <th className="px-4 py-3 font-bold">Roll Number</th>
                        <th className="px-4 py-3 font-bold">Meal</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {liveDetails.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{detail.student_name}</td>
                          <td className="px-4 py-3 text-gray-500">{detail.roll_number}</td>
                          <td className="px-4 py-3 capitalize">{detail.meal}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              detail.status === 'coming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {detail.status === 'coming' ? 'Coming ✅' : 'Not Coming ❌'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
                <div className="mt-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                    <p className="text-sm text-blue-600 font-medium italic">No individual student RSVPs recorded for today yet.</p>
                </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <HiOutlineUserGroup className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-gray-800 font-bold">Student Sync Unavailable</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
              {syncError ? `Error: ${syncError}` : "We couldn't reach the student management server."} Please ensure your 
              <strong> Organization Code ({user?.organization_code || 'Not Set'})</strong> matches your students' code.
            </p>
            <button 
                onClick={loadDashboardData}
                className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
                Retry Sync
            </button>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Efficiency Gauge */}
        <div className="glass-card p-6 flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-800 mb-4">♻️ Food Efficiency</h3>
          <div className="w-48 h-48 relative">
            <Doughnut data={efficiencyData} options={{ 
              responsive: true, maintainAspectRatio: true,
              plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter' } } } },
              cutout: '70%'
            }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">
                  {stats.waste_percentage ? (100 - stats.waste_percentage).toFixed(0) : '85'}%
                </p>
                <p className="text-xs text-gray-500">Efficiency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🍚 Food Requirements</h3>
          <div className="space-y-3">
            {stats.food_requirements && Object.entries(stats.food_requirements)
              .filter(([k]) => !['total_food_kg', 'insight', 'all_recommendations', 'optimization_applied', 'factor_used'].includes(k))
              .map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-gray-800">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                </div>
              ))}
            {!stats.food_requirements && (
              <p className="text-gray-400 text-sm">No prediction data yet. Run a prediction first.</p>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Alerts</h3>
          <div className="space-y-3">
            {stats.low_stock_alerts > 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">{stats.low_stock_alerts} items low on stock</p>
                  <p className="text-xs text-amber-600">Check inventory for details</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                <span className="text-green-500 text-lg">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">All stock levels OK</p>
                  <p className="text-xs text-green-600">Inventory is well-stocked</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-blue-500 text-lg">📊</span>
              <div>
                <p className="text-sm font-semibold text-blue-800">Today's Date</p>
                <p className="text-xs text-blue-600">{stats.date || new Date().toISOString().slice(0, 10)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
