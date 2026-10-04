import { useState } from 'react';
import { Play, Square, Send, Bot, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sessionsApi } from '@/services/api';

interface MockSimulatorControlProps {
  sessionId: number;
}

export default function MockSimulatorControl({ sessionId }: MockSimulatorControlProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testStudent, setTestStudent] = useState('Alex Rivera');

  const handleToggleSimulation = async () => {
    setLoading(true);
    try {
      if (isSimulating) {
        await sessionsApi.stopMock(sessionId);
        setIsSimulating(false);
        toast.success('Mock chat simulator stopped.');
      } else {
        await sessionsApi.startMock(sessionId);
        setIsSimulating(true);
        toast.success('Mock chat simulator started! Simulated students are voting live.');
      }
    } catch (err: any) {
      toast.error('Failed to toggle mock simulator.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;

    try {
      await sessionsApi.sendMockMessage(sessionId, testMessage.trim(), testStudent);
      toast.success(`Sent test message from ${testStudent}`);
      setTestMessage('');
    } catch (err) {
      toast.error('Failed to send test message.');
    }
  };

  return (
    <div className="glass-card p-5 border border-brand-500/20 bg-gradient-to-r from-surface-900 via-surface-900 to-brand-950/20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Mock Chat Simulator
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Testing Mode
              </span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Simulate live student votes & chat without an active YouTube livestream.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleSimulation}
          disabled={loading}
          className={`btn flex items-center gap-2 ${
            isSimulating
              ? 'bg-accent-rose text-white hover:bg-accent-rose/90'
              : 'btn-primary'
          }`}
        >
          {isSimulating ? (
            <>
              <Square size={16} /> Stop Simulator
            </>
          ) : (
            <>
              <Play size={16} /> Start Mock Stream
            </>
          )}
        </button>
      </div>

      {/* Manual message input */}
      <form onSubmit={handleSendTestMessage} className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Student Name"
          value={testStudent}
          onChange={e => setTestStudent(e.target.value)}
          className="input sm:w-44 text-xs"
        />
        <input
          type="text"
          placeholder="Test chat (e.g. 'Option A', 'I choose B', 'Answer is C', '#present')"
          value={testMessage}
          onChange={e => setTestMessage(e.target.value)}
          className="input flex-1 text-xs"
        />
        <button
          type="submit"
          className="btn-secondary text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Send size={14} />
          Send Test Message
        </button>
      </form>
    </div>
  );
}
