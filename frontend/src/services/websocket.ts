/**
 * WebSocket service for real-time ClassPulse events.
 */
import type { WSEvent, WSEventType } from '@/types';

type EventHandler = (data: Record<string, unknown>) => void;

class WSService {
  private ws: WebSocket | null = null;
  private sessionId: number | null = null;
  private handlers: Map<WSEventType, EventHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  connect(sessionId: number) {
    if (this.ws && this.connected && this.sessionId === sessionId) return;
    this.sessionId = sessionId;
    this.disconnect();
    this._connect();
  }

  private _connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/${this.sessionId}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      console.log('[WS] Connected');
      this._startPing();
    };

    this.ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        this._dispatch(event.event, event.data);
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._stopPing();
      console.log('[WS] Disconnected, reconnecting in 3s...');
      this.reconnectTimer = setTimeout(() => this._connect(), 3000);
    };

    this.ws.onerror = (e) => {
      console.warn('[WS] Error', e);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this._stopPing();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  on(event: WSEventType, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: WSEventType, handler: EventHandler) {
    const handlers = this.handlers.get(event) || [];
    this.handlers.set(event, handlers.filter(h => h !== handler));
  }

  private _dispatch(event: WSEventType, data: Record<string, unknown>) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(h => h(data));
  }

  private _startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping' }));
      }
    }, 30000);
  }

  private _stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
  }

  get isConnected() {
    return this.connected;
  }
}

export const wsService = new WSService();
