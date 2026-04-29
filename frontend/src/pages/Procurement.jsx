import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineShoppingCart, HiOutlineRefresh, HiOutlineClock, HiOutlineExclamation, HiOutlineLightningBolt } from 'react-icons/hi';
import SetupWizard from '../components/SetupWizard';

export default function Procurement() {
  const [data, setData] = useState(null);
  const [setupStatus, setSetupStatus] = useState({ has_data: true });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => { loadSuggestions(); }, [period]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const setupRes = await API.get('/analytics/setup-status');
      setSetupStatus(setupRes.data);
      if (!setupRes.data.has_data) { setLoading(false); return; }
      const res = await API.get(`/analytics/procurement-suggestions?days=${period}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load suggestions');
    } finally { setLoading(false); }
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (p === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const formatDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!setupStatus.has_data) {
    return <SetupWizard onDataUploaded={loadSuggestions} />;
  }

  const urgentItems = data?.suggestions?.filter(s => s.priority === 'high') || [];
  const expiringItems = data?.suggestions?.filter(s => s.use_first) || [];
  const itemsToBuy = data?.suggestions?.filter(s => s.to_procure_kg > 0) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineShoppingCart className="text-primary-600" />
            Smart Procurement
          </h1>
          <p className="text-gray-500 mt-1">Connected intelligence: Attendance → Consumption → Stock → Buy</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            {[7, 15, 30].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  period === p ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{p} Days</button>
            ))}
          </div>
          <button onClick={loadSuggestions}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-primary-600" title="Refresh">
            <HiOutlineRefresh className={`text-xl ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{data.avg_daily_students?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Avg Students/Day</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-primary-600">{itemsToBuy.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Items to Buy</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{data.urgent_count || 0}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Urgent</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{expiringItems.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Expiring Soon</p>
            </div>
          </div>

          {/* AI Insights */}
          {data.insights?.length > 0 && (
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
              <h3 className="font-bold text-primary-800 flex items-center gap-2 mb-3">
                <HiOutlineLightningBolt /> Connected AI Insights
              </h3>
              <div className="space-y-2">
                {data.insights.map((insight, idx) => (
                  <p key={idx} className="text-primary-700 text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Expiry Warnings Banner */}
          {expiringItems.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                <HiOutlineExclamation /> Expiry Alerts — Use These First!
              </h3>
              <div className="flex flex-wrap gap-2">
                {expiringItems.map((s, i) => (
                  <div key={i} className="bg-white border border-red-200 rounded-xl px-4 py-2 text-sm">
                    <span className="font-bold text-gray-800">{s.item}</span>
                    <span className="block text-xs text-red-600 mt-0.5">{s.expiry_warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI-Driven Purchasing Decisions */}
          <div className="space-y-8">
            {/* 1. Urgent Purchases (3-Day Rule) */}
            {urgentItems.length > 0 && (
              <div className="bg-red-50/30 border border-red-100 rounded-3xl p-6">
                <h3 className="text-xl font-black text-red-700 flex items-center gap-2 mb-6">
                  🚨 URGENT: BUY NOW ({urgentItems.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {urgentItems.map((s, i) => (
                    <div key={i} className="glass-card-premium p-5 border-l-4 border-red-500 shadow-lg relative overflow-hidden">
                       <div className="flex justify-between items-start mb-3">
                          <h4 className="font-black text-gray-900">{s.item}</h4>
                          <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded">BUY NOW</span>
                       </div>
                       <p className="text-3xl font-black text-gray-900 mb-2">
                          {s.to_procure_kg} <span className="text-xs font-bold text-gray-400 uppercase">{s.unit}</span>
                       </p>
                       <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                          ⚠️ Stock runs out in {s.days_left || 0} days
                       </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Full Procurement Roadmap */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                 📋 Full Procurement Roadmap ({data.suggestions.length} Items)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.suggestions?.map((s, i) => (
                  <div key={i} className="glass-card p-5 hover:shadow-xl transition-all border border-gray-100 group">
                    <div className="flex justify-between items-start mb-4">
                       <h4 className="font-bold text-gray-800">{s.item}</h4>
                       <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                          s.action === "BUY NOW" ? 'bg-red-100 text-red-600' : 
                          s.action === "PLAN PURCHASE" ? 'bg-amber-100 text-amber-600' : 
                          'bg-green-100 text-green-600'
                       }`}>{s.action}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-400">Current Stock</span>
                          <span className="text-gray-700">{s.current_stock_kg} {s.unit}</span>
                       </div>
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-400">Target Level</span>
                          <span className="text-blue-600">{s.required_kg} {s.unit}</span>
                       </div>
                    </div>

                    {s.to_procure_kg > 0 ? (
                       <div className="pt-3 border-t border-dashed border-gray-100">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Recommended to Buy</p>
                          <p className="text-xl font-black text-gray-900">{s.to_procure_kg} {s.unit}</p>
                       </div>
                    ) : (
                       <div className="pt-3 border-t border-dashed border-gray-100 text-green-600 text-xs font-bold flex items-center gap-1">
                          ✅ Stock Levels Healthy
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
