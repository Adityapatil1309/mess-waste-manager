import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import Layout from './components/Layout';
import StudentLayout from './components/StudentLayout';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Manager/Admin Pages
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import FoodCooking from './pages/FoodCooking';
import WasteEntry from './pages/WasteEntry';
import Inventory from './pages/Inventory';
import Prediction from './pages/Prediction';
import Procurement from './pages/Procurement';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import SetMenu from './pages/SetMenu';
import ManageTimings from './pages/ManageTimings';
import ManagerProfile from './pages/ManagerProfile';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import MarkAttendance from './pages/MarkAttendance';
import StudentHistory from './pages/StudentHistory';
import MessMenu from './pages/MessMenu';
import StudentProfile from './pages/StudentProfile';
import FoodFeedback from './pages/FoodFeedback';
import FoodFeedbackDashboard from './pages/FoodFeedbackDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect students trying to access manager pages
    if (user.role === 'student') return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'student') return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#333', color: '#fff', fontSize: '14px' } }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Manager/Admin Routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Attendance /></Layout></ProtectedRoute>} />
          <Route path="/food-cooking" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><FoodCooking /></Layout></ProtectedRoute>} />
          <Route path="/waste-entry" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><WasteEntry /></Layout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Inventory /></Layout></ProtectedRoute>} />
          <Route path="/prediction" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Prediction /></Layout></ProtectedRoute>} />
          <Route path="/procurement" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Procurement /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/manage-menu" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><SetMenu /></Layout></ProtectedRoute>} />
          <Route path="/manage-timings" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><ManageTimings /></Layout></ProtectedRoute>} />
          <Route path="/manager-profile" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><ManagerProfile /></Layout></ProtectedRoute>} />
          <Route path="/food-feedback-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'mess_manager']}><Layout><FoodFeedbackDashboard /></Layout></ProtectedRoute>} />

          {/* Student Routes */}
          <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><StudentDashboard /></StudentLayout></ProtectedRoute>} />
          <Route path="/mark-attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MarkAttendance /></StudentLayout></ProtectedRoute>} />
          <Route path="/my-attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><StudentHistory /></StudentLayout></ProtectedRoute>} />
          <Route path="/mess-menu" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MessMenu /></StudentLayout></ProtectedRoute>} />
          <Route path="/student-profile" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><StudentProfile /></StudentLayout></ProtectedRoute>} />
          <Route path="/food-feedback" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><FoodFeedback /></StudentLayout></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
