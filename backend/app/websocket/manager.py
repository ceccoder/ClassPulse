"""
WebSocket connection manager for real-time communication.
"""
import json
from typing import Dict, List
from fastapi import WebSocket, APIRouter
from starlette.websockets import WebSocketDisconnect

ws_router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # session_id -> list of websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # global connections (no specific session)
        self.global_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, session_id: int = None):
        await websocket.accept()
        if session_id is not None:
            if session_id not in self.active_connections:
                self.active_connections[session_id] = []
            self.active_connections[session_id].append(websocket)
        else:
            self.global_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: int = None):
        if session_id is not None and session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
        elif websocket in self.global_connections:
            self.global_connections.remove(websocket)

    async def broadcast(self, event: str, data: dict, session_id: int = None):
        """Broadcast an event to all connected clients for a session."""
        message = json.dumps({"event": event, "data": data, "session_id": session_id})
        dead = []

        # Send to session-specific connections
        if session_id is not None and session_id in self.active_connections:
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append((ws, session_id))

        # Send to global connections
        for ws in self.global_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append((ws, None))

        # Clean up dead connections
        for ws, sid in dead:
            self.disconnect(ws, sid)

    async def send_to_session(self, event: str, data: dict, session_id: int):
        await self.broadcast(event, data, session_id)


manager = ConnectionManager()


@ws_router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for ping/pong keepalive
            try:
                msg = json.loads(data)
                if msg.get("event") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)


@ws_router.websocket("/ws")
async def websocket_global(websocket: WebSocket):
    await manager.connect(websocket, session_id=None)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("event") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id=None)
