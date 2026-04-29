import { NavLink } from 'react-router-dom';
import { FaLeaf } from 'react-icons/fa';
import {
  HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineBeaker,
  HiOutlineTrash, HiOutlineCube, HiOutlineLightningBolt,
  HiOutlineShoppingCart, HiOutlineChartBar, HiOutlineDocumentReport,
  HiOutlineX, HiOutlineBookOpen, HiOutlineUserCircle, HiOutlineClock,
  HiOutlineStar
} from 'react-icons/hi';

const navItems = [
  { path: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { path: '/attendance', icon: HiOutlineUserGroup, label: 'Attendance' },
  { path: '/food-cooking', icon: HiOutlineBeaker, label: 'Food Cooking' },
  { path: '/waste-entry', icon: HiOutlineTrash, label: 'Waste Entry' },
  { path: '/inventory', icon: HiOutlineCube, label: 'Inventory' },
  { path: '/prediction', icon: HiOutlineLightningBolt, label: 'ML Prediction' },
  { path: '/procurement', icon: HiOutlineShoppingCart, label: 'Procurement' },
  { path: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
  { path: '/manage-menu', icon: HiOutlineBookOpen, label: 'Manage Menu' },
  { path: '/manage-timings', icon: HiOutlineClock, label: 'Manage Timings' },
  { path: '/food-feedback-dashboard', icon: HiOutlineStar, label: 'Food Feedback' },
  { path: '/manager-profile', icon: HiOutlineUserCircle, label: 'My Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white/90 backdrop-blur-xl border-r border-gray-100
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FaLeaf className="text-white text-lg" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">MessWaste</h1>
              <p className="text-xs text-primary-600 font-semibold">AI Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-400"
          >
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="glass-card-green p-3 text-center">
            <p className="text-xs font-medium text-primary-700">🌱 Sustainability Score</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">87%</p>
            <p className="text-xs text-primary-600/70 mt-1">Great progress!</p>
          </div>
        </div>
      </aside>
    </>
  );
}
