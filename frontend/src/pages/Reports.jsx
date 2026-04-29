import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineDocumentReport, HiOutlineDownload } from 'react-icons/hi';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSummary(); }, [days]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reports/summary?days=${days}`);
      setSummary(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const downloadCSV = async (type) => {
    try {
      const res = await API.get(`/reports/csv/${type}?days=${days}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${days}days.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} CSV downloaded! 📥`);
    } catch (err) { toast.error('Download failed'); }
  };

  const downloadPDF = async () => {
    try {
      const res = await API.get(`/reports/pdf/summary?days=${days}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `mess_report_${days}days.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded! 📄');
    } catch (err) { toast.error('PDF generation failed'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineDocumentReport className="text-teal-500" /> Report Generator
          </h1>
          <p className="text-gray-500 mt-1">Generate and download comprehensive mess reports</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                days === d ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">📋 Report Summary ({days} days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/30">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-3xl font-bold text-secondary-600">{summary.total_attendance_records}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-200/30">
              <p className="text-sm text-gray-500">Avg Attendance</p>
              <p className="text-3xl font-bold text-primary-600">{summary.avg_daily_attendance}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-200/30">
              <p className="text-sm text-gray-500">Total Waste</p>
              <p className="text-3xl font-bold text-red-600">{summary.total_waste_kg} kg</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200/30">
              <p className="text-sm text-gray-500">Efficiency</p>
              <p className="text-3xl font-bold text-emerald-600">{summary.efficiency_score}%</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Total Food Cooked</span>
              <span className="font-semibold">{summary.total_food_cooked_kg} kg</span>
            </div>
            <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Waste %</span>
              <span className="font-semibold text-red-600">{summary.waste_percentage}%</span>
            </div>
            <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Period</span>
              <span className="font-semibold">{summary.period_days} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Download Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📥 CSV Exports</h3>
          <div className="space-y-3">
            {['attendance', 'waste', 'inventory'].map((type) => (
              <button key={type} onClick={() => downloadCSV(type)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 transition-all group"
                id={`download-csv-${type}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {type === 'attendance' ? '👥' : type === 'waste' ? '🗑️' : '📦'}
                  </span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 capitalize">{type} Data</p>
                    <p className="text-xs text-gray-500">Download as CSV spreadsheet</p>
                  </div>
                </div>
                <HiOutlineDownload size={20} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📄 PDF Report</h3>
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/20">
              <span className="text-3xl text-white">📄</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">Complete Summary Report</h4>
            <p className="text-sm text-gray-500 mb-6">
              Generates a detailed PDF with attendance stats, waste analysis, and efficiency metrics.
            </p>
            <button onClick={downloadPDF} className="btn-primary flex items-center gap-2 mx-auto" id="download-pdf">
              <HiOutlineDownload /> Download PDF Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
