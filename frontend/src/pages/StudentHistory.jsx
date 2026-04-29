import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineClipboardList, HiOutlineDownload } from 'react-icons/hi';

export default function StudentHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await API.get('/student/attendance?limit=100');
      setRecords(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Meal', 'Status'];
    const rows = records.map(r => [r.date, r.meal, r.status]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my_attendance_history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalComing = records.filter(r => r.status === 'coming').length;
  const totalNotComing = records.filter(r => r.status === 'not_coming').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineClipboardList className="text-secondary-500" /> My Attendance History
          </h1>
          <p className="text-gray-500 mt-1">Your past mess attendance records</p>
        </div>
        {records.length > 0 && (
          <button onClick={downloadCSV} className="btn-outline flex items-center gap-2" id="download-history">
            <HiOutlineDownload /> Download CSV
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-800">{records.length}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-gray-500">Coming</p>
          <p className="text-2xl font-bold text-primary-600">{totalComing}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-gray-500">Not Coming</p>
          <p className="text-2xl font-bold text-red-500">{totalNotComing}</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Meal</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{r.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.meal === 'breakfast' ? 'bg-amber-100 text-amber-700' :
                      r.meal === 'lunch' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>{r.meal}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.status === 'coming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'coming' ? '✅ Coming' : '❌ Not Coming'}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-400">No attendance records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
