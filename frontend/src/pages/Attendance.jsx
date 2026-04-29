import { useState, useEffect } from 'react';
import API from '../api/axios';
import { deleteEntry } from '../api/apiHelpers';
import toast from 'react-hot-toast';
import { HiOutlineUserGroup, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), meal: 'lunch', students: '' });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const res = await API.get('/attendance/?limit=50');
      setRecords(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/attendance/', { ...form, students: parseInt(form.students) });
      toast.success('Attendance recorded! ✅');
      setForm({ ...form, students: '' });
      setShowForm(false);
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    deleteEntry('/attendance', id, setRecords, 'Attendance record');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineUserGroup className="text-secondary-500" /> Attendance Management
          </h1>
          <p className="text-gray-500 mt-1">Record and manage daily meal attendance</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2" id="add-attendance">
          <HiOutlinePlus /> Add Record
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="font-bold text-gray-800 mb-4">New Attendance Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field" required id="att-date" />
            <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })}
              className="input-field" id="att-meal">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
            <input type="number" placeholder="Number of students" value={form.students}
              onChange={(e) => setForm({ ...form, students: e.target.value })}
              className="input-field" required min="0" id="att-students" />
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50" id="att-submit">
              {loading ? 'Saving...' : 'Save'}
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Students</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{r.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${r.meal === 'breakfast' ? 'bg-amber-100 text-amber-700' : 
                        r.meal === 'lunch' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {r.meal}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{r.students}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <HiOutlineTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                    No attendance records yet. Add your first entry above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
