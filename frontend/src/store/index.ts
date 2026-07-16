import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClassSession, Poll, Quiz, ActivityLog, HandRaise } from '@/types';

interface SessionState {
  activeSession: ClassSession | null;
  setActiveSession: (session: ClassSession | null) => void;
}

interface PollState {
  polls: Poll[];
  activePoll: Poll | null;
  setPolls: (polls: Poll[]) => void;
  updatePoll: (poll: Poll) => void;
  setActivePoll: (poll: Poll | null) => void;
  updatePollVote: (data: {
    poll_id: number;
    options: { id: number; keyword: string; text: string; vote_count: number }[];
    total_votes: number;
  }) => void;
}

interface ActivityState {
  activities: ActivityLog[];
  handRaises: HandRaise[];
  addActivity: (activity: ActivityLog) => void;
  addHandRaise: (handRaise: HandRaise) => void;
  setHandRaises: (hrs: HandRaise[]) => void;
  acknowledgeHandRaise: (id: number) => void;
}

interface UIState {
  sidebarCollapsed: boolean;
  presentationMode: boolean;
  toggleSidebar: () => void;
  setPresentationMode: (val: boolean) => void;
}

// ─── Session Store ─────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeSession: null,
      setActiveSession: (session) => set({ activeSession: session }),
    }),
    { name: 'classpulse-session' }
  )
);

// ─── Poll Store ────────────────────────────────────────────────────────────────

export const usePollStore = create<PollState>()((set, get) => ({
  polls: [],
  activePoll: null,

  setPolls: (polls) => {
    const active = polls.find(p => p.status === 'active') || null;
    set({ polls, activePoll: active });
  },

  updatePoll: (poll) => {
    set(state => ({
      polls: state.polls.map(p => p.id === poll.id ? poll : p),
      activePoll: poll.status === 'active' ? poll :
        (state.activePoll?.id === poll.id ? null : state.activePoll)
    }));
  },

  setActivePoll: (poll) => set({ activePoll: poll }),

  updatePollVote: (data) => {
    set(state => ({
      polls: state.polls.map(p => {
        if (p.id !== data.poll_id) return p;
        return {
          ...p,
          total_votes: data.total_votes,
          options: p.options.map(opt => {
            const updated = data.options.find(o => o.id === opt.id);
            return updated ? { ...opt, vote_count: updated.vote_count } : opt;
          })
        };
      }),
      activePoll: state.activePoll?.id === data.poll_id
        ? {
            ...state.activePoll!,
            total_votes: data.total_votes,
            options: state.activePoll!.options.map(opt => {
              const updated = data.options.find(o => o.id === opt.id);
              return updated ? { ...opt, vote_count: updated.vote_count } : opt;
            })
          }
        : state.activePoll
    }));
  }
}));

// ─── Activity Store ────────────────────────────────────────────────────────────

export const useActivityStore = create<ActivityState>()((set) => ({
  activities: [],
  handRaises: [],

  addActivity: (activity) => set(state => ({
    activities: [activity, ...state.activities].slice(0, 100)
  })),

  addHandRaise: (handRaise) => set(state => ({
    handRaises: [...state.handRaises, handRaise]
  })),

  setHandRaises: (hrs) => set({ handRaises: hrs }),

  acknowledgeHandRaise: (id) => set(state => ({
    handRaises: state.handRaises.map(h =>
      h.id === id ? { ...h, acknowledged: true } : h
    )
  })),
}));

// ─── UI Store ──────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      presentationMode: false,
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPresentationMode: (val) => set({ presentationMode: val }),
    }),
    { name: 'classpulse-ui' }
  )
);
