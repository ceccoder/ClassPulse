import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart2, HelpCircle, ClipboardList,
  Trophy, Zap, FileText, History, Monitor, Settings,
  ChevronLeft, Layers
} from 'lucide-react';
import { useUIStore, useSessionStore } from '@/store';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/polls', icon: BarChart2, label: 'Polls' },
  { path: '/quiz', icon: HelpCircle, label: 'Quiz' },
  { path: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/activity', icon: Zap, label: 'Activity' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/presentation', icon: Monitor, label: 'Present' },
  { path: '/overlay', icon: Layers, label: 'Overlay Widget' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const activeSession = useSessionStore(s => s.activeSession);

  return (
    <aside
      className={`flex flex-col border-r border-surface-800/60 bg-surface-950/95 backdrop-blur-sm
        transition-all duration-300 ease-in-out z-40 flex-shrink-0
        ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-surface-800/60 h-16 px-4 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-900/40">
              CP
            </div>
            <span className="font-bold text-white text-base tracking-tight">ClassPulse</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold text-sm">
            CP
          </div>
        )}
        {!sidebarCollapsed && (
          <button onClick={toggleSidebar} className="btn-icon">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Session Status */}
      {!sidebarCollapsed && activeSession && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-xs font-medium text-accent-emerald truncate">{activeSession.title}</span>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-0.5">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            target={(path === '/presentation' || path === '/overlay') ? '_blank' : undefined}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item'
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-brand-400' : ''}`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle (when collapsed) */}
      {sidebarCollapsed && (
        <div className="p-2 border-t border-surface-800/60">
          <button
            onClick={toggleSidebar}
            className="btn-icon w-full flex items-center justify-center"
          >
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        </div>
      )}
    </aside>
  );
}
