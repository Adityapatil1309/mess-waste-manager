import { useState, useEffect, useRef } from 'react';
import { HiOutlineBell, HiOutlineCheck, HiOutlineInformationCircle, HiOutlineExclamation, HiOutlineCheckCircle } from 'react-icons/hi';
import API from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  useEffect(() => {
    fetchNotifications();
    
    // Close dropdown on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <HiOutlineCheckCircle className="text-green-500" size={20} />;
      case 'warning': return <HiOutlineExclamation className="text-amber-500" size={20} />;
      case 'error': return <HiOutlineExclamation className="text-red-500" size={20} />;
      default: return <HiOutlineInformationCircle className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-colors ${isOpen ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100 text-gray-500'}`}
        id="notifications-btn"
      >
        <HiOutlineBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <HiOutlineCheck size={14} /> Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <HiOutlineBell size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => n.is_read === 0 && markAsRead(n.id)}
                    className={`p-4 flex gap-3 transition-colors cursor-pointer ${n.is_read === 0 ? 'bg-primary-50/30 hover:bg-primary-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${n.is_read === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 line-clamp-2 ${n.is_read === 0 ? 'text-gray-700' : 'text-gray-500'}`}>
                        {n.message}
                      </p>
                    </div>
                    {n.is_read === 0 && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 text-center bg-gray-50/30">
              <button className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                View all activity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
