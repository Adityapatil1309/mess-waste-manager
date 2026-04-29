import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock } from 'react-icons/hi';
import ProfileUploadWidget from '../components/ProfileUploadWidget';
import LiveMealWidget from '../components/LiveMealWidget';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user, login } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [menu, setMenu] = useState(null);
  const [assignmentInfo, setAssignmentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { 
    if (user?.org_code) {
      loadData(); 
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [statusRes, menuRes, assignmentRes] = await Promise.all([
        API.get('/student/attendance/today'),
        API.get('/student/menu'),
        API.get('/student/assignment-info').catch(() => ({ data: null })),
      ]);
      setTodayStatus(statusRes.data);
      setMenu(menuRes.data);
      setAssignmentInfo(assignmentRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getMealStatus = (meal) => {
    if (!todayStatus?.meals_marked) return null;
    return todayStatus.meals_marked[meal];
  };

  const meals = [
    { key: 'breakfast', label: 'Breakfast', emoji: '🌅', time: '7:30 - 9:00 AM' },
    { key: 'lunch', label: 'Lunch', emoji: '☀️', time: '12:00 - 2:00 PM' },
    { key: 'dinner', label: 'Dinner', emoji: '🌙', time: '7:00 - 9:00 PM' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await API.post('/student/join-organization', { org_code: joinCode.trim().toUpperCase() });
      if (res.data.access_token) {
        login(res.data.access_token);
      }
      toast.success('Joined organization successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join organization');
      setJoining(false);
    }
  };

  if (!user?.org_code) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Your Mess</h2>
          <p className="text-gray-500 mb-8">Enter the Organization Code provided by your Mess Manager.</p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <input 
              type="text" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD1234" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl tracking-widest font-mono font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all uppercase"
              required
              maxLength={20}
            />
            <button 
              type="submit"
              disabled={joining || joinCode.length < 3}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              {joining ? 'Joining...' : 'Join Now'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card-green p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, <span className="text-primary-600">{user?.name || 'Student'}</span>! 👋
          </h1>
          <p className="text-gray-500 mt-1 mb-4">Here's your mess attendance status for today.</p>
          {assignmentInfo?.assigned && assignmentInfo.managers.length > 0 && (
            <div className="inline-flex bg-white/50 backdrop-blur-sm px-4 py-3 rounded-2xl border border-primary-100 items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                {assignmentInfo.managers[0].name.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-primary-500">Mess Manager</p>
                <p className="text-sm font-bold text-gray-800">{assignmentInfo.managers[0].name}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 self-center md:self-start">
          <ProfileUploadWidget user={user} />
        </div>
      </div>

      {/* Live Next Meal Widget */}
      <LiveMealWidget menu={menu} todayStatus={todayStatus} isStudent={true} />

      {/* Today's Meal Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {meals.map((meal) => {
          const status = getMealStatus(meal.key);
          return (
            <div key={meal.key} className="glass-card p-5 text-center hover:shadow-xl transition-shadow">
              <p className="text-3xl mb-2">{meal.emoji}</p>
              <h3 className="font-bold text-gray-800 text-lg">{meal.label}</h3>
              <p className="text-xs text-gray-500 mb-3">{meal.time}</p>
              {status === 'coming' ? (
                <div className="flex items-center justify-center gap-1 text-primary-600">
                  <HiOutlineCheckCircle size={20} />
                  <span className="font-semibold text-sm">Coming ✅</span>
                </div>
              ) : status === 'not_coming' ? (
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <HiOutlineXCircle size={20} />
                  <span className="font-semibold text-sm">Not Coming</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 text-amber-500">
                  <HiOutlineClock size={20} />
                  <span className="font-semibold text-sm">Not Marked</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Action */}
      {!todayStatus?.all_marked && (
        <Link to="/mark-attendance" className="block">
          <div className="glass-card p-6 border-2 border-dashed border-primary-300 hover:border-primary-500 hover:bg-primary-50/50 transition-all text-center group cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
              <HiOutlineCheckCircle className="text-white text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Mark Your Attendance</h3>
            <p className="text-sm text-gray-500 mt-1">Tap here to mark which meals you're attending today</p>
          </div>
        </Link>
      )}

      {/* Today's Menu Preview */}
      {menu && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🍽️ Today's Menu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(menu.meals).map(([mealKey, mealData]) => (
              <div key={mealKey} className="p-4 rounded-xl bg-gray-50">
                <h4 className="font-semibold text-gray-800 capitalize mb-2">
                  {mealKey === 'breakfast' ? '🌅' : mealKey === 'lunch' ? '☀️' : '🌙'} {mealKey}
                </h4>
                <p className="text-xs text-primary-600 font-medium mb-2">{mealData.time}</p>
                <ul className="space-y-1">
                  {mealData.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
