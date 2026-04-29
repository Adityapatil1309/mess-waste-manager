import { NavLink } from 'react-router-dom';
import { FaLeaf } from 'react-icons/fa';
import {
  HiOutlineViewGrid, HiOutlineCheckCircle, HiOutlineClipboardList,
  HiOutlineBookOpen, HiOutlineUser, HiOutlineX, HiOutlineStar
} from 'react-icons/hi';

const navItems = [
  { path: '/student-dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { path: '/mark-attendance', icon: HiOutlineCheckCircle, label: 'Mark Attendance' },
  { path: '/my-attendance', icon: HiOutlineClipboardList, label: 'My History' },
  { path: '/mess-menu', icon: HiOutlineBookOpen, label: "Today's Menu" },
  { path: '/food-feedback', icon: HiOutlineStar, label: 'Food Feedback' },
  { path: '/student-profile', icon: HiOutlineUser, label: 'Profile' },
];

export default function StudentSidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-white/90 backdrop-blur-xl border-r border-gray-100
        flex flex-col
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FaLeaf className="text-white text-lg" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Student</h1>
              <p className="text-xs text-primary-600 font-semibold">Mess Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <HiOutlineX size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
              id={`nav-student-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
