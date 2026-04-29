import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineMenuAlt2, HiOutlineBell, HiOutlineLogout } from 'react-icons/hi';
import { FaLeaf } from 'react-icons/fa';
import NotificationCenter from './NotificationCenter';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          id="menu-toggle"
        >
          <HiOutlineMenuAlt2 size={22} />
        </button>
        <div className="hidden md:flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <FaLeaf className="text-white text-sm" />
          </div>
          <span className="font-bold text-gray-800">MessWaste<span className="text-primary-600">AI</span></span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <NotificationCenter />

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'Manager'}</p>
          </div>
          <Link 
            to={user?.role === 'student' ? '/student-profile' : '/manager-profile'}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary-500/20 overflow-hidden"
          >
            {user?.profile_image && !imgError ? (
              <img 
                src={user.profile_image} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            id="logout-btn"
            title="Logout"
          >
            <HiOutlineLogout size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
