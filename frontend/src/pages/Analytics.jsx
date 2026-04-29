import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineInformationCircle } from 'react-icons/hi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import SetupWizard from '../components/SetupWizard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Analytics() {
  const [attTrend, setAttTrend] = useState([]);
  const [wasteTrend, setWasteTrend] = useState([]);
  const [foodVsWaste, setFoodVsWaste] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState({ has_data: true });

  useEffect(() => { loadData(); }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const setupRes = await API.get('/analytics/setup-status');
      setSetupStatus(setupRes.data);

      if (!setupRes.data.has_data) {
        setLoading(false);
        return;
      }

      const [att, waste, fvw, mon] = await Promise.all([
        API.get(`/analytics/attendance-trend?days=${days}`),
        API.get(`/analytics/waste-trend?days=${days}`),
        API.get(`/analytics/food-vs-waste?days=${days}`),
        API.get('/analytics/monthly-summary'),
      ]);
      setAttTrend(att.data);
      setWasteTrend(waste.data);
      setFoodVsWaste(fvw.data);
      setMonthly(mon.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, padding: 15, font: { family: 'Inter', size: 12 } } },
      tooltip: { backgroundColor: '#1f2937', cornerRadius: 10, padding: 12 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Inter', size: 11 } } },
    },
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  if (!setupStatus.has_data) {
    return <SetupWizard onDataUploaded={loadData} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineChartBar className="text-secondary-500" /> Analytics
          </h1>
          <p className="text-gray-500 mt-1">Comprehensive data insights and trends</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                days === d ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Trend */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Attendance Trend</h3>
        <div className="h-72">
          <Line data={{
            labels: attTrend.map(d => d.date?.slice(5)),
            datasets: [{
              label: 'Students', data: attTrend.map(d => d.students),
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
              fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5,
            }],
          }} options={chartOpts} />
        </div>
      </div>

      {/* Food vs Waste */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🍽️ Food vs Waste</h3>
          <div className="h-72">
            <Bar data={{
              labels: foodVsWaste.map(d => d.date?.slice(5)),
              datasets: [
                { label: 'Food (kg)', data: foodVsWaste.map(d => d.food_kg), backgroundColor: 'rgba(22,163,74,0.7)', borderRadius: 6 },
                { label: 'Waste (kg)', data: foodVsWaste.map(d => d.waste_kg), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 },
              ],
            }} options={chartOpts} />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🗑️ Waste Trend</h3>
          <div className="h-72">
            <Line data={{
              labels: wasteTrend.map(d => d.date?.slice(5)),
              datasets: [{
                label: 'Waste (kg)', data: wasteTrend.map(d => d.waste_kg),
                borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
                fill: true, tension: 0.4, pointRadius: 2,
              }],
            }} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {monthly && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Monthly Attendance ({monthly.year})</h3>
            <div className="h-72">
              <Bar data={{
                labels: monthly.months.map(m => monthNames[m.month - 1]),
                datasets: [{
                  label: 'Avg Attendance', data: monthly.months.map(m => m.avg_attendance),
                  backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 6,
                }],
              }} options={{
                ...chartOpts,
                plugins: { ...chartOpts.plugins, legend: { display: false } }
              }} />
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Monthly Waste % ({monthly.year})</h3>
            <div className="h-72">
              <Line data={{
                labels: monthly.months.map(m => monthNames[m.month - 1]),
                datasets: [{
                  label: 'Waste %', data: monthly.months.map(m => m.waste_percentage),
                  borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
                  fill: true, tension: 0.4, pointRadius: 3,
                }],
              }} options={chartOpts} />
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Food Efficiency Over Time</h3>
        <div className="h-72">
          <Line data={{
            labels: foodVsWaste.map(d => d.date?.slice(5)),
            datasets: [{
              label: 'Efficiency %', data: foodVsWaste.map(d => d.efficiency),
              borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)',
              fill: true, tension: 0.4, pointRadius: 2,
            }],
          }} options={chartOpts} />
        </div>
      </div>
    </div>
  );
}
