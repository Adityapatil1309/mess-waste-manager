import { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import Navbar from './Navbar';

export default function StudentLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="page-enter max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
