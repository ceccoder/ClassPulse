import { useEffect, useRef, useCallback } from 'react';
import { wsService } from '@/services/websocket';
import { usePollStore, useActivityStore } from '@/store';
import type { WSEventType } from '@/types';

/**
 * Hook to connect to WebSocket for a session and handle events.
 */
export function useWebSocket(sessionId: number | null) {
  const updatePollVote = usePollStore(s => s.updatePollVote);
  const addActivity = useActivityStore(s => s.addActivity);

  useEffect(() => {
    if (!sessionId) return;
    wsService.connect(sessionId);

    // Handle poll votes
    const offPollVote = wsService.on('poll_vote', (data) => {
      updatePollVote(data as Parameters<typeof updatePollVote>[0]);
    });

    // Handle activity events
    const offActivity = wsService.on('activity', (data) => {
      addActivity({
        id: Date.now(),
        session_id: sessionId,
        event_type: data.event_type as string,
        description: data.description as string,
        student_name: data.student_name as string | null,
        metadata_json: null,
        created_at: data.timestamp as string || new Date().toISOString(),
      });
    });

    return () => {
      offPollVote();
      offActivity();
    };
  }, [sessionId, updatePollVote, addActivity]);

  const on = useCallback((event: WSEventType, handler: (data: Record<string, unknown>) => void) => {
    return wsService.on(event, handler);
  }, []);

  return { on, isConnected: wsService.isConnected };
}

/**
 * Hook to subscribe to a specific WebSocket event.
 */
export function useWSEvent(
  event: WSEventType,
  handler: (data: Record<string, unknown>) => void,
  sessionId?: number | null
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (data: Record<string, unknown>) => handlerRef.current(data);
    return wsService.on(event, stableHandler);
  }, [event]);
}
