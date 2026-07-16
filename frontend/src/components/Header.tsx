import { useEffect, useState } from 'react';
import { Bell, Wifi, WifiOff, Radio } from 'lucide-react';
import { useSessionStore } from '@/store';
import { wsService } from '@/services/websocket';
import { formatDateTime } from '@/utils';

export default function Header() {
  const activeSession = useSessionStore(s => s.activeSession);
  const [wsConnected, setWsConnected] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Poll WS connection status
    const interval = setInterval(() => {
      setWsConnected(wsService.isConnected);
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: Session info */}
      <div className="flex items-center gap-3">
        {activeSession ? (
          <>
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-sm font-semibold text-white">{activeSession.title}</span>
            </div>
            <span className="text-xs text-surface-500">
              {activeSession.platform === 'youtube' ? '🎥 YouTube Live' : activeSession.platform}
            </span>
          </>
        ) : (
          <span className="text-sm text-surface-500">No active session</span>
        )}
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-surface-500 font-mono tabular-nums">
          {time.toLocaleTimeString()}
        </span>

        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all duration-500 ${
          wsConnected
            ? 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/30'
            : 'text-surface-500 bg-surface-800/60 border-surface-700/30'
        }`}>
          {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
