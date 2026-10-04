import { useState, useRef, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Filter, Zap } from 'lucide-react';
import { useWSEvent } from '@/hooks/useWebSocket';

export interface ChatFeedItem {
  message_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  text: string;
  timestamp: string;
  is_vote: boolean;
  voted_keyword?: string;
  is_correct?: boolean | null;
}

export default function LiveChatFeed() {
  const [messages, setMessages] = useState<ChatFeedItem[]>([]);
  const [filterVotesOnly, setFilterVotesOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen to live WebSocket chat events
  useWSEvent('chat_message', (data: Record<string, unknown>) => {
    const item = data as unknown as ChatFeedItem;
    setMessages(prev => [item, ...prev].slice(0, 100)); // Keep latest 100
  });

  const displayedMessages = filterVotesOnly
    ? messages.filter(m => m.is_vote)
    : messages;

  return (
    <div className="glass-card p-5 flex flex-col h-[420px]">
      {/* Header with filter toggle */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-800">
        <h2 className="section-title flex items-center gap-2">
          <MessageSquare size={18} className="text-accent-cyan" />
          Live Chat & Detected Votes
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterVotesOnly(false)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              !filterVotesOnly
                ? 'bg-brand-600 text-white font-medium'
                : 'bg-surface-800 text-surface-400 hover:text-white'
            }`}
          >
            All Messages ({messages.length})
          </button>
          <button
            onClick={() => setFilterVotesOnly(true)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
              filterVotesOnly
                ? 'bg-accent-emerald text-white font-medium'
                : 'bg-surface-800 text-surface-400 hover:text-white'
            }`}
          >
            <Zap size={12} />
            Votes Only ({messages.filter(m => m.is_vote).length})
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {displayedMessages.length > 0 ? (
          displayedMessages.map((msg, index) => (
            <div
              key={msg.message_id || index}
              className={`p-2.5 rounded-lg border transition-all ${
                msg.is_vote
                  ? 'bg-brand-600/10 border-brand-500/30'
                  : 'bg-surface-800/40 border-surface-800'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-accent-cyan flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                  {msg.author_avatar ? (
                    <img src={msg.author_avatar} alt={msg.author_name} className="w-full h-full object-cover" />
                  ) : (
                    msg.author_name[0]?.toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {msg.author_name}
                    </span>
                    <span className="text-[10px] text-surface-500">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                    </span>
                  </div>

                  <p className="text-xs text-surface-200 mt-0.5 break-words">
                    {msg.text}
                  </p>

                  {/* Detected Vote Pill */}
                  {msg.is_vote && msg.voted_keyword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-brand-500 text-white flex items-center gap-1">
                        <Zap size={10} />
                        Vote: Option {msg.voted_keyword}
                      </span>
                      {msg.is_correct === true && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 flex items-center gap-1">
                          <CheckCircle size={10} /> Correct
                        </span>
                      )}
                      {msg.is_correct === false && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-accent-rose/20 text-accent-rose border border-accent-rose/30 flex items-center gap-1">
                          <XCircle size={10} /> Incorrect
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-surface-500 text-center py-10">
            <MessageSquare size={32} className="opacity-30 mb-2" />
            <p className="text-xs">No chat messages received yet</p>
            <p className="text-[11px] mt-1 text-surface-600">
              Messages will appear here live when YouTube polling or Mock Simulator is active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
