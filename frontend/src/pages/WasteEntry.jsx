import { useState, useEffect } from 'react';
import API from '../api/axios';
import { deleteEntry } from '../api/apiHelpers';
import toast from 'react-hot-toast';
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';

export default function WasteEntry() {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), meal: 'lunch',
    waste_kg: '', waste_type: 'mixed', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rec, sum] = await Promise.all([
        API.get('/waste/?limit=50'),
        API.get('/waste/summary?days=30')
      ]);
      setRecords(rec.data);
      setSummary(sum.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/waste/', { ...form, waste_kg: parseFloat(form.waste_kg) });
      toast.success('Waste entry saved! 🗑️');
      setShowForm(false);
      loadData();
    } catch (err) { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    deleteEntry('/waste', id, setRecords, 'Waste record');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineTrash className="text-red-500" /> Waste Entry
          </h1>
          <p className="text-gray-500 mt-1">Track food waste to identify reduction opportunities</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2" id="add-waste">
          <HiOutlinePlus /> Add Entry
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <p className="text-sm text-gray-500">Total Waste (30 days)</p>
            <p className="text-2xl font-bold text-red-600">{summary.total_waste_kg} kg</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-gray-500">Avg Daily Waste</p>
            <p className="text-2xl font-bold text-amber-600">{summary.avg_daily_waste_kg} kg</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-gray-500">Waste by Type</p>
            <div className="mt-2 space-y-1">
              {summary.by_type && Object.entries(summary.by_type).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{k}</span>
                  <span className="font-semibold">{v.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="font-bold text-gray-800 mb-4">New Waste Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className="input-field">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
            <input type="number" step="0.1" placeholder="Waste (kg)" value={form.waste_kg}
              onChange={(e) => setForm({ ...form, waste_kg: e.target.value })} className="input-field" required />
            <select value={form.waste_type} onChange={(e) => setForm({ ...form, waste_type: e.target.value })} className="input-field">
              <option value="mixed">Mixed</option>
              <option value="cooked">Cooked Food</option>
              <option value="raw">Raw Food</option>
              <option value="plate">Plate Waste</option>
            </select>
            <input type="text" placeholder="Notes (optional)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Meal</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Waste</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Notes</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{r.date}</td>
                  <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{r.meal}</span></td>
                  <td className="px-6 py-4 text-sm font-bold text-red-600">{r.waste_kg} kg</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{r.waste_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.notes || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <HiOutlineTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">No waste entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
