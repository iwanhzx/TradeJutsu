import type { WsMessage } from "../types/api";

type MessageHandler = (message: WsMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private _statusListeners: Set<(connected: boolean) => void> = new Set();

  get isConnected() { return this._isConnected; }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.DEV ? "localhost:8000" : window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}/api/v1/ws`);

    this.ws.onopen = () => { this._isConnected = true; this._notifyStatus(); };
    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(message));
      } catch { /* ignore */ }
    };
    this.ws.onclose = () => { this._isConnected = false; this._notifyStatus(); this._scheduleReconnect(); };
    this.ws.onerror = () => { this.ws?.close(); };
  }

  disconnect() {
    if (this.reconnectTimeout) { clearTimeout(this.reconnectTimeout); this.reconnectTimeout = null; }
    this.ws?.close(); this.ws = null; this._isConnected = false; this._notifyStatus();
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(listener: (connected: boolean) => void): () => void {
    this._statusListeners.add(listener);
    return () => this._statusListeners.delete(listener);
  }

  private _notifyStatus() { this._statusListeners.forEach((l) => l(this._isConnected)); }
  private _scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => { this.reconnectTimeout = null; this.connect(); }, 3000);
  }
}

export const wsClient = new WebSocketClient();
