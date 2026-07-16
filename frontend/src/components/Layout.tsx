import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/store';

export default function Layout() {
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-0'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
